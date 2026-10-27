import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnLzbWUto6QdrltRaBB1fRvYNrHr6K-NA",
  authDomain: "aulas-iam.firebaseapp.com",
  databaseURL: "https://aulas-iam-default-rtdb.firebaseio.com",
  projectId: "aulas-iam",
  storageBucket: "aulas-iam.firebasestorage.app",
  messagingSenderId: "1030670722131",
  appId: "1:1030670722131:web:e1de2ef2a68397663e52a6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const songsCollection = collection(db, "musicas");

let currentUser = null;
let currentProfile = null;
let songs = [];

const elements = {
  songGrid: document.querySelector("#songGrid"),
  songCount: document.querySelector("#songCount"),
  librarySearch: document.querySelector("#librarySearch"),
  songDialog: document.querySelector("#songDialog"),
  songForm: document.querySelector("#songForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  songId: document.querySelector("#songId"),
  songTitle: document.querySelector("#songTitle"),
  songArtist: document.querySelector("#songArtist"),
  songAlbum: document.querySelector("#songAlbum"),
  songComment: document.querySelector("#songComment"),
  toast: document.querySelector("#toast")
};

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function formatCount(count) {
  return `${count} ${count === 1 ? "música" : "músicas"}`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function getFavoriteIds() {
  return currentProfile?.favorites || [];
}

function renderSongs(filter = "") {
  const query = filter.trim().toLowerCase();
  const favoriteIds = getFavoriteIds();
  const filtered = songs.filter((song) =>
    [song.title, song.artist, song.album, song.comment]
      .join(" ")
      .toLowerCase()
      .includes(query)
  );

  elements.songCount.textContent = formatCount(filtered.length);
  if (!filtered.length) {
    elements.songGrid.innerHTML = `
      <div class="empty-state">
        <span aria-hidden="true">♪</span>
        <h3>Nenhuma música encontrada</h3>
        <p>Cadastre uma nova música ou tente outro termo.</p>
      </div>`;
    return;
  }

  elements.songGrid.innerHTML = filtered.map((song, index) => `
    <article class="song-card" style="--delay: ${index * 55}ms">
      <div class="cover-art">
        <span class="cover-kicker">ESP.</span>
        <div class="vinyl" aria-hidden="true"><span></span></div>
        <div class="cover-lines" aria-hidden="true"></div>
      </div>
      <div class="song-info">
        <div class="song-heading">
          <div>
            <h3>${escapeHtml(song.title)}</h3>
            <p>${escapeHtml(song.artist)}</p>
          </div>
          <button class="favorite-button ${favoriteIds.includes(song.id) ? "active" : ""}" type="button" aria-label="${favoriteIds.includes(song.id) ? "Remover dos" : "Adicionar aos"} favoritos" data-action="favorite" data-id="${song.id}">♥</button>
        </div>
        <p class="album-name">${escapeHtml(song.album || "Álbum não informado")}</p>
        ${song.comment ? `<p class="comment">“${escapeHtml(song.comment)}”</p>` : ""}
        <div class="card-actions">
          <button class="text-button" type="button" data-action="edit" data-id="${song.id}">Editar</button>
          <button class="text-button danger" type="button" data-action="delete" data-id="${song.id}">Excluir</button>
        </div>
      </div>
    </article>
  `).join("");
}

function openSongDialog(song = null) {
  elements.songForm.reset();
  elements.songId.value = song?.id || "";
  elements.dialogTitle.textContent = song ? "Editar música" : "Nova música";
  elements.songTitle.value = song?.title || "";
  elements.songArtist.value = song?.artist || "";
  elements.songAlbum.value = song?.album || "";
  elements.songComment.value = song?.comment || "";
  elements.songDialog.showModal();
  requestAnimationFrame(() => elements.songTitle.focus());
}

function closeSongDialog() {
  elements.songDialog.close();
}

elements.songForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = elements.songId.value;
  const data = {
    title: elements.songTitle.value.trim(),
    artist: elements.songArtist.value.trim(),
    album: elements.songAlbum.value.trim(),
    comment: elements.songComment.value.trim(),
    updatedAt: serverTimestamp()
  };

  try {
    if (id) {
      await updateDoc(doc(db, "musicas", id), data);
      showToast("Música atualizada");
    } else {
      await addDoc(songsCollection, { ...data, createdAt: serverTimestamp() });
      showToast("Música adicionada ao catálogo");
    }
    closeSongDialog();
  } catch (error) {
    showToast("Não foi possível salvar a música");
    console.error(error);
  }
});

elements.songGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const song = songs.find((item) => item.id === button.dataset.id);
  if (!song) return;

  if (button.dataset.action === "favorite") {
    await toggleFavorite(song.id);
    return;
  }
  if (button.dataset.action === "edit") openSongDialog(song);
  if (button.dataset.action === "delete") {
    if (!confirm(`Excluir "${song.title}" do catálogo?`)) return;
    try {
      await deleteDoc(doc(db, "musicas", song.id));
      showToast("Música excluída");
    } catch (error) {
      showToast("Não foi possível excluir a música");
      console.error(error);
    }
  }
});

elements.librarySearch.addEventListener("input", (event) => renderSongs(event.target.value));
document.querySelector("#newSongButton").addEventListener("click", () => openSongDialog());
document.querySelector("#closeDialogButton").addEventListener("click", closeSongDialog);
document.querySelector("#cancelDialogButton").addEventListener("click", closeSongDialog);
elements.songDialog.addEventListener("click", (event) => {
  if (event.target === elements.songDialog) closeSongDialog();
});

onSnapshot(songsCollection, (snapshot) => {
  songs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  songs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  renderSongs(elements.librarySearch.value);
}, (error) => {
  console.error(error);
  showToast("Não foi possível carregar o catálogo");
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const isSearch = button.dataset.view === "buscar";
    const isAccount = button.dataset.view === "usuario";
    document.querySelector("#catalogView").classList.toggle("hidden", isSearch || isAccount);
    document.querySelector("#searchView").classList.toggle("hidden", !isSearch);
    document.querySelector("#accountView").classList.toggle("hidden", !isAccount);
    document.querySelector("#newSongButton").classList.toggle("hidden", isSearch || isAccount);
    if (isAccount) renderAccount();
  });
});

const lyricsForm = document.querySelector("#lyricsForm");
const lyricsResult = document.querySelector("#lyricsResult");

async function loadLyrics(artist, title) {
  lyricsResult.innerHTML = '<div class="loading"><span></span> Buscando letra...</div>';
  try {
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (!response.ok) throw new Error("Letra não encontrada");
    const data = await response.json();
    const lyrics = data.lyrics || "Letra não disponível para esta música.";
    lyricsResult.innerHTML = `<div class="lyrics-copy"><h3>${escapeHtml(title)}</h3><p class="lyrics-artist">${escapeHtml(artist)}</p><p>${escapeHtml(lyrics).replaceAll("\n", "<br>")}</p></div>`;
  } catch (error) {
    lyricsResult.innerHTML = '<div class="empty-state compact"><h3>Não encontramos essa letra</h3><p>Tente selecionar outro resultado aproximado.</p></div>';
  }
}

lyricsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const term = document.querySelector("#musicSearchInput").value.trim();
  lyricsResult.innerHTML = '<div class="loading"><span></span> Buscando resultados aproximados...</div>';
  try {
    const response = await fetch(`https://api.lyrics.ovh/suggest/${encodeURIComponent(term)}`);
    if (!response.ok) throw new Error("Busca sem resposta");
    const data = await response.json();
    const results = data.data || [];
    if (!results.length) {
      lyricsResult.innerHTML = '<div class="empty-state compact"><h3>Nenhum resultado aproximado</h3><p>Tente usar um trecho diferente do nome da música ou artista.</p></div>';
      return;
    }

    lyricsResult.innerHTML = `<div class="suggestion-list">${results.slice(0, 8).map((item) => `
      <button class="suggestion-item" type="button" data-artist="${escapeHtml(item.artist.name)}" data-title="${escapeHtml(item.title)}">
        <span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.artist.name)}</small></span>
        <span aria-hidden="true">→</span>
      </button>
    `).join("")}</div>`;
  } catch (error) {
    lyricsResult.innerHTML = '<div class="empty-state compact"><h3>Não foi possível pesquisar</h3><p>Verifique sua conexão e tente novamente.</p></div>';
  }
});

lyricsResult.addEventListener("click", (event) => {
  const button = event.target.closest(".suggestion-item");
  if (!button) return;
  loadLyrics(button.dataset.artist, button.dataset.title);
});

function usernameToEmail(username) {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9]/g, ".");
  return `${normalized || "usuario"}@espia.dinha`;
}

function setAuthError(message) {
  document.querySelector("#authError").textContent = message;
}

function translateAuthError(error) {
  if (error.code === "auth/email-already-in-use") return "Este nome de usuário já está cadastrado.";
  if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") return "Nome ou senha incorretos.";
  if (error.code === "auth/weak-password") return "A senha deve ter pelo menos 6 caracteres.";
  return "Não foi possível concluir a operação.";
}

document.querySelectorAll(".auth-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector("#loginForm").classList.toggle("hidden", tab.dataset.authTab !== "login");
    document.querySelector("#registerForm").classList.toggle("hidden", tab.dataset.authTab !== "register");
    setAuthError("");
  });
});

document.querySelector("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#registerName").value.trim();
  const password = document.querySelector("#registerPassword").value;
  if (name.length < 2) {
    setAuthError("O nome deve ter pelo menos 2 caracteres.");
    return;
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, usernameToEmail(name), password);
    await updateProfile(credential.user, { displayName: name });
    await setDoc(doc(db, "espiadinha-usuarios", credential.user.uid), { name, favorites: [] }, { merge: true });
    event.target.reset();
    setAuthError("");
    showToast("Conta criada com sucesso");
  } catch (error) {
    setAuthError(translateAuthError(error));
  }
});

document.querySelector("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.querySelector("#loginName").value.trim();
  const password = document.querySelector("#loginPassword").value;
  try {
    await signInWithEmailAndPassword(auth, usernameToEmail(name), password);
    event.target.reset();
    setAuthError("");
  } catch (error) {
    setAuthError(translateAuthError(error));
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await signOut(auth);
  showToast("Você saiu da sua conta");
});

async function toggleFavorite(songId) {
  if (!currentUser) {
    document.querySelector('[data-view="usuario"]').click();
    showToast("Entre na sua conta para salvar favoritos");
    return;
  }
  const favorites = getFavoriteIds();
  const exists = favorites.includes(songId);
  const nextFavorites = exists ? favorites.filter((id) => id !== songId) : [...favorites, songId];
  try {
    await updateDoc(doc(db, "espiadinha-usuarios", currentUser.uid), { favorites: nextFavorites });
    currentProfile = { ...currentProfile, favorites: nextFavorites };
    renderSongs(elements.librarySearch.value);
    renderAccount();
    showToast(exists ? "Removida dos favoritos" : "Adicionada aos favoritos");
  } catch (error) {
    showToast("Não foi possível atualizar os favoritos");
    console.error(error);
  }
}

function renderAccount() {
  const authPanel = document.querySelector("#authPanel");
  const profilePanel = document.querySelector("#profilePanel");
  authPanel.classList.toggle("hidden", Boolean(currentUser));
  profilePanel.classList.toggle("hidden", !currentUser);
  if (!currentUser) return;

  const name = currentProfile?.name || currentUser.displayName || "Usuário";
  document.querySelector("#profileName").textContent = name;
  document.querySelector("#profileAvatar").textContent = name.charAt(0).toUpperCase();
  const favorites = getFavoriteIds().map((id) => songs.find((song) => song.id === id)).filter(Boolean);
  document.querySelector("#favoriteCount").textContent = formatCount(favorites.length);
  document.querySelector("#favoriteGrid").innerHTML = favorites.length ? favorites.map((song) => `
    <article class="favorite-item">
      <button class="favorite-remove" type="button" data-favorite-id="${song.id}" aria-label="Remover ${escapeHtml(song.title)} dos favoritos">♥</button>
      <div><h4>${escapeHtml(song.title)}</h4><p>${escapeHtml(song.artist)}</p></div>
    </article>
  `).join("") : '<div class="empty-state compact"><h3>Sua coleção está vazia</h3><p>Adicione músicas favoritas pelo catálogo.</p></div>';
}

document.querySelector("#favoriteGrid").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-favorite-id]");
  if (!button) return;
  await toggleFavorite(button.dataset.favoriteId);
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  currentProfile = null;
  if (user) {
    try {
      const profile = await getDoc(doc(db, "espiadinha-usuarios", user.uid));
      currentProfile = profile.exists() ? profile.data() : { name: user.displayName || "Usuário", favorites: [] };
      if (!profile.exists()) await setDoc(doc(db, "espiadinha-usuarios", user.uid), currentProfile);
    } catch (error) {
      console.error(error);
    }
  }
  renderAccount();
  renderSongs(elements.librarySearch.value);
});

renderSongs();

// ====================
// 1. STATE & VARIABEL
// ====================
let songs = [];
let filteredSongs = [];
let currentSongIndex = -1;
let isPlaying = false;
let isShuffle = false;
let isRepeat = false;
let songsPerLoad = 10;
let loadedCount = 0;

// Elemen DOM
const audio = document.getElementById("audio");
const songList = document.getElementById("song-list");
const searchInput = document.getElementById("search");
const clearSearchBtn = document.getElementById("clear-search");
const nowPlaying = document.getElementById("now-playing");
const songArtist = document.getElementById("song-artist");
const songAlbum = document.getElementById("song-album");
const songGenre = document.getElementById("song-genre");
const durationDisplay = document.getElementById("duration");
const seekBar = document.getElementById("seek");
const coverArt = document.getElementById("cover-art");
const loadingSpinner = document.getElementById("loading-spinner");

const playBtn = document.getElementById("play");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const shuffleBtn = document.getElementById("shuffle");
const repeatBtn = document.getElementById("repeat");

// ====================
// 2. FUNGSI DATA
// ====================

// Ambil daftar lagu dari songs.json
async function fetchSongs() {
    const res = await fetch("songs.json");
    songs = await res.json();
    filteredSongs = [...songs];
}

// Filter lagu berdasarkan keyword
function filterSongs(keyword) {
    filteredSongs = songs.filter(song =>
        song.title.toLowerCase().includes(keyword.toLowerCase()) ||
        song.artist.toLowerCase().includes(keyword.toLowerCase())
    );
    resetAndRenderSongs();
}

// ====================
// 3. FUNGSI UI
// ====================

// Render daftar lagu (lazy load)
function renderSongs() {
    const toLoad = filteredSongs.slice(loadedCount, loadedCount + songsPerLoad);
    toLoad.forEach((song, index) => {
        const li = document.createElement("li");
        li.textContent = song.title;
        li.addEventListener("click", () => playSong(loadedCount + index));
        songList.appendChild(li);
    });
    loadedCount += toLoad.length;
}

// Reset daftar & load ulang
function resetAndRenderSongs() {
    songList.innerHTML = "";
    loadedCount = 0;
    renderSongs();
}

// Update tampilan lagu yang sedang diputar
function updateNowPlaying(index) {
    const song = filteredSongs[index];
    nowPlaying.textContent = song.title;
    songArtist.textContent = song.artist || "Unknown";
    songAlbum.textContent = song.album || "Unknown";
    songGenre.textContent = song.genre || "Unknown";
    coverArt.src = song.cover || "";
}

// Update seek bar & durasi
function updateSeekBar() {
    seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
    durationDisplay.textContent = formatTime(audio.currentTime) + " / " + formatTime(audio.duration);
}

// Format detik → mm:ss
function formatTime(sec) {
    if (isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ====================
// 4. FUNGSI PLAYER
// ====================

function playSong(index) {
    currentSongIndex = index;
    const song = filteredSongs[index];
    audio.src = song.url;
    updateNowPlaying(index);
    audio.play();
    isPlaying = true;
    togglePlayPauseUI();
}

function togglePlayPause() {
    if (isPlaying) {
        audio.pause();
    } else {
        audio.play();
    }
}

function togglePlayPauseUI() {
    iconPlay.style.display = isPlaying ? "none" : "inline";
    iconPause.style.display = isPlaying ? "inline" : "none";
}

function playNext() {
    if (isShuffle) {
        currentSongIndex = Math.floor(Math.random() * filteredSongs.length);
    } else {
        currentSongIndex = (currentSongIndex + 1) % filteredSongs.length;
    }
    playSong(currentSongIndex);
}

function playPrev() {
    currentSongIndex = (currentSongIndex - 1 + filteredSongs.length) % filteredSongs.length;
    playSong(currentSongIndex);
}

function toggleShuffle() {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("active", isShuffle);
}

function toggleRepeat() {
    isRepeat = !isRepeat;
    repeatBtn.classList.toggle("active", isRepeat);
}

// ====================
// 5. FUNGSI EVENT
// ====================

function bindEvents() {
    // Kontrol player
    playBtn.addEventListener("click", togglePlayPause);
    prevBtn.addEventListener("click", playPrev);
    nextBtn.addEventListener("click", playNext);
    shuffleBtn.addEventListener("click", toggleShuffle);
    repeatBtn.addEventListener("click", toggleRepeat);

    // Seek bar
    seekBar.addEventListener("input", () => {
        audio.currentTime = (seekBar.value / 100) * audio.duration;
    });

    // Audio event
    audio.addEventListener("timeupdate", updateSeekBar);
    audio.addEventListener("play", () => { isPlaying = true; togglePlayPauseUI(); });
    audio.addEventListener("pause", () => { isPlaying = false; togglePlayPauseUI(); });
    audio.addEventListener("ended", () => {
        if (isRepeat) {
            playSong(currentSongIndex);
        } else {
            playNext();
        }
    });

    // Search
    searchInput.addEventListener("input", () => filterSongs(searchInput.value));
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        filterSongs("");
    });

    // Lazy load saat scroll
    document.addEventListener("scroll", () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
            renderSongs();
        }
    });
}

// ====================
// 6. INIT
// ====================
async function init() {
    await fetchSongs();
    resetAndRenderSongs();
    bindEvents();
}

init();

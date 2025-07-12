const audio = document.getElementById("audio");
const nowPlaying = document.getElementById("now-playing");
const seek = document.getElementById("seek");
const volume = document.getElementById("volume");
const songList = document.getElementById("song-list");
const searchInput = document.getElementById("search");


const btnPlay = document.getElementById("play");
const btnNext = document.getElementById("next");
const btnPrev = document.getElementById("prev");
const btnShuffle = document.getElementById("shuffle");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");

let currentIndex = 0;
let isPlaying = false;
let isShuffled = false;
let songs = [];

fetch("songs.json")
  .then(res => res.json())
  .then(data => {
    songs = data;
    const saved = localStorage.getItem("lastIndex");
    currentIndex = saved ? parseInt(saved) : 0;
    renderPlaylist();
    loadSong(currentIndex);
  });

  function renderPlaylist(filter = "") {
    songList.innerHTML = "";
    songs.forEach((song, idx) => {
      if (song.title.toLowerCase().includes(filter.toLowerCase())) {
        const li = document.createElement("li");
        li.textContent = song.title;
        li.addEventListener("click", () => {
          currentIndex = idx;
          playSong();
        });
        songList.appendChild(li);
      }
    });
    highlightActive();
  }
  
  searchInput.addEventListener("input", () => {
    renderPlaylist(searchInput.value);
  });
  

function highlightActive() {
  [...songList.children].forEach((li, idx) => {
    li.classList.toggle("active", idx === currentIndex);
  });
}

function loadSong(index) {
  const song = songs[index];
  if (!song) return;
  audio.src = song.url;
  nowPlaying.textContent = "🎧 Now playing : " + song.title;
  updateNowPlayingUI(song);
  highlightActive();
}

function playSong() {
  loadSong(currentIndex);
  audio.play();
  isPlaying = true;
  toggleIcons();
  localStorage.setItem("lastIndex", currentIndex);
}

function playNext() {
  if (isShuffled) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    currentIndex = (currentIndex + 1) % songs.length;
  }
  playSong();
}

function playPrev() {
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong();
}

function toggleIcons() {
  iconPlay.style.display = isPlaying ? "none" : "inline";
  iconPause.style.display = isPlaying ? "inline" : "none";
}

btnPlay.addEventListener("click", () => {
  if (!songs.length) return;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play();
    isPlaying = true;
  }
  toggleIcons();
});

btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);
btnShuffle.addEventListener("click", () => {
  isShuffled = !isShuffled;
  btnShuffle.classList.toggle("active", isShuffled);
});

audio.addEventListener("ended", playNext);

audio.addEventListener("timeupdate", () => {
  seek.value = (audio.currentTime / audio.duration) * 100 || 0;
});

seek.addEventListener("input", () => {
  audio.currentTime = (seek.value / 100) * audio.duration;
});

volume.addEventListener("input", () => {
  audio.volume = volume.value;
});

// Tambahan elemen UI
const durationText = document.getElementById("duration");

// Format durasi mm:ss
function formatTime(seconds) {
  const min = Math.floor(seconds / 60) || 0;
  const sec = Math.floor(seconds % 60) || 0;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// Update info cover & judul
function updateNowPlayingUI(song) {
durationText.textContent = "0:00";
}

// Update setiap detik
audio.addEventListener("timeupdate", () => {
  seek.value = (audio.currentTime / audio.duration) * 100 || 0;
  durationText.textContent = formatTime(audio.currentTime);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.error('❌ SW failed:', err));
  });
}

const songList = document.getElementById("song-list");
const audio = document.getElementById("audio");
const nowPlaying = document.getElementById("now-playing");
const searchInput = document.getElementById("search");

const btnPlay = document.getElementById("play");
const btnNext = document.getElementById("next");
const btnPrev = document.getElementById("prev");
const btnShuffle = document.getElementById("shuffle");

let songs = [];
let currentIndex = 0;
let isPlaying = false;
let isShuffled = false;

// Ambil songs.json
fetch("songs.json")
  .then((res) => res.json())
  .then((data) => {
    songs = data;
    renderSongs(songs);
  });

function renderSongs(list) {
  songList.innerHTML = "";
  list.forEach((song, index) => {
    const li = document.createElement("li");
    li.textContent = song.title;
    li.addEventListener("click", () => {
      currentIndex = index;
      playSong(songs[currentIndex]);
    });
    songList.appendChild(li);
  });
}

function playSong(song) {
  nowPlaying.textContent = "🎧 Sedang diputar: " + song.title;
  audio.src = song.url;
  audio.play();
  isPlaying = true;
  btnPlay.textContent = "⏸️";
}

function togglePlayPause() {
  if (!songs.length) return;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    btnPlay.textContent = "▶️";
  } else {
    audio.play();
    isPlaying = true;
    btnPlay.textContent = "⏸️";
  }
}

function playNext() {
  if (isShuffled) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    currentIndex = (currentIndex + 1) % songs.length;
  }
  playSong(songs[currentIndex]);
}

function playPrev() {
  if (isShuffled) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  }
  playSong(songs[currentIndex]);
}

function toggleShuffle() {
  isShuffled = !isShuffled;
  btnShuffle.style.color = isShuffled ? "var(--accent)" : "var(--fg)";
}

// Event listeners
btnPlay.addEventListener("click", togglePlayPause);
btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);
btnShuffle.addEventListener("click", toggleShuffle);

// Auto next when song ends
audio.addEventListener("ended", playNext);

// Fitur pencarian
searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.toLowerCase();
  const filtered = songs.filter(s => s.title.toLowerCase().includes(keyword));
  renderSongs(filtered);
});

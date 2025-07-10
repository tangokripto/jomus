const audio = document.getElementById("audio");
const playBtn = document.getElementById("play");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const shuffleBtn = document.getElementById("shuffle");
const seek = document.getElementById("seek");
const volume = document.getElementById("volume");
const playlistEl = document.getElementById("playlist");
const titleEl = document.getElementById("song-title");
const search = document.getElementById("search");

let songs = [];
let queue = [];
let index = 0;
let isShuffle = false;

const darkToggle = document.getElementById('toggle-dark');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  document.body.classList.add('dark');
}

darkToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});


function loadSongs() {
  fetch("songs.json")
    .then(res => res.json())
    .then(data => {
      songs = data;
      const last = localStorage.getItem("lastPlayed");
      index = last ? songs.findIndex(s => s.title === last) : 0;
      queue = [...songs];
      renderPlaylist();
      playSong();
    });
}

function renderPlaylist() {
  playlistEl.innerHTML = "";
  queue.forEach((s, i) => {
    if (s.title.toLowerCase().includes(search.value.toLowerCase())) {
      const div = document.createElement("div");
      div.textContent = s.title;
      if (i === index) div.classList.add("active");
      div.onclick = () => {
        index = i;
        playSong();
      };
      playlistEl.appendChild(div);
    }
  });
}

function playSong() {
  const song = queue[index];
  audio.src = song.url;
  titleEl.textContent = song.title;
  localStorage.setItem("lastPlayed", song.title);
  audio.play();
  renderPlaylist();
}

function nextSong() {
  index = (index + 1) % queue.length;
  playSong();
}

function prevSong() {
  index = (index - 1 + queue.length) % queue.length;
  playSong();
}

playBtn.onclick = () => {
  if (audio.paused) audio.play();
  else audio.pause();
};

audio.onplay = () => (playBtn.textContent = "⏸️");
audio.onpause = () => (playBtn.textContent = "▶️");

audio.ontimeupdate = () => {
  seek.value = audio.currentTime;
  seek.max = audio.duration || 0;
};

seek.oninput = () => {
  audio.currentTime = seek.value;
};

volume.oninput = () => {
  audio.volume = volume.value;
};

nextBtn.onclick = nextSong;
prevBtn.onclick = prevSong;

shuffleBtn.onclick = () => {
  isShuffle = !isShuffle;
  shuffleBtn.style.color = isShuffle ? "red" : "inherit";
  queue = isShuffle ? [...songs].sort(() => Math.random() - 0.5) : [...songs];
  index = 0;
  playSong();
};

search.oninput = renderPlaylist;

document.getElementById("toggle-theme").onclick = () => {
  document.body.classList.toggle("dark");
};

document.getElementById("toggle-mini").onclick = () => {
  document.body.classList.toggle("mini");
};

audio.onended = nextSong;

loadSongs();

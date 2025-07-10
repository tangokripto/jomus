const audio = new Audio();
let songs = [];
let currentIndex = 0;
let isShuffling = false;

// DOM Elements
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const playlistDiv = document.getElementById('playlist');
const seekBar = document.getElementById('seekBar');
const volume = document.getElementById('volume');
const search = document.getElementById('search');
const darkToggle = document.getElementById('darkModeToggle');
const miniToggle = document.getElementById('toggleMini');

// Load dark mode
if (localStorage.getItem('dark') === 'true') document.body.classList.add('dark');

// Fetch and render songs
fetch('public/songs.json')
  .then(res => res.json())
  .then(data => {
    songs = data;
    renderPlaylist();
    loadLastPlayed();
  });

function renderPlaylist(filter = '') {
  playlistDiv.innerHTML = '';
  songs.forEach((song, i) => {
    if (song.title.toLowerCase().includes(filter.toLowerCase())) {
      const div = document.createElement('div');
      div.textContent = song.title;
      if (i === currentIndex) div.classList.add('active');
      div.onclick = () => playSong(i);
      playlistDiv.appendChild(div);
    }
  });
}

function playSong(index) {
  currentIndex = index;
  const song = songs[currentIndex];
  audio.src = song.url;
  audio.play();
  updatePlaylistUI();
  playPauseBtn.textContent = '⏸';
  saveLastPlayed();
}

function updatePlaylistUI() {
  [...playlistDiv.children].forEach((el, i) => {
    el.classList.toggle('active', i === currentIndex);
  });
}

function saveLastPlayed() {
  localStorage.setItem('lastPlayed', JSON.stringify({
    index: currentIndex,
    time: audio.currentTime
  }));
}

function loadLastPlayed() {
  const last = JSON.parse(localStorage.getItem('lastPlayed') || '{}');
  if (last.index !== undefined && songs[last.index]) {
    currentIndex = last.index;
    playSong(currentIndex);
    audio.currentTime = last.time || 0;
  }
}

playPauseBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = '⏸';
  } else {
    audio.pause();
    playPauseBtn.textContent = '▶️';
  }
};

nextBtn.onclick = () => {
  if (isShuffling) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    currentIndex = (currentIndex + 1) % songs.length;
  }
  playSong(currentIndex);
};

prevBtn.onclick = () => {
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong(currentIndex);
};

shuffleBtn.onclick = () => {
  isShuffling = !isShuffling;
  shuffleBtn.style.color = isShuffling ? 'red' : 'black';
};

volume.oninput = () => {
  audio.volume = volume.value;
};

audio.ontimeupdate = () => {
  seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
  saveLastPlayed();
};

seekBar.oninput = () => {
  audio.currentTime = (seekBar.value / 100) * audio.duration;
};

search.oninput = (e) => {
  renderPlaylist(e.target.value);
};

darkToggle.onclick = () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('dark', document.body.classList.contains('dark'));
};

miniToggle.onclick = () => {
  document.body.classList.toggle('mini');
};
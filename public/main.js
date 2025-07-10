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
const miniTitle = document.getElementById('mini-title');

// Dark mode saat load
if (localStorage.getItem('dark') === 'true') {
  document.documentElement.classList.add('dark');
}

// Fetch lagu
fetch('/public/songs.json')
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
      const li = document.createElement('li');
      li.textContent = song.title;
      if (i === currentIndex) li.classList.add('active');
      li.onclick = () => playSong(i);
      playlistDiv.appendChild(li);
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
  miniTitle.textContent = song.title;
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

// Tombol play/pause
playPauseBtn.onclick = () => {
  if (audio.paused) {
    audio.play();
    playPauseBtn.textContent = '⏸';
  } else {
    audio.pause();
    playPauseBtn.textContent = '▶️';
  }
};

// Tombol next
nextBtn.onclick = () => {
  if (isShuffling) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    currentIndex = (currentIndex + 1) % songs.length;
  }
  playSong(currentIndex);
};

// Tombol prev
prevBtn.onclick = () => {
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong(currentIndex);
};

// Shuffle
shuffleBtn.onclick = () => {
  isShuffling = !isShuffling;
  shuffleBtn.style.color = isShuffling ? 'red' : 'black';
};

// Volume
volume.oninput = () => {
  audio.volume = volume.value;
};

// Seek bar update
audio.ontimeupdate = () => {
  seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
  saveLastPlayed();
};

seekBar.oninput = () => {
  audio.currentTime = (seekBar.value / 100) * audio.duration;
};

// Search filter
search.oninput = (e) => {
  renderPlaylist(e.target.value);
};

// Toggle dark mode
darkToggle.onclick = () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('dark', document.documentElement.classList.contains('dark'));
};

// Mini player toggle (bisa dikembangkan)
miniToggle.onclick = () => {
  document.body.classList.toggle('mini');
};

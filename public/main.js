let songs = [];
let current = 0;
const audio = document.getElementById('audio');
const playBtn = document.getElementById('play');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const shuffleBtn = document.getElementById('shuffle');
const seekBar = document.getElementById('seek');
const volume = document.getElementById('volume');
const playlist = document.getElementById('playlist');
const miniToggle = document.getElementById('mini-toggle');
const miniTitle = document.getElementById('mini-title');

async function loadSongs() {
  const res = await fetch('songs.json');
  songs = await res.json();
  renderPlaylist();
  const savedIndex = +localStorage.getItem('lastPlayed') || 0;
  playSong(savedIndex);
}

function renderPlaylist() {
  playlist.innerHTML = '';
  songs.forEach((s, i) => {
    const li = document.createElement('li');
    li.textContent = s.title;
    li.classList.add('song-item');
    li.onclick = () => playSong(i);
    playlist.appendChild(li);
  });
}

function playSong(i) {
  current = i;
  const song = songs[i];
  audio.src = song.url;
  audio.play();
  highlightCurrent();
  localStorage.setItem('lastPlayed', current);
  miniTitle.textContent = '🎵 ' + song.title;
}

function highlightCurrent() {
  [...document.querySelectorAll('.song-item')].forEach((el, i) => {
    el.classList.toggle('playing', i === current);
  });
}

playBtn.onclick = () => {
  if (audio.paused) audio.play();
  else audio.pause();
};
prevBtn.onclick = () => playSong((current - 1 + songs.length) % songs.length);
nextBtn.onclick = () => playSong((current + 1) % songs.length);
shuffleBtn.onclick = () => {
  const r = Math.floor(Math.random() * songs.length);
  playSong(r);
};
audio.onended = () => nextBtn.onclick();

seekBar.addEventListener('input', () => {
  audio.currentTime = (audio.duration * seekBar.value) / 100;
});
audio.ontimeupdate = () => {
  seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
};
volume.oninput = () => {
  audio.volume = volume.value;
};

// Mini Player Toggle
miniToggle.onclick = () => {
  if (audio.paused) audio.play();
  else audio.pause();
};

// Dark Mode
document.getElementById('toggle-dark').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

// Search
document.getElementById('search').addEventListener('input', e => {
  const keyword = e.target.value.toLowerCase();
  document.querySelectorAll('.song-item').forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(keyword) ? '' : 'none';
  });
});

// Mini mode toggle (optional, based on window size)
window.addEventListener('resize', () => {
  if (window.innerWidth < 500) {
    document.body.classList.add('mini-mode');
  } else {
    document.body.classList.remove('mini-mode');
  }
});
window.dispatchEvent(new Event('resize')); // trigger on load

loadSongs();

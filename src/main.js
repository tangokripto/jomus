const playlistEl = document.getElementById('playlist');
const audio = document.getElementById('audio');
let current = 0;
let songs = [];

async function loadSongs() {
  const res = await fetch('/public/songs.json');
  songs = await res.json();

  songs.forEach((song, i) => {
    const li = document.createElement('li');
    li.textContent = song.title;
    li.addEventListener('click', () => playSong(i));
    playlistEl.appendChild(li);
  });

  playSong(0);
}

function playSong(index) {
  current = index;
  audio.src = songs[current].url;
  audio.play();
  highlightCurrent();
}

function highlightCurrent() {
  Array.from(playlistEl.children).forEach((li, i) => {
    li.classList.toggle('active', i === current);
  });
}

document.getElementById('play').addEventListener('click', () => {
  if (audio.paused) audio.play();
  else audio.pause();
});

document.getElementById('next').addEventListener('click', () => {
  current = (current + 1) % songs.length;
  playSong(current);
});

document.getElementById('prev').addEventListener('click', () => {
  current = (current - 1 + songs.length) % songs.length;
  playSong(current);
});

document.getElementById('shuffle').addEventListener('click', () => {
  current = Math.floor(Math.random() * songs.length);
  playSong(current);
});

loadSongs();

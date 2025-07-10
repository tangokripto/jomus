const audio = document.getElementById("audio");
const nowPlaying = document.getElementById("now-playing");
const seek = document.getElementById("seek");
const volume = document.getElementById("volume");
const songList = document.getElementById("song-list");
const cover = document.getElementById('cover');
const titleDiv = document.getElementById('songTitle');
const timeDiv = document.getElementById('time');

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
    renderPlaylist();
    loadSong(currentIndex);
  });

function renderPlaylist() {
  songList.innerHTML = "";
  songs.forEach((song, idx) => {
    const li = document.createElement("li");
    li.textContent = song.title;
    li.addEventListener("click", () => {
      currentIndex = idx;
      playSong();
    });
    songList.appendChild(li);
  });
}

function highlightActive() {
  [...songList.children].forEach((li, idx) => {
    li.classList.toggle("active", idx === currentIndex);
  });
}

function loadSong(index) {
  const song = songs[index];
  if (!song) return;
  audio.src = song.url;
  nowPlaying.textContent = "🎧 Played : " + song.title;
  highlightActive();
}

function playSong(index) {
  currentIndex = index;
  const song = songs[currentIndex];
  audio.src = song.url;
  titleDiv.textContent = song.title;
  cover.src = song.cover || 'default.jpg'; // default cover
  audio.play();
  updatePlaylistUI();
  playPauseBtn.textContent = '⏸';
  saveLastPlayed();
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

audio.ontimeupdate = () => {
  seekBar.value = (audio.currentTime / audio.duration) * 100 || 0;
  saveLastPlayed();

  const format = sec => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!isNaN(audio.duration)) {
    timeDiv.textContent = `${format(audio.currentTime)} / ${format(audio.duration)}`;
  }
};

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

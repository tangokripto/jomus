const audio = document.getElementById("audio");
const nowPlaying = document.getElementById("now-playing");
const seek = document.getElementById("seek");
const songList = document.getElementById("song-list");
const searchInput = document.getElementById("search");
const btnRepeat = document.getElementById("repeat");
const btnPlay = document.getElementById("play");
const btnNext = document.getElementById("next");
const btnPrev = document.getElementById("prev");
const btnShuffle = document.getElementById("shuffle");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");
const btnClearSearch = document.getElementById("clear-search");
const durationText = document.getElementById("duration");

let currentIndex = 0;
let isRepeating = false;
let isPlaying = false;
let isShuffled = false;
let songs = [];
let filteredSongs = [];
let scrollTitleInterval;
let scrollTitleOffset = 0;

fetch("https://gist.githubusercontent.com/tangokripto/9a9509c2df203d727b060494a4a002dc/raw/songs.json")
  .then(res => res.json())
  .then(data => {
    songs = data;
    const saved = localStorage.getItem("lastIndex");
    currentIndex = saved ? parseInt(saved) : 0;
    renderPlaylist();
    loadSong(currentIndex, true);
  });

function toggleClearButton() {
  btnClearSearch.style.display = searchInput.value ? "block" : "none";
}

searchInput.addEventListener("input", () => {
  renderPlaylist(searchInput.value);
  toggleClearButton();
});

btnClearSearch.addEventListener("click", () => {
  searchInput.value = "";
  renderPlaylist();
  toggleClearButton();
});

toggleClearButton();

function renderPlaylist(filter = "") {
  songList.innerHTML = "";
  filterSongs = songs
    .map((song, idx) => ({ ...song, originalIndex: idx }))
    .filter(song => {
      const query = filter.toLowerCase();
      return (
        song.title?.toLowerCase().includes(query) ||
        song.artist?.toLowerCase().includes(query) ||
        song.album?.toLowerCase().includes(query) ||
        song.genre?.toLowerCase().includes(query) ||
        song.file?.toLowerCase().includes(query)
      );
    });

  filterSongs.forEach((song, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="flex flex-col">
        <span class="text-xs text-zinc-400">${song.file.split('/')}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      currentIndex = song.originalIndex;
      playSong();
      renderPlaylist(searchInput.value);
      scrollToCurrentSong(false);
    });
    songList.appendChild(li);
  });

  highlightActive();
}


songList.addEventListener("scroll", () => {
  if (
    songList.scrollTop + songList.clientHeight >=
    songList.scrollHeight - 10
  ) {
    if (visibleCount < filteredSongs.length) {
      visibleCount += LOAD_STEP;
      renderVisibleSongs();
    }
  }
});

function scrollToCurrentSong(autoScroll = true) {
  const active = songList.querySelector("li.active");
  if (active && autoScroll) {
    active.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function highlightActive() {
  [...songList.children].forEach((li, idx) => {
    const realIndex = filterSongs[idx]?.originalIndex;
    li.classList.toggle("active", realIndex === currentIndex);
  });
}

function loadSong(index, resume = false) {
  const song = songs[index];
  if (!song) return;

  nowPlaying.textContent = "⏳ Loading ...";
  document.title = "Loading...";

  audio.src = song.url;
  audio.load();

  audio.addEventListener("canplay", function onReady() {
    audio.removeEventListener("canplay", onReady);
    const savedIndex = parseInt(localStorage.getItem("lastIndex"));
    const savedTime = parseFloat(localStorage.getItem("lastTime"));

    if (resume && index === savedIndex && !isNaN(savedTime)) {
      audio.currentTime = savedTime;
    }

    nowPlaying.textContent = " 🎵 " + song.title;
    const fullTitle = `🎵 ${song.title} - ${song.artist || "Unknown"}`;
    startScrollingTitle(fullTitle);

    updateNowPlayingUI(song);
    document.getElementById("song-artist").textContent = song.artist || "Unknown";
    document.getElementById("song-album").textContent = song.album || "Unknown";
    document.getElementById("song-genre").textContent = song.genre || "Genre?";
    highlightActive();
  });
}

function playSong(resume = false) {
  loadSong(currentIndex, resume);
  audio.volume = 0;
  audio.play();
  isPlaying = true;
  toggleIcons();
  localStorage.setItem("lastIndex", currentIndex);

  let vol = 0;
  const fade = setInterval(() => {
    vol += 0.05;
    if (vol >= 1) {
      audio.volume = 1;
      clearInterval(fade);
    } else {
      audio.volume = vol;
    }
  }, 50);
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
    clearInterval(scrollTitleInterval);
    localStorage.setItem("lastTime", audio.currentTime.toString());
  } else {
    audio.play();
    isPlaying = true;
    const song = songs[currentIndex];
    const fullTitle = `🎵 ${song.title} - ${song.artist || "Unknown"} 🎶`;
    startScrollingTitle(fullTitle);
  }
  toggleIcons();
});

btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);
btnShuffle.addEventListener("click", () => {
  isShuffled = !isShuffled;
  btnShuffle.classList.toggle("active", isShuffled);
});
btnRepeat.addEventListener("click", () => {
  isRepeating = !isRepeating;
  btnRepeat.classList.toggle("active", isRepeating);
});

audio.addEventListener("ended", () => {
  if (isRepeating) {
    audio.currentTime = 0;
    audio.play();
  } else {
    playNext();
  }
});

audio.addEventListener("timeupdate", () => {
  seek.value = (audio.currentTime / audio.duration) * 100 || 0;
  const current = formatTime(audio.currentTime);
  const total = formatTime(audio.duration);
  durationText.textContent = `${current} / ${total}`;
  if (!audio.seeking && !audio.paused) {
    localStorage.setItem("lastTime", audio.currentTime.toString());
  }
});

seek.addEventListener("input", () => {
  audio.currentTime = (seek.value / 100) * audio.duration;
});

function formatTime(seconds) {
  const min = Math.floor(seconds / 60) || 0;
  const sec = Math.floor(seconds % 60) || 0;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function updateNowPlayingUI(song) {
  durationText.textContent = "0:00";
  const cover = document.getElementById("cover-art");
  if (song.cover) {
    cover.src = song.cover;
    cover.style.display = "block";
    updateFavicon(song.cover);
    generateFaviconFromImage(song.cover);
  } else {
    cover.style.display = "none";
  }

  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || 'Unknown',
      artist: song.artist || 'Unknown',
      album: song.album || '',
      artwork: [{ src: song.cover, sizes: '512x512', type: 'image/png' }]
    });

    navigator.mediaSession.setActionHandler('play', () => audio.play());
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }
}

function updateFavicon(url) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url + "?v=" + Date.now();
}

function generateFaviconFromImage(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 64, 64);
    const favicon = canvas.toDataURL("image/png");

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  };
  img.src = url;
}

function startScrollingTitle(text) {
  clearInterval(scrollTitleInterval);
  scrollTitleOffset = 0;
  scrollTitleInterval = setInterval(() => {
    const scrollText = text.substring(scrollTitleOffset) + " • " + text.substring(0, scrollTitleOffset);
    document.title = scrollText;
    scrollTitleOffset = (scrollTitleOffset + 1) % text.length;
  }, 250);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('✅ Service Worker registered'))
      .catch(err => console.error('❌ SW failed:', err));
  });
}

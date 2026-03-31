const audio = new Audio();
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
let filterSongs = [];
let scrollTitleInterval;
let scrollTitleOffset = 0;

// Lazy load config
const SONGS_PER_LOAD = 20;
let loadedCount = 0;

// Fetch & Init Songs
fetch("songs.json")
  .then(res => res.json())
  .then(data => {
    songs = data;
    songs.sort((a, b) => a.artist?.toLowerCase().localeCompare(b.artist?.toLowerCase()));
    const saved = localStorage.getItem("lastIndex");
    currentIndex = saved ? parseInt(saved) : 0;
    renderPlaylist();
    while (loadedCount <= currentIndex && loadedCount < songs.length) {
      loadMoreSongs();
    }
    loadSong(currentIndex, true);
    setTimeout(() => {
        highlightActive(true);
    }, 500);
  });

// Toggle Clear Search Button
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

// Render Playlist
function renderPlaylist(filter = "") {
  songList.innerHTML = "";
  loadedCount = 0;

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

  loadMoreSongs();
}

// Load More Songs (Lazy Load)
function loadMoreSongs() {
  const nextSongs = filterSongs.slice(loadedCount, loadedCount + SONGS_PER_LOAD);
  nextSongs.forEach(song => {
    const li = document.createElement("li");
    li.setAttribute("data-index", song.originalIndex);
    li.innerHTML = `
      <div class="flex flex-col">
        <span class="text-xs text-zinc-400">${getFileName(song.file)}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      currentIndex = song.originalIndex;
      playSong();
      scrollToCurrentSong(false);
    });
    songList.appendChild(li);
  });

  loadedCount += nextSongs.length;
  highlightActive(false);
}

// Get File Name
function getFileName(path) {
  const name = path.split('/').pop();
  return name.replace(/\.[^/.]+$/, '');
}

songList.addEventListener("scroll", () => {
  if (songList.scrollTop + songList.clientHeight >= songList.scrollHeight - 10) {
    loadMoreSongs();
  }
});

// Scroll To Current Song
function scrollToCurrentSong(autoScroll = true) {
 // const active = songList.querySelector("li.active");
 // if (active && autoScroll) {
 //   active.scrollIntoView({ behavior: "smooth", block: "center" });
 // }
}

// Highlight Active Song
function highlightActive(shouldScroll = false) {
  const listItems = songList.querySelectorAll("li");
  listItems.forEach((li) => {
    const songIndex = parseInt(li.getAttribute("data-index"));
    if (songIndex === currentIndex) {
      li.classList.add("active-song");
      if (shouldScroll) {
      li.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    } else {
      li.classList.remove("active-song");
    }
  });
}

// Load Song
function loadSong(index, resume = false) {
  const song = songs[index];
  if (!song) return;

  nowPlaying.textContent = "⏳ Loading ...";
  document.title = "Music Pleyah.";

  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  if (!audio.src || audio.src !== song.url) {
    audio.src = song.url;
  }

  audio.addEventListener("canplay", function onReady() {
    audio.removeEventListener("canplay", onReady);
    const savedIndex = parseInt(localStorage.getItem("lastIndex"));
    const savedTime = parseFloat(localStorage.getItem("lastTime"));

    if (resume && index === savedIndex && !isNaN(savedTime)) {
      audio.currentTime = savedTime;
    }

    nowPlaying.textContent = song.title;
    const fullTitle = `${song.title} - ${song.artist || "Unknown"}`;
    
    updateNowPlayingUI(song);
    document.getElementById("song-artist").textContent = song.artist || "Unknown";
    document.getElementById("song-album").textContent = song.album || "Unknown";
    document.getElementById("song-genre").textContent = song.genre || "Unknown";
    highlightActive(true);
    /* scrollToCurrentSong(); */
  });
}

// Play Song
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

// Play Next Song
function playNext() {
  if (isShuffled) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    currentIndex = (currentIndex + 1) % songs.length;
  }
  playSong();
}

// Play Previous Song
function playPrev() {
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong();
}

// Toggle Play/Pause Icons
function toggleIcons() {
  iconPlay.style.display = isPlaying ? "none" : "inline";
  iconPause.style.display = isPlaying ? "inline" : "none";
}

// Format Time
function formatTime(seconds) {
  const min = Math.floor(seconds / 60) || 0;
  const sec = Math.floor(seconds % 60) || 0;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// Update Now Playing UI
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

// Update Favicon
function updateFavicon(url) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url + "?v=" + Date.now();
}

// Generate Favicon From Image
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

// Start Scrolling Title
function startScrollingTitle(text) {
  clearInterval(scrollTitleInterval);
  scrollTitleOffset = 0;
  scrollTitleInterval = setInterval(() => {
    const scrollText = text.substring(scrollTitleOffset) + "  " + text.substring(0, scrollTitleOffset);
    document.title = scrollText;
    scrollTitleOffset = (scrollTitleOffset + 1) % text.length;
  }, 250);
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('[OK] Service Worker registered'))
      .catch(err => console.error('[Err] SW failed:', err));
  });
}

// Event Listeners
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
    const fullTitle = `🎶 ${song.title} - ${song.artist || "Unknown"} `;
    startScrollingTitle(fullTitle);
  }
  toggleIcons();
});

// Toast Notification 
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.innerHTML = message;
  toast.classList.add("show");
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);

isShuffled = localStorage.getItem("isShuffled") === "true";
isRepeating = localStorage.getItem("isRepeating") === "true";

if (isShuffled) btnShuffle.classList.add("active-control");
if (isRepeating) btnRepeat.classList.add("active-control");

btnShuffle.addEventListener("click", () => {
  isShuffled = !isShuffled;
  localStorage.setItem("isShuffled", isShuffled);
  btnShuffle.classList.toggle("active-control", isShuffled);
  showToast(isShuffled ? "Shuffle Enabled" : "Sequential Play");
});

btnRepeat.addEventListener("click", () => {
  isRepeating = !isRepeating;
  localStorage.setItem("isRepeating", isRepeating);
  btnRepeat.classList.toggle("active-control", isRepeating);
  showToast(isRepeating ? "Repeat Mode" : "Play All");
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
  const progress = (audio.currentTime / audio.duration) * 100 || 0;
  seek.value = progress;
  
  // TAMBAHKAN BARIS INI: Update warna bar yang sudah lewat
  seek.style.backgroundSize = progress + '% 100%';

  const current = formatTime(audio.currentTime);
  const total = formatTime(audio.duration || 0);
  durationText.textContent = `${current} / ${total}`;
  
  if (!audio.seeking && !audio.paused) {
    localStorage.setItem("lastTime", audio.currentTime.toString());
  }
});

seek.addEventListener("input", () => {
  audio.currentTime = (seek.value / 100) * audio.duration;

  seek.style.backgroundSize = seek.value + '% 100%';
});

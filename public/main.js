/* =========================================
   1. INITIALIZATION & VARIABLES
   ========================================= */
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

// Video Elements
const videoElement = document.getElementById('bg-video');
const videoSource = document.getElementById('video-source');
const videoContainer = document.getElementById('video-container');

// State Management
let currentSongIndex = 0;
let currentVideoIndex = 0;
let isRepeating = false;
let isPlaying = false;
let isShuffled = false;
let songs = [];
let filterSongs = [];
let scrollTitleInterval;
let scrollTitleOffset = 0;

const SONGS_PER_LOAD = 20;
let loadedCount = 0;

const videoList = [
  'https://f003.backblazeb2.com/file/music-pribadi/evelyn.3840x2160.mp4',
  'https://f003.backblazeb2.com/file/music-pribadi/hunt-showdown-death-roots.3840x2160.mp4',
  'https://f003.backblazeb2.com/file/music-pribadi/hunt-showdown-veil-of-thorns.3840x2160.mp4',
  'https://f003.backblazeb2.com/file/music-pribadi/the-shadow-fantasy-king-moewalls-com.mp4'
];

/* =========================================
   2. SONG CORE LOGIC (FETCH & LOAD)
   ========================================= */
fetch("songs.json")
  .then(res => res.json())
  .then(data => {
    songs = data;
    songs.sort((a, b) => a.artist?.toLowerCase().localeCompare(b.artist?.toLowerCase()));
    
    const saved = localStorage.getItem("lastIndex");
    currentSongIndex = saved ? parseInt(saved) : 0;
    
    renderPlaylist();
    while (loadedCount <= currentSongIndex && loadedCount < songs.length) {
      loadMoreSongs();
    }
    loadSong(currentSongIndex, true);
    setTimeout(() => highlightActive(true), 500);
  })
  .catch(err => console.error("Failed to load songs:", err));

function loadSong(index, resume = false) {
  const song = songs[index];
  if (!song) return;

  nowPlaying.textContent = "Loading...";
  audio.pause();
  audio.src = song.url;
  audio.load();

  audio.addEventListener("canplay", function onReady() {
    audio.removeEventListener("canplay", onReady);
    
    const savedIndex = parseInt(localStorage.getItem("lastIndex"));
    const savedTime = parseFloat(localStorage.getItem("lastTime"));

    if (resume && index === savedIndex && !isNaN(savedTime)) {
      audio.currentTime = savedTime;
    }

    nowPlaying.textContent = song.title;
    updateNowPlayingUI(song);
    highlightActive(true);
  });
}

function playSong(resume = false) {
  loadSong(currentSongIndex, resume);
  audio.volume = 0;
  audio.play();
  isPlaying = true;
  toggleIcons();
  localStorage.setItem("lastIndex", currentSongIndex);

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

/* =========================================
   3. PLAYLIST & SEARCH
   ========================================= */
function renderPlaylist(filter = "") {
  songList.innerHTML = "";
  loadedCount = 0;
  const query = filter.toLowerCase();

  filterSongs = songs
    .map((song, idx) => ({ ...song, originalIndex: idx }))
    .filter(song => {
      const title = (song.title || "").toLowerCase();
      const artist = (song.artist || "").toLowerCase();
      const album = (song.album || "").toLowerCase();
      const genre = (song.genre || "").toLowerCase();
      const file = (song.file || "").toLowerCase();

      return (
        title.includes(query) ||
        artist.includes(query) ||
        album.includes(query) ||
        genre.includes(query) ||
        file.includes(query)
      );
    });

  loadMoreSongs();
  if (currentSongIndex !== -1) {
    ensureActiveSongVisible();
  }
}

function loadMoreSongs() {
  const nextSongs = filterSongs.slice(loadedCount, loadedCount + SONGS_PER_LOAD);
  nextSongs.forEach(song => {
    const li = document.createElement("li");
    li.setAttribute("data-index", song.originalIndex);
    li.innerHTML = `<span>${getFileName(song.file)}</span>`;
    li.addEventListener("click", () => {
      currentSongIndex = song.originalIndex;
      playSong();
    });
    songList.appendChild(li);
  });
  loadedCount += nextSongs.length;
  highlightActive(false);
}

function ensureActiveSongVisible() {
  const isSongInFilter = filterSongs.some(s => s.originalIndex === currentSongIndex);
  if (!isSongInFilter) return;

  while (!songList.querySelector(`li[data-index="${currentSongIndex}"]`) && loadedCount < filterSongs.length) {
    loadMoreSongs();
  }
  highlightActive(true);
}

function highlightActive(shouldScroll = false) {
  const listItems = songList.querySelectorAll("li");
  listItems.forEach((li) => {
    const idx = parseInt(li.getAttribute("data-index"));
    if (idx === currentSongIndex) {
      li.classList.add("active-song");
      if (shouldScroll) li.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      li.classList.remove("active-song");
    }
  });
}

/* =========================================
   4. CONTROLS & EVENTS
   ========================================= */
function playNext() {
  const activeList = filterSongs.length > 0 ? filterSongs : songs.map((s, i) => ({...s, originalIndex: i}));
  let currentIndexInActiveList = activeList.findIndex(s => s.originalIndex === currentSongIndex);

  if (isShuffled) {
    currentIndexInActiveList = Math.floor(Math.random() * activeList.length);
  } else {
    currentIndexInActiveList = (currentIndexInActiveList + 1) % activeList.length;
  }

  currentSongIndex = activeList[currentIndexInActiveList].originalIndex;
  playSong();
}

function playPrev() {
  const activeList = filterSongs.length > 0 ? filterSongs : songs.map((s, i) => ({...s, originalIndex: i}));
  let currentIndexInActiveList = activeList.findIndex(s => s.originalIndex === currentSongIndex);

  currentIndexInActiveList = (currentIndexInActiveList - 1 + activeList.length) % activeList.length;
  
  currentSongIndex = activeList[currentIndexInActiveList].originalIndex;
  playSong();
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
    const song = songs[currentSongIndex];
    startScrollingTitle(`🎶 ${song.title} - ${song.artist || "Unknown"} `);
  }
  toggleIcons();
});

btnNext.addEventListener("click", playNext);
btnPrev.addEventListener("click", playPrev);

searchInput.addEventListener("input", () => {
  renderPlaylist(searchInput.value);
  btnClearSearch.style.display = searchInput.value ? "block" : "none";
});

btnClearSearch.addEventListener("click", () => {
  searchInput.value = "";
  renderPlaylist();
  btnClearSearch.style.display = "none";
  setTimeout(() => ensureActiveSongVisible(), 100);
});

isShuffled = localStorage.getItem("isShuffled") === "true";
isRepeating = localStorage.getItem("isRepeating") === "true";
btnShuffle.classList.toggle("active-control", isShuffled);
btnRepeat.classList.toggle("active-control", isRepeating);

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

/* =========================================
   5. VIDEO ROTATION (FIXED ID)
   ========================================= */
function changeVideo() {
    const vContainer = document.getElementById('video-container');
    const vSource = document.getElementById('video-source');
    const vElement = document.getElementById('bg-video');

    if (!vContainer || !vSource || !vElement) return;

    vContainer.style.opacity = '0';

    setTimeout(() => {
        currentVideoIndex = (currentVideoIndex + 1) % videoList.length;
        vSource.src = videoList[currentVideoIndex];
        vElement.load();
        
        vElement.addEventListener('canplay', function startPlay() {
            vElement.play();
            vContainer.style.opacity = '1';
            vElement.removeEventListener('canplay', startPlay);
        }, { once: true });
    }, 1500); 
}

setInterval(changeVideo, 300000);

function forcePlayVideo() {
    if (videoElement) {
        videoElement.play().catch(() => {
            const playOnGesture = () => {
                videoElement.play();
                document.removeEventListener('click', playOnGesture);
                document.removeEventListener('touchstart', playOnGesture);
            };
            document.addEventListener('click', playOnGesture);
            document.addEventListener('touchstart', playOnGesture);
        });
    }
}

forcePlayVideo();

/* =========================================
   6. UTILITIES (UI, TOAST, SCROLL)
   ========================================= */
function toggleIcons() {
  iconPlay.style.display = isPlaying ? "none" : "inline";
  iconPause.style.display = isPlaying ? "inline" : "none";

  // UPDATE MEDIA SESSION STATE
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }
}

function updateNowPlayingUI(song) {
  document.getElementById("song-artist").textContent = song.artist || "Unknown";
  document.getElementById("song-album").textContent = song.album || "Unknown";
  document.getElementById("song-genre").textContent = song.genre || "Unknown";
  
  const cover = document.getElementById("cover-art");
  if (song.cover) {
    cover.src = song.cover;
    cover.style.display = "block";
    updateFavicon(song.cover);
  }

  // ENHANCED MEDIA SESSION API
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist || "Unknown",
      album: song.album || "Unknown",
      artwork: [
        { src: song.cover || 'covers/default.jpg', sizes: '512x512', type: 'image/png' }
      ]
    });

    // Handlers agar tombol di Lock Screen & TWS berfungsi
    navigator.mediaSession.setActionHandler('play', () => {
      audio.play();
      isPlaying = true;
      toggleIcons();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audio.pause();
      isPlaying = false;
      toggleIcons();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrev());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime) audio.currentTime = details.seekTime;
    });
  }
}

function startScrollingTitle(text) {
  clearInterval(scrollTitleInterval);
  scrollTitleOffset = 0;
  scrollTitleInterval = setInterval(() => {
    const scrollText = text.substring(scrollTitleOffset) + "  " + text.substring(0, scrollTitleOffset);
    document.title = scrollText;
    scrollTitleOffset = (scrollTitleOffset + 1) % text.length;
  }, 250);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.innerHTML = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2000);
}

audio.addEventListener("timeupdate", () => {
  const progress = (audio.currentTime / audio.duration) * 100 || 0;
  seek.value = progress;
  seek.style.backgroundSize = progress + '% 100%';
  durationText.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration || 0)}`;
  
  if (!audio.seeking && !audio.paused) {
    localStorage.setItem("lastTime", audio.currentTime.toString());
  }
});

seek.addEventListener("input", () => {
  audio.currentTime = (seek.value / 100) * audio.duration;
  seek.style.backgroundSize = seek.value + '% 100%';
});

audio.addEventListener("ended", () => isRepeating ? audio.play() : playNext());

function formatTime(seconds) {
  const min = Math.floor(seconds / 60) || 0;
  const sec = Math.floor(seconds % 60) || 0;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function getFileName(path) {
  return path.split('/').pop().replace(/\.[^/.]+$/, '');
}

function updateFavicon(url) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  link.href = url;
}

songList.addEventListener("scroll", () => {
  if (songList.scrollTop + songList.clientHeight >= songList.scrollHeight - 50) {
    if (loadedCount < filterSongs.length) {
      loadMoreSongs();
    }
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => console.log(err));
}
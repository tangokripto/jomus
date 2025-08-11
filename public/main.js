// main.js - FINAL (lazy-load, auto-scroll highlight, search, save state)
// ===================================================================

// ====================
// STATE & DOM ELEMENTS
// ====================
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
const coverArt = document.getElementById("cover-art");

let songs = [];            // semua lagu dari songs.json
let filteredSongs = [];    // hasil filter (search)
let currentIndex = 0;      // index di songs (originalIndex)
let isPlaying = false;
let isShuffled = false;
let isRepeating = false;
let scrollTitleInterval = null;
let scrollTitleOffset = 0;

// Lazy-load config
const SONGS_PER_BATCH = 10;
let loadedCount = 0;       // berapa item sudah dirender di UI

// ====================
// [FUNC] Util: safeGet
// ====================
function safeGet(id) {
  return document.getElementById(id);
}

// ====================
// [FUNC] Fetch & Init
// - Ambil songs.json, set states dari localStorage, render awal
// ====================
function init() {
  fetch("songs.json")
    .then(res => res.json())
    .then(data => {
      songs = Array.isArray(data) ? data : [];
      // pastikan terurut (opsional) agar konsisten
      songs.sort((a, b) => (a.artist || "").toLowerCase().localeCompare((b.artist || "").toLowerCase()));

      // restore saved states
      const savedIndex = parseInt(localStorage.getItem("lastIndex"));
      const savedTime = parseFloat(localStorage.getItem("lastTime"));
      const savedShuffle = localStorage.getItem("shuffle") === "true";
      const savedRepeat = localStorage.getItem("repeat") === "true";

      if (!isNaN(savedIndex)) currentIndex = savedIndex;
      if (!isNaN(savedTime)) audio.currentTime = savedTime;
      isShuffled = savedShuffle;
      isRepeating = savedRepeat;
      btnShuffle.classList.toggle("active", isShuffled);
      btnRepeat.classList.toggle("active", isRepeating);

      // initial filter (empty = all)
      filteredSongs = songs.map((s, i) => ({ ...s, originalIndex: i }));
      loadedCount = 0;
      renderPlaylist(); // render first batch
      // if a saved index exists, load metadata for that song (but don't autoplay)
      if (songs[currentIndex]) loadSong(currentIndex, true);
    })
    .catch(err => {
      console.error("Failed to load songs.json", err);
    });
}

// ====================
// [FUNC] Toggle Clear Search Button Visibility
// ====================
function toggleClearButton() {
  btnClearSearch.style.display = searchInput.value ? "block" : "none";
}

// ====================
// [FUNC] Render Playlist (reset + prepare filteredSongs)
// - tidak mengubah scroll if caller wants to preserve
// ====================
function renderPlaylist(filter = "") {
  // preserve scrollTop only when filter is different? we'll reset because search changes list.
  songList.innerHTML = "";
  loadedCount = 0;

  const q = (filter || "").toLowerCase();
  filteredSongs = songs
    .map((song, idx) => ({ ...song, originalIndex: idx }))
    .filter(s => {
      if (!q) return true;
      return (
        (s.title || "").toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q) ||
        (s.album || "").toLowerCase().includes(q) ||
        (s.genre || "").toLowerCase().includes(q) ||
        (s.file || "").toLowerCase().includes(q)
      );
    });

  loadMoreSongs(); // load first batch
}

// ====================
// [FUNC] Load More Songs (lazy-load batch)
// - After appended, check if currentIndex is within new batch and auto-highlight+scroll
// ====================
function loadMoreSongs() {
  if (!filteredSongs || !filteredSongs.length) return;

  const start = loadedCount;
  const end = Math.min(loadedCount + SONGS_PER_BATCH, filteredSongs.length);
  const batch = filteredSongs.slice(start, end);

  const fragment = document.createDocumentFragment();
  batch.forEach((song, idx) => {
    const li = document.createElement("li");
    // tag data for mapping back to filteredSongs index and originalIndex
    li.dataset.filteredIndex = start + idx;
    li.dataset.originalIndex = song.originalIndex;
    li.innerHTML = `
      <div class="flex flex-col">
        <span class="text-xs text-zinc-400">${getFileName(song.file)}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      // set currentIndex to originalIndex (global songs index)
      currentIndex = song.originalIndex;
      playSong();
      // highlight and scroll to current song soon (will work even if item not yet in DOM)
      highlightActive();
      scrollToCurrentSong(false);
    });
    fragment.appendChild(li);
  });

  songList.appendChild(fragment);
  loadedCount = end;

  // update highlight for items rendered so far
  highlightActive();

  // If the currently playing song is inside this newly added batch, ensure it's visible
  const activeInBatch = batch.some(s => s.originalIndex === currentIndex);
  if (activeInBatch) {
    // small timeout to ensure DOM painted
    requestAnimationFrame(() => {
      highlightActive();
      scrollToCurrentSong(true);
    });
  }
}

// ====================
// [FUNC] Get file name (without extension)
// ====================
function getFileName(path = "") {
  const name = (path + "").split("/").pop() || "";
  return name.replace(/\.[^/.]+$/, "");
}

// ====================
// [FUNC] Scroll To Current Song
// - autoScroll param controls whether scroll happens
// ====================
function scrollToCurrentSong(autoScroll = true) {
  if (!autoScroll) return;
  // find corresponding li with data-original-index === currentIndex
  const items = [...songList.querySelectorAll("li")];
  const target = items.find(li => Number(li.dataset.originalIndex) === Number(currentIndex));
  if (target) {
    try {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      // fallback
      target.scrollIntoView();
    }
  }
}

// ====================
// [FUNC] Highlight Active Song
// - toggles .active class on visible list items
// ====================
function highlightActive() {
  const lis = [...songList.children];
  lis.forEach((li, visibleIdx) => {
    const realIdx = Number(li.dataset.originalIndex);
    if (realIdx === Number(currentIndex)) {
      li.classList.add("active");
    } else {
      li.classList.remove("active");
    }
  });
}

// ====================
// [FUNC] Load Song (set src, restore resume time optionally)
// - DOES NOT autoplay unless playSong calls audio.play()
// ====================
function loadSong(index, resume = false) {
  const song = songs[index];
  if (!song) return;

  nowPlaying.textContent = "⏳ Loading ...";
  document.title = "Loading...";

  // stop previous
  audio.pause();
  audio.removeAttribute("src");
  audio.load();

  // set new src
  if (!audio.src || audio.src !== song.url) {
    audio.src = song.url;
  }

  // when ready, restore time if requested and update UI
  audio.addEventListener("canplay", function onCanPlay() {
    audio.removeEventListener("canplay", onCanPlay);
    const savedIndex = parseInt(localStorage.getItem("lastIndex"));
    const savedTime = parseFloat(localStorage.getItem("lastTime"));

    if (resume && index === savedIndex && !isNaN(savedTime)) {
      audio.currentTime = savedTime;
    }

    nowPlaying.textContent = " 🎵 " + (song.title || song.file || "Unknown");
    const fullTitle = `🎵 ${song.title || "Unknown"} - ${song.artist || "Unknown"}`;
    startScrollingTitle(fullTitle);

    updateNowPlayingUI(song);

    // ensure visible and highlighted
    highlightActive();
    // If the currently active item hasn't been rendered yet (lazy), attempt to bring it into view by loading more batches until found
    ensureActiveVisible();
  });
}

// ====================
// [FUNC] Play Song
// - fade in volume
// ====================
function playSong(resume = false) {
  loadSong(currentIndex, resume);
  audio.volume = 0;
  const playPromise = audio.play();
  // handle autoplay rejection gracefully
  if (playPromise && typeof playPromise.then === "function") {
    playPromise.then(() => {
      isPlaying = true;
      toggleIcons();
      localStorage.setItem("lastIndex", currentIndex);
      // fade in
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
    }).catch(e => {
      // autoplay blocked — update state but don't crash
      isPlaying = !audio.paused;
      toggleIcons();
    });
  } else {
    isPlaying = true;
    toggleIcons();
    localStorage.setItem("lastIndex", currentIndex);
  }
}

// ====================
// [FUNC] Play Next
// ====================
function playNext() {
  if (isShuffled) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    // move in filtered list context: find its position in filteredSongs then next
    const posInFiltered = filteredSongs.findIndex(s => s.originalIndex === currentIndex);
    if (posInFiltered >= 0) {
      const nextPos = (posInFiltered + 1) % filteredSongs.length;
      currentIndex = filteredSongs[nextPos].originalIndex;
    } else {
      currentIndex = (currentIndex + 1) % songs.length;
    }
  }
  playSong();
}

// ====================
// [FUNC] Play Previous
// ====================
function playPrev() {
  if (isShuffled) {
    currentIndex = Math.floor(Math.random() * songs.length);
  } else {
    const posInFiltered = filteredSongs.findIndex(s => s.originalIndex === currentIndex);
    if (posInFiltered >= 0) {
      const prevPos = (posInFiltered - 1 + filteredSongs.length) % filteredSongs.length;
      currentIndex = filteredSongs[prevPos].originalIndex;
    } else {
      currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    }
  }
  playSong();
}

// ====================
// [FUNC] Toggle Icons (play/pause UI)
// ====================
function toggleIcons() {
  iconPlay.style.display = isPlaying ? "none" : "inline";
  iconPause.style.display = isPlaying ? "inline" : "none";
}

// ====================
// [FUNC] Format Time mm:ss
// ====================
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ====================
// [FUNC] Update Now Playing UI & MediaSession
// ====================
function updateNowPlayingUI(song) {
  durationText.textContent = "0:00";
  if (song.cover) {
    coverArt.src = song.cover;
    coverArt.style.display = "block";
    updateFavicon(song.cover);
    generateFaviconFromImage(song.cover);
  } else {
    coverArt.style.display = "none";
  }

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'Unknown',
        artist: song.artist || 'Unknown',
        album: song.album || '',
        artwork: [{ src: song.cover || '', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', playPrev);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    } catch (e) {
      // ignore if browser doesn't support settings
    }
  }
}

// ====================
// [FUNC] Update Favicon (simple swap with cache buster)
// ====================
function updateFavicon(url) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url + "?v=" + Date.now();
}

// ====================
// [FUNC] Generate Favicon From Image (canvas)
// ====================
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

// ====================
// [FUNC] Start Scrolling Title (document.title marquee)
// ====================
function startScrollingTitle(text) {
  clearInterval(scrollTitleInterval);
  scrollTitleOffset = 0;
  scrollTitleInterval = setInterval(() => {
    const scrollText = text.substring(scrollTitleOffset) + " • " + text.substring(0, scrollTitleOffset);
    document.title = scrollText;
    scrollTitleOffset = (scrollTitleOffset + 1) % text.length;
  }, 250);
}

// ====================
// [FUNC] Ensure Active Visible
// - If active song not rendered yet (lazy), load more batches until visible (with cap to avoid infinite loop)
// ====================
function ensureActiveVisible() {
  // If already visible, nothing to do
  const items = [...songList.querySelectorAll("li")];
  const visibleIndexes = items.map(li => Number(li.dataset.originalIndex));
  if (visibleIndexes.includes(currentIndex)) {
    // highlight + scroll
    highlightActive();
    scrollToCurrentSong(true);
    return;
  }

  // Otherwise, progressively load more until we either render the active item or exhaust
  let attempts = 0;
  const maxAttempts = Math.ceil(filteredSongs.length / SONGS_PER_BATCH) + 2;
  (function tryLoad() {
    if (attempts++ > maxAttempts) return;
    // find position of active in filteredSongs
    const pos = filteredSongs.findIndex(s => s.originalIndex === currentIndex);
    if (pos === -1) return; // not in filtered set
    const neededBatches = Math.floor((pos) / SONGS_PER_BATCH) + 1;
    // load until loadedCount covers pos
    if (loadedCount <= pos) {
      loadMoreSongs();
      // use rAF to let DOM update then check again
      requestAnimationFrame(() => {
        const itemsNow = [...songList.querySelectorAll("li")];
        const visibleNow = itemsNow.map(li => Number(li.dataset.originalIndex));
        if (visibleNow.includes(currentIndex)) {
          highlightActive();
          scrollToCurrentSong(true);
        } else {
          // try again
          setTimeout(tryLoad, 40);
        }
      });
    } else {
      // already should be visible
      highlightActive();
      scrollToCurrentSong(true);
    }
  })();
}

// ====================
// [FUNC] Save Player State (last index/time/shuffle/repeat)
// ====================
function savePlayerState() {
  localStorage.setItem("lastIndex", currentIndex.toString());
  localStorage.setItem("lastTime", audio.currentTime.toString());
  localStorage.setItem("shuffle", isShuffled ? "true" : "false");
  localStorage.setItem("repeat", isRepeating ? "true" : "false");
}

// ====================
// EVENT BINDINGS
// ====================
btnPlay.addEventListener("click", () => {
  if (!songs.length) return;
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    clearInterval(scrollTitleInterval);
    localStorage.setItem("lastTime", audio.currentTime.toString());
  } else {
    // try to play current — ensure source loaded first
    // If source is not set we should loadSong then play
    if (!audio.src) {
      playSong(true);
    } else {
      audio.play().catch(() => { /* autoplay block */ });
      isPlaying = true;
      const song = songs[currentIndex] || {};
      startScrollingTitle(`🎵 ${song.title || "Unknown"} - ${song.artist || "Unknown"} 🎶`);
    }
  }
  toggleIcons();
});

btnNext.addEventListener("click", () => {
  playNext();
  savePlayerState();
});
btnPrev.addEventListener("click", () => {
  playPrev();
  savePlayerState();
});

btnShuffle.addEventListener("click", () => {
  isShuffled = !isShuffled;
  btnShuffle.classList.toggle("active", isShuffled);
  localStorage.setItem("shuffle", isShuffled ? "true" : "false");
});

btnRepeat.addEventListener("click", () => {
  isRepeating = !isRepeating;
  btnRepeat.classList.toggle("active", isRepeating);
  localStorage.setItem("repeat", isRepeating ? "true" : "false");
});

// audio events
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
  durationText.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  if (!audio.seeking && !audio.paused) {
    localStorage.setItem("lastTime", audio.currentTime.toString());
  }
});

seek.addEventListener("input", () => {
  if (audio.duration) audio.currentTime = (seek.value / 100) * audio.duration;
});

// search events
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

// lazy load on scroll of list container
songList.addEventListener("scroll", () => {
  if (songList.scrollTop + songList.clientHeight >= songList.scrollHeight - 10) {
    loadMoreSongs();
  }
});

// save position periodically (throttle could be added)
window.addEventListener("beforeunload", () => {
  savePlayerState();
});

// ====================
// [FUNC] Register Service Worker (PWA) - optional
// ====================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ Service Worker registered'))
      .catch(err => console.error('❌ SW failed:', err));
  });
}

// ====================
// START
// ====================
init();

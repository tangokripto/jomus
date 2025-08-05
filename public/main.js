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
const tabAll = document.getElementById("tab-all");
const tabArtist = document.getElementById("tab-artist");
const artistList = document.getElementById("artist-list");
const viewArtists = document.getElementById("view-artists");
const viewSongs = document.getElementById("view-songs");


let currentIndex = 0;
let isRepeating = false;
let isPlaying = false;
let isShuffled = false;
let songs = [];
let filterSongs = [];
let scrollTitleInterval;
let scrollTitleOffset = 0;
let lazyBatchSize = 20;
let lazyLoaded = 0;
let lazyFilter = "";

fetch("songs.json")
  .then(res => res.json())
  .then(data => {
    songs = data.sort((a, b) => a.artist.localeCompare(b.artist));
    const saved = localStorage.getItem("lastIndex");
    currentIndex = saved ? parseInt(saved) : 0;
    renderPlaylist();
    loadSong(currentIndex, true);
  });

function renderPlaylist(filter = "") {
  songList.innerHTML = "";
  lazyLoaded = 0;
  lazyFilter = filter;
  filterSongs = songs.map((s, i) => ({ ...s, originalIndex: i }))
    .filter(s => {
      const q = filter.toLowerCase();
      return (
        s.title?.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        s.album?.toLowerCase().includes(q) ||
        s.genre?.toLowerCase().includes(q) ||
        s.file?.toLowerCase().includes(q)
      );
    });
  loadMoreSongs();
}

function loadMoreSongs() {
  const next = filterSongs.slice(lazyLoaded, lazyLoaded + lazyBatchSize);
  next.forEach(song => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="flex flex-col">
      <span class="text-xs text-zinc-400">${getFileName(song.file)}</span>
    </div>`;
    li.addEventListener("click", () => {
      currentIndex = song.originalIndex;
      playSong();
    
      // Hanya reset playlist jika filter berubah
      if (searchInput.value !== lazyFilter) {
        renderPlaylist(searchInput.value);
      } else {
        highlightActive();
        scrollToCurrentSong(false);
      }
    });
    songList.appendChild(li);
  });
  lazyLoaded += lazyBatchSize;
  highlightActive();
}

function getFileName(path) {
  return path.split("/").pop().replace(/\.[^/.]+$/, "");
}

function highlightActive() {
  [...songList.children].forEach((li, idx) => {
    const realIdx = filterSongs[idx]?.originalIndex;
    li.classList.toggle("active", realIdx === currentIndex);
  });
}

function scrollToCurrentSong(auto = true) {
  const active = songList.querySelector("li.active");
  if (active && auto) active.scrollIntoView({ behavior: "smooth", block: "center" });
}

function toggleIcons() {
  iconPlay.style.display = isPlaying ? "none" : "inline";
  iconPause.style.display = isPlaying ? "inline" : "none";
}

function formatTime(s) {
  const min = Math.floor(s / 60) || 0;
  const sec = Math.floor(s % 60) || 0;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function loadSong(index, resume = false) {
  const song = songs[index];
  if (!song) return;
  nowPlaying.textContent = "⏳ Loading ...";
  document.title = "Loading...";

  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio.src = song.url;

  audio.addEventListener("canplay", function onReady() {
    audio.removeEventListener("canplay", onReady);
    const savedTime = parseFloat(localStorage.getItem("lastTime"));
    const savedIndex = parseInt(localStorage.getItem("lastIndex"));

    if (resume && index === savedIndex && !isNaN(savedTime)) {
      audio.currentTime = savedTime;
    }

    nowPlaying.textContent = "🎵 " + song.title;
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
  currentIndex = isShuffled ? Math.floor(Math.random() * songs.length) : (currentIndex + 1) % songs.length;
  playSong();
}

function playPrev() {
  currentIndex = (currentIndex - 1 + songs.length) % songs.length;
  playSong();
}

audio.addEventListener("ended", () => {
  isRepeating ? audio.play() : playNext();
});

audio.addEventListener("timeupdate", () => {
  seek.value = (audio.currentTime / audio.duration) * 100 || 0;
  durationText.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  if (!audio.paused && !audio.seeking) {
    localStorage.setItem("lastTime", audio.currentTime.toString());
  }
});

seek.addEventListener("input", () => {
  audio.currentTime = (seek.value / 100) * audio.duration;
});

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
    startScrollingTitle(`🎵 ${song.title} - ${song.artist || "Unknown"} 🎶`);
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

searchInput.addEventListener("input", () => {
  renderPlaylist(searchInput.value);
  toggleClearButton();
});
btnClearSearch.addEventListener("click", () => {
  searchInput.value = "";
  renderPlaylist();
  toggleClearButton();
});
function toggleClearButton() {
  btnClearSearch.style.display = searchInput.value ? "block" : "none";
}
toggleClearButton();

function startScrollingTitle(text) {
  clearInterval(scrollTitleInterval);
  scrollTitleOffset = 0;
  scrollTitleInterval = setInterval(() => {
    const scroll = text.substring(scrollTitleOffset) + " • " + text.substring(0, scrollTitleOffset);
    document.title = scroll;
    scrollTitleOffset = (scrollTitleOffset + 1) % text.length;
  }, 250);
}

function updateNowPlayingUI(song) {
  durationText.textContent = "0:00";
  const cover = document.getElementById("cover-art");
  if (song.cover) {
    cover.src = song.cover;
    cover.style.display = "block";
    generateFaviconFromImage(song.cover);
  } else {
    cover.style.display = "none";
  }

  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || "Unknown",
      artist: song.artist || "Unknown",
      album: song.album || "",
      artwork: [{ src: song.cover, sizes: "512x512", type: "image/png" }],
    });

    navigator.mediaSession.setActionHandler("play", () => audio.play());
    navigator.mediaSession.setActionHandler("pause", () => audio.pause());
    navigator.mediaSession.setActionHandler("previoustrack", playPrev);
    navigator.mediaSession.setActionHandler("nexttrack", playNext);
  }
}

function generateFaviconFromImage(url) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    canvas.getContext("2d").drawImage(img, 0, 0, 64, 64);
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

songList.addEventListener("scroll", () => {
  const nearBottom = songList.scrollTop + songList.clientHeight >= songList.scrollHeight - 100;
  if (nearBottom && lazyLoaded < filterSongs.length) {
    loadMoreSongs();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then(() => console.log("✅ Service Worker registered"))
      .catch(err => console.error("❌ SW failed:", err));
  });
}
/* TAB artist */
tabAll.addEventListener("click", () => {
  tabAll.classList.add("active");
  tabArtist.classList.remove("active");
  artistList.classList.add("hidden");
  songList.classList.remove("hidden");
  renderPlaylist(searchInput.value);
});

tabArtist.addEventListener("click", () => {
  tabArtist.classList.add("active");
  tabAll.classList.remove("active");
  artistList.classList.remove("hidden");
  songList.classList.add("hidden");
  renderArtistList();
});

function renderArtistList() {
  const uniqueArtists = [...new Set(songs.map(song => song.artist || "Unknown"))];
  artistList.innerHTML = "";

  uniqueArtists.sort().forEach(artist => {
    const div = document.createElement("div");
    div.textContent = artist;
    div.classList.add("cursor-pointer", "py-1", "hover:underline", "text-sm", "text-zinc-300");
    div.addEventListener("click", () => {
      searchInput.value = artist;
      toggleClearButton();
      tabAll.click();
      setTimeout(() => renderPlaylist(artist), 10);
    });    
    artistList.appendChild(div);
  });
}

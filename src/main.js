const songList = document.getElementById("song-list");
const audio = document.getElementById("audio");
const nowPlaying = document.getElementById("now-playing");
const searchInput = document.getElementById("search");

let songs = [];

// Ambil songs.json
fetch("songs.json")
  .then((res) => res.json())
  .then((data) => {
    songs = data;
    renderSongs(songs);
  });

function renderSongs(list) {
  songList.innerHTML = "";
  list.forEach((song, index) => {
    const li = document.createElement("li");
    li.textContent = song.title;
    li.addEventListener("click", () => playSong(song));
    songList.appendChild(li);
  });
}

function playSong(song) {
  nowPlaying.textContent = "🎧 Sedang diputar: " + song.title;
  audio.src = song.url;
  audio.play();
}

// Fitur pencarian
searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.toLowerCase();
  const filtered = songs.filter(s => s.title.toLowerCase().includes(keyword));
  renderSongs(filtered);
});

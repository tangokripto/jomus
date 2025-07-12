const CACHE_NAME = "spotify-kw-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/main.js",
  "/songs.json",
  "/icon-192.png",
  "/icon-512.png",
  "/default.jpg"
];

// Tambahkan semua file lagu MP3 ke cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return fetch("/songs.json")
        .then(res => res.json())
        .then(songs => {
          const mp3s = songs.map(s => s.url);
          return cache.addAll([...urlsToCache, ...mp3s]);
        });
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).catch(() =>
          event.request.destination === "document"
            ? caches.match("/index.html")
            : undefined
        )
      );
    })
  );
});

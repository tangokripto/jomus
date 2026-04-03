const CACHE_NAME = "Jomusic-cache-v6"; // Versi naik ke v6 untuk mereset cache lama
const STATIC_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/main.js",
  "/songs.json",
  "/covers/default.jpg",
  "https://f003.backblazeb2.com/file/music-pribadi/tyler-lastovich-hM08wZJBlK4-unsplash.webp"
];

const VIDEO_ASSETS = [
  'https://f003.backblazeb2.com/file/music-pribadi/evelyn.3840x2160.mp4',
  'https://f003.backblazeb2.com/file/music-pribadi/hunt-showdown-death-roots.3840x2160.mp4',
  'https://f003.backblazeb2.com/file/music-pribadi/hunt-showdown-veil-of-thorns.3840x2160.mp4',
  'https://f003.backblazeb2.com/file/music-pribadi/the-shadow-fantasy-king-moewalls-com.mp4'
];

// 1. Install Event: Simpan aset awal ke cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching Core & Videos...");
      return cache.addAll([...STATIC_CACHE, ...VIDEO_ASSETS]);
    })
  );
  self.skipWaiting();
});

// 2. Fetch Event: Logika cerdas pemisahan songs.json dengan aset statis
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // STRATEGI KHUSUS UNTUK songs.json (Network First)
  if (url.pathname.endsWith('songs.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Jika berhasil konek ke internet, update cache dengan data terbaru
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          // Jika gagal (offline), ambil cadangan dari cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // STRATEGI UNTUK ASET LAIN (Cache First)
  event.respondWith(
    caches.match(event.request).then(response => {
      // Jika ada di cache pakai cache, jika tidak baru fetch internet
      return response || fetch(event.request).catch(() => {
        // Fallback jika user sedang offline dan mencoba akses halaman utama
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});

// 3. Activate Event: Bersihkan cache versi lama
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});
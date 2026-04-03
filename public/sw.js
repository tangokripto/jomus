const CACHE_NAME = "Jomusic-cache-v6";
const MUSIC_CACHE_NAME = "Jomusic-songs-cache"; // Cache khusus file mp3
const MAX_AGE = 24 * 60 * 60 * 1000; // Batas simpan: 6 Jam (dalam milidetik)

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

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([...STATIC_CACHE, ...VIDEO_ASSETS]))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // 1. LOGIKA KHUSUS FILE MUSIK (.mp3 / .m4a)
  if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.m4a')) {
    event.respondWith(
      caches.open(MUSIC_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            // Cek umur cache
            const dateHeader = cachedResponse.headers.get('date');
            const age = Date.now() - new Date(dateHeader).getTime();

            if (age < MAX_AGE) {
              return cachedResponse; // Masih fresh, ambil dari cache
            }
          }

          // Jika tidak ada di cache atau sudah kadaluarsa, fetch baru
          return fetch(event.request).then(networkResponse => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 2. LOGIKA songs.json (Network First - Seperti sebelumnya)
  if (url.pathname.endsWith('songs.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. LOGIKA ASET STATIS (Cache First)
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

// Bersihkan cache lama dan cache musik yang sudah basi saat SW aktif
self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== MUSIC_CACHE_NAME)
            .map(key => caches.delete(key))
      )),
      // Pembersihan otomatis file musik lama
      caches.open(MUSIC_CACHE_NAME).then(cache => {
        cache.keys().then(requests => {
          requests.forEach(request => {
            cache.match(request).then(response => {
              const date = response.headers.get('date');
              if (Date.now() - new Date(date).getTime() > MAX_AGE) {
                cache.delete(request);
              }
            });
          });
        });
      })
    ])
  );
  self.clients.claim();
});
const CACHE_NAME = "Jomusic-cache-v0.4";
const STATIC_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/main.js",
  "/songs.json",
  "/manifest.json",
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
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching Core & Videos...");
      return cache.addAll([...STATIC_CACHE, ...VIDEO_ASSETS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Audio files - always network first with cache fallback
  if (url.pathname.endsWith('.mp3') || url.pathname.endsWith('.m4a') || url.pathname.endsWith('.flac')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Don't cache audio files (too large), just stream
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request);
        })
    );
    return;
  }

  const updateFiles = ['songs.json', 'style.css', 'main.js', 'index.html', 'manifest.json'];
  const isNetworkFirst = updateFiles.some(file => url.pathname.endsWith(file)) || url.pathname === '/';

  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        if (event.request.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Handle messages from main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync for offline playback (experimental)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-playback-state') {
    event.waitUntil(syncPlaybackState());
  }
});

async function syncPlaybackState() {
  // Placeholder for syncing playback state when back online
  console.log('Syncing playback state...');
}
const CACHE_NAME = "Jomusic-cache-v3";
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
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching Core & Videos...");
      return cache.addAll([...STATIC_CACHE, ...VIDEO_ASSETS]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith('songs.json', 'style.css', 'main.js')) {
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
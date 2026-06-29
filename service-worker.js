const CACHE_NAME = "triad-learning-trainer-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function putInCache(request, response) {
  if (response && response.ok && response.type === "basic") {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

// 应用外壳走 network-first：发布到 GitHub Pages 后，联网时总能拿到最新版本，
// 离线时回退到缓存（导航请求回退到 index.html）。
function networkFirst(request) {
  return fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")));
}

// 图标、manifest 等静态资源走 cache-first，省流量、能离线。
function cacheFirst(request) {
  return caches.match(request).then((cached) => cached || fetch(request).then((response) => putInCache(request, response)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // 不拦截跨域请求（例如 GitHub Gist API），避免把同步数据缓存成旧版本。
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || /\.(?:html|js|css)$/.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

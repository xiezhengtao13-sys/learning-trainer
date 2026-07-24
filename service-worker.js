// 改动 app.js / styles.css / 数据文件后把这里 +1，旧缓存会在 activate 时清掉。
// 页面会通过 GET_VERSION 消息读这个值显示在「设置 → 关于」，所以它是权威的缓存版本号，
// 不要在 app.js 里另外抄一份常量（会漂移）。
const CACHE_NAME = "triad-learning-trainer-v14";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data/minna-lessons.js",
  "./data/ai-generated-readings.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  // 这里不调 skipWaiting：新版本先停在 waiting 状态，页面检测到后提示用户，
  // 用户点「立即更新」才发 SKIP_WAITING 激活。iOS 主屏 App 靠这条路更新，
  // 不用再删除图标重新添加（删了会连 localStorage 里的 token 一起没）。
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  // 页面问「你是哪个缓存版本」，用 MessageChannel 回一个。
  if (event.data.type === "GET_VERSION" && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ cacheName: CACHE_NAME });
  }
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


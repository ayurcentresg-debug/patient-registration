// AYUR GATE Service Worker — PWA offline mode
// Bump CACHE_NAME on every meaningful release so old caches are evicted.
const CACHE_NAME = "ayurgate-v3-2026-04-28";
const OFFLINE_URL = "/offline";

// App shell: precached on install so the app loads even without network.
const PRECACHE_URLS = [
  "/dashboard",
  "/login",
  "/help",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

// ─── Install: precache the app shell ─────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {/* tolerate 404s */}))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches ───────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch strategies ────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GETs
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // 1. API routes: network-only (data must always be fresh).
  //    On failure, return a structured JSON so the UI can show "offline".
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: "offline", message: "You appear to be offline. Reconnect and retry." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // 2. Next.js static assets (_next/static): cache-first (immutable, hashed)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response("", { status: 503 }))
      )
    );
    return;
  }

  // 3. Images / icons / fonts: cache-first
  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response("", { status: 503 }))
      )
    );
    return;
  }

  // 4. HTML page navigations: network-first with cache fallback,
  //    then offline page if neither has it
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) =>
            cached || caches.match(OFFLINE_URL) || new Response("Offline", { status: 503 })
          )
        )
    );
    return;
  }
});

// ─── Receive 'skipWaiting' message from page (for forced update) ─────
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

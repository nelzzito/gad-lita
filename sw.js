// 🔹 Versión automática (evita conflictos siempre)
const CACHE_NAME = 'gad-Lita-' + Date.now();

// 🔹 Solo archivos estáticos (NO HTML dinámico)
const STATIC_ASSETS = [
  './',
  './index.html',
  './main.js',
  './manifest.json',
  './logo.png'
];

// 🔹 INSTALACIÓN
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 🔹 ACTIVACIÓN (limpia versiones viejas)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 🔹 FETCH (network-first INTELIGENTE)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // ❌ NO cachear Supabase ni APIs
  if (url.includes('supabase.co')) return;

  // ❌ NO cachear HTML dinámico (evita bugs)
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ✅ Estrategia: network first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
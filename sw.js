const CACHE_NAME = 'gad-lita-v1';
const ASSETS = [
  './',
  './index.html',
  './logo.png',
  './manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activación y limpieza de caché antigua
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activado');
});

// ESTO ES LO QUE ACTIVA EL LOGO: El evento fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
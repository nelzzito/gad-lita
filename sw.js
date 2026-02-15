const CACHE_NAME = 'gad-lita-plus-v4'; // Versión limpia

const assets = [
  '/',
  '/index.html',
  '/main.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com'
];

// 1. INSTALACIÓN: Guarda solo lo estrictamente necesario
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ SW V4: Caché de seguridad preparada');
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN: Elimina cualquier rastro de V1, V2 o V3
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. ESTRATEGIA: Network First (Priorizar red para evitar código viejo)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // No interferir con las subidas de Supabase (importante para las fotos)
  if (event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si hay red, actualizamos la caché con lo más nuevo
        const resClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          if (!event.request.url.includes('chrome-extension')) {
            cache.put(event.request, resClone);
          }
        });
        return response;
      })
      .catch(() => {
        // Si falla la red (offline), entregar lo que tengamos en caché
        return caches.match(event.request);
      })
  );
});
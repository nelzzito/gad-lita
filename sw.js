const CACHE_NAME = 'gad-lita-plus-v3'; // Subimos a V3

const assets = [
  './',
  './index.html',
  './main.js',
  './style.css',
  './logo.png',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Cache V3: Guardando recursos críticos');
      return cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  // Toma el control de la página inmediatamente
  self.clients.claim();
});

// 3. ESTRATEGIA DE CARGA (Cache First para rapidez)
self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET (no subidas a Supabase)
  if (event.request.method !== 'GET') return;

  // No cachear llamadas directas a la API de Supabase para que no haya datos viejos
  if (event.request.url.includes('supabase.co') && !event.request.url.includes('js')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Si está en caché, lo entrega. Si no, va a la red y lo guarda.
      return response || fetch(event.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          // Guardamos dinámicamente cualquier cosa de Tailwind o fuentes
          if (event.request.url.includes('cdn') || event.request.url.includes('fonts')) {
            cache.put(event.request.url, fetchRes.clone());
          }
          return fetchRes;
        });
      }).catch(() => {
        // Si no hay red y es la página principal, entregar el index
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
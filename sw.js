const CACHE_NAME = 'gad-lita-plus-v2'; // Cambié a V2 para forzar al celular a actualizarse

const assets = [
  './',
  './index.html',
  './main.js',
  './style.css',
  './logo.png',
  './manifest.json',
  // LIBRERÍAS EXTERNAS (Crucial para que no se dañe el diseño)
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
];

// 1. INSTALACIÓN
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache actualizado: Guardando diseño y librerías');
      return cache.addAll(assets);
    })
  );
  self.skipWaiting(); // Obliga al nuevo Service Worker a activarse de inmediato
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
});

// 3. ESTRATEGIA DE CARGA
self.addEventListener('fetch', event => {
  // Ignorar peticiones de subida de datos a Supabase (eso lo maneja el main.js)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(response => {
      // Devuelve lo que hay en memoria, si no está, va a internet
      return response || fetch(event.request).then(fetchRes => {
        return caches.open(CACHE_NAME).then(cache => {
          // Si es un recurso nuevo que no estaba en la lista, lo guarda para la próxima
          if (event.request.url.includes('cdn') || event.request.url.includes('googleapis')) {
             cache.put(event.request.url, fetchRes.clone());
          }
          return fetchRes;
        });
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
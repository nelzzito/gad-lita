const CACHE_NAME = 'gad-lita-v5'; // <--- Recuerda subir el número (v3, v4...) para que el navegador detecte el cambio

// Archivos básicos para que la app cargue sin internet (Mantenemos tus rutas exactas)
const assets = [
  './',
  './index.html',
  './main.js',
  './manifest.json',
  './logo.png'
];

// 1. INSTALACIÓN: Guarda los archivos en el caché del dispositivo
self.addEventListener('install', event => {
  self.skipWaiting(); // <--- AÑADIDO: Fuerza a la nueva versión a instalarse de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache abierto: Archivos guardados');
      return cache.addAll(assets);
    })
  );
});

// 2. ACTIVACIÓN: Elimina versiones antiguas del caché para evitar conflictos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  return self.clients.claim(); // <--- AÑADIDO: Toma el control de la página de inmediato sin esperar a reiniciar
});

// 3. ESTRATEGIA DE CARGA (FETCH): (Mantenemos tu lógica original exacta)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // NO tocar Supabase
  if (url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Guardar copia en cache (actualizada)
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Si no hay internet, usa cache
        return caches.match(event.request);
      })
  );
});
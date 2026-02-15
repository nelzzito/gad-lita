const CACHE_NAME = 'gad-lita-v2';

// Archivos básicos para que la app cargue sin internet
const assets = [
  './',
  './index.html',
  './main.js',
  './manifest.json',
  './logo.png'
];

// 1. INSTALACIÓN: Guarda los archivos en el caché del dispositivo
self.addEventListener('install', event => {
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
});

// 3. ESTRATEGIA DE CARGA (FETCH):
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // EXCEPCIÓN CRÍTICA: Si la petición va hacia Supabase (Base de Datos o Storage), 
  // NO debe pasar por el caché. Esto permite que las subidas (POST) no fallen.
  if (url.includes('supabase.co')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Devuelve el archivo si está en caché, de lo contrario lo busca en internet
      return response || fetch(event.request).catch(() => {
        console.log("Modo offline: Archivo no disponible en caché.");
      });
    })
  );
});
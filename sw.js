const CACHE_NAME = 'gad-lita-plus-v1';

// Archivos críticos que se guardarán para funcionar sin internet
const assets = [
  './',
  './index.html',
  './main.js',
  './style.css',
  './logo.png', // Asegúrate de que el nombre coincida con tu archivo
  './manifest.json'
];

// 1. INSTALACIÓN: Guarda los archivos en la memoria del celular/PC
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Cache abierto: Guardando archivos para modo offline');
      return cache.addAll(assets);
    })
  );
});

// 2. ACTIVACIÓN: Limpia versiones viejas de la app
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. ESTRATEGIA DE CARGA: ¿De dónde saco la información?
self.addEventListener('fetch', event => {
  // EXCEPCIÓN: Si la petición es para Supabase, NO usar caché (dejar que main.js lo maneje)
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Si está en caché, lo devuelve. Si no, lo busca en internet.
      return response || fetch(event.request).catch(() => {
        // Si falla internet y no está en caché (ej. una imagen externa), no hace nada
        console.log("Archivo no encontrado en caché y no hay internet.");
      });
    })
  );
});
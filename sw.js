self.addEventListener('fetch', (event) => {
  // Este código permite que el navegador reconozca la App como instalable
  event.respondWith(fetch(event.request));
});
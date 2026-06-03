// HemoPocket — Service Worker
// Estrategia: network-first para HTML/JSON (siempre la última versión), cache fallback offline.
// Estática (CSS/JS/imágenes): cache-first.
// Versión: bump para forzar actualización de los clientes.

const CACHE = 'hemopocket-v49';
const APP_SHELL = ['/', '/index.html', '/HemoPocket_app.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(APP_SHELL).catch(() => null))
  );
  // NO skipWaiting aquí: dejamos que la versión nueva quede "esperando" para
  // que la app muestre el aviso "Actualizar". Al pulsarlo, la app envía
  // 'skipWaiting' (ver abajo) y la versión vieja se reemplaza automáticamente.
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  // 1. HTML / navegación: network-first con fallback a cache.
  // Fallback: primero la URL exacta, luego /HemoPocket_app.html (el app shell principal),
  // así evitamos servir la página de redirect como fallback y que cause un bucle.
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(req)
            .then(r => r || caches.match('/HemoPocket_app.html'))
            .then(r => r || caches.match('/'))
        )
    );
    return;
  }

  // 2. Mismo origen (CSS/JS/iconos/PDFs): cache-first
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 3. Cross-origin (Gist, PDFs en raw.githubusercontent): solo pasarelaje, ya se cachea en IndexedDB de la app
  // No interferimos para no romper CORS.
});

// Permite refrescar desde la app cuando hay una nueva versión
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

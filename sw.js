// HemoPocket — Service Worker
// Estrategia: network-first para HTML/JSON (siempre la última versión), cache fallback offline.
// Estática (CSS/JS/imágenes): cache-first.
// Versión: bump para forzar actualización de los clientes.

const CACHE = 'hemopocket-v82';
// El recurso crítico es HemoPocket_app.html (app autocontenida). El resto son auxiliares.
// pdf.min.js se auto-aloja y se precachea para que el visor de PDF funcione sin conexión.
const APP_SHELL = ['/HemoPocket_app.html', '/manifest.json', '/', '/index.html', '/vendor/pdfjs/pdf.min.js'];

// Guarda una respuesta en caché de forma segura. Si la respuesta venía de una
// redirección (típico en Vercel para "/" e "/index.html"), la reconstruimos:
// servir una respuesta "redirected" a una navegación falla y rompe el offline.
async function safePut(cache, req, resp) {
  try {
    if (!resp || !resp.ok || resp.type === 'opaque') return;
    if (resp.redirected) {
      const body = await resp.blob();
      await cache.put(req, new Response(body, { status: 200, statusText: 'OK', headers: resp.headers }));
    } else {
      await cache.put(req, resp);
    }
  } catch (e) { /* nunca dejamos que un fallo de caché rompa la respuesta */ }
}

self.addEventListener('install', e => {
  // Cacheo INDIVIDUAL (no addAll atómico): que el fallo de una URL no impida cachear el resto.
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(APP_SHELL.map(u =>
        fetch(u, { cache: 'reload' }).then(r => safePut(c, u, r)).catch(() => null)
      ))
    )
  );
  // skipWaiting AQUÍ: la versión nueva se activa de inmediato sin esperar a que se
  // cierren todas las ventanas. Imprescindible para PWA de escritorio que el usuario
  // mantiene abiertas: sin esto, la versión nueva quedaba "esperando" indefinidamente
  // y esos equipos nunca se actualizaban. La página recarga al recibir 'controllerchange'.
  self.skipWaiting();
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
  if (isHTML) {
    e.respondWith(
      // cache:'no-store' evita que la caché HTTP del navegador devuelva un HTML
      // viejo: forzamos siempre la última versión de la red cuando hay conexión.
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => safePut(c, req, copy));
          return resp;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true })
            .then(r => r || caches.match('/HemoPocket_app.html'))
            .then(r => r || caches.match('/'))
            .then(r => r || new Response(
              '<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;text-align:center;padding:40px;color:#333"><h2>Sin conexión</h2><p>Abre HemoPocket una vez con conexión para guardarla en el dispositivo.</p></body>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            ))
        )
    );
    return;
  }

  // 1b. hemopocket.json (estructura de guías/sync): network-first, fallback a caché.
  // Así el sync siempre ve la última versión en vez de una copia cacheada.
  if (sameOrigin && url.pathname.endsWith('hemopocket.json')) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => safePut(c, req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 1c. SDK de Firebase (gstatic.com/firebasejs/...): cache-first CROSS-ORIGIN.
  // Imprescindible para offline: Firebase se importa desde Google; si no lo
  // guardamos, sin conexión el módulo de login no carga y la app queda inutilizable.
  // gstatic envía CORS, así que la respuesta es 'cors' (no opaca) y se puede cachear.
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') !== -1) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => safePut(c, req, copy));
          return resp;
        });
      })
    );
    return;
  }

  // 2. Mismo origen (CSS/JS/iconos/PDFs locales): cache-first
  if (sameOrigin) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => safePut(c, req, copy));
          return resp;
        }).catch(() => cached);
      })
    );
    return;
  }

  // 3. Cross-origin (pdf.js CDN, PDFs en raw.githubusercontent): no interferimos (CORS).
});

// Permite refrescar desde la app cuando hay una nueva versión
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

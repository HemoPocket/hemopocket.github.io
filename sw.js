// HemoPocket — Service Worker
// Estrategia: network-first para HTML/JSON (siempre la última versión), cache fallback offline.
// Estática (CSS/JS/imágenes): cache-first.
// Versión: bump para forzar actualización de los clientes.

const CACHE = 'hemopocket-v84';
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
              `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HemoPocket — Sin conexión</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#eef1f5;color:#333;padding:24px">
<div style="max-width:380px;text-align:center">
<svg width="64" height="64" viewBox="0 0 100 100" fill="#c41e3a" style="margin-bottom:8px" aria-hidden="true"><path d="M22 4C32 4 40 12 40 22C40 35 27 42 27 50C27 58 40 65 40 78C40 88 32 96 22 96C12 96 4 88 4 78C4 65 17 58 17 50C17 42 4 35 4 22C4 12 12 4 22 4Z"/><path d="M78 4C88 4 96 12 96 22C96 35 83 42 83 50C83 58 96 65 96 78C96 88 88 96 78 96C68 96 60 88 60 78C60 65 73 58 73 50C73 42 60 35 60 22C60 12 68 4 78 4Z"/><circle cx="50" cy="50" r="17"/></svg>
<h1 style="font-size:1.25rem;margin:.4rem 0;color:#c41e3a">HemoPocket — Sin conexión</h1>
<p style="font-size:.95rem;line-height:1.6">Parece que es la primera vez que abres HemoPocket en este dispositivo y ahora no hay conexión.</p>
<p style="font-size:.95rem;line-height:1.6"><strong>Ábrela una vez con Internet</strong> (wifi o datos) y deja pasar unos segundos: se guardará en el dispositivo y, a partir de entonces, <strong>funcionará sin conexión</strong>.</p>
<button onclick="location.reload()" style="margin-top:12px;background:#c41e3a;color:#fff;border:none;border-radius:8px;padding:.6rem 1.3rem;font-size:.95rem;cursor:pointer">Reintentar</button>
</div></body></html>`,
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

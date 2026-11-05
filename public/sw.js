// ============================================================================
// CROW COMICS — Service Worker (PWA: instalable + lectura offline)
//
// Estrategia:
// - Navegaciones (recargas / rutas de la SPA): red primero; si no hay red,
//   sirve el app shell cacheado ("/") para que la app abra sin internet.
// - Assets propios (JS/CSS con hash, iconos): caché primero — si ya los
//   tienes, no se piden de nuevo.
// - Fuentes de Google: caché primero para que el look sobreviva sin red.
// - API de Supabase y cualquier otro cruce de origen: SIEMPRE red (datos
//   frescos). Si el fetch de Supabase falla por estar offline, la app
//   cae al respaldo local del catálogo (localStorage) por su cuenta.
// ============================================================================

const VERSION = 'v3';
const SHELL_CACHE = `crow-shell-${VERSION}`;
const RUNTIME_CACHE = `crow-runtime-${VERSION}`;

// App shell: lo mínimo para abrir la web sin conexión.
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/crow-emblem.png',
  '/crow-192.png',
  '/crow-512.png',
  '/favicon.svg',
];

// Instalación: precarga del shell y toma el control apenas pueda.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activación: borra cachés de versiones anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/** ¿Es una fuente de Google (CSS u archivo de fuente)? */
const isGoogleFont = (url) =>
  url.origin === 'https://fonts.googleapis.com' ||
  url.origin === 'https://fonts.gstatic.com';

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo GET: nunca tocar POST/PATCH/DELETE (escrituras a Supabase).
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ── Navegación de la SPA: red primero, shell cacheado de respaldo ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Guarda la respuesta fresca para futuras visitas offline.
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached ?? Response.error())),
    );
    return;
  }

  // Supabase (REST/storage/auth): red directa, sin caché.
  if (url.hostname.endsWith('supabase.co')) return;

  // Mismo origen (assets con hash, iconos) o fuentes de Google: caché primero.
  if (url.origin === self.location.origin || isGoogleFont(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            // Solo cachea respuestas válidas.
            if (response && (response.ok || response.type === 'opaque')) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached ?? Response.error());
      }),
    );
  }
});

// Service worker : l'application s'ouvre même si le hub redémarre ou si le Wi-Fi hoquette.
// Statique en « stale-while-revalidate », jamais d'/api en cache.
const VERSION = 'mc-os-v3.0.1';
const CORE = [
  '/', '/index.html', '/nuage.html', '/contact.html', '/master.html', '/mur.html',
  '/css/os.css', '/css/mur.css',
  '/js/app.js', '/js/attract.js', '/js/hub.js', '/js/ui.js', '/js/data.js', '/js/mur.js',
  '/js/views/regie.js', '/js/views/contacts.js', '/js/views/capture.js', '/js/views/mur.js', '/js/views/book.js',
  '/js/views/devis.js', '/js/views/scene.js', '/js/views/elec.js', '/js/views/pass.js',
  '/js/vendor/qrcode.js', '/js/vendor/jsqr.js', '/js/vendor/three.js',
  '/fonts/jost.woff2', '/fonts/jbmono-400.woff2', '/fonts/jbmono-500.woff2', '/fonts/jbmono-600.woff2', '/fonts/jbmono-700.woff2',
  '/assets/logo-m.svg', '/assets/logo-mediascene.png', '/mediacom.vcf', '/manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const key = url.pathname === '/' ? '/index.html' : url.pathname;
    const cached = await cache.match(key);
    const network = fetch(e.request).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    return (await network) || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});

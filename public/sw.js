// Service worker : l'application s'ouvre même si le hub redémarre ou si le Wi-Fi hoquette.
// Pages, scripts et styles : réseau d'abord (un correctif est pris dès le lancement suivant),
// cache en secours. Polices, photos, icônes et bibliothèques : cache d'abord. Jamais d'/api.
const VERSION = 'mc-os-v4.0.1';
const CORE = [
  '/', '/nuage', '/contact', '/master', '/mur', '/ecran',
  '/css/os.css', '/css/mur.css',
  '/js/app.js', '/js/attract.js', '/js/hub.js', '/js/ui.js', '/js/data.js', '/js/mur.js',
  '/js/views/regie.js', '/js/views/contacts.js', '/js/views/capture.js', '/js/views/mur.js', '/js/views/book.js',
  '/js/views/scene.js', '/js/views/pass.js',
  '/bilan', '/js/vendor/qrcode.js', '/js/vendor/jsqr.js', '/js/vendor/three.js',
  '/fonts/jost.woff2', '/fonts/jbmono-400.woff2', '/fonts/jbmono-500.woff2', '/fonts/jbmono-600.woff2', '/fonts/jbmono-700.woff2',
  '/assets/logo-m.svg', '/assets/logo-mediascene.png', '/mediacom.vcf', '/manifest.webmanifest',
];
const ALIASES = { '/bilan': '/bilan', '/': '/index.html', '/mur': '/mur.html', '/ecran': '/mur.html', '/nuage': '/nuage.html', '/live': '/nuage.html', '/master': '/master.html', '/contact': '/contact.html' };
const STATIC = /^\/(fonts|assets\/(?!videos)|icons|js\/vendor)/; // vidéos : servies par plages, hors cache
// Clé de cache : une adresse courte (/mur) et son fichier (/mur.html) partagent la même entrée
const keyOf = (p) => ALIASES[p] || p;
// Une réponse partielle (206, vidéo) ou une redirection ne doit jamais être mise en cache telle quelle
const clean = async (res) => (res.status === 206 || res.redirected ? new Response(res.body, { status: res.status === 206 ? 200 : res.status, headers: res.headers }) : res);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(CORE.map(async (u) => {
    try { const r = await clean(await fetch(u, { cache: 'no-store' })); if (r.ok) await c.put(keyOf(u), r); } catch { /* repris au premier usage */ }
  }))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/assets/videos/') || url.pathname === '/setup' || url.pathname === '/setup.html') return;
  const key = keyOf(url.pathname);
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (STATIC.test(key)) {
      const hit = await cache.match(key);
      if (hit) return hit;
      const res = await clean(await fetch(e.request));
      if (res.ok) cache.put(key, res.clone());
      return res;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      // Une requête de navigation ne peut pas être recopiée avec des options : on repart de son URL
      const res = await clean(await fetch(url.href, { signal: ctrl.signal, credentials: 'same-origin' }));
      clearTimeout(timer);
      if (res.ok) cache.put(key, res.clone());
      return res;
    } catch {
      return (await cache.match(key)) || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

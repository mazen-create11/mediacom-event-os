/**
 * Médiacom Event OS — hub du stand.
 * Un Mac (ou un PC) sur le Wi-Fi du stand lance `node server.js` : il sert l'application,
 * stocke les contacts dans data/db.json et synchronise toutes les tablettes en temps réel (SSE).
 * Zéro dépendance npm. Aucun accès internet requis.
 */
'use strict';

const http = require('http');
const https = require('https');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || PORT + 443;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data'); // DATA_DIR : hub de test séparé
const CARDS = path.join(DATA, 'cards');
fs.mkdirSync(CARDS, { recursive: true });

/* ---------- Configuration & stockage ---------- */

const CONFIG_FILE = path.join(DATA, 'config.json');
const DB_FILE = path.join(DATA, 'db.json');

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

const config = readJSON(CONFIG_FILE, null) || { token: crypto.randomBytes(9).toString('base64url') };
fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

const BAK_FILE = path.join(DATA, 'db.bak.json');

// Une base illisible n'est jamais écrasée : elle est mise de côté et le hub repart de la sauvegarde.
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return readJSON(BAK_FILE, {});
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    const keep = path.join(DATA, `db.illisible-${Date.now()}.json`);
    fs.renameSync(DB_FILE, keep);
    const bak = readJSON(BAK_FILE, null);
    console.error(`[hub] data/db.json illisible, mis de côté dans ${path.basename(keep)}. ${bak ? 'Reprise sur la sauvegarde db.bak.json.' : 'Pas de sauvegarde : les tablettes renverront leurs contacts.'}`);
    return bak || {};
  }
}

const db = Object.assign(
  {
    leads: [],
    words: [],
    deleted: {},
    wall: { scene: 'cloud', accept: true, message: '', question: '', photo: 'scene-m-rouge', updatedAt: 0 },
    settings: { eventName: 'Salon', wifiSsid: '', wifiPass: '', publicUrl: '' },
    tarifs: null,
  },
  loadDB()
);

let saveTimer = null;
let saveError = null;
let lastSaveAlert = 0;
function writeNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  const tmp = DB_FILE + '.tmp';
  try {
    const fd = fs.openSync(tmp, 'w');
    fs.writeSync(fd, JSON.stringify(db));
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fs.renameSync(tmp, DB_FILE);
    saveError = null;
  } catch (e) {
    saveError = e.message;
    console.error('[hub] écriture de la base impossible :', e.message);
    if (Date.now() - lastSaveAlert > 60000) {
      lastSaveAlert = Date.now();
      broadcast('alert', { from: 'Hub', text: 'Le Mac du hub n’arrive plus à enregistrer (disque plein ?). Exportez le CSV maintenant.', to: 'all', at: Date.now() }, { staffOnly: true });
    }
  }
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeNow, 250);
}
// Sauvegarde tournante, seulement à partir d'un fichier relu avec succès
setInterval(() => {
  try { JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); fs.copyFileSync(DB_FILE, BAK_FILE); } catch { /* rien à sauvegarder */ }
}, 120000);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => { if (saveTimer) writeNow(); process.exit(0); });
}

/* ---------- Temps réel (Server-Sent Events) ---------- */

const clients = new Set(); // { res, staff, device, op, kind }

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data, { staffOnly = false } = {}) {
  for (const c of clients) {
    if (staffOnly && !c.staff) continue;
    send(c.res, event, data);
  }
}

function presence() {
  const seen = new Map();
  for (const c of clients) {
    if (!c.staff || !c.device) continue;
    seen.set(c.device, { device: c.device, op: c.op, kind: c.kind, since: c.since });
  }
  return [...seen.values()];
}

function publicWall() {
  return { wall: db.wall, words: db.words.filter((w) => !w.hidden), eventName: db.settings.eventName };
}

// Purge du limiteur de débit (des centaines de téléphones passent dans la journée)
setInterval(() => {
  const now = Date.now();
  for (const [ip, r] of rate) if (now - r.last > 600000) rate.delete(ip);
}, 300000);

process.on('uncaughtException', (e) => console.error('[hub] erreur non gérée', e));
process.on('unhandledRejection', (e) => console.error('[hub] promesse rejetée', e));

setInterval(() => {
  for (const c of clients) c.res.write(`event: ping\ndata: ${Date.now()}\n\n`);
}, 15000);

/* ---------- Sécurité ---------- */

function isLocal(req) {
  const a = req.socket.remoteAddress || '';
  if (a !== '127.0.0.1' && a !== '::1' && a !== '::ffff:127.0.0.1') return false;
  // Un tunnel (cloudflared, ngrok…) arrive lui aussi par 127.0.0.1 : il ajoute ces en-têtes ou un autre Host
  const h = req.headers;
  if (h['x-forwarded-for'] || h['cf-connecting-ip'] || h['x-real-ip'] || h.forwarded) return false;
  const host = String(h.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function tokenOf(req, url) {
  const h = req.headers['x-stand-token'];
  if (h) return h;
  const q = url.searchParams.get('t');
  if (q) return q;
  const m = /(?:^|;\s*)mc_t=([^;]+)/.exec(req.headers.cookie || '');
  return m ? decodeURIComponent(m[1]) : '';
}

function isStaff(req, url) {
  return isLocal(req) || tokenOf(req, url) === config.token;
}

// Limiteur de débit des mots visiteurs : 1 envoi / 2,5 s et 25 / 10 min par IP
const rate = new Map();
function rateOk(ip) {
  const now = Date.now();
  const r = rate.get(ip) || { last: 0, hits: [] };
  r.hits = r.hits.filter((t) => now - t < 600000);
  if (now - r.last < 2500 || r.hits.length >= 25) return false;
  r.last = now;
  r.hits.push(now);
  rate.set(ip, r);
  return true;
}

const BLOCKED = /\b(merde|putain|putes?|connard|connasse|encul\w*|salope|batard|niquer?|nique|ntm|fdp|tg|pd|bite|couilles?|chatte|nazi|hitler|negro|bougnoul\w*|youpin|pede|tapette|enfoire)\b/i;
function cleanWord(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  if (text.length < 2) return { error: 'Mot trop court' };
  if (/(https?:|www\.|\.[a-z]{2,4}\b|@)/i.test(text)) return { error: 'Les liens ne sont pas acceptés' };
  if (BLOCKED.test(text.normalize('NFD').replace(/[̀-ͯ]/g, ''))) return { error: 'Ce mot ne peut pas être affiché' };
  return { text };
}

/* ---------- Utilitaires HTTP ---------- */

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req, limit = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  }
  return out;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.vcf': 'text/vcard; charset=utf-8', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
};

const ALIASES = { '/': '/index.html', '/mur': '/mur.html', '/display.html': '/mur.html', '/nuage': '/nuage.html', '/client.html': '/nuage.html',
  '/master': '/master.html', '/bilan': '/bilan.html', '/contact': '/contact.html', '/setup': '/setup.html' };

function serveStatic(req, res, pathname) {
  pathname = ALIASES[pathname] || pathname;
  let file;
  try { file = path.join(PUBLIC, decodeURIComponent(pathname)); } catch { res.writeHead(400); return res.end(); }
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Introuvable');
    }
    const etag = `"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304); return res.end(); }
    const ext = path.extname(file).toLowerCase();
    const longCache = /\/(fonts|assets|js\/vendor|icons)\//.test(pathname);
    // Lecture par plages : indispensable pour que Safari (iPad, iPhone) lise les vidéos
    const range = req.headers.range;
    if (range && /^bytes=\d*-\d*$/.test(range)) {
      const [a0, b0] = range.slice(6).split('-');
      let start = a0 === '' ? st.size - Number(b0) : Number(a0);
      let end = a0 !== '' && b0 !== '' ? Number(b0) : st.size - 1;
      end = Math.min(end, st.size - 1);
      if (!(start >= 0) || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${st.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Content-Length': end - start + 1,
        'Accept-Ranges': 'bytes',
        ETag: etag,
        'Cache-Control': longCache ? 'public, max-age=604800' : 'no-cache',
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, {
      'Accept-Ranges': 'bytes',
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      ETag: etag,
      'Cache-Control': longCache ? 'public, max-age=604800' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function csvCell(v) {
  let s = Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

/* ---------- Logique métier ---------- */

const LOCKED = ['operator', 'transfer', 'history', 'createdAt', 'capturedBy'];
function upsertLead(input) {
  if (!input || typeof input.id !== 'string' || !/^[\w-]{4,64}$/.test(input.id)) throw new Error('id_invalide');
  if (db.deleted[input.id]) { const e = new Error('supprimé'); e.code = 410; throw e; }
  const prev = db.leads.find((l) => l.id === input.id);
  const patch = { ...input };
  if (prev) for (const k of LOCKED) delete patch[k]; // seul /api/transfer change le suivi
  const lead = Object.assign({}, prev || {}, patch, { updatedAt: Date.now() });
  if (!lead.createdAt) lead.createdAt = lead.updatedAt;
  if (typeof lead.cardPhoto === 'string' && lead.cardPhoto.startsWith('data:image/jpeg;base64,')) {
    fs.writeFileSync(path.join(CARDS, `${lead.id}.jpg`), Buffer.from(lead.cardPhoto.split(',')[1], 'base64'));
    lead.cardPhoto = `/api/cards/${lead.id}.jpg`;
  }
  delete lead.cardPhotoPending;
  if (prev) db.leads[db.leads.indexOf(prev)] = lead;
  else db.leads.unshift(lead);
  save();
  return lead;
}

/* ---------- HTTPS local ----------
 * Safari (iPad) n'autorise caméra en direct, presse-papiers et cache hors-ligne qu'en HTTPS.
 * Le hub fabrique sa propre autorité de certification (une fois) et un certificat serveur
 * pour ses adresses du moment (régénéré si l'adresse Wi-Fi change). Chaque iPad installe
 * l'autorité une seule fois : /mediacom-ca.crt, puis Réglages › Général › Informations ›
 * Réglages des certificats. Les visiteurs restent en HTTP. HTTPS=0 pour désactiver. */
const CERTS = path.join(DATA, 'certs');
function opensslBin() {
  for (const b of ['/opt/homebrew/bin/openssl', '/usr/local/bin/openssl', '/usr/bin/openssl', 'openssl']) {
    try { execFileSync(b, ['version'], { stdio: 'ignore' }); return b; } catch { /* suivant */ }
  }
  return null;
}
function ensureCerts() {
  if (process.env.HTTPS === '0') return null;
  const bin = opensslBin();
  if (!bin) return null;
  fs.mkdirSync(CERTS, { recursive: true });
  const f = (n) => path.join(CERTS, n);
  const run = (args) => execFileSync(bin, args, { stdio: 'ignore' });
  try {
    if (!fs.existsSync(f('ca.crt'))) {
      fs.writeFileSync(f('ca.cnf'), '[req]\ndistinguished_name=dn\nx509_extensions=v3_ca\nprompt=no\n[dn]\nCN=Mediacom Stand CA\nO=Mediacom\n[v3_ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\n');
      run(['req', '-x509', '-new', '-nodes', '-newkey', 'rsa:2048', '-sha256', '-days', '3650', '-keyout', f('ca.key'), '-out', f('ca.crt'), '-config', f('ca.cnf')]);
    }
    const ips = ['127.0.0.1', ...lanAddresses()];
    const want = JSON.stringify(ips);
    if (!fs.existsSync(f('server.crt')) || readJSON(f('ips.json'), '') !== want) {
      fs.writeFileSync(f('srv.cnf'), '[req]\ndistinguished_name=dn\nprompt=no\n[dn]\nCN=mediacom.local\nO=Mediacom\n');
      fs.writeFileSync(f('srv.ext'), `basicConstraints=CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,DNS:mediacom.local,${ips.map((i) => 'IP:' + i).join(',')}\n`);
      run(['req', '-new', '-nodes', '-newkey', 'rsa:2048', '-keyout', f('server.key'), '-out', f('server.csr'), '-config', f('srv.cnf')]);
      run(['x509', '-req', '-in', f('server.csr'), '-CA', f('ca.crt'), '-CAkey', f('ca.key'), '-CAcreateserial', '-out', f('server.crt'), '-days', '800', '-sha256', '-extfile', f('srv.ext')]);
      fs.writeFileSync(f('ips.json'), JSON.stringify(want));
    }
    return { key: fs.readFileSync(f('server.key')), cert: fs.readFileSync(f('server.crt')), ca: fs.readFileSync(f('ca.crt')) };
  } catch (e) {
    console.error('[hub] HTTPS indisponible :', e.message);
    return null;
  }
}
const tls = ensureCerts();

/* ---------- Routeur ---------- */

async function handler(req, res) {
  try {
    await route(req, res);
  } catch (e) {
    console.error('[hub]', req.method, req.url, e.message);
    if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Requête invalide');
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;
  const staff = isStaff(req, url);

  // Appairage : /?t=JETON pose le cookie. L'URL garde le jeton pour que l'icône « écran d'accueil »
  // d'iOS (stockage séparé de Safari) reste appairée à chaque lancement.
  if (req.method === 'GET' && url.searchParams.get('t') === config.token && !p.startsWith('/api/')) {
    res.setHeader('Set-Cookie', `mc_t=${encodeURIComponent(config.token)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`);
  }

  if (p === '/mediacom-ca.crt') {
    if (!tls) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert', 'Content-Disposition': 'attachment; filename="mediacom-ca.crt"' });
    return res.end(tls.ca);
  }

  if (!p.startsWith('/api/')) return serveStatic(req, res, p);

  try {
    /* --- Public --- */
    if (p === '/api/health') return json(res, 200, { ok: !saveError, staff, time: Date.now(), saveError: staff ? saveError : undefined });

    if (p === '/api/info') {
      const lan = lanAddresses();
      const host = lan[0] || 'localhost';
      const base = db.settings.publicUrl || `http://${host}:${PORT}`;
      const secureBase = tls ? `https://${host}:${HTTPS_PORT}` : null;
      return json(res, 200, {
        base, secureBase, lan, port: PORT, eventName: db.settings.eventName,
        caUrl: tls ? `http://${host}:${PORT}/mediacom-ca.crt` : null,
        wifi: db.settings.wifiSsid ? { ssid: db.settings.wifiSsid, pass: db.settings.wifiPass } : null,
        pairUrl: staff ? `${secureBase || base}/?t=${config.token}` : undefined,
        pairUrlHttp: staff ? `${base}/?t=${config.token}` : undefined,
      });
    }

    if (p === '/api/wall' && req.method === 'GET') {
      return json(res, 200, { question: db.wall.question || '', accept: db.wall.accept !== false, eventName: db.settings.eventName });
    }

    if (p === '/api/wall/stream' || (p === '/api/stream' && req.method === 'GET')) {
      const wantsStaff = p === '/api/stream';
      if (wantsStaff && !staff) return json(res, 401, { error: 'appairage requis' });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('retry: 2000\n\n');
      const c = {
        res, staff: wantsStaff,
        device: (url.searchParams.get('device') || '').slice(0, 40),
        op: (url.searchParams.get('op') || '').slice(0, 20),
        kind: (url.searchParams.get('kind') || 'tablet').slice(0, 12),
        since: Date.now(),
      };
      clients.add(c);
      if (wantsStaff) {
        send(res, 'hello', { leads: db.leads, deleted: Object.keys(db.deleted), words: db.words, wall: db.wall, settings: db.settings, tarifs: db.tarifs, presence: presence(), serverTime: Date.now() });
        broadcast('presence', presence(), { staffOnly: true });
      } else {
        send(res, 'wall', publicWall());
      }
      req.on('close', () => {
        clients.delete(c);
        if (wantsStaff) broadcast('presence', presence(), { staffOnly: true });
      });
      return;
    }

    if (p === '/api/words' && req.method === 'POST') {
      if (!db.wall.accept) return json(res, 423, { error: 'Le mur est en pause, réessayez dans un instant' });
      const ip = req.socket.remoteAddress || '?';
      if (!staff && !rateOk(ip)) return json(res, 429, { error: 'Doucement, un mot toutes les quelques secondes' });
      const { text, error } = cleanWord((await readBody(req, 4096)).text);
      if (error) return json(res, 422, { error });
      const key = text.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');
      let w = db.words.find((x) => x.key === key);
      if (w) { w.count += 1; w.at = Date.now(); }
      else { w = { id: crypto.randomUUID().slice(0, 8), key, text, count: 1, hidden: false, at: Date.now() }; db.words.push(w); }
      save();
      broadcast('words', db.words.filter((x) => !x.hidden));
      broadcast('words:all', db.words, { staffOnly: true });
      if (!w.hidden) broadcast('word', w);
      return json(res, 200, { ok: true, word: w });
    }

    /* --- Équipe uniquement --- */
    if (!staff) return json(res, 401, { error: 'appairage requis' });

    if (p === '/api/token/rotate' && req.method === 'POST') {
      const { device } = await readBody(req, 4096);
      config.token = crypto.randomBytes(9).toString('base64url');
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      for (const c of clients) if (c.staff && c.device !== device) { send(c.res, 'revoked', {}); c.res.end(); clients.delete(c); }
      res.setHeader('Set-Cookie', `mc_t=${encodeURIComponent(config.token)}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`);
      return json(res, 200, { ok: true, token: config.token });
    }

    if (p === '/api/state') return json(res, 200, { leads: db.leads, words: db.words, wall: db.wall, settings: db.settings, tarifs: db.tarifs, presence: presence() });

    if (p.startsWith('/api/cards/')) {
      const id = path.basename(p);
      if (!/^[\w-]+\.jpg$/.test(id)) return json(res, 400, { error: 'nom' });
      return fs.createReadStream(path.join(CARDS, id)).on('error', () => json(res, 404, {})).pipe(res);
    }

    if (p === '/api/leads' && req.method === 'POST') {
      let lead;
      try { lead = upsertLead(await readBody(req)); } catch (e) {
        if (e.code === 410) return json(res, 410, { error: 'contact supprimé' });
        throw e;
      }
      broadcast('lead', lead, { staffOnly: true });
      return json(res, 200, { ok: true, lead });
    }

    let m;
    if ((m = /^\/api\/leads\/([\w-]+)$/.exec(p)) && req.method === 'DELETE') {
      db.leads = db.leads.filter((l) => l.id !== m[1]);
      db.deleted[m[1]] = Date.now();
      fs.rm(path.join(CARDS, `${m[1]}.jpg`), { force: true }, () => {});
      save();
      broadcast('lead:delete', { id: m[1] }, { staffOnly: true });
      return json(res, 200, { ok: true });
    }

    if (p === '/api/transfer' && req.method === 'POST') {
      const { leadId, from, to, note } = await readBody(req);
      const lead = db.leads.find((l) => l.id === leadId);
      if (!lead) return json(res, 404, { error: 'contact introuvable' });
      const t = { from: String(from || ''), to: String(to || ''), note: String(note || '').slice(0, 280), at: Date.now(), ack: false };
      lead.operator = t.to;
      lead.transfer = t;
      lead.history = [...(lead.history || []), { type: 'transfer', ...t }];
      lead.updatedAt = Date.now();
      save();
      broadcast('lead', lead, { staffOnly: true });
      broadcast('transfer', { lead, ...t }, { staffOnly: true });
      return json(res, 200, { ok: true, lead });
    }

    if ((m = /^\/api\/leads\/([\w-]+)\/ack$/.exec(p)) && req.method === 'POST') {
      const lead = db.leads.find((l) => l.id === m[1]);
      if (lead?.transfer) { lead.transfer.ack = true; lead.updatedAt = Date.now(); save(); broadcast('lead', lead, { staffOnly: true }); }
      return json(res, 200, { ok: true });
    }

    if (p === '/api/words/hide' && req.method === 'POST') {
      const { id, hidden } = await readBody(req);
      const w = db.words.find((x) => x.id === id);
      if (w) w.hidden = !!hidden;
      save();
      broadcast('words', db.words.filter((x) => !x.hidden));
      broadcast('words:all', db.words, { staffOnly: true });
      return json(res, 200, { ok: true });
    }

    if (p === '/api/words/clear' && req.method === 'POST') {
      db.words = [];
      save();
      broadcast('words', []);
      broadcast('words:all', [], { staffOnly: true });
      return json(res, 200, { ok: true });
    }

    if (p === '/api/wall' && req.method === 'PUT') {
      const b = await readBody(req);
      const allowed = ['scene', 'accept', 'message', 'question', 'photo', 'countdownTo', 'countdownFrom'];
      for (const k of allowed) {
        if (!(k in b)) continue;
        if (k === 'accept') db.wall[k] = !!b[k];
        else if (k === 'countdownTo' || k === 'countdownFrom') db.wall[k] = Math.max(0, Number(b[k]) || 0);
        else db.wall[k] = String(b[k] ?? '').slice(0, 160);
      }
      db.wall.updatedAt = Date.now();
      save();
      broadcast('wall', publicWall());
      return json(res, 200, { ok: true, wall: db.wall });
    }

    if (p === '/api/settings' && req.method === 'PUT') {
      const b = await readBody(req);
      for (const k of ['eventName', 'wifiSsid', 'wifiPass', 'publicUrl']) if (k in b) db.settings[k] = String(b[k]).slice(0, 120);
      save();
      broadcast('settings', db.settings, { staffOnly: true });
      return json(res, 200, { ok: true, settings: db.settings });
    }

    if (p === '/api/tarifs' && req.method === 'PUT') {
      db.tarifs = await readBody(req);
      save();
      broadcast('tarifs', db.tarifs, { staffOnly: true });
      return json(res, 200, { ok: true });
    }

    if (p === '/api/alert' && req.method === 'POST') {
      const { from, text, to } = await readBody(req);
      broadcast('alert', { from: String(from || 'Régie'), text: String(text || '').slice(0, 200), to: to || 'all', at: Date.now() }, { staffOnly: true });
      return json(res, 200, { ok: true });
    }

    if (p === '/api/export.csv') {
      const head = ['Enregistré le', 'Nom', 'Société', 'Profil', 'Événements / an', 'Fonction', 'Téléphone', 'Email', 'Événement', 'Période', 'Jauge', 'Budget', 'Besoins', 'Potentiel', 'Suivi par', 'Notes'];
      const OPS = { mazen: 'Mazen', coraline: 'Coraline', nolan: 'Nolan', eric: 'Éric' };
      const rows = db.leads.filter((l) => !l.demo).map((l) => [new Date(l.createdAt || l.updatedAt).toLocaleString('fr-FR'), l.name, l.company, l.profile, l.volume, l.role, l.phone, l.email,
        l.eventType, l.period, l.audience, l.budget, l.needs, { hot: 'Chaud', warm: 'Tiède', cold: 'Froid' }[l.temperature] || '', OPS[l.operator] || l.operator, l.notes].map(csvCell).join(';'));
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mediacom-contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      });
      return res.end('﻿' + [head.map(csvCell).join(';'), ...rows].join('\r\n'));
    }

    return json(res, 404, { error: 'route inconnue' });
  } catch (e) {
    const tooBig = e.message === 'too_large';
    return json(res, tooBig ? 413 : 400, { error: tooBig ? 'fichier trop lourd' : 'requête invalide' });
  }
}

const server = http.createServer(handler);
if (tls) https.createServer({ key: tls.key, cert: tls.cert }, handler).listen(HTTPS_PORT, '0.0.0.0');

server.listen(PORT, '0.0.0.0', () => {
  const lan = lanAddresses();
  const host = lan[0] || 'localhost';
  const base = `http://${host}:${PORT}`;
  const team = tls ? `https://${host}:${HTTPS_PORT}` : base;
  console.log(`
  ┌─ MÉDIACOM EVENT OS · hub du stand ──────────────────────────
  │  Tablettes (équipe)  ${team}/?t=${config.token}
  │  Mur LED             ${base}/mur
  │  Visiteurs           ${base}/nuage
  │  Console iPhone      ${team}/master?t=${config.token}
  │  Mise en service     http://localhost:${PORT}/setup
  │  HTTPS               ${tls ? `actif (certificat iPad : ${base}/mediacom-ca.crt)` : 'inactif'}
  │  Données             ${path.relative(process.cwd(), DB_FILE) || DB_FILE}
  └─────────────────────────────────────────────────────────────
`);
});

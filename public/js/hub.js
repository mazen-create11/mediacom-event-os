// Client de synchronisation : hub du stand (SSE + API) quand il existe, sinon mode local
// (localStorage + BroadcastChannel entre onglets).
// - Écritures optimistes : l'écran se met à jour tout de suite, le réseau suit.
// - File d'attente dans IndexedDB (les photos de cartes dépassent vite le quota de localStorage),
//   rejouée dans l'ordre à la reconnexion ; une modification n'envoie que les champs changés.
// - Un contact connu de la tablette mais absent du hub lui est renvoyé, jamais effacé.

const CACHE_KEY = 'mc_os_cache_v3';
const OUTBOX_KEY = 'mc_os_outbox_v3';
const BC_NAME = 'mc_os_v3';
const LEAD_REASONS = new Set(['lead', 'lead:delete', 'hello']);

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16);

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}

const idb = (() => {
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('indexedDB indisponible'));
    const r = indexedDB.open('mc_os', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
  const run = (mode, fn) => open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction('kv', mode);
    const req = fn(t.objectStore('kv'));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = t.onabort = () => reject(t.error);
  }));
  return { get: (k) => run('readonly', (s) => s.get(k)), set: (k, v) => run('readwrite', (s) => s.put(v, k)) };
})();

// Jeton d'appairage : lu dans l'URL (?t=) puis gardé sur l'appareil
const urlToken = new URLSearchParams(location.search).get('t');
if (urlToken) store('mc_t', urlToken);
export const token = () => load('mc_t', '');
export const withToken = (path) => (token() ? `${path}${path.includes('?') ? '&' : '?'}t=${encodeURIComponent(token())}` : path);

export function deviceId() {
  let id = load('mc_device', null);
  if (!id) { id = 'dev-' + uid().slice(0, 8); store('mc_device', id); }
  return id;
}

// 'hub' : le hub répond ; 'down' : rien ne répond (hub éteint, Wi-Fi coupé) ; 'none' : site statique sans hub
export async function hubKind() {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    const d = await r.json().catch(() => null);
    return d && typeof d.ok === 'boolean' ? 'hub' : 'none';
  } catch {
    return 'down';
  }
}

const retryable = (e) => !e.status || e.status >= 500 || e.status === 401 || e.status === 408;
const isDataURL = (v) => typeof v === 'string' && v.startsWith('data:');

export function createHub({ kind = 'tablet', operator = () => '' } = {}) {
  const listeners = new Map();
  const on = (ev, fn) => { (listeners.get(ev) || listeners.set(ev, new Set()).get(ev)).add(fn); return () => listeners.get(ev).delete(fn); };
  const emit = (ev, data) => listeners.get(ev)?.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

  const cached = load(CACHE_KEY, {});
  const state = {
    leads: cached.leads || [],
    words: cached.words || [],
    wall: cached.wall || { scene: 'cloud', accept: true, message: '', photo: 'scene-m-rouge' },
    settings: cached.settings || { eventName: 'Salon' },
    tarifs: cached.tarifs || null,
    presence: [],
    status: 'connecting', // connecting | online | offline | local | unpaired
    mode: location.protocol.startsWith('http') ? 'hub' : 'local',
    serverOffset: 0,
  };
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(BC_NAME) : null;

  /* ---------- Stockage local ---------- */

  let lastStorageAlert = 0;
  const storageError = () => {
    if (Date.now() - lastStorageAlert < 60000) return;
    lastStorageAlert = Date.now();
    emit('storage-error');
  };
  // Le cache n'embarque pas les photos de cartes : elles vivent dans la file d'attente jusqu'à l'envoi
  const slim = (l) => (isDataURL(l.cardPhoto) ? { ...l, cardPhoto: null, cardPhotoPending: true } : l);
  const persistNow = () => {
    if (!store(CACHE_KEY, { leads: state.leads.map(slim), words: state.words, wall: state.wall, settings: state.settings, tarifs: state.tarifs })) storageError();
  };
  let persistTimer = 0;
  const changed = (reason) => {
    clearTimeout(persistTimer);
    if (LEAD_REASONS.has(reason)) persistNow(); else persistTimer = setTimeout(persistNow, 800);
    emit('change', reason);
  };
  const setStatus = (s) => { if (state.status !== s) { state.status = s; emit('status', s); } };

  function upsertLocal(lead) {
    const i = state.leads.findIndex((l) => l.id === lead.id);
    if (i >= 0) state.leads[i] = lead; else state.leads.unshift(lead);
    state.leads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  function dropLocal(id) {
    const n = state.leads.length;
    state.leads = state.leads.filter((l) => l.id !== id);
    if (state.leads.length !== n) changed('lead:delete');
  }

  /* ---------- File d'attente ---------- */

  let outbox = [];
  let loaded = false;
  let flushing = false;
  const persistOutbox = () => {
    idb.set('outbox', outbox).catch(() => { if (!store(OUTBOX_KEY, outbox)) storageError(); });
  };
  const ready = idb.get('outbox')
    .then((v) => v || load(OUTBOX_KEY, []))
    .catch(() => load(OUTBOX_KEY, []))
    .then((saved) => {
      outbox = [...(Array.isArray(saved) ? saved : []), ...outbox];
      loaded = true;
      try { localStorage.removeItem(OUTBOX_KEY); } catch { /* */ }
      persistOutbox();
      emit('queued', outbox.length);
      flush();
    });

  function enqueue(job) {
    if (job.key) {
      // Une modification d'une fiche déjà en attente fusionne avec l'envoi existant
      const i = outbox.findIndex((j, k) => j.key === job.key && !(flushing && k === 0));
      if (i >= 0) {
        outbox[i] = { ...outbox[i], body: { ...outbox[i].body, ...job.body } };
        persistOutbox();
        return;
      }
    }
    outbox.push(job);
    persistOutbox();
    emit('queued', outbox.length);
  }

  /* ---------- Réseau ---------- */

  async function api(method, url, body, timeout = 8000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        method,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token() ? { 'x-stand-token': token() } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { const err = new Error(data.error || res.statusText); err.status = res.status; throw err; }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function rejected(job, e) {
    if (e.status === 410 && job.url === '/api/leads') dropLocal(job.body.id); // supprimé ailleurs
    emit('rejected', { job, error: e.message });
  }

  // N'échoue jamais : un envoi impossible part en file d'attente, un refus est signalé
  async function send(method, url, body, key) {
    if (state.mode === 'local') return null;
    const job = { method, url, body, key, at: Date.now() };
    if (!loaded || outbox.length || state.status !== 'online') { enqueue(job); flush(); return null; }
    try {
      return await api(method, url, body);
    } catch (e) {
      if (retryable(e)) enqueue(job); else rejected(job, e);
      return null;
    }
  }

  async function flush() {
    if (flushing || !loaded || !outbox.length || state.status !== 'online') return;
    flushing = true;
    try {
      while (outbox.length) {
        const job = outbox[0];
        try {
          await api(job.method, job.url, job.body);
        } catch (e) {
          if (retryable(e)) break;
          rejected(job, e);
        }
        outbox.shift();
        persistOutbox();
      }
    } finally {
      flushing = false;
      emit('queued', outbox.length);
    }
  }

  // Fusion à la (re)connexion : le hub fait foi, sauf pour ce qui est encore en attente d'envoi.
  // Un contact que seule la tablette connaît est renvoyé au hub (base perdue, autre tablette hors ligne…).
  function mergeLeads(remote = [], deleted = []) {
    const gone = new Set(deleted);
    const pending = new Set(outbox.filter((j) => j.key).map((j) => j.key.slice(5)));
    const map = new Map(remote.map((l) => [l.id, l]));
    for (const l of state.leads) {
      if (gone.has(l.id)) continue;
      const r = map.get(l.id);
      if (!r) {
        map.set(l.id, l);
        if (!pending.has(l.id) && !l.cardPhotoPending) enqueue({ method: 'POST', url: '/api/leads', body: l, key: 'lead:' + l.id, at: Date.now() });
      } else if (pending.has(l.id) && (r.updatedAt || 0) < (l.updatedAt || 0)) {
        map.set(l.id, l);
      }
    }
    return [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  let es = null;
  let lastMsg = 0;
  let retry = 0;
  let probed = false;
  function connect() {
    if (state.mode === 'local') { setStatus('local'); return; }
    // Page servie sans hub (lien de démonstration) : bascule en mode local. Un hub éteint, lui, reste « hors ligne ».
    if (!probed) {
      probed = true;
      hubKind().then((k) => {
        if (k === 'none') { state.mode = 'local'; setStatus('local'); emit('change', 'hello'); } else connect();
      });
      return;
    }
    es?.close();
    setStatus(state.status === 'online' ? 'online' : 'connecting');
    const q = new URLSearchParams({ device: deviceId(), op: operator() || '', kind });
    if (token()) q.set('t', token());
    es = new EventSource(`/api/stream?${q}`);
    lastMsg = Date.now();
    const handle = (name, fn) => es.addEventListener(name, (ev) => { lastMsg = Date.now(); retry = 0; try { fn(JSON.parse(ev.data)); } catch (e) { console.error(name, e); } });

    handle('hello', async (d) => {
      await ready;
      state.leads = mergeLeads(d.leads, d.deleted);
      state.words = d.words; state.wall = d.wall; state.settings = d.settings; state.tarifs = d.tarifs; state.presence = d.presence;
      state.serverOffset = d.serverTime - Date.now();
      setStatus('online');
      changed('hello');
      emit('presence', state.presence);
      flush();
    });
    handle('ping', () => {});
    handle('lead', (lead) => {
      // Une modification locale encore en file ne doit pas être écrasée par l'écho d'une version antérieure
      const pending = outbox.some((j) => j.key === 'lead:' + lead.id);
      const mine = state.leads.find((l) => l.id === lead.id);
      if (pending && mine && (mine.updatedAt || 0) > (lead.updatedAt || 0)) return;
      upsertLocal(lead); changed('lead'); emit('lead', lead);
    });
    handle('lead:delete', ({ id }) => dropLocal(id));
    handle('transfer', (t) => emit('transfer', t));
    handle('words:all', (w) => { state.words = w; changed('words'); });
    handle('word', (w) => emit('word', w));
    handle('wall', (d) => { state.wall = d.wall; changed('wall'); });
    handle('presence', (p) => { state.presence = p; emit('presence', p); });
    handle('settings', (s) => { state.settings = s; changed('settings'); });
    handle('tarifs', (t) => { state.tarifs = t; changed('tarifs'); });
    handle('alert', (a) => emit('alert', a));
    handle('revoked', () => { es.close(); setStatus('unpaired'); });

    es.onerror = async () => {
      if (es.readyState !== EventSource.CLOSED) { setStatus('offline'); return; }
      // Fermé définitivement : appairage manquant ou hub absent
      try {
        const h = await api('GET', '/api/health', null, 4000);
        if (!h.staff) { setStatus('unpaired'); return; }
      } catch { /* hub injoignable */ }
      setStatus('offline');
      retry = Math.min(retry + 1, 6);
      setTimeout(connect, 800 * 2 ** retry);
    };
  }

  setInterval(() => {
    if (state.mode === 'hub' && state.status === 'online' && Date.now() - lastMsg > 40000) connect();
    if (state.status === 'online') flush();
  }, 10000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.mode === 'hub' && state.status !== 'online') connect();
  });
  window.addEventListener('online', () => state.mode === 'hub' && connect());

  /* ---------- Mode local (sans hub) : synchro entre onglets ---------- */

  function localBroadcast(type, data) {
    if (state.mode !== 'local') return;
    persistNow();
    bc?.postMessage({ type, data, from: deviceId() });
  }
  if (bc) bc.onmessage = ({ data: msg }) => {
    if (state.mode !== 'local' || msg.from === deviceId()) return;
    const c = load(CACHE_KEY, {});
    Object.assign(state, { leads: c.leads || [], words: c.words || [], wall: c.wall || state.wall, settings: c.settings || state.settings, tarifs: c.tarifs ?? state.tarifs });
    emit('change', msg.type);
    if (msg.type === 'transfer') emit('transfer', msg.data);
    if (msg.type === 'alert') emit('alert', msg.data);
    if (msg.type === 'word') emit('word', msg.data);
  };

  /* ---------- Actions ---------- */

  const now = () => Date.now() + state.serverOffset;

  return {
    state,
    on,
    connect,
    newId: () => 'ld-' + uid(),
    outboxSize: () => outbox.length,

    // Retourne dès l'enregistrement local ; l'envoi au hub suit (ou attend le réseau)
    saveLead(input) {
      const prev = state.leads.find((l) => l.id === input.id);
      const stamp = now();
      const lead = { ...(prev || {}), ...input, updatedAt: stamp };
      if (!prev) {
        lead.createdAt = lead.createdAt || stamp;
        lead.history = [{ type: 'created', by: lead.capturedBy, at: lead.createdAt }];
      }
      if (isDataURL(input.cardPhoto)) delete lead.cardPhotoPending;
      upsertLocal(lead);
      changed('lead');
      localBroadcast('lead', lead);
      send('POST', '/api/leads', prev ? { ...input, id: lead.id, updatedAt: stamp } : lead, 'lead:' + lead.id);
      return lead;
    },

    deleteLead(id) {
      dropLocal(id);
      localBroadcast('lead:delete', { id });
      return send('DELETE', `/api/leads/${id}`);
    },

    transfer(leadId, from, to, note) {
      const lead = state.leads.find((l) => l.id === leadId);
      if (!lead) return;
      const t = { from, to, note, at: now(), ack: false };
      Object.assign(lead, { operator: to, transfer: t, updatedAt: now() });
      lead.history = [...(lead.history || []), { type: 'transfer', ...t }];
      changed('lead');
      if (state.mode === 'local') { localBroadcast('transfer', { lead, ...t }); return; }
      return send('POST', '/api/transfer', { leadId, from, to, note });
    },

    ack(leadId) {
      const lead = state.leads.find((l) => l.id === leadId);
      if (lead?.transfer) { lead.transfer.ack = true; changed('lead'); localBroadcast('lead', lead); }
      return send('POST', `/api/leads/${leadId}/ack`);
    },

    async sendWord(text) {
      if (state.mode === 'local') {
        const key = text.toLowerCase();
        let w = state.words.find((x) => x.key === key);
        if (w) w.count += 1; else { w = { id: uid().slice(0, 8), key, text, count: 1, hidden: false, at: now() }; state.words.push(w); }
        changed('words'); localBroadcast('word', w);
        return w;
      }
      return (await api('POST', '/api/words', { text })).word;
    },

    hideWord(id, hidden) {
      const w = state.words.find((x) => x.id === id);
      if (w) w.hidden = hidden;
      changed('words'); localBroadcast('words');
      return send('POST', '/api/words/hide', { id, hidden });
    },

    clearWords() {
      state.words = [];
      changed('words'); localBroadcast('words');
      return send('POST', '/api/words/clear', {});
    },

    setWall(patch) {
      Object.assign(state.wall, patch, { updatedAt: now() });
      changed('wall'); localBroadcast('wall');
      return send('PUT', '/api/wall', patch);
    },

    setTarifs(t) {
      state.tarifs = t;
      changed('tarifs'); localBroadcast('tarifs');
      return send('PUT', '/api/tarifs', t);
    },

    setSettings(patch) {
      Object.assign(state.settings, patch);
      changed('settings'); localBroadcast('settings');
      return send('PUT', '/api/settings', patch);
    },

    alert(from, text, to = 'all') {
      const a = { from, text, to, at: now() };
      if (state.mode === 'local') { localBroadcast('alert', a); return; }
      return send('POST', '/api/alert', a);
    },

    // Nouveau jeton : toutes les autres tablettes devront être appairées de nouveau
    async rotateToken() {
      const d = await api('POST', '/api/token/rotate', { device: deviceId() });
      store('mc_t', d.token);
      connect();
      return d.token;
    },
  };
}

/* ---------- Flux public du mur LED (sans appairage) ---------- */

export function wallFeed(onData) {
  if (!location.protocol.startsWith('http')) return localWall(onData);
  hubKind().then((k) => (k === 'none' ? localWall(onData) : hubWall(onData)));
  return { mode: 'auto' };
}

function localWall(onData) {
  {
    const read = () => { const c = load(CACHE_KEY, {}); onData({ wall: c.wall || { scene: 'cloud', accept: true }, words: (c.words || []).filter((w) => !w.hidden), eventName: c.settings?.eventName }); };
    read();
    if ('BroadcastChannel' in window) new BroadcastChannel(BC_NAME).onmessage = ({ data }) => { read(); if (data.type === 'word' && !data.data?.hidden) onData({ word: data.data }); };
    return { mode: 'local' };
  }
}

function hubWall(onData) {
  let es;
  const open = () => {
    es = new EventSource('/api/wall/stream');
    es.addEventListener('wall', (e) => onData(JSON.parse(e.data)));
    es.addEventListener('words', (e) => onData({ words: JSON.parse(e.data) }));
    es.addEventListener('word', (e) => onData({ word: JSON.parse(e.data) }));
    es.onerror = () => { if (es.readyState === EventSource.CLOSED) setTimeout(open, 3000); };
  };
  open();
  return { mode: 'hub' };
}

// Client de synchronisation : hub du stand (SSE + API) quand il existe, sinon mode local
// (localStorage + BroadcastChannel entre onglets). Écritures optimistes, file d'attente rejouée
// à la reconnexion, identifiants générés côté client pour rester idempotent.

const CACHE_KEY = 'mc_os_cache_v3';
const OUTBOX_KEY = 'mc_os_outbox_v3';
const BC_NAME = 'mc_os_v3';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16);

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota ou mode privé */ }
}

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
  let outbox = load(OUTBOX_KEY, []);
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(BC_NAME) : null;

  const persist = () => store(CACHE_KEY, { leads: state.leads, words: state.words, wall: state.wall, settings: state.settings, tarifs: state.tarifs });
  const changed = (reason) => { persist(); emit('change', reason); };
  const setStatus = (s) => { if (state.status !== s) { state.status = s; emit('status', s); } };

  function upsertLocal(lead) {
    const i = state.leads.findIndex((l) => l.id === lead.id);
    if (i >= 0) state.leads[i] = lead; else state.leads.unshift(lead);
    state.leads.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  /* ---------- Réseau ---------- */

  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token() ? { 'x-stand-token': token() } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.error || res.statusText); err.status = res.status; throw err; }
    return data;
  }

  async function send(method, url, body) {
    if (state.mode === 'local') return null;
    try {
      return await api(method, url, body);
    } catch (e) {
      if (!e.status || e.status >= 500 || e.status === 401) {
        outbox.push({ method, url, body, at: Date.now() });
        store(OUTBOX_KEY, outbox);
        emit('queued', outbox.length);
      }
      if (e.status && e.status < 500 && e.status !== 401) throw e;
      return null;
    }
  }

  let flushing = false;
  async function flush() {
    if (flushing || !outbox.length || state.status !== 'online') return;
    flushing = true;
    while (outbox.length) {
      const job = outbox[0];
      try {
        await api(job.method, job.url, job.body);
      } catch (e) {
        if (!e.status || e.status >= 500 || e.status === 401) break; // on réessaiera
      }
      outbox.shift();
      store(OUTBOX_KEY, outbox);
    }
    flushing = false;
    emit('queued', outbox.length);
  }

  let es = null;
  let lastMsg = 0;
  let retry = 0;
  function connect() {
    if (state.mode === 'local') { setStatus('local'); return; }
    es?.close();
    setStatus(state.status === 'online' ? 'online' : 'connecting');
    const q = new URLSearchParams({ device: deviceId(), op: operator() || '', kind });
    if (token()) q.set('t', token());
    es = new EventSource(`/api/stream?${q}`);
    lastMsg = Date.now();
    const handle = (name, fn) => es.addEventListener(name, (ev) => { lastMsg = Date.now(); retry = 0; try { fn(JSON.parse(ev.data)); } catch (e) { console.error(name, e); } });

    handle('hello', (d) => {
      state.leads = mergeLeads(d.leads);
      state.words = d.words; state.wall = d.wall; state.settings = d.settings; state.tarifs = d.tarifs; state.presence = d.presence;
      state.serverOffset = d.serverTime - Date.now();
      setStatus('online');
      changed('hello');
      emit('presence', state.presence);
      flush();
    });
    handle('ping', () => {});
    handle('lead', (lead) => { upsertLocal(lead); changed('lead'); emit('lead', lead); });
    handle('lead:delete', ({ id }) => { state.leads = state.leads.filter((l) => l.id !== id); changed('lead:delete'); });
    handle('transfer', (t) => emit('transfer', t));
    handle('words:all', (w) => { state.words = w; changed('words'); });
    handle('word', (w) => emit('word', w));
    handle('wall', (d) => { state.wall = d.wall; changed('wall'); });
    handle('presence', (p) => { state.presence = p; emit('presence', p); });
    handle('settings', (s) => { state.settings = s; changed('settings'); });
    handle('tarifs', (t) => { state.tarifs = t; changed('tarifs'); });
    handle('alert', (a) => emit('alert', a));

    es.onerror = async () => {
      if (es.readyState === EventSource.CLOSED) {
        // Fermé définitivement : appairage manquant ou hub absent
        try {
          const h = await api('GET', '/api/health');
          if (!h.staff) { setStatus('unpaired'); return; }
        } catch { /* hub injoignable */ }
        setStatus('offline');
        retry = Math.min(retry + 1, 6);
        setTimeout(connect, 800 * 2 ** retry);
      } else {
        setStatus('offline');
      }
    };
  }

  // Si le hub renvoie des contacts, on garde nos versions locales plus récentes (file d'attente non rejouée)
  function mergeLeads(remote = []) {
    const pending = new Set(outbox.filter((j) => j.url === '/api/leads').map((j) => j.body.id));
    const map = new Map(remote.map((l) => [l.id, l]));
    for (const l of state.leads) if (pending.has(l.id) && (!map.has(l.id) || (map.get(l.id).updatedAt || 0) < (l.updatedAt || 0))) map.set(l.id, l);
    return [...map.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  setInterval(() => {
    if (state.mode === 'hub' && state.status === 'online' && Date.now() - lastMsg > 40000) connect();
  }, 10000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.mode === 'hub' && state.status !== 'online') connect();
  });
  window.addEventListener('online', () => state.mode === 'hub' && connect());

  /* ---------- Mode local (sans hub) : synchro entre onglets ---------- */

  function localBroadcast(type, data) {
    if (state.mode !== 'local') return;
    bc?.postMessage({ type, data, from: deviceId() });
  }
  bc && (bc.onmessage = ({ data: msg }) => {
    if (state.mode !== 'local' || msg.from === deviceId()) return;
    const c = load(CACHE_KEY, {});
    Object.assign(state, { leads: c.leads || [], words: c.words || [], wall: c.wall || state.wall, settings: c.settings || state.settings, tarifs: c.tarifs ?? state.tarifs });
    emit('change', msg.type);
    if (msg.type === 'transfer') emit('transfer', msg.data);
    if (msg.type === 'alert') emit('alert', msg.data);
    if (msg.type === 'word') emit('word', msg.data);
  });

  /* ---------- Actions ---------- */

  const now = () => Date.now() + state.serverOffset;

  const api_ = {
    state,
    on,
    connect,
    newId: () => 'ld-' + uid(),

    async saveLead(input) {
      const prev = state.leads.find((l) => l.id === input.id);
      const lead = { ...(prev || {}), ...input, updatedAt: now() };
      if (!lead.createdAt) lead.createdAt = now();
      if (!lead.history) lead.history = [];
      if (!prev) lead.history.push({ type: 'created', by: lead.capturedBy, at: lead.createdAt });
      upsertLocal(lead);
      changed('lead');
      localBroadcast('lead', lead);
      const res = await send('POST', '/api/leads', lead);
      if (res?.lead) { upsertLocal(res.lead); changed('lead'); }
      return lead;
    },

    async deleteLead(id) {
      state.leads = state.leads.filter((l) => l.id !== id);
      changed('lead:delete');
      localBroadcast('lead:delete', { id });
      await send('DELETE', `/api/leads/${id}`);
    },

    async transfer(leadId, from, to, note) {
      const lead = state.leads.find((l) => l.id === leadId);
      if (!lead) return;
      const t = { from, to, note, at: now(), ack: false };
      Object.assign(lead, { operator: to, transfer: t, updatedAt: now() });
      lead.history = [...(lead.history || []), { type: 'transfer', ...t }];
      changed('lead');
      if (state.mode === 'local') { persist(); localBroadcast('transfer', { lead, ...t }); return; }
      await send('POST', '/api/transfer', { leadId, from, to, note });
    },

    async ack(leadId) {
      const lead = state.leads.find((l) => l.id === leadId);
      if (lead?.transfer) { lead.transfer.ack = true; changed('lead'); localBroadcast('lead', lead); }
      await send('POST', `/api/leads/${leadId}/ack`);
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

    async hideWord(id, hidden) {
      const w = state.words.find((x) => x.id === id);
      if (w) w.hidden = hidden;
      changed('words'); localBroadcast('words');
      await send('POST', '/api/words/hide', { id, hidden });
    },

    async clearWords() {
      state.words = [];
      changed('words'); localBroadcast('words');
      await send('POST', '/api/words/clear', {});
    },

    async setWall(patch) {
      Object.assign(state.wall, patch, { updatedAt: now() });
      changed('wall'); localBroadcast('wall');
      await send('PUT', '/api/wall', patch);
    },

    async setTarifs(t) {
      state.tarifs = t;
      changed('tarifs'); localBroadcast('tarifs');
      await send('PUT', '/api/tarifs', t);
    },

    async setSettings(patch) {
      Object.assign(state.settings, patch);
      changed('settings'); localBroadcast('settings');
      await send('PUT', '/api/settings', patch);
    },

    async alert(from, text, to = 'all') {
      const a = { from, text, to, at: now() };
      if (state.mode === 'local') { localBroadcast('alert', a); return; }
      await send('POST', '/api/alert', a);
    },

    outboxSize: () => outbox.length,
  };
  return api_;
}

/* ---------- Flux public du mur LED (sans appairage) ---------- */

export function wallFeed(onData) {
  if (!location.protocol.startsWith('http')) {
    const read = () => { const c = load(CACHE_KEY, {}); onData({ wall: c.wall || { scene: 'cloud', accept: true }, words: (c.words || []).filter((w) => !w.hidden), eventName: c.settings?.eventName }); };
    read();
    if ('BroadcastChannel' in window) new BroadcastChannel(BC_NAME).onmessage = ({ data }) => { read(); if (data.type === 'word') onData({ word: data.data }); };
    return { mode: 'local' };
  }
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

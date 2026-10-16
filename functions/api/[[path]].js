// API de la démo en ligne (Cloudflare Pages Functions + D1).
// Reprend la partie publique du hub : mots du nuage, sondage, questions, état et habillage du mur LED.
// Aucun contact n'est envoyé ici : sur le lien public, les fiches restent dans l'appareil.

const THEME_DEFAULT = { style: 'sobre', c1: '#0a2f6b', c2: '#3192ff', brand: true, logo: '', client: '' };
const WALL_DEFAULT = { scene: 'cloud', accept: true, message: '', question: '', photo: 'scene-m-rouge', countdownTo: 0, countdownFrom: 0, maxPerPerson: 0, reelSet: 'seminaire', externalUrl: '', qaTitle: '', qaOpen: true, cloudLayout: 'centre', theme: THEME_DEFAULT, updatedAt: 0 };
const SETTINGS_DEFAULT = { eventName: 'Salon', bookAll: false, bookHide: [], bookShow: [] };
const MAX_SESSIONS = 12;
const MAX_WORDS = 300;
const MAX_QUESTIONS = 200;
const THEME_STYLES = new Set(['sobre', 'lumiere', 'uni', 'degrade', 'photo']);
const BLOCKED = /\b(merde|putain|putes?|connard|connasse|encul\w*|salope|batard|niquer?|nique|ntm|fdp|tg|pd|bite|couilles?|chatte|nazi|hitler|negro|bougnoul\w*|youpin|pede|tapette|enfoire)\b/i;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});
const cleanText = (raw, max) => String(raw || '').replace(/\s+/g, ' ').trim().slice(0, max);
const pidOf = (b) => String(b?.pid || '').replace(/[^\w-]/g, '').slice(0, 40) || 'anonyme';
const rid = () => crypto.randomUUID().slice(0, 8);

function cleanWord(raw) {
  const text = cleanText(raw, 28);
  if (text.length < 2) return { error: 'Mot trop court' };
  if (/(https?:|www\.|\.[a-z]{2,4}\b|@)/i.test(text)) return { error: 'Les liens ne sont pas acceptés' };
  if (BLOCKED.test(text.normalize('NFD').replace(/[̀-ͯ]/g, ''))) return { error: 'Ce mot ne peut pas être affiché' };
  return { text };
}
function cleanTheme(t) {
  const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : d);
  const logo = typeof t.logo === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(t.logo) && t.logo.length < 80000 ? t.logo : '';
  return { style: THEME_STYLES.has(t.style) ? t.style : 'sobre', c1: hex(t.c1, '#0a2f6b'), c2: hex(t.c2, '#3192ff'), brand: t.brand !== false, logo, client: cleanText(t.client, 40) };
}

const kvGet = async (db, k, fallback) => { const row = await db.prepare('SELECT v FROM kv WHERE k = ?').bind(k).first(); return row ? JSON.parse(row.v) : fallback; };
const kvSet = (db, k, v) => db.prepare('INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind(k, JSON.stringify(v)).run();

async function getWall(db) {
  const w = { ...WALL_DEFAULT, ...(await kvGet(db, 'wall', {})) };
  w.theme = { ...THEME_DEFAULT, ...(w.theme || {}) };
  return w;
}
async function words(db, all = false) {
  const { results } = await db.prepare(`SELECT id, key, text, count, hidden, at FROM words ${all ? '' : 'WHERE hidden = 0'} ORDER BY at ASC`).all();
  return results.map((w) => ({ ...w, hidden: !!w.hidden }));
}
async function pollPublic(db) {
  const poll = await kvGet(db, 'poll', null);
  if (!poll) return null;
  const { results } = await db.prepare('SELECT opt, COUNT(*) AS n FROM pvotes WHERE poll = ? GROUP BY opt').bind(poll.id).all();
  const counts = Object.fromEntries(results.map((r) => [r.opt, r.n]));
  const voters = (await db.prepare('SELECT COUNT(DISTINCT device) AS n FROM pvotes WHERE poll = ?').bind(poll.id).first())?.n || 0;
  const options = poll.options.map((o) => ({ ...o, count: counts[o.id] || 0 }));
  return { ...poll, options, total: options.reduce((s, o) => s + o.count, 0), voters };
}
async function questions(db, all = false) {
  const { results } = await db.prepare(`SELECT id, text, votes, hidden, answered, pinned, at FROM questions ${all ? '' : 'WHERE hidden = 0'} ORDER BY at ASC`).all();
  return results.map((q) => ({ ...q, hidden: !!q.hidden, answered: !!q.answered, pinned: !!q.pinned }));
}
const getSettings = async (db) => ({ ...SETTINGS_DEFAULT, ...(await kvGet(db, 'settings', {})) });
const ids = (v) => [...new Set([].concat(v || []).map((x) => String(x).replace(/[^\w-]/g, '').slice(0, 40)).filter(Boolean))].slice(0, 120);

/* --- Sessions : une prestation = une session close avec ses résultats --- */
async function getSession(db) {
  let s = await kvGet(db, 'session', null);
  if (!s) { s = { id: rid(), name: 'Salon', client: '', startedAt: Date.now() }; await kvSet(db, 'session', s); }
  return s;
}
async function snapshot(db) {
  const [s, w, ws, p, qs, st] = await Promise.all([getSession(db), getWall(db), words(db), pollPublic(db), questions(db), getSettings(db)]);
  const stats = { words: ws.length, sends: ws.reduce((a, x) => a + (x.count || 1), 0), votes: p?.total || 0, voters: p?.voters || 0, questions: qs.length, qvotes: qs.reduce((a, q) => a + (q.votes || 0), 0) };
  return {
    ...s, name: s.name || st.eventName, client: w.theme?.client || s.client || '', stats, endedAt: Date.now(),
    question: w.question || '', qaTitle: w.qaTitle || '',
    words: ws.sort((a, b) => b.count - a.count || a.at - b.at).slice(0, 120).map(({ text, count, at }) => ({ text, count, at })),
    poll: p,
    questions: qs.sort((a, b) => b.votes - a.votes || a.at - b.at).slice(0, 150),
  };
}
const sessionList = (list) => list.map(({ id, name, client, startedAt, endedAt, stats }) => ({ id, name, client, startedAt, endedAt, stats }));
async function screensList(db) {
  const all = await kvGet(db, 'screens', {});
  const now = Date.now();
  for (const k of Object.keys(all)) if (now - all[k].at > 20000) delete all[k];
  return Object.values(all).sort((a, b) => a.since - b.since);
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  const path = '/' + [].concat(params.path || []).join('/');
  const method = request.method;
  const body = async () => { try { return await request.json(); } catch { return {}; } };

  try {
    if (path === '/health') return json({ ok: true, cloud: true, staff: false, time: Date.now() });

    if (path === '/info') {
      const origin = new URL(request.url).origin;
      return json({ base: origin, cloud: true, lan: [], wifi: null });
    }

    if (path === '/wall' && method === 'GET') {
      const w = await getWall(db);
      return json({ question: w.question || '', accept: w.accept !== false, scene: w.scene, eventName: 'Salon' });
    }

    if (path === '/wall/state' && method === 'GET') {
      const all = new URL(request.url).searchParams.has('all');
      const st = await getSettings(db);
      const out = { wall: await getWall(db), words: await words(db, all), poll: await pollPublic(db), questions: await questions(db, all), eventName: st.eventName, book: { hide: st.bookHide, show: st.bookShow }, serverTime: Date.now() };
      if (all) Object.assign(out, { settings: st, screens: await screensList(db), session: await getSession(db), sessions: sessionList(await kvGet(db, 'sessions', [])) });
      return json(out);
    }

    if (path === '/wall' && method === 'PUT') {
      const b = await body();
      const w = await getWall(db);
      for (const k of ['scene', 'accept', 'message', 'question', 'photo', 'countdownTo', 'countdownFrom', 'maxPerPerson', 'reelSet', 'externalUrl', 'qaTitle', 'qaOpen', 'theme', 'cloudLayout']) {
        if (!(k in b)) continue;
        if (k === 'accept' || k === 'qaOpen') w[k] = !!b[k];
        else if (k === 'cloudLayout') w[k] = b[k] === 'haut' ? 'haut' : 'centre';
        else if (k.startsWith('countdown') || k === 'maxPerPerson') w[k] = Math.max(0, Number(b[k]) || 0);
        else if (k === 'externalUrl') w[k] = /^https?:\/\//i.test(String(b[k] || '')) ? String(b[k]).slice(0, 500) : '';
        else if (k === 'theme') w.theme = cleanTheme({ ...w.theme, ...(b.theme || {}) });
        else w[k] = String(b[k] ?? '').slice(0, 160);
      }
      w.updatedAt = Date.now();
      await kvSet(db, 'wall', w);
      return json({ ok: true, wall: w });
    }

    /* --- Nuage de mots --- */
    if (path === '/words' && method === 'POST') {
      const w0 = await getWall(db);
      if (!w0.accept) return json({ error: 'Les réponses sont closes pour le moment' }, 423);
      const b = await body();
      const pid = pidOf(b);
      const max = Number(w0.maxPerPerson) || 0;
      if (max) {
        const n = (await db.prepare('SELECT n FROM wordsby WHERE device = ?').bind(pid).first())?.n || 0;
        if (n >= max) return json({ error: max === 1 ? 'Un seul mot par personne pour cette question' : `${max} mots au maximum par personne` }, 429);
      }
      const { text, error } = cleanWord(b.text);
      if (error) return json({ error }, 422);
      const key = text.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');
      const now = Date.now();
      const prev = await db.prepare('SELECT id FROM words WHERE key = ?').bind(key).first();
      if (prev) {
        await db.prepare('UPDATE words SET count = count + 1, at = ? WHERE key = ?').bind(now, key).run();
      } else {
        await db.prepare('INSERT INTO words (id, key, text, count, hidden, at) VALUES (?, ?, ?, 1, 0, ?)').bind(rid(), key, text, now).run();
        await db.prepare(`DELETE FROM words WHERE id NOT IN (SELECT id FROM words ORDER BY at DESC LIMIT ${MAX_WORDS})`).run();
      }
      await db.prepare('INSERT INTO wordsby (device, n) VALUES (?1, 1) ON CONFLICT(device) DO UPDATE SET n = n + 1').bind(pid).run();
      const w = await db.prepare('SELECT id, key, text, count, hidden, at FROM words WHERE key = ?').bind(key).first();
      return json({ ok: true, word: { ...w, hidden: !!w.hidden } });
    }
    if (path === '/words/hide' && method === 'POST') {
      const { id, hidden } = await body();
      await db.prepare('UPDATE words SET hidden = ? WHERE id = ?').bind(hidden ? 1 : 0, String(id || '')).run();
      return json({ ok: true });
    }
    if (path === '/words/clear' && method === 'POST') {
      await db.batch([db.prepare('DELETE FROM words'), db.prepare('DELETE FROM wordsby')]);
      return json({ ok: true });
    }

    /* --- Sondage --- */
    if (path === '/poll' && method === 'PUT') {
      const b = await body();
      const options = [].concat(b.options || []).map((o) => cleanText(typeof o === 'string' ? o : o?.label, 60)).filter(Boolean).slice(0, 6);
      if (options.length < 2) return json({ error: 'Deux réponses au minimum' }, 422);
      const poll = { id: rid(), title: cleanText(b.title, 120) || 'Votre avis ?', options: options.map((label, i) => ({ id: 'o' + (i + 1), label })), open: b.open !== false, multiple: !!b.multiple, at: Date.now() };
      await db.batch([db.prepare('DELETE FROM pvotes')]);
      await kvSet(db, 'poll', poll);
      return json({ ok: true, poll: await pollPublic(db) });
    }
    if (path === '/poll/open' && method === 'POST') {
      const poll = await kvGet(db, 'poll', null);
      if (poll) { poll.open = !!(await body()).open; await kvSet(db, 'poll', poll); }
      return json({ ok: true, poll: await pollPublic(db) });
    }
    if (path === '/poll/reset' && method === 'POST') {
      await db.prepare('DELETE FROM pvotes').run();
      return json({ ok: true, poll: await pollPublic(db) });
    }
    if (path === '/poll/vote' && method === 'POST') {
      const poll = await kvGet(db, 'poll', null);
      if (!poll) return json({ error: 'Aucun sondage en cours' }, 404);
      if (poll.open === false) return json({ error: 'Le vote est clos' }, 423);
      const b = await body();
      const pid = pidOf(b);
      const valid = new Set(poll.options.map((o) => o.id));
      let picks = [...new Set([].concat(b.optionIds || b.optionId || []).map(String).filter((id) => valid.has(id)))];
      if (!picks.length) return json({ error: 'Choisissez une réponse' }, 422);
      if (!poll.multiple) picks = picks.slice(0, 1);
      const { results: mine } = await db.prepare('SELECT opt FROM pvotes WHERE poll = ? AND device = ?').bind(poll.id, pid).all();
      if (mine.length && !b.change) return json({ error: 'Vous avez déjà voté', poll: await pollPublic(db), mine: mine.map((m) => m.opt) }, 409);
      await db.batch([
        db.prepare('DELETE FROM pvotes WHERE poll = ? AND device = ?').bind(poll.id, pid),
        ...picks.map((opt) => db.prepare('INSERT OR IGNORE INTO pvotes (poll, device, opt) VALUES (?, ?, ?)').bind(poll.id, pid, opt)),
      ]);
      return json({ ok: true, poll: await pollPublic(db), mine: picks });
    }

    /* --- Questions --- */
    if (path === '/questions' && method === 'POST') {
      const w0 = await getWall(db);
      if (w0.qaOpen === false) return json({ error: 'Les questions sont closes' }, 423);
      const b = await body();
      const text = cleanText(b.text, 180);
      if (text.length < 4) return json({ error: 'Question trop courte' }, 422);
      if (/(https?:|www\.)/i.test(text)) return json({ error: 'Les liens ne sont pas acceptés' }, 422);
      if (BLOCKED.test(text.normalize('NFD').replace(/[̀-ͯ]/g, ''))) return json({ error: 'Cette question ne peut pas être affichée' }, 422);
      const pid = pidOf(b);
      const recent = (await db.prepare('SELECT COUNT(*) AS n FROM questions WHERE by = ? AND at > ?').bind(pid, Date.now() - 120000).first())?.n || 0;
      if (recent >= 3) return json({ error: 'Trois questions en deux minutes, c’est déjà bien : laissez les autres poser les leurs' }, 429);
      const q = { id: rid(), text, votes: 0, hidden: false, answered: false, pinned: false, at: Date.now() };
      await db.prepare('INSERT INTO questions (id, text, by, votes, hidden, answered, pinned, at) VALUES (?, ?, ?, 0, 0, 0, 0, ?)').bind(q.id, text, pid, q.at).run();
      await db.prepare(`DELETE FROM questions WHERE id NOT IN (SELECT id FROM questions ORDER BY at DESC LIMIT ${MAX_QUESTIONS})`).run();
      return json({ ok: true, question: q });
    }
    if (path === '/questions/vote' && method === 'POST') {
      const b = await body();
      const id = String(b.id || '');
      const q = await db.prepare('SELECT id, hidden FROM questions WHERE id = ?').bind(id).first();
      if (!q || q.hidden) return json({ error: 'Question introuvable' }, 404);
      const pid = pidOf(b);
      const had = await db.prepare('SELECT 1 AS x FROM qvotes WHERE qid = ? AND device = ?').bind(id, pid).first();
      if (had) await db.prepare('DELETE FROM qvotes WHERE qid = ? AND device = ?').bind(id, pid).run();
      else await db.prepare('INSERT OR IGNORE INTO qvotes (qid, device) VALUES (?, ?)').bind(id, pid).run();
      await db.prepare('UPDATE questions SET votes = (SELECT COUNT(*) FROM qvotes WHERE qid = ?1) WHERE id = ?1').bind(id).run();
      const fresh = await db.prepare('SELECT id, text, votes, answered, pinned, at FROM questions WHERE id = ?').bind(id).first();
      return json({ ok: true, voted: !had, question: fresh });
    }
    if (path === '/questions/set' && method === 'POST') {
      const b = await body();
      const id = String(b.id || '');
      const sets = ['hidden', 'answered', 'pinned'].filter((k) => k in b);
      if (sets.length) await db.prepare(`UPDATE questions SET ${sets.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...sets.map((k) => (b[k] ? 1 : 0)), id).run();
      return json({ ok: true });
    }
    if (path === '/questions/clear' && method === 'POST') {
      await db.batch([db.prepare('DELETE FROM questions'), db.prepare('DELETE FROM qvotes')]);
      return json({ ok: true });
    }

    /* --- Écran connecté (ordinateur du mur) --- */
    if (path === '/screen/ping' && method === 'POST') {
      const b = await body();
      const id = String(b.id || '').replace(/[^\w-]/g, '').slice(0, 24);
      if (!id) return json({ error: 'id' }, 422);
      const all = await kvGet(db, 'screens', {});
      const now = Date.now();
      for (const k of Object.keys(all)) if (now - all[k].at > 20000) delete all[k];
      all[id] = { id, scene: cleanText(b.scene, 16), locked: cleanText(b.locked, 16), w: Number(b.w) || 0, h: Number(b.h) || 0, fs: !!b.fs, since: all[id]?.since || now, at: now };
      await kvSet(db, 'screens', all);
      return json({ ok: true });
    }

    /* --- Réglages partagés (nom de l'événement, validation du Book) --- */
    if (path === '/settings' && method === 'PUT') {
      const b = await body();
      const st = await getSettings(db);
      if ('eventName' in b) st.eventName = cleanText(b.eventName, 120) || 'Salon';
      if ('bookAll' in b) st.bookAll = !!b.bookAll;
      if ('bookHide' in b) st.bookHide = ids(b.bookHide);
      if ('bookShow' in b) st.bookShow = ids(b.bookShow);
      await kvSet(db, 'settings', st);
      return json({ ok: true, settings: st });
    }

    /* --- Sessions --- */
    if (path === '/session/new' && method === 'POST') {
      const b = await body();
      const snap = await snapshot(db);
      let list = await kvGet(db, 'sessions', []);
      if (b.archive !== false && (snap.stats.sends || snap.stats.votes || snap.stats.questions)) list = [snap, ...list].slice(0, MAX_SESSIONS);
      await db.batch([db.prepare('DELETE FROM words'), db.prepare('DELETE FROM wordsby'), db.prepare('DELETE FROM pvotes'), db.prepare('DELETE FROM questions'), db.prepare('DELETE FROM qvotes')]);
      const name = cleanText(b.name, 80), client = cleanText(b.client, 40);
      const st = await getSettings(db);
      if (name) st.eventName = name;
      const session = { id: rid(), name: name || st.eventName, client, startedAt: Date.now() };
      const w = await getWall(db);
      if ('client' in b) w.theme = cleanTheme({ ...w.theme, client, logo: client && client !== w.theme.client ? '' : w.theme.logo });
      if (b.question !== undefined) w.question = cleanText(b.question, 160);
      w.updatedAt = Date.now();
      await Promise.all([kvSet(db, 'poll', null), kvSet(db, 'sessions', list), kvSet(db, 'session', session), kvSet(db, 'settings', st), kvSet(db, 'wall', w)]);
      return json({ ok: true, session, sessions: sessionList(list) });
    }
    if (path === '/session' && method === 'PUT') {
      const b = await body();
      const s = await getSession(db);
      const st = await getSettings(db);
      if ('name' in b) { s.name = cleanText(b.name, 80) || s.name; st.eventName = s.name; }
      if ('client' in b) { s.client = cleanText(b.client, 40); const w = await getWall(db); w.theme = cleanTheme({ ...w.theme, client: s.client }); w.updatedAt = Date.now(); await kvSet(db, 'wall', w); }
      await Promise.all([kvSet(db, 'session', s), kvSet(db, 'settings', st)]);
      return json({ ok: true, session: s });
    }
    if (path === '/sessions' && method === 'GET') return json({ session: await getSession(db), sessions: sessionList(await kvGet(db, 'sessions', [])) });
    if (path === '/sessions/live' && method === 'GET') return json({ ...(await snapshot(db)), live: true });
    const sm = /^\/sessions\/([\w-]+)$/.exec(path);
    if (sm) {
      const list = await kvGet(db, 'sessions', []);
      const s = list.find((x) => x.id === sm[1]);
      if (!s) return json({ error: 'session introuvable' }, 404);
      if (method === 'DELETE') { await kvSet(db, 'sessions', list.filter((x) => x.id !== sm[1])); return json({ ok: true }); }
      return json(s);
    }

    return json({ error: 'non disponible dans la démo en ligne' }, 404);
  } catch (e) {
    return json({ error: 'erreur du serveur de démo', detail: String(e?.message || e).slice(0, 200) }, 500);
  }
}

// API de la démo en ligne (Cloudflare Pages Functions + D1).
// Reprend seulement la partie publique du hub : mots du nuage et état du mur LED.
// Aucun contact n'est envoyé ici : sur le lien public, les fiches restent dans l'appareil.

const WALL_DEFAULT = { scene: 'cloud', accept: true, message: '', question: '', photo: 'scene-m-rouge', countdownTo: 0, countdownFrom: 0, updatedAt: 0 };
const MAX_WORDS = 300;
const BLOCKED = /\b(merde|putain|putes?|connard|connasse|encul\w*|salope|batard|niquer?|nique|ntm|fdp|tg|pd|bite|couilles?|chatte|nazi|hitler|negro|bougnoul\w*|youpin|pede|tapette|enfoire)\b/i;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

function cleanWord(raw) {
  const text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  if (text.length < 2) return { error: 'Mot trop court' };
  if (/(https?:|www\.|\.[a-z]{2,4}\b|@)/i.test(text)) return { error: 'Les liens ne sont pas acceptés' };
  if (BLOCKED.test(text.normalize('NFD').replace(/[̀-ͯ]/g, ''))) return { error: 'Ce mot ne peut pas être affiché' };
  return { text };
}

async function getWall(db) {
  const row = await db.prepare('SELECT v FROM kv WHERE k = ?').bind('wall').first();
  return { ...WALL_DEFAULT, ...(row ? JSON.parse(row.v) : {}) };
}

async function words(db, all = false) {
  const { results } = await db.prepare(`SELECT id, key, text, count, hidden, at FROM words ${all ? '' : 'WHERE hidden = 0'} ORDER BY at ASC`).all();
  return results.map((w) => ({ ...w, hidden: !!w.hidden }));
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
      return json({ question: w.question || '', accept: w.accept !== false, eventName: 'Salon' });
    }

    if (path === '/wall/state' && method === 'GET') {
      const all = new URL(request.url).searchParams.has('all');
      return json({ wall: await getWall(db), words: await words(db, all), serverTime: Date.now() });
    }

    if (path === '/wall' && method === 'PUT') {
      const b = await body();
      const w = await getWall(db);
      for (const k of ['scene', 'accept', 'message', 'question', 'photo', 'countdownTo', 'countdownFrom']) {
        if (!(k in b)) continue;
        if (k === 'accept') w[k] = !!b[k];
        else if (k.startsWith('countdown')) w[k] = Math.max(0, Number(b[k]) || 0);
        else w[k] = String(b[k] ?? '').slice(0, 160);
      }
      w.updatedAt = Date.now();
      await db.prepare('INSERT INTO kv (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind('wall', JSON.stringify(w)).run();
      return json({ ok: true, wall: w });
    }

    if (path === '/words' && method === 'POST') {
      const w0 = await getWall(db);
      if (!w0.accept) return json({ error: 'Le mur est en pause, réessayez dans un instant' }, 423);
      const { text, error } = cleanWord((await body()).text);
      if (error) return json({ error }, 422);
      const key = text.toLocaleLowerCase('fr').normalize('NFD').replace(/[̀-ͯ]/g, '');
      const now = Date.now();
      const prev = await db.prepare('SELECT id FROM words WHERE key = ?').bind(key).first();
      if (prev) {
        await db.prepare('UPDATE words SET count = count + 1, at = ? WHERE key = ?').bind(now, key).run();
      } else {
        await db.prepare('INSERT INTO words (id, key, text, count, hidden, at) VALUES (?, ?, ?, 1, 0, ?)').bind(crypto.randomUUID().slice(0, 8), key, text, now).run();
        // Démo publique : on garde les 300 mots les plus récents
        await db.prepare(`DELETE FROM words WHERE id NOT IN (SELECT id FROM words ORDER BY at DESC LIMIT ${MAX_WORDS})`).run();
      }
      const w = await db.prepare('SELECT id, key, text, count, hidden, at FROM words WHERE key = ?').bind(key).first();
      return json({ ok: true, word: { ...w, hidden: !!w.hidden } });
    }

    if (path === '/words/hide' && method === 'POST') {
      const { id, hidden } = await body();
      await db.prepare('UPDATE words SET hidden = ? WHERE id = ?').bind(hidden ? 1 : 0, String(id || '')).run();
      return json({ ok: true });
    }

    if (path === '/words/clear' && method === 'POST') {
      await db.prepare('DELETE FROM words').run();
      return json({ ok: true });
    }

    return json({ error: 'non disponible dans la démo en ligne' }, 404);
  } catch (e) {
    return json({ error: 'erreur du serveur de démo' }, 500);
  }
}

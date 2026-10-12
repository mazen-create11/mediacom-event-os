// Mode vitrine : une tablette posée sur le stand sans personne devant lance le diaporama
// (MediaScène puis réalisations). Un toucher le referme. Réglable par appareil.
import { MEDIASCENE, PHOTOS } from './data.js';
import { drawerOpen } from './ui.js';

const KEY = 'mc_attract_min';
export const attractMinutes = () => { try { return Number(localStorage.getItem(KEY) ?? 3); } catch { return 3; } };
export const setAttractMinutes = (m) => { try { localStorage.setItem(KEY, String(m)); } catch { /* */ } };

export function initAttract(present) {
  let last = Date.now();
  const bump = () => { last = Date.now(); };
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => document.addEventListener(ev, bump, { passive: true, capture: true }));

  const playlist = () => [
    ...MEDIASCENE.photos,
    ...PHOTOS.filter((p) => p.w > p.h).sort(() => Math.random() - 0.5).slice(0, 10),
  ];

  setInterval(() => {
    const min = attractMinutes();
    if (!min || document.hidden) return;
    if (Date.now() - last < min * 60000) return;
    const busy = drawerOpen() || document.querySelector('#sheet')?.open || document.querySelector('#show.is-open');
    if (busy) return;
    bump();
    present(playlist(), 0, 'Le son · la lumière · l’image', { attract: true });
  }, 5000);
}

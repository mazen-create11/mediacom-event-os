// Référentiel partagé par toutes les pages. Seules des informations vérifiées y figurent
// (site mediacom.org, fiches techniques MediaScène) ; le reste est générique ou marqué « à valider ».

export const COMPANY = {
  name: 'Médiacom',
  baseline: 'Le son, la lumière, l’image',
  since: 1999,
  address: '25 bd de Saint-Marcel, 13011 Marseille',
  phone: '04 91 35 55 55',
  phoneAlt: '04 88 80 13 77',
  email: 'contact@mediacom.org',
  site: 'https://www.mediacom.org',
  siteScene: 'https://www.mediascene.eu',
  reviews: 'https://maps.app.goo.gl/nyXYYP8LgnCxwS8D6',
};

export const OPERATORS = [
  { id: 'mazen', name: 'Mazen', role: 'Développement commercial' },
  { id: 'coraline', name: 'Coraline', role: 'Chargée de projets' },
  { id: 'nolan', name: 'Nolan', role: 'Direction technique' },
  { id: 'eric', name: 'Éric', role: 'Direction' },
];
export const opById = (id) => OPERATORS.find((o) => o.id === id) || OPERATORS[0];
export const initial = (name = '?') => name.trim().charAt(0).toUpperCase();

export const EVENT_TYPES = [
  'Séminaire / plénière', 'Soirée de gala', 'Congrès / convention', 'Concert / festival',
  'Salon / stand', 'Lancement produit', 'Événement public', 'Événement privé',
];

export const NEEDS = [
  'Son', 'Lumière', 'Écran LED', 'Vidéo & captation', 'Streaming', 'Scène mobile MediaScène',
  'Structure & levage', 'Lasers & effets', 'Mapping laser façade', 'Distribution électrique', 'Mobilier',
];

export const AUDIENCE = ['< 100', '100 – 300', '300 – 800', '800 – 2 000', '2 000 +'];
export const BUDGETS = ['< 5 k€', '5 – 15 k€', '15 – 40 k€', '40 k€ +', 'À définir'];

export const TEMPS = {
  hot: { label: 'Chaud', hint: 'Projet daté, budget en vue' },
  warm: { label: 'Tiède', hint: 'Projet dans les 6 mois' },
  cold: { label: 'Froid', hint: 'Veille, catalogue' },
};

// Univers du book et photos réelles issues de mediacom.org (légendes génériques, à valider par Éric)
export const UNIVERS = [
  { id: 'all', label: 'Tout' },
  { id: 'scene', label: 'Concerts & festivals' },
  { id: 'gala', label: 'Galas & soirées' },
  { id: 'corporate', label: 'Conventions & plénières' },
  { id: 'lumiere', label: 'Mises en lumière' },
];

export const PHOTOS = [
  { f: 'scene-m-rouge', u: 'scene', c: 'Plateau, structure et lumière', w: 1600, h: 1328 },
  { f: 'regie-concert', u: 'scene', c: 'Régie façade, concert en salle', w: 1600, h: 1065 },
  { f: 'facade-violette', u: 'lumiere', c: 'Mise en lumière de façade, Marseille', credit: 'Sophie Vernet', w: 1080, h: 685 },
  { f: 'gala-award', u: 'gala', c: 'Remise de prix, écran LED et lumière', w: 1600, h: 900 },
  { f: 'plateau-bleu-rouge', u: 'scene', c: 'Plateau concert, faisceaux et fumée', w: 1800, h: 1009 },
  { f: 'convention-palais', u: 'corporate', c: 'Convention, écran et sonorisation', w: 1080, h: 886 },
  { f: 'festival-plein-air', u: 'scene', c: 'Festival en plein air', w: 1600, h: 1067 },
  { f: 'facade-bleu-rose', u: 'lumiere', c: 'Mise en lumière de façade, Marseille', w: 1600, h: 1200 },
  { f: 'gala-ring', u: 'gala', c: 'Gala sportif, ring et écran géant', w: 960, h: 1280 },
  { f: 'artifices-notre-dame', u: 'lumiere', c: 'Artifices, drones et lasers à Marseille', w: 1200, h: 912 },
  { f: 'pleniere-palais', u: 'corporate', c: 'Plénière, installation avant ouverture', w: 1080, h: 864 },
  { f: 'concert-camargue', u: 'scene', c: 'Concert, scène et écran', w: 1600, h: 1200 },
  { f: 'lasers', u: 'lumiere', c: 'Show lasers', w: 1800, h: 1200 },
  { f: 'fan-zone-marseille', u: 'scene', c: 'Fan zone UEFA Euro 2016, Marseille', credit: 'Benjamin Gayté-Sorbier', w: 960, h: 640 },
  { f: 'soiree-jardin', u: 'gala', c: 'Réception en jardin, éclairage d’ambiance', w: 900, h: 1200 },
  { f: 'facade-rouge', u: 'lumiere', c: 'Projection de façade pour les fêtes', w: 1024, h: 1280 },
  { f: 'concert-plage', u: 'scene', c: 'Concert en bord de mer', w: 800, h: 533 },
  { f: 'artifices-port', u: 'lumiere', c: 'Spectacle pyrotechnique sur le port', w: 1080, h: 720 },
  { f: 'soiree-piscine', u: 'gala', c: 'Soirée en terrasse, mise en lumière', w: 1079, h: 1684 },
  { f: 'faisceaux-rouges', u: 'scene', c: 'Ambiance faisceaux', w: 1800, h: 1009 },
  { f: 'vieux-port-scene', u: 'scene', c: 'Grande scène en centre-ville', w: 1000, h: 669 },
  { f: 'facade-bleue', u: 'lumiere', c: 'Mise en lumière en extérieur', w: 1200, h: 1600 },
  { f: 'concert-couchant', u: 'scene', c: 'Concert au coucher du soleil', w: 900, h: 1200 },
];
export const photo = (f, small = false) => `/assets/photos/${f}${small ? '-s' : ''}.jpg`;

// MediaScène : chiffres issus des fiches techniques et de la note de calcul (dossier prospection)
export const MEDIASCENE = {
  photos: [
    { f: 'mediascene-concert', c: 'MediaScène 60 m², concert en plein air' },
    { f: 'mediascene-vieux-port', c: 'MediaScène sur le Vieux-Port, Marseille' },
    { f: 'mediascene-festival', c: 'MediaScène en festival' },
    { f: 'mediascene-nuit', c: 'MediaScène en exploitation de nuit' },
    { f: 'mediascene-les-gets', c: 'MediaScène aux Gets' },
  ],
  specs: [
    { v: '60 m²', l: 'Podium mobile hydraulique' },
    { v: '2 h', l: 'Montage, déploiement 100 % hydraulique' },
    { v: '2', l: 'Personnes suffisent au déploiement' },
    { v: '1 600 kg', l: 'Charge en toiture (CMU)' },
    { v: '72 km/h', l: 'Vent de calcul, soufflet anti-vent' },
    { v: '400 kg', l: 'Son accroché par côté' },
    { v: '3,5 t', l: 'Remorque' },
    { v: '+18 m²', l: 'Extensions en option, logos sponsors' },
  ],
};

export const GEAR = ['L-Acoustics A15 · KS21', 'Robe iForte', 'Yamaha DM3', 'Novastar', 'Blackmagic ATEM'];

// Barème indicatif : valeurs de départ héritées, NON validées. Éric les corrige dans l'onglet Devis.
export const TARIFS_DEFAULT = {
  status: 'A_VALIDER',
  validatedBy: '',
  validatedAt: 0,
  base: 1500,
  audience: [
    { max: 200, add: 0 },
    { max: 500, add: 1200 },
    { max: Infinity, add: 2500 },
  ],
  days: 0.6, // coefficient par jour supplémentaire
  options: [
    { id: 'son', label: 'Sonorisation', price: 1400 },
    { id: 'lumiere', label: 'Lumière', price: 1600 },
    { id: 'led', label: 'Écran LED', price: 2800 },
    { id: 'stream', label: 'Captation & streaming', price: 1200 },
    { id: 'scene', label: 'Scène mobile MediaScène', price: null },
    { id: 'mapping', label: 'Mapping laser façade', price: null },
  ],
  spread: 1.35,
};

// Consommations indicatives (à confirmer par Nolan) pour le calcul électrique du stand
export const LOADS_DEFAULT = {
  l1: [
    { id: 'led', name: 'Mur LED 4 × 2 m', w: 2200 },
    { id: 'regie', name: 'Régie vidéo', w: 450 },
  ],
  l2: [
    { id: 'lyre1', name: 'Lyre 1', w: 900 },
    { id: 'lyre2', name: 'Lyre 2', w: 900 },
    { id: 'son', name: 'Son du stand', w: 550 },
  ],
};
export const LINE_MAX = 3680; // 16 A × 230 V

// Référentiel partagé par toutes les pages. Seules des informations vérifiées y figurent
// (site mediacom.org, fiches techniques MediaScène, contrôle des faits du 12/10/2026) ;
// le reste est générique ou marqué « à valider ».

export const COMPANY = {
  name: 'Médiacom',
  baseline: 'Le son, la lumière, l’image',
  since: 1999,
  address: '25 bd de Saint-Marcel, 13011 Marseille',
  phone: '04 91 35 55 55',
  phoneAlt: '04 88 80 13 77',
  email: 'contact@mediacom.org',
  emailEric: 'eric.algoud@mediacom.org',
  site: 'https://www.mediacom.org',
  siteScene: 'https://www.mediascene.eu',
  reviews: 'https://maps.app.goo.gl/nyXYYP8LgnCxwS8D6',
};

// Repères vérifiés, utilisables face aux agences
export const PROOFS = [
  { v: '1999', l: 'Prestataire technique à Marseille' },
  { v: '2004', l: 'Ville de Marseille, cliente depuis' },
  { v: '24/7', l: 'Permanence technique' },
  { v: '98 %', l: 'Parc lumière en LED' },
];

export const OPERATORS = [
  { id: 'mazen', name: 'Mazen', role: 'Business Developer' },
  { id: 'coraline', name: 'Coraline', role: 'Chargée de projets' },
  { id: 'nolan', name: 'Nolan', role: 'Direction technique' },
  { id: 'eric', name: 'Éric', role: 'Direction' },
];
export const opById = (id) => OPERATORS.find((o) => o.id === id) || OPERATORS[0];
export const initial = (name = '?') => name.trim().charAt(0).toUpperCase();

// Le salon attire surtout des agences séminaires et événementielles
export const PROFILES = ['Agence événementielle', 'Agence séminaire / DMC', 'Entreprise', 'Lieu / hôtel', 'Collectivité', 'Autre'];
export const VOLUMES = ['1 à 5 / an', '6 à 20 / an', 'Plus de 20 / an'];
export const isAgency = (l) => /^Agence/.test(l.profile || '');

export const EVENT_TYPES = [
  'Séminaire', 'Convention / plénière', 'Soirée d’entreprise', 'Congrès',
  'Incentive / team building', 'Salon / stand', 'Événement public', 'Autre',
];

export const NEEDS = [
  'Son', 'Lumière', 'Écran LED', 'Vidéo & captation', 'Streaming / hybride', 'Structure & levage',
  'Scène mobile MediaScène', 'Mapping laser façade', 'Lasers & effets', 'Distribution électrique', 'Mobilier',
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
  { id: 'corporate', label: 'Séminaires & conventions' },
  { id: 'gala', label: 'Soirées & galas' },
  { id: 'lumiere', label: 'Mises en lumière' },
  { id: 'scene', label: 'Concerts & plein air' },
];

export const PHOTOS = [
  { f: 'convention-palais', u: 'corporate', c: 'Convention, écran et sonorisation', w: 2880, h: 2363 },
  { f: 'gala-award', u: 'gala', c: 'Remise de prix, écran LED et lumière', w: 2880, h: 1620 },
  { f: 'pleniere-palais', u: 'corporate', c: 'Plénière, installation avant ouverture', w: 2880, h: 2304 },
  { f: 'scene-m-rouge', u: 'scene', c: 'Plateau, structure et lumière', w: 2880, h: 2390 },
  { f: 'facade-violette', u: 'lumiere', c: 'Mise en lumière de façade, Marseille', credit: 'Sophie Vernet', w: 2880, h: 1827 },
  { f: 'soiree-jardin', u: 'gala', c: 'Réception en jardin, éclairage d’ambiance', w: 2160, h: 2880 },
  { f: 'regie-concert', u: 'scene', c: 'Régie façade, concert en salle', w: 2880, h: 1917 },
  { f: 'facade-bleu-rose', u: 'lumiere', c: 'Mise en lumière de façade, Marseille', w: 2880, h: 2160 },
  { f: 'gala-ring', u: 'gala', c: 'Gala sportif, ring et écran géant', w: 2160, h: 2880 },
  { f: 'plateau-bleu-rouge', u: 'scene', c: 'Plateau, faisceaux et fumée', w: 2880, h: 1614 },
  { f: 'soiree-piscine', u: 'gala', c: 'Soirée en terrasse, mise en lumière', w: 1845, h: 2880 },
  { f: 'artifices-notre-dame', u: 'lumiere', c: 'Artifices, drones et lasers à Marseille', w: 2880, h: 2189 },
  { f: 'festival-plein-air', u: 'scene', c: 'Festival en plein air', w: 2880, h: 1921 },
  { f: 'lasers', u: 'lumiere', c: 'Show lasers', w: 2880, h: 1921 },
  { f: 'concert-camargue', u: 'scene', c: 'Concert, scène et écran', w: 2880, h: 2160 },
  { f: 'facade-rouge', u: 'lumiere', c: 'Projection de façade pour les fêtes', w: 2304, h: 2880 },
  { f: 'fan-zone-marseille', u: 'scene', c: 'Fan zone UEFA Euro 2016, Marseille', credit: 'Benjamin Gayté-Sorbier', w: 2880, h: 1920 },
  { f: 'artifices-port', u: 'lumiere', c: 'Spectacle pyrotechnique sur le port', w: 2880, h: 1920 },
  { f: 'faisceaux-rouges', u: 'scene', c: 'Ambiance faisceaux', w: 2880, h: 1614 },
  { f: 'concert-plage', u: 'scene', c: 'Concert en bord de mer', w: 2880, h: 1919 },
  { f: 'vieux-port-scene', u: 'scene', c: 'Grande scène en centre-ville', w: 2880, h: 1927 },
  { f: 'facade-bleue', u: 'lumiere', c: 'Mise en lumière en extérieur', w: 2160, h: 2880 },
  { f: 'concert-couchant', u: 'scene', c: 'Concert au coucher du soleil', w: 2160, h: 2880 },
];
export const photo = (f, small = false) => `/assets/photos/${f}${small ? '-s' : ''}.jpg`;

// Vidéos de prestations (muettes, en boucle) : remplies quand des vidéos réelles sont fournies
export const VIDEOS = [
  // Clip officiel de la chaîne YouTube « mediacom studio 13 » (intégré sur mediacom.org)
  { f: 'studio13-plateau', u: 'corporate', k: 'Médiacom Studio 13', c: 'Plateau TV, murs LED et régie lumière', w: 1920, h: 1080, dur: 13.4 },
  // Concert d'Allauch, juillet 2026 : régie, faisceaux, public (artiste non identifiable). Droits à confirmer par Éric.
  { f: 'allauch-triptyque', u: 'scene', k: 'Concert en plein air', c: 'Régie, faisceaux et public', w: 1728, h: 864, dur: 9 },
  { f: 'studio13-regie', u: 'corporate', k: 'Médiacom Studio 13', c: 'Plateaux LED et console son', w: 1920, h: 1080, dur: 7.5 },
];
export const video = (f) => `/assets/videos/${f}.mp4`;
export const poster = (f) => `/assets/videos/${f}.jpg`;

// MediaScène : fiches techniques 60 m² et 3-en-1 80/100/120 m², note de calcul 60 m²
export const MEDIASCENE = {
  range: 'De 60 à 120 m²',
  photos: [
    { f: 'mediascene-concert', c: 'MediaScène 60 m², concert en plein air' },
    { f: 'mediascene-vieux-port', c: 'MediaScène sur le Vieux-Port, Marseille' },
    { f: 'mediascene-festival', c: 'MediaScène en festival' },
    { f: 'mediascene-nuit', c: 'MediaScène en exploitation de nuit' },
    { f: 'mediascene-les-gets', c: 'MediaScène aux Gets' },
  ],
  models: [
    {
      id: 'ms60', label: '60 m²', name: 'MediaScène 60', sizes: [60],
      deck: { 60: [9.08, 6.58] }, clearance: 4.87, deckH: 1.05, trailer: 11.02,
      key: [
        { v: '9,08 × 6,58 m', l: 'Plateau de 60 m²' },
        { v: '1,6 t', l: 'Charge en toiture' },
        { v: '72 km/h', l: 'Vent de calcul, bâche à soufflet' },
        { v: '2 h', l: 'Montage, à 2 personnes' },
      ],
      specs: [
        { v: '9,08 × 6,58 m', l: 'Plateau de 60 m²' },
        { v: '3,5 t', l: 'Remorque, 2 essieux' },
        { v: '100 %', l: 'Déploiement hydraulique' },
        { v: '1,6 t', l: 'Charge en toiture (CMU)' },
        { v: '4,87 m', l: 'Hauteur sous points moteurs' },
        { v: '400 kg', l: 'Accroche son par côté' },
        { v: '72 km/h', l: 'Vent de calcul, bâche à soufflet' },
        { v: '2 h', l: 'Montage, à 2 personnes' },
      ],
    },
    {
      id: 'ms120', label: '80 · 100 · 120 m²', name: 'Scène 3-en-1', sizes: [80, 100, 120],
      deck: { 80: [12.3, 6.86], 100: [12.3, 8.11], 120: [12.3, 9.36] }, clearance: 7.97, deckH: 1.45, trailer: 12.46,
      key: [
        { v: '12,30 × 9,36 m', l: 'Plateau jusqu’à 120 m²' },
        { v: '10,1 t', l: 'Charge en toiture' },
        { v: '75 km/h', l: 'Homologation, version bâchée' },
        { v: '7,97 m', l: 'Sous points moteurs' },
      ],
      specs: [
        { v: '80 · 100 · 120', l: 'Trois tailles de plateau en m², de série' },
        { v: '12,30 × 9,36 m', l: 'Plateau en version 120 m²' },
        { v: '10,1 t', l: 'Charge en toiture, 68 points' },
        { v: '7,97 m', l: 'Hauteur sous points moteurs' },
        { v: '1,2 t', l: 'Accroche son par aile' },
        { v: '75 km/h', l: 'Homologation, version bâchée' },
        { v: '1,20 à 1,70 m', l: 'Hauteur de plancher' },
        { v: '26 t', l: 'Semi-remorque, hydraulique' },
      ],
    },
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
    { id: 'scene', label: 'Scène mobile MediaScène (60 à 120 m²)', price: null },
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

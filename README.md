# Médiacom Event OS · application de stand

Application de salon pour Médiacom (prestataire technique son, lumière, image, scène mobile MediaScène).
Un Mac sur le Wi-Fi du stand sert l'application à toutes les tablettes, au mur LED et aux téléphones des visiteurs. Aucun internet requis.

## Démarrer

Double-cliquer **`Lancer le hub du stand.command`** (ou `node server.js`). Node.js 18+ suffit : aucune dépendance à installer.
La page `http://localhost:3000/setup` s'ouvre avec les QR codes de mise en service.

| Écran | Adresse | Pour qui |
|---|---|---|
| Application tablette | `https://<ip>:3443/?t=<jeton>` (QR « Équipe ») | Mazen, Coraline, Nolan, Éric |
| Console iPhone | `/master` | régie en mobilité |
| Mur LED 4 × 2 m | `http://<ip>:3000/mur` | ordinateur du mur, double-clic = plein écran |
| Page visiteur | `http://<ip>:3000/nuage` | téléphones des visiteurs (QR affiché sur le mur) |
| Contact visiteur | `/contact` | fiche Médiacom, vCard |
| Bilan du jour | `/bilan` | Éric, en fin de journée (imprimer en PDF) |
| Mise en service | `http://localhost:3000/setup` | Mac du hub uniquement |

## Ce que fait l'application

- **Régie** : contacts du jour, VU-mètre de cadence, contacts chauds et agences, tranches d'équipe avec présence en direct, timeline par demi-heure, besoins les plus demandés, aperçu du mur, lien vers le **bilan du jour**.
- **Contacts** : saisie en 20 s (Express, lecture du QR d'un badge, photo de carte) pensée pour les agences (profil, nombre d'événements par an), indicateur de complétude de la fiche, détection des doublons, fiche, transfert à un collègue (sa tablette sonne), QR vCard sans réseau, export CSV (contacts « démo » exclus).
- **Mur LED** : 5 scènes pilotées depuis la tablette ou l'iPhone (nuage de mots, showreel photos et vidéos, MediaScène 60 à 120 m², message révélé mot à mot avec compte à rebours optionnel, noir), modération, question du nuage, fond, aperçu plein écran sur la tablette.
- **Book** : deux ouvertures (séminaires et conventions ; MediaScène 60 m² ou 3-en-1 80 à 120 m², chiffres des fiches techniques), 23 photos réelles de mediacom.org agrandies à 2 880 px, mode présentation plein écran.
- **Devis express** : fourchette indicative, barème éditable et validable par Éric (bandeau « à valider » tant qu'il ne l'a pas fait), impression.
- **Scène 3D** : plateau, mur LED incurvé animé, truss, lyres et faisceaux, salle en plénière, gala ou concert ; résolution et cabinets calculés. Format **MediaScène** à l'échelle des fiches (60, 80, 100, 120 m²) avec déploiement hydraulique animé.
- **Électricité** : charge des deux lignes 16 A, alerte à 80 % et en surcharge.
- **Bilan du stand** (`/bilan`) : document imprimable en PDF pour Éric (contacts chauds à rappeler, profils, équipe, besoins, affluence, mots du mur), résumé envoyé par e-mail.
- **Pass & réglages** : QR visiteurs (fiche contact, site, MediaScène, avis Google), appairage, Wi-Fi du stand, nom de l'événement.

## Mise en service (une fois)

1. Routeur Wi-Fi du stand : le Mac du hub, les tablettes et l'ordinateur du mur sur le même réseau. Renseigner le Wi-Fi dans l'onglet Pass : le mur affiche alors un QR « Rejoindre le Wi-Fi » pour les visiteurs.
2. Chaque iPad : QR « Certificat » → installer le profil → Réglages › Général › Informations › Réglages des certificats → activer « Mediacom Stand CA ». Sans cette étape l'app marche, mais sans caméra en direct ni cache hors-ligne.
3. Chaque iPad : QR « Équipe » → ouvrir → Partager › Sur l'écran d'accueil → choisir l'opérateur.
4. Ordinateur du mur : ouvrir l'adresse « Mur LED » dans Chrome, double-clic pour le plein écran.

## Sécurité et données

- Contacts = données personnelles : accès réservé aux appareils appairés (jeton dans `data/config.json`). Les visiteurs n'accèdent qu'à l'envoi de mots et à la fiche contact.
- Mots visiteurs : 28 caractères, liens et grossièretés refusés, envois illimités, modération depuis la tablette.
- Données dans `data/` (exclu de git) : `db.json`, photos de cartes, certificats. Export CSV en fin de journée depuis l'onglet Contacts.
- Hors réseau, chaque tablette garde ses saisies et les renvoie à la reconnexion.

## Développement

- Hub de test sans toucher aux vraies données : `PORT=3100 HTTPS=0 DATA_DIR=/tmp/essai node server.js`.
- Photos : les versions agrandies (Real-ESRGAN, contrôlées une à une) sont dans `_research/upscaled/` et priment sur les originaux au build.

- `public/` : pages et modules ES sans build. `tools/` : `npm install && npm run build` régénère polices, bundles three.js / QR / jsQR, photos et icônes.
- `_legacy/` : version précédente (référence). `_research/` : photos sources, logo, CSS du site.

## À valider par l'équipe

- Éric : barème du devis, droits d'usage des photos créditées, compte Instagram (non affiché tant qu'il n'est pas confirmé).
- Nolan : consommations réelles du mur LED et des lyres (onglet Électricité, valeurs indicatives).

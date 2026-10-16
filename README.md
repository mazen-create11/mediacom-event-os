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
| Écran LED (sortie pure) | `http://<ip>:3000/ecran` | ordinateur relié au boîtier vidéo ; suit la tablette, double-clic ou F = plein écran |
| Écran figé sur une scène | `/ecran/nuage` `/ecran/sondage` `/ecran/questions` `/ecran/showreel` `/ecran/mediascene` `/ecran/message` `/ecran/externe` `/ecran/noir` | une source par entrée du boîtier de commutation |
| Mur habillé (en-tête, bandeau) | `http://<ip>:3000/mur` | variante de l'écran avec la marque et le bandeau |
| Page visiteur | `http://<ip>:3000/nuage` | téléphones des visiteurs (QR affiché sur l'écran) : nuage, sondage, questions |
| Contact visiteur | `/contact` | fiche Médiacom, vCard |
| Bilan du jour | `/bilan` | Éric, en fin de journée (imprimer en PDF) |
| Mise en service | `http://localhost:3000/setup` | Mac du hub uniquement |

## Ce que fait l'application

- **Régie** : contacts du jour, VU-mètre de cadence, contacts chauds et agences, tranches d'équipe avec présence en direct, timeline par demi-heure, besoins les plus demandés, aperçu du mur, lien vers le **bilan du jour**.
- **Contacts** : saisie en 20 s (Express, lecture du QR d'un badge, photo de carte) pensée pour les agences (profil, nombre d'événements par an), indicateur de complétude de la fiche, détection des doublons, fiche, transfert à un collègue (sa tablette sonne), QR vCard sans réseau, export CSV (contacts « démo » exclus).
- **Écran** : 8 scènes pilotées depuis la tablette ou l'iPhone : **nuage de mots**, **sondage** (2 à 6 réponses, choix multiple, vote ouvert ou clos, barres et pourcentages en direct), **questions du public** (envoi, vote des participants, épingler, répondu, masquer), showreel, MediaScène 60 à 160 m², message mot à mot avec compte à rebours, page externe (l'outil d'un tiers plein écran), noir. Modération, limite de réponses par personne, clôture. **Habillage** en quelques secondes : sobre (défaut, rien ne bouge), lumière, couleur unie, dégradé, photo ; nom et logo du client ; signature Médiacom. Le concept vendu aux agences : une session interactive administrée par Médiacom, aux couleurs du client.
- **Book** : deux ouvertures (séminaires et conventions ; MediaScène 60 m², 3-en-1 80 à 120 m², 160 m² avec régie, chiffres des fiches techniques), photos réelles de mediacom.org agrandies à 2 880 px, mode présentation plein écran. Sélection séminaire par défaut (concerts, festivals et gala sportif en réserve, réglage « Tout le book » dans Pass).
- **Scène 3D** : plateau, mur LED incurvé animé, truss, lyres et faisceaux, salle en plénière, gala ou concert ; résolution et cabinets calculés. Format **MediaScène** à l'échelle des fiches (60, 80, 100, 120 m²) avec déploiement hydraulique animé.
- **Bilan du stand** (`/bilan`) : document imprimable en PDF pour Éric (contacts chauds à rappeler, profils, équipe, besoins, affluence, mots du mur), résumé envoyé par e-mail.
- **Pass & réglages** : QR visiteurs (fiche contact, site, MediaScène, avis Google), appairage, Wi-Fi du stand, nom de l'événement, **validation du Book** (chaque référence retirée ou remise d'un toucher, liste à copier pour Éric).
- **Sessions interactives** (onglet Écran, module 04) : une prestation = une session (nom, client, question d'ouverture). « Nouvelle session » archive la précédente avec ses résultats et repart à zéro sans changer les liens. **Rapport de session** `/rapport?id=live` ou `?id=<session>` : A4 imprimable (mots, sondage, questions, compteurs), CSV. C'est ce que le client emporte.
- **Écran surveillé** : la page `/ecran` se signale toutes les 5 s, la tablette affiche « Écran Nuage · 1600×800 · plein écran » ou « Écran perdu depuis 20 s ». Veille bloquée, dernier état gardé en local. Lanceurs kiosque pour l'ordinateur du mur : `tools/ecran/Ecran-Mediacom.bat` (Windows) et `.command` (Mac).

## Mise en service (une fois)

1. Routeur Wi-Fi du stand : le Mac du hub, les tablettes et l'ordinateur du mur sur le même réseau. Renseigner le Wi-Fi dans l'onglet Pass : le mur affiche alors un QR « Rejoindre le Wi-Fi » pour les visiteurs.
2. Chaque iPad : QR « Certificat » → installer le profil → Réglages › Général › Informations › Réglages des certificats → activer « Mediacom Stand CA ». Sans cette étape l'app marche, mais sans caméra en direct ni cache hors-ligne.
3. Chaque iPad : QR « Équipe » → ouvrir → Partager › Sur l'écran d'accueil → choisir l'opérateur.
4. Ordinateur du mur : ouvrir l'adresse « Écran LED » (`/ecran`) dans Chrome, double-clic pour le plein écran. Les adresses figées (`/ecran/noir`, `/ecran/sondage`…) servent quand le mur est alimenté par un boîtier de commutation : une entrée par scène.

## Sécurité et données

- Contacts = données personnelles : accès réservé aux appareils appairés (jeton dans `data/config.json`). Les visiteurs n'accèdent qu'à l'envoi de mots et à la fiche contact.
- Participation visiteurs : mots de 28 caractères, questions de 180, liens et grossièretés refusés, limite de mots par personne réglable (illimité par défaut), trois questions par personne et par deux minutes, modération depuis la tablette. Identité = un identifiant anonyme du navigateur.
- Données dans `data/` (exclu de git) : `db.json`, photos de cartes, certificats. Export CSV en fin de journée depuis l'onglet Contacts.
- Hors réseau, chaque tablette garde ses saisies et les renvoie à la reconnexion.

## Développement

- Hub de test sans toucher aux vraies données : `PORT=3100 HTTPS=0 DATA_DIR=/tmp/essai node server.js`.
- Démo en ligne : `npx wrangler@4 pages deploy --branch main` (Cloudflare Pages + D1 ; schéma dans `schema.sql`, à rejouer avec `wrangler d1 execute mediacom-event-os-demo --remote --file schema.sql` après toute nouvelle table).
- VPS : `bash tools/vps/deployer.sh root@hôte domaine [clé]` installe Node, Caddy (HTTPS) et le service systemd.
- Photos : les versions agrandies (Real-ESRGAN, contrôlées une à une) sont dans `_research/upscaled/` et priment sur les originaux au build.

- `public/` : pages et modules ES sans build. `tools/` : `npm install && npm run build` régénère polices, bundles three.js / QR / jsQR, photos et icônes.
- `_legacy/` : version précédente (référence). `_research/` : photos sources, logo, CSS du site.

## À valider par l'équipe

- Éric : droits d'usage des photos créditées, compte Instagram (non affiché tant qu'il n'est pas confirmé), sélection séminaire du Book.

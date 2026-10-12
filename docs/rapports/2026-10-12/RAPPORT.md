# Médiacom Event OS · rapport du 12/10/2026

Refonte complète de l'application de stand Médiacom, faite avec Claude Code à partir de la version Antigravity du 09/10.

## Liens

| Quoi | Adresse |
|---|---|
| Démo en ligne (app) | https://mediacom-event-os.pages.dev |
| Mur LED en ligne | https://mediacom-event-os.pages.dev/mur |
| Page visiteur en ligne | https://mediacom-event-os.pages.dev/nuage |
| Code (GitHub, **public** depuis le 12/10, à repasser en privé plus tard) | https://github.com/mazen-create11/mediacom-event-os |
| Hub du salon (Mac) | double-clic `Lancer le hub du stand.command`, puis `http://localhost:3000/setup` |

Hébergement : Cloudflare Pages, projet `mediacom-event-os` (compte de Mazen). Base D1 `mediacom-event-os-demo` (id `753489c4-6356-49e3-a996-23a97546c1ba`) pour les mots et l'état du mur de la démo. Publication : `npx wrangler@4 pages deploy --branch main` depuis la racine du projet (le dossier `functions/` part avec).

## Ce qui a été fait

1. **DA « Régie de nuit »** tirée de 7 recherches Pinterest (consoles lumière, plugins audio, interfaces bleu nuit) : modules rack, touches à LED, VU-mètre, tranches de console, faisceaux. Un accent `#3192ff`, rouge réservé aux contacts chauds. Jost + JetBrains Mono embarquées. Planches : `_archive/2026-10-12/pinterest/`.
2. **Hub `server.js`** sans dépendance : HTTP 3000, HTTPS 3443 avec autorité de certification du stand, temps réel SSE, appairage par jeton révocable, file d'attente hors ligne (IndexedDB), base robuste (fichier illisible mis de côté, sauvegarde tournante), lecture vidéo par plages (Safari).
3. **8 écrans tablette** : Régie, Contacts (saisie Express, badge QR, carte), Mur LED (5 scènes), Book, Devis, Scène 3D, Électricité, Pass. Plus `/mur`, `/nuage`, `/contact`, `/master` (iPhone), `/setup`, `/bilan`.
4. **Public visé : agences séminaires et événementielles** (consigne de Mazen) : profil et nombre d'événements par an à la saisie, filtre « Agences », démo, suggestions du mur, Book ouvert sur séminaires et conventions.
5. **MediaScène de 60 à 120 m²** (consigne de Mazen) : chiffres relus dans `~/Desktop/prospection-podium-mobile/07-docs/` (60 m² sur remorque 3,5 t ; 3-en-1 80/100/120 m², 12,30 × 9,36 m, 10,1 t en toiture, 75 km/h bâchée). Fiches 70, 120 et 160 m² du même dossier non reprises (hors gamme annoncée). Scène 3D : format MediaScène à l'échelle, déploiement hydraulique animé en 5 étapes.
6. **Mur LED** : nuage sans chevauchement, showreel photos et vidéos, scène MediaScène, message révélé mot à mot avec compte à rebours, aperçu plein écran sur tablette.
7. **Photos** : 28 agrandies à 2 880 px (Real-ESRGAN ×4 mélangé à 10 % de Lanczos). 8 refaites sans IA car l'IA abîmait visages ou textes : 02, 10, 15, 42, 53, 54, 61, hero-vieux-port. Sources gardées dans `_research/upscaled/`, planches de contrôle dans `_archive/2026-10-12/upscale-controle/`.
8. **Vidéos** : clip officiel YouTube « Médiacom Studio 13 » (2 plans) et triptyque 2:1 du concert d'Allauch (régie, faisceaux, public). Script `tools/video.sh`.
9. **Bilan du stand** `/bilan` : document imprimable pour Éric, résumé par e-mail.
10. **Démo en ligne vivante** : `functions/api/` (Cloudflare D1) partage les mots et le pilotage du mur ; les contacts restent dans l'appareil sur le lien public.
11. **Envois de mots illimités** (consigne de Mazen : « faut pas mettre de limites par envoi de mot »). Gardés : filtre insultes et liens, 28 caractères par mot.
12. Rôle de Mazen affiché : « Business Developer » (consigne de Mazen).

## Contrôles

- Relecture critique du code par un agent séparé : 15 défauts, tous corrigés et retestés (accès par tunnel, perte de contacts au rejeu, base corrompue, double appui, saisie écrasée, mot masqué rediffusé, QR d'appairage exposé, injection CSV…).
- Charge : 600 mots en 0,8 s avec 60 écrans abonnés, 0 perte.
- Base corrompue simulée : 3 contacts sur 3 récupérés depuis la tablette.
- Hors ligne : modification faite sans réseau puis transfert concurrent, les deux conservés au retour.
- Lighthouse `/nuage` mobile : performance 98, accessibilité 100.
- Vidéo lue dans WebKit (moteur Safari). Parcours en ligne téléphone → mur → pilotage vérifié.
- Scripts de test : `tools/tests/` (hub de test : `PORT=3100 HTTPS=0 DATA_DIR=/tmp/essai node server.js`).

## Incident

Le parcours de mediacom.org et mediascene.eu par l'agent de recherche vidéo (environ 10 requêtes en parallèle, 224 pages) a fait bloquer l'adresse IP du réseau de Mazen (62.212.108.215) par l'hébergeur des deux sites. Effet : depuis ce réseau (Mac et téléphone en Wi-Fi), les QR « mediacom.org » et « MediaScène » ne s'ouvrent pas. Les sites répondent normalement de l'extérieur (vérifié par firecrawl). En 4G ou au salon, aucun impact. Règle : ne plus parcourir ces sites qu'une page à la fois.

## À valider par l'équipe

- **Éric** : barème du devis (bandeau « à valider » affiché), droit de diffuser les images d'Allauch, fichiers d'origine des vidéos Facebook (Dôme, NRJ Extravadance, MediaScène sur sa page), droits des photos créditées (Benjamin Gayté-Sorbier, Sophie Vernet).
- **Nolan** : consommations réelles du mur LED et des lyres.
- **Mazen** : test sur un vrai iPad (certificat, caméra badge, écran d'accueil), repasser le dépôt GitHub en privé.

## Vidéos repérées non téléchargées

- Facebook Médiacom (facebook.com/mediacomsono) : after-movie Dôme de Marseille (Ishay Ribo), NRJ Extravadance (montage son et lumière), Festival de la Moline, régie des 150 ans de Longchamp, Little Stars Cannes.
- Facebook d'Éric Algoud : « scène mobile totalement hydraulique de 60 m² ».
- YouTube « Benjamin GAYTE-SORBIER » : gala des 20 ans du Club Marseille Métropole, spot Luxe Award (Grimaldi Forum).
- Instagram officiel : instagram.com/mediacom_officiel (et non « mediacom.marseille »).

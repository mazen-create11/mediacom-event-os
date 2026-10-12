# 🎛️ MEDIACOM EVENT OS - STAND & PROSPECTION HORS-LIGNE

> **Application Salon & Régie Tablette Multi-Sessions (100% Hors-Ligne)**  
> Conçue sur-mesure pour **Mediacom Marseille** (Son, Lumière, Vidéo & Scénographie).

---

## 🚀 Les Piliers Clés du Projet (Vision x10 / x100)

1. **100% Autonome Hors-Ligne (Offline-First)** :
   - Fonctionne sans aucune connexion internet grâce au Service Worker PWA et au stockage IndexedDB/LocalStorage.
   - Zéro bug ni temps de latence en salon, même si le réseau 4G/5G ou Wi-Fi du parc des expositions est saturé.

2. **Multi-Sessions & Coordination d'Équipe Instantanée** :
   - Profils dédiés : **Mazen** (Direction de Projet), **Nolan** (Direction Technique), **Coraline** (Chargée de Projets), **Éric** (Direction Générale).
   - **Transfert de Lead en 1 clic** : Si Coraline discute avec un prospect et doit le passer à Mazen ou Éric, elle clique sur *Passer à un collègue* avec une note interne. La tablette de Mazen émet instantanément un **carillon sonore de régie** et affiche un **toast d'alerte visuel**.

3. **Capture Prospect Multi-Mode (< 20 secondes)** :
   - Formulaire express avec tags techniques (Son L-Acoustics, Lyres Robe, Écran LED, Scénographie, etc.).
   - Mode Scan Badge Visiteur (QR / Code-barres).
   - Mode Scan Carte de Visite (photo & archivage).
   - Qualification immédiate : 🔥 Chaud / ⚡ Tiède / ❄️ Froid.

4. **Contrôleur du Mur LED & Nuage de Mots Live** :
   - Pilotez ce qui s'affiche sur l'écran 4x2m du stand depuis votre tablette.
   - Les visiteurs scannent le QR code géant avec leur smartphone et envoient leurs mots en direct sur le mur LED.
   - Modération en direct depuis la tablette.

5. **Simulateur 3D Scénographique Interactif** :
   - Rendu 3D temps réel du plateau séminaire avec écran LED incurvé, lyres asservies avec faisceaux lumineux en mouvement et mobilier lounge.
   - Idéal pour bluffer les agences événementielles directement sur le stand.

6. **Supervision Électrique Stand (Outil Technique Nolan)** :
   - Calcul en temps réel des charges sur les 2 lignes PC 16A (3 600W max par ligne = 7 200W total).
   - Détection des risques de disjonction (Écran LED + Lyres 900W + Son).

7. **Export & Sauvegarde** :
   - Export CSV Excel immédiat en fin de journée pour intégration directe dans votre CRM ou boîte mail.

---

## 📲 Comment l'installer sur les Tablettes (iPad & Android)

### Méthode 1 : En 1 Clic (Mode Stand-Alone PWA)
1. Ouvrez Safari sur l'iPad et allez sur l'URL locale de l'application (ou le fichier `index.html`).
2. Cliquez sur l'icône de partage de Safari (le carré avec la flèche vers le haut).
3. Sélectionnez **"Sur l'écran d'accueil"** (Add to Home Screen).
4. L'application s'affiche avec son icône Mediacom comme une application native Apple, en plein écran, sans barre d'adresse, et fonctionne hors-ligne.

### Méthode 2 : Lancement en Réseau Local Stand (Wi-Fi de poche ou Routeur de Régie)
Si vous disposez d'un mini-routeur Wi-Fi ou du PC de régie sur le stand :
```bash
cd mediacom-event-app
node server.js
```
Toutes les tablettes connectées au Wi-Fi du stand tapent simplement l'IP du PC (ex: `http://192.168.1.10:3000`) et sont automatiquement synchronisées entre elles !

/**
 * MEDIACOM STAGE 3D CONFIGURATOR (Plateau Séminaire & Show Scénique)
 * Moteur 3D temps réel Canvas fluide à 60 FPS avec faisceaux volumétriques,
 * mur LED animé, structure truss et mobilier scénique modulable.
 */

class Mediacom3DViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Angles de caméra
    this.rotX = 0.32;
    this.rotY = -0.38;
    this.zoom = 1.05;
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    // État du plateau
    this.screenCurved = true;
    this.lightsMoving = true;
    this.lightTime = 0;
    this.currentTheme = 'blue'; // 'blue', 'gold', 'purple', 'white'
    this.furnitureMode = 'plenary'; // 'plenary' (pupitre + fauteuils), 'lounge' (mange-debout), 'clean' (vide)
    this.showScreenVideo = true;

    // Palettes d'éclairage
    this.themes = {
      blue: { primary: '#0077fd', secondary: '#00e5ff', beam: 'rgba(0, 119, 253, 0.45)', beamTarget: 'rgba(0, 229, 255, 0.6)' },
      gold: { primary: '#ffb300', secondary: '#ffe082', beam: 'rgba(255, 179, 0, 0.45)', beamTarget: 'rgba(255, 224, 130, 0.6)' },
      purple: { primary: '#d500f9', secondary: '#ff4081', beam: 'rgba(213, 0, 249, 0.45)', beamTarget: 'rgba(255, 64, 129, 0.6)' },
      white: { primary: '#ffffff', secondary: '#b0bec5', beam: 'rgba(255, 255, 255, 0.4)', beamTarget: 'rgba(255, 255, 255, 0.7)' }
    };

    this.initEvents();
    this.animate();
  }

  initEvents() {
    const handleStart = (x, y) => {
      this.isDragging = true;
      this.lastMouse = { x, y };
    };

    const handleMove = (x, y) => {
      if (!this.isDragging) return;
      const dx = x - this.lastMouse.x;
      const dy = y - this.lastMouse.y;
      this.rotY += dx * 0.007;
      this.rotX += dy * 0.007;
      this.rotX = Math.max(-0.1, Math.min(0.9, this.rotX));
      this.lastMouse = { x, y };
    };

    const handleEnd = () => { this.isDragging = false; };

    this.canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleEnd);

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', handleEnd);

    window.addEventListener('resize', () => {
      if (!this.canvas) return;
      this.width = this.canvas.clientWidth;
      this.height = this.canvas.clientHeight;
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    });
  }

  project(p) {
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const x1 = p.x * cosY - p.z * sinY;
    const z1 = p.x * sinY + p.z * cosY;

    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const y2 = p.y * cosX - z1 * sinX;
    const z2 = p.y * sinX + z1 * cosX;

    const fov = 480 * this.zoom;
    const distance = 580;
    const factor = fov / (distance + z2);

    return {
      x: this.width / 2 + x1 * factor,
      y: this.height / 2 + y2 * factor + 45,
      z: z2,
      scale: factor
    };
  }

  drawGridAndStageFloor() {
    // Sol de salle avec grille technique
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    this.ctx.lineWidth = 1;
    for (let x = -350; x <= 350; x += 50) {
      const p1 = this.project({ x, y: 130, z: -350 });
      const p2 = this.project({ x, y: 130, z: 350 });
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }
    for (let z = -350; z <= 350; z += 50) {
      const p1 = this.project({ x: -350, y: 130, z });
      const p2 = this.project({ x: 350, y: 130, z });
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }

    // Podium Scène Mediacom 4x2m (Élévation 30 cm)
    const w = 260;
    const d = 170;
    const yStage = 100;

    const stageCorners = [
      { x: -w, y: yStage, z: -d },
      { x: w, y: yStage, z: -d },
      { x: w, y: yStage, z: d },
      { x: -w, y: yStage, z: d }
    ].map(p => this.project(p));

    // Surface moquette noire scène
    this.ctx.fillStyle = '#0f141d';
    this.ctx.beginPath();
    this.ctx.moveTo(stageCorners[0].x, stageCorners[0].y);
    for (let i = 1; i < stageCorners.length; i++) this.ctx.lineTo(stageCorners[i].x, stageCorners[i].y);
    this.ctx.closePath();
    this.ctx.fill();

    // Nez de marche lumineux avec la couleur du thème
    const theme = this.themes[this.currentTheme];
    this.ctx.strokeStyle = theme.primary;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(stageCorners[3].x, stageCorners[3].y);
    this.ctx.lineTo(stageCorners[2].x, stageCorners[2].y);
    this.ctx.stroke();
  }

  drawLEDScreen() {
    // Mur LED Haute Résolution (Incurvé ou Plat)
    const segments = 18;
    const radius = 280;
    const arcAngle = this.screenCurved ? Math.PI * 0.48 : 0;
    const height = 150;
    const yTop = -50;

    const topPoints = [];
    const bottomPoints = [];

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) - 0.5;
      const angle = t * arcAngle;
      const x = this.screenCurved ? Math.sin(angle) * radius : t * 400;
      const z = this.screenCurved ? -Math.cos(angle) * radius + 110 : -130;

      topPoints.push(this.project({ x, y: yTop, z }));
      bottomPoints.push(this.project({ x, y: yTop + height, z }));
    }

    const theme = this.themes[this.currentTheme];

    // Rendu des dalles LED
    for (let i = 0; i < segments; i++) {
      const p1 = topPoints[i];
      const p2 = topPoints[i + 1];
      const p3 = bottomPoints[i + 1];
      const p4 = bottomPoints[i];

      const grad = this.ctx.createLinearGradient(p1.x, p1.y, p4.x, p4.y);
      grad.addColorStop(0, '#040b17');
      grad.addColorStop(0.5, theme.primary);
      grad.addColorStop(1, theme.secondary);

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.lineTo(p3.x, p3.y);
      this.ctx.lineTo(p4.x, p4.y);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Affichage d'animation vidéo sur l'écran
    const centerTop = topPoints[Math.floor(segments / 2)];
    const centerBottom = bottomPoints[Math.floor(segments / 2)];
    const cx = (centerTop.x + centerBottom.x) / 2;
    const cy = (centerTop.y + centerBottom.y) / 2;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${Math.floor(20 * centerTop.scale)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText("MEDIACOM SHOWCASE", cx, cy - 14);

    this.ctx.fillStyle = theme.secondary;
    this.ctx.font = `bold ${Math.floor(12 * centerTop.scale)}px sans-serif`;
    this.ctx.fillText("MUR LED P2.6 • SON L-ACOUSTICS • SHOW LUMIÈRE", cx, cy + 16);
  }

  drawMovingHeadsAndBeams() {
    if (this.lightsMoving) this.lightTime += 0.025;

    const theme = this.themes[this.currentTheme];

    // 4 Lyres robotisées asservies (2 au sol, 2 sur totems hauts)
    const lyres = [
      { x: -190, y: -80, z: -100, isTruss: true },
      { x: 190, y: -80, z: -100, isTruss: true },
      { x: -140, y: 95, z: 120, isTruss: false },
      { x: 140, y: 95, z: 120, isTruss: false }
    ];

    lyres.forEach((lyre, idx) => {
      const p = this.project(lyre);

      if (lyre.isTruss) {
        // Totem structure aluminium
        const base = this.project({ x: lyre.x, y: 100, z: lyre.z });
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(base.x, base.y);
        this.ctx.lineTo(p.x, p.y);
        this.ctx.stroke();
      }

      // Tête de la lyre
      this.ctx.fillStyle = '#1c2433';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 9 * p.scale, 0, Math.PI * 2);
      this.ctx.fill();

      // Mouvement du faisceau
      const phase = this.lightTime + idx * 1.5;
      const sweepX = Math.sin(phase) * 180;
      const sweepZ = Math.cos(phase * 0.7) * 80;

      const target = {
        x: lyre.x + sweepX,
        y: 110,
        z: lyre.z + 180 + sweepZ
      };
      const pTarget = this.project(target);

      // Cône volumétrique
      const grad = this.ctx.createLinearGradient(p.x, p.y, pTarget.x, pTarget.y);
      grad.addColorStop(0, theme.beam);
      grad.addColorStop(0.4, theme.beamTarget);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x, p.y);
      this.ctx.lineTo(pTarget.x - 35 * pTarget.scale, pTarget.y);
      this.ctx.lineTo(pTarget.x + 35 * pTarget.scale, pTarget.y);
      this.ctx.closePath();
      this.ctx.fill();

      // Impact lumineux au sol
      this.ctx.fillStyle = theme.beamTarget;
      this.ctx.beginPath();
      this.ctx.ellipse(pTarget.x, pTarget.y, 30 * pTarget.scale, 14 * pTarget.scale, 0, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawFurniture() {
    if (this.furnitureMode === 'plenary') {
      // Pupitre orateur plexi
      const pPupitre = this.project({ x: -80, y: 60, z: 60 });
      const pBase = this.project({ x: -80, y: 100, z: 60 });

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(pBase.x, pBase.y);
      this.ctx.lineTo(pPupitre.x, pPupitre.y);
      this.ctx.stroke();

      // Tablette pupitre
      this.ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
      this.ctx.fillRect(pPupitre.x - 14 * pPupitre.scale, pPupitre.y - 6 * pPupitre.scale, 28 * pPupitre.scale, 8 * pPupitre.scale);

      // 2 Fauteuils lounge VIP
      [-10, 60].forEach(posX => {
        const pSeat = this.project({ x: posX, y: 80, z: 40 });
        this.ctx.fillStyle = '#1e2838';
        this.ctx.strokeStyle = '#0077fd';
        this.ctx.lineWidth = 1;
        this.ctx.fillRect(pSeat.x - 16 * pSeat.scale, pSeat.y - 12 * pSeat.scale, 32 * pSeat.scale, 24 * pSeat.scale);
        this.ctx.strokeRect(pSeat.x - 16 * pSeat.scale, pSeat.y - 12 * pSeat.scale, 32 * pSeat.scale, 24 * pSeat.scale);
      });
    } else if (this.furnitureMode === 'lounge') {
      // 2 Mange-debout événementiels
      [-60, 60].forEach(posX => {
        const pTable = this.project({ x: posX, y: 65, z: 50 });
        const pBase = this.project({ x: posX, y: 100, z: 50 });

        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(pBase.x, pBase.y);
        this.ctx.lineTo(pTable.x, pTable.y);
        this.ctx.stroke();

        this.ctx.fillStyle = '#0077fd';
        this.ctx.beginPath();
        this.ctx.ellipse(pTable.x, pTable.y, 22 * pTable.scale, 9 * pTable.scale, 0, 0, Math.PI * 2);
        this.ctx.fill();
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawGridAndStageFloor();
    this.drawLEDScreen();
    this.drawMovingHeadsAndBeams();
    this.drawFurniture();

    requestAnimationFrame(() => this.animate());
  }

  setTheme(themeName) {
    if (this.themes[themeName]) this.currentTheme = themeName;
  }

  setFurniture(mode) {
    this.furnitureMode = mode;
  }

  toggleCurve() {
    this.screenCurved = !this.screenCurved;
  }

  toggleLights() {
    this.lightsMoving = !this.lightsMoving;
  }
}

window.Mediacom3DViewer = Mediacom3DViewer;

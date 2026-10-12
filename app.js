/**
 * MEDIACOM EVENT OS - MOTEUR APPLICATIF OFFICIEL V2
 * 100% Offline-First • Sessions Indépendantes • AirDrop QR Natif • Estimateur Express
 */

// Configuration officielle des opérateurs Stand
const OPERATORS = {
  mazen: { 
    id: 'mazen', 
    name: 'Mazen', 
    role: 'Business Developer', 
    phone: '04 88 80 13 77',
    email: 'm.chaban@mediacom.org',
    color: '#0077fd',
    initial: 'M'
  },
  coraline: { 
    id: 'coraline', 
    name: 'Coraline', 
    role: 'Chargée de Développement Commercial', 
    phone: '04 88 80 13 77',
    email: 'commercial@mediacom.org',
    color: '#00e5ff',
    initial: 'C'
  },
  nolan: { 
    id: 'nolan', 
    name: 'Nolan', 
    role: 'Directeur Technique', 
    phone: '04 88 80 13 77',
    email: 'technique@mediacom.org',
    color: '#ffb300',
    initial: 'N'
  },
  eric: { 
    id: 'eric', 
    name: 'Éric', 
    role: 'Directeur Général', 
    phone: '04 91 35 55 55',
    email: 'contact@mediacom.org',
    color: '#ff3366',
    initial: 'E'
  }
};

const AppState = {
  currentOperator: 'mazen',
  activeView: 'dashboard',
  leads: [],
  selectedLeadForTransfer: null,
  activeFilter: 'all',
  capturedCardPhoto: null,
  powerLoads: {
    line1: { 
      name: 'Ligne 1 (PC16A - 3600W max)', 
      items: [
        { name: 'Mur LED 4x2m (Incurvé P2.6)', power: 2200 },
        { name: 'Régie Vidéo & Scaler Analog Way', power: 450 }
      ] 
    },
    line2: { 
      name: 'Ligne 2 (PC16A - 3600W max)', 
      items: [
        { name: 'Lyre Robotisée Spot 1', power: 900 },
        { name: 'Lyre Robotisée Spot 2', power: 900 },
        { name: 'Système Son Stand L-Acoustics', power: 550 }
      ] 
    }
  },
  channel: null,
  cameraStream: null
};

document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  initOperators();
  initNavigation();
  initFormInteractions();
  initRealtimeSync();
  initPowerCalculator();
  initShowcase();
  initEstimator();
  initQRConnect();
  renderLeadsList();
  updateKPIs();

  if (window.Mediacom3DViewer) {
    window.viewerInstance = new window.Mediacom3DViewer('canvas3d');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW Note:', err));
  }
});

/* ==========================================================================
   STOCKAGE HORS-LIGNE
   ========================================================================== */

function initStorage() {
  const savedLeads = localStorage.getItem('mediacom_event_leads_v2');
  if (savedLeads) {
    try {
      AppState.leads = JSON.parse(savedLeads);
    } catch (e) {
      AppState.leads = [];
    }
  } else {
    AppState.leads = [
      {
        id: 'lead-1',
        name: 'Sophie Laurent',
        company: 'Agence Étoile Événements (Marseille)',
        email: 's.laurent@etoile-events.fr',
        phone: '06 12 34 56 78',
        eventType: 'Séminaire & Plénière',
        date: '2026-11-20',
        budget: '25 000 € - 50 000 €',
        needs: ['Écran LED Incurvé P2.6', 'Sonorisation L-Acoustics', 'Mobilier Lounge'],
        temperature: 'hot',
        operator: 'Coraline',
        notes: 'Séminaire annuel 400 participants à Marseille. Cherche prestataire technique complet scénographie + mur LED.',
        cardPhoto: null,
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'lead-2',
        name: 'Marc Valadier',
        company: 'Laboratoires Méditerranée & Santé',
        email: 'm.valadier@labo-med.com',
        phone: '06 98 76 54 32',
        eventType: 'Soirée de Gala',
        date: '2026-12-15',
        budget: '> 50 000 €',
        needs: ['Éclairage & Lyres Robe', 'Sonorisation L-Acoustics', 'Scénographie & Déco'],
        temperature: 'hot',
        operator: 'Nolan',
        notes: 'Gala 50 ans entreprise au Palais du Pharo. Besoin de show lumière d’ouverture immersif.',
        cardPhoto: null,
        timestamp: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'lead-3',
        name: 'Alexandre Meyer',
        company: 'Comexposium Méditerranée',
        email: 'a.meyer@comex-med.com',
        phone: '06 45 67 89 01',
        eventType: 'Congrès & Convention',
        date: '2027-02-10',
        budget: '15 000 € - 25 000 €',
        needs: ['Régie Vidéo Multi-Cam', 'Streaming Live', 'Microphonie HF Shure'],
        temperature: 'warm',
        operator: 'Mazen',
        notes: 'Congrès 2 jours avec 6 ateliers simultanés et captation vidéo pour rediffusion.',
        cardPhoto: null,
        timestamp: new Date(Date.now() - 10800000).toISOString()
      }
    ];
    saveLeadsToStorage();
  }

  const savedOp = localStorage.getItem('mediacom_operator_v2');
  if (savedOp && OPERATORS[savedOp]) {
    AppState.currentOperator = savedOp;
  }
}

function saveLeadsToStorage() {
  localStorage.setItem('mediacom_event_leads_v2', JSON.stringify(AppState.leads));
}

/* ==========================================================================
   GESTION DES OPÉRATEURS DU STAND
   ========================================================================== */

function initOperators() {
  updateOperatorUI();
  const opCard = document.getElementById('operator-selector-card');
  if (opCard) opCard.addEventListener('click', openOperatorModal);
}

function setOperator(operatorKey) {
  if (OPERATORS[operatorKey]) {
    AppState.currentOperator = operatorKey;
    localStorage.setItem('mediacom_operator_v2', operatorKey);
    updateOperatorUI();
    closeModal('operator-modal');
    renderLeadsList();
    updateKPIs();
    showNotification(`Session active : ${OPERATORS[operatorKey].name} (${OPERATORS[operatorKey].role})`, 'success');
  }
}

function updateOperatorUI() {
  const op = OPERATORS[AppState.currentOperator];
  const nameEl = document.getElementById('current-op-name');
  const roleEl = document.getElementById('current-op-role');
  const avatarEl = document.getElementById('current-op-avatar');
  
  if (nameEl) nameEl.textContent = op.name;
  if (roleEl) roleEl.textContent = op.role;
  if (avatarEl) {
    avatarEl.textContent = op.initial;
    avatarEl.style.background = `linear-gradient(135deg, ${op.color}, #002b66)`;
  }
}

function openOperatorModal() {
  const modal = document.getElementById('operator-modal');
  if (modal) modal.classList.add('active');
}

/* ==========================================================================
   NAVIGATION (AUTONOME SUR CHAQUE TABLETTE)
   ========================================================================== */

function initNavigation() {
  document.querySelectorAll('[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.getAttribute('data-view'));
    });
  });
}

function switchView(viewName) {
  AppState.activeView = viewName;
  
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.add('active');

  document.querySelectorAll('[data-view]').forEach(link => {
    if (link.getAttribute('data-view') === viewName) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  const titles = {
    dashboard: { title: "Dashboard Stand & Capture Leads", sub: "Collecte ultra-rapide et coordination d'équipe" },
    screencenter: { title: "Régie Écran Mur LED 4x2m", sub: "Supervision du grand écran public et des mots live" },
    showcase: { title: "Book Réalisations & Estimateur Express", sub: "Présentation interactive des 4 univers Mediacom et chiffrage" },
    simulator3d: { title: "Configurateur 3D Scénographique", sub: "Plateau séminaire interactif, faisceaux de lyres et dalles LED" },
    powercalc: { title: "Calculateur Électrique (Régie Nolan)", sub: "Supervision des 2 lignes PC16A (7200W max) du stand" },
    connect: { title: "Pass Contact Visiteur & vCard", sub: "QR code officiel pointant vers la fiche de direction d'Éric" }
  };

  const titleEl = document.getElementById('topbar-main-title');
  const subEl = document.getElementById('topbar-sub-title');
  if (titleEl && titles[viewName]) titleEl.textContent = titles[viewName].title;
  if (subEl && titles[viewName]) subEl.textContent = titles[viewName].sub;
}

/* ==========================================================================
   FORMULAIRE ET PRISE DE CONTACT
   ========================================================================== */

function initFormInteractions() {
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });

  document.querySelectorAll('.temp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.temp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('.cap-tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cap-tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      toggleCaptureMode(tab.getAttribute('data-mode'));
    });
  });

  const leadForm = document.getElementById('quick-lead-form');
  if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveLeadFromForm();
    });
  }

  const snapBtn = document.getElementById('btn-snap-card');
  if (snapBtn) snapBtn.addEventListener('click', snapCardPhoto);

  const filterAllBtn = document.getElementById('filter-all-leads');
  const filterMyBtn = document.getElementById('filter-my-leads');
  if (filterAllBtn && filterMyBtn) {
    filterAllBtn.addEventListener('click', () => {
      AppState.activeFilter = 'all';
      filterAllBtn.classList.add('active');
      filterMyBtn.classList.remove('active');
      renderLeadsList();
    });
    filterMyBtn.addEventListener('click', () => {
      AppState.activeFilter = 'my_leads';
      filterMyBtn.classList.add('active');
      filterAllBtn.classList.remove('active');
      renderLeadsList();
    });
  }
}

function toggleCaptureMode(mode) {
  const cameraBox = document.getElementById('camera-scan-box');
  const cardSnapArea = document.getElementById('card-snap-controls');
  if (!cameraBox) return;

  if (mode === 'badge' || mode === 'card') {
    cameraBox.style.display = 'block';
    if (cardSnapArea) cardSnapArea.style.display = mode === 'card' ? 'flex' : 'none';
    startCameraPreview(mode);
  } else {
    cameraBox.style.display = 'none';
    if (cardSnapArea) cardSnapArea.style.display = 'none';
    stopCameraPreview();
  }
}

function startCameraPreview(mode) {
  const video = document.getElementById('camera-video');
  const guideText = document.getElementById('camera-guide-text');
  if (!video) return;

  if (guideText) {
    guideText.textContent = mode === 'badge' ? "Cadrez le badge visiteur ou le QR code d'un collègue" : "Cadrez la carte de visite puis cliquez sur 'Prendre la photo'";
  }

  navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      AppState.cameraStream = stream;
      video.srcObject = stream;
      video.play();
    })
    .catch(() => {
      if (guideText) guideText.textContent = "Caméra non disponible - Saisie manuelle activée";
    });
}

function stopCameraPreview() {
  if (AppState.cameraStream) {
    AppState.cameraStream.getTracks().forEach(t => t.stop());
    AppState.cameraStream = null;
  }
}

function snapCardPhoto() {
  const video = document.getElementById('camera-video');
  const previewImg = document.getElementById('card-photo-preview');
  if (!video) return;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const base64 = canvas.toDataURL('image/jpeg', 0.8);
  AppState.capturedCardPhoto = base64;

  if (previewImg) {
    previewImg.src = base64;
    previewImg.style.display = 'block';
  }
  showNotification("Photo de la carte enregistrée !", "success");
}

function saveLeadFromForm(transferTo = null, transferNote = '') {
  const name = document.getElementById('lead-name')?.value.trim();
  const company = document.getElementById('lead-company')?.value.trim();
  const email = document.getElementById('lead-email')?.value.trim();
  const phone = document.getElementById('lead-phone')?.value.trim();
  const eventType = document.getElementById('lead-event-type')?.value;
  const date = document.getElementById('lead-date')?.value;
  const budget = document.getElementById('lead-budget')?.value;
  const notes = document.getElementById('lead-notes')?.value.trim();

  if (!name && !company) {
    showNotification("Veuillez renseigner au moins un Nom ou une Société.", "warning");
    return;
  }

  const activeTags = [];
  document.querySelectorAll('.tag-btn.active').forEach(b => activeTags.push(b.textContent.trim()));

  const activeTempBtn = document.querySelector('.temp-btn.active');
  const temp = activeTempBtn ? activeTempBtn.getAttribute('data-temp') : 'warm';
  const currentOp = OPERATORS[AppState.currentOperator].name;

  const newLead = {
    id: 'lead-' + Date.now(),
    name: name || 'Contact Non Nommé',
    company: company || 'Société Non Renseignée',
    email: email || '',
    phone: phone || '',
    eventType: eventType || 'Non Défini',
    date: date || '',
    budget: budget || '',
    needs: activeTags,
    temperature: temp,
    operator: transferTo ? OPERATORS[transferTo].name : currentOp,
    notes: transferNote ? `[Transféré par ${currentOp} : ${transferNote}] - ${notes}` : notes,
    cardPhoto: AppState.capturedCardPhoto || null,
    timestamp: new Date().toISOString()
  };

  AppState.leads.unshift(newLead);
  saveLeadsToStorage();
  renderLeadsList();
  updateKPIs();

  document.getElementById('quick-lead-form').reset();
  document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
  AppState.capturedCardPhoto = null;
  const previewImg = document.getElementById('card-photo-preview');
  if (previewImg) previewImg.style.display = 'none';

  if (transferTo) {
    broadcastMessage({
      type: 'LEAD_TRANSFERRED',
      lead: newLead,
      from: currentOp,
      to: transferTo,
      note: transferNote
    });
    showNotification(`Lead transféré avec succès à ${OPERATORS[transferTo].name} !`, 'success');
  } else {
    broadcastMessage({
      type: 'NEW_LEAD',
      lead: newLead,
      operator: currentOp
    });
    showNotification("Contact enregistré avec succès !", 'success');
  }
}

function renderLeadsList() {
  const container = document.getElementById('leads-container');
  if (!container) return;

  const currentOpName = OPERATORS[AppState.currentOperator].name.toLowerCase();
  const filtered = AppState.activeFilter === 'my_leads'
    ? AppState.leads.filter(l => (l.operator || '').toLowerCase().includes(currentOpName))
    : AppState.leads;

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 40px 20px; color: var(--text-dim);">Aucun prospect trouvé dans cette vue.</div>`;
    return;
  }

  container.innerHTML = filtered.map(lead => {
    const tempIcon = lead.temperature === 'hot' ? '🔥 Chaud' : lead.temperature === 'cool' ? '❄️ Froid' : '⚡ Tiède';
    const tempBg = lead.temperature === 'hot' ? 'rgba(255, 51, 102, 0.2)' : lead.temperature === 'cool' ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 179, 0, 0.2)';
    const tempColor = lead.temperature === 'hot' ? '#ff4d79' : lead.temperature === 'cool' ? '#00e5ff' : '#ffb300';

    return `
      <div class="lead-item" onclick="openLeadDetail('${lead.id}')">
        <div class="lead-top">
          <div>
            <div class="lead-name">${escapeHtml(lead.name)}</div>
            <div class="lead-company">${escapeHtml(lead.company)}</div>
          </div>
          <span class="lead-pill" style="background:${tempBg}; color:${tempColor}; border:1px solid ${tempColor}40;">
            ${tempIcon}
          </span>
        </div>
        <div class="lead-pills">
          <span class="lead-pill" style="color:#fff; background:rgba(255,255,255,0.08);">👤 ${escapeHtml(lead.operator)}</span>
          <span class="lead-pill">📅 ${lead.eventType}</span>
          ${lead.cardPhoto ? '<span class="lead-pill" style="color:var(--mc-cyan); border:1px solid var(--mc-cyan);">📷 Carte jointe</span>' : ''}
          ${lead.needs.map(n => `<span class="lead-pill" style="border:1px solid rgba(0,119,253,0.4);">${escapeHtml(n)}</span>`).join('')}
        </div>
        ${lead.notes ? `<div style="font-size:11px; color:var(--text-dim); margin-top:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">💬 ${escapeHtml(lead.notes)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function updateKPIs() {
  const currentOpName = OPERATORS[AppState.currentOperator].name.toLowerCase();
  const totalLeads = AppState.leads.length;
  const hotLeads = AppState.leads.filter(l => l.temperature === 'hot').length;
  const myLeads = AppState.leads.filter(l => (l.operator || '').toLowerCase().includes(currentOpName)).length;

  const totalEl = document.getElementById('kpi-total-leads');
  const hotEl = document.getElementById('kpi-hot-leads');
  const myEl = document.getElementById('kpi-my-leads');
  const navCountEl = document.getElementById('nav-leads-count');

  if (totalEl) totalEl.textContent = totalLeads;
  if (hotEl) hotEl.textContent = hotLeads;
  if (myEl) myEl.textContent = myLeads;
  if (navCountEl) navCountEl.textContent = totalLeads;
}

/* ==========================================================================
   FICHE DÉTAIL & AIRDROP VISUEL VIA QR CODE RÉEL
   ========================================================================== */

function openLeadDetail(leadId) {
  const lead = AppState.leads.find(l => l.id === leadId);
  if (!lead) return;

  AppState.selectedLeadForTransfer = lead;

  const modal = document.getElementById('lead-detail-modal');
  const body = document.getElementById('lead-detail-body');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
      <div>
        <h2 style="font-size:22px; font-weight:800; color:#fff;">${escapeHtml(lead.name)}</h2>
        <div style="font-size:14px; color:var(--mc-cyan); font-weight:600;">${escapeHtml(lead.company)}</div>
      </div>
      <span class="lead-pill" style="background:rgba(0,119,253,0.25); color:#fff; font-size:12px; padding:6px 12px;">
        Pris par : ${escapeHtml(lead.operator)}
      </span>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; font-size:13px;">
      <div><strong>Email :</strong> <a href="mailto:${lead.email}" style="color:var(--mc-cyan);">${lead.email || 'Non renseigné'}</a></div>
      <div><strong>Tél :</strong> <a href="tel:${lead.phone}" style="color:var(--mc-cyan);">${lead.phone || 'Non renseigné'}</a></div>
      <div><strong>Type :</strong> ${lead.eventType}</div>
      <div><strong>Date :</strong> ${lead.date || 'Non fixée'}</div>
      <div><strong>Budget :</strong> ${lead.budget || 'Non précisé'}</div>
      <div><strong>Potentiel :</strong> ${lead.temperature.toUpperCase()}</div>
    </div>

    <div style="margin-bottom:16px;">
      <div style="font-size:12px; font-weight:700; color:var(--text-dim); margin-bottom:6px; text-transform:uppercase;">Besoins Techniques :</div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        ${lead.needs.map(n => `<span class="lead-pill" style="border:1px solid var(--mc-blue);">${escapeHtml(n)}</span>`).join('')}
      </div>
    </div>

    ${lead.notes ? `
      <div style="background:rgba(255,255,255,0.04); padding:12px; border-radius:10px; margin-bottom:16px; font-size:13px;">
        <div style="font-size:11px; font-weight:700; color:var(--text-dim); margin-bottom:4px; text-transform:uppercase;">Notes Stand :</div>
        ${escapeHtml(lead.notes)}
      </div>
    ` : ''}

    ${lead.cardPhoto ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:11px; font-weight:700; color:var(--text-dim); margin-bottom:6px; text-transform:uppercase;">Photo Carte de Visite :</div>
        <img src="${lead.cardPhoto}" style="width:100%; max-height:220px; object-fit:contain; border-radius:10px; border:1px solid var(--border-subtle);">
      </div>
    ` : ''}

    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="btn-submit" onclick="generateAirDropQR('${lead.id}')" style="background:linear-gradient(135deg, var(--mc-cyan), #0077fd);">
        📲 Transférer par QR Code (AirDrop Hors-Ligne)
      </button>
      <button class="btn-transfer" onclick="openTransferModalForLead('${lead.id}')">
        👤 Transférer à un collègue
      </button>
    </div>
  `;

  modal.classList.add('active');
}

function generateAirDropQR(leadId) {
  const lead = AppState.leads.find(l => l.id === leadId);
  if (!lead) return;

  const modal = document.getElementById('airdrop-qr-modal');
  const box = document.getElementById('airdrop-qr-box');
  const nameEl = document.getElementById('airdrop-lead-name');
  if (!modal || !box) return;

  if (nameEl) nameEl.textContent = `${lead.name} (${lead.company})`;

  box.innerHTML = '';
  // Vrai QR code standard généré avec qrcode.min.js
  const vcardPayload = `BEGIN:VCARD
VERSION:3.0
N:${lead.name};;;;
FN:${lead.name}
ORG:${lead.company}
TEL:${lead.phone}
EMAIL:${lead.email}
NOTE:[${lead.eventType}] ${lead.notes || ''}
END:VCARD`;

  new QRCode(box, {
    text: vcardPayload,
    width: 220,
    height: 220,
    colorDark: "#0a0c10",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });

  modal.classList.add('active');
}

function openTransferModalForLead(leadId) {
  AppState.selectedLeadForTransfer = AppState.leads.find(l => l.id === leadId);
  closeModal('lead-detail-modal');
  const modal = document.getElementById('transfer-modal');
  if (modal) modal.classList.add('active');
}

function confirmTransfer(targetOperatorKey) {
  const lead = AppState.selectedLeadForTransfer;
  const note = document.getElementById('transfer-custom-note')?.value || '';
  const currentOp = OPERATORS[AppState.currentOperator].name;

  if (lead) {
    lead.operator = OPERATORS[targetOperatorKey].name;
    lead.notes = `[Transféré par ${currentOp} : ${note}] - ` + (lead.notes || '');
    saveLeadsToStorage();
    renderLeadsList();
    updateKPIs();

    broadcastMessage({
      type: 'LEAD_TRANSFERRED',
      lead: lead,
      from: currentOp,
      to: targetOperatorKey,
      note: note
    });

    showNotification(`Lead transféré à ${OPERATORS[targetOperatorKey].name} !`, 'success');
  }

  closeModal('transfer-modal');
}

/* ==========================================================================
   SYNCHRONISATION DATA-ONLY (AUCUN CHANGEMENT DE VUE IMPOSÉ)
   ========================================================================== */

function initRealtimeSync() {
  if ('BroadcastChannel' in window) {
    AppState.channel = new BroadcastChannel('mediacom_stand_sync');
    AppState.channel.onmessage = (event) => {
      handleIncomingBroadcast(event.data);
    };
  }
}

function broadcastMessage(data) {
  if (AppState.channel) {
    AppState.channel.postMessage(data);
  }
}

function handleIncomingBroadcast(data) {
  if (data.type === 'LEAD_TRANSFERRED') {
    if (data.to === AppState.currentOperator || data.to === 'all') {
      triggerTransferAlert(data);
    }
    const idx = AppState.leads.findIndex(l => l.id === data.lead.id);
    if (idx >= 0) {
      AppState.leads[idx] = data.lead;
    } else {
      AppState.leads.unshift(data.lead);
    }
    saveLeadsToStorage();
    renderLeadsList();
    updateKPIs();
  } else if (data.type === 'NEW_LEAD') {
    AppState.leads.unshift(data.lead);
    saveLeadsToStorage();
    renderLeadsList();
    updateKPIs();
  }
}

function triggerTransferAlert(data) {
  playAudioChime();
  const toast = document.getElementById('toast-transfer');
  const toastMsg = document.getElementById('toast-transfer-msg');
  if (toast && toastMsg) {
    toastMsg.innerHTML = `<strong>${data.from}</strong> vous transfère un contact :<br><span style="color:var(--mc-cyan); font-weight:700;">${data.lead.name} (${data.lead.company})</span><br><em>"${data.note || 'Pas de note'}"</em>`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 9000);
  }
}

function playAudioChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log('Audio note:', e);
  }
}

/* ==========================================================================
   BOOK & ESTIMATEUR DE BUDGET EXPRESS
   ========================================================================== */

const SHOWCASE_ITEMS = [
  {
    title: "Séminaires & Plénières d'Entreprise",
    category: "corporate",
    badge: "Plénière 200 à 1000 pax",
    desc: "Dispositif complet clé-en-main : Mur LED incurvé P2.6 plein format, sonorisation haute intelligibilité L-Acoustics Kiva II, microphonie HF Shure Axient et pupitres design.",
    specs: ["Écran LED Incurvé P2.6", "L-Acoustics Kiva II", "Shure Axient HF", "Pupitre & Mobilier VIP"],
    price: "À partir de 4 500 € HT",
    baseCost: 4500
  },
  {
    title: "Soirées de Gala & Cocktails Prestige",
    category: "gala",
    badge: "Gala & Événements Privés",
    desc: "Mise en lumière féerique des lieux réceptifs (hôtels 5*, domaines viticoles, palais) : show lyres robotisées Robe 900W, éclairage architectural sans fil sur batterie, scène modulaire et étincelles froides.",
    specs: ["Lyres Robe BMFL / Spot", "Projecteurs Éco IP65", "Scène Modulaire", "Effets Étincelles Froides"],
    price: "À partir de 6 500 € HT",
    baseCost: 6500
  },
  {
    title: "Congrès, Salons & Conventions Médicales",
    category: "congres",
    badge: "Congrès Multi-Salles",
    desc: "Dispositif complet pour conventions professionnelles : sonorisation multi-zones, streaming live sécurisé, régie vidéo 4K et écrans de rappel retour retour pour conférenciers.",
    specs: ["Multi-Salles Ateliers", "Streaming 4K Live", "Régie Blackmagic", "Traduction Simultanée"],
    price: "Sur Devis Spécifique",
    baseCost: 8500
  },
  {
    title: "Festivals, Scènes Extérieures & Concerts",
    category: "festival",
    badge: "Grand Show Plein Air",
    desc: "La puissance d'un des plus grands parcs de matériel du Sud de la France : scènes mobiles couvertes homologuées, son Line Array L-Acoustics K2/Kara et murs LED plein jour outdoor IP65.",
    specs: ["L-Acoustics K2 / Kara", "Scène Mobile Couverte", "Murs LED Plein Jour", "Équipe Régie Complète"],
    price: "Sur Devis Technique",
    baseCost: 12000
  },
  {
    title: "Mobilier Événementiel & Scénographie",
    category: "furniture",
    badge: "Mobilier Lounge & Stand",
    desc: "Catalogue complet de mobilier pour vos espaces réceptifs : mange-debout lumineux, tabourets hauts scandinaves, canapés lounge cuir, comptoirs d'accueil personnalisés aux couleurs de l'événement.",
    specs: ["Mange-debout Design", "Salons Lounge", "Comptoirs d'Accueil", "Éclairage Autonome"],
    price: "Pack Mobilier Salon dès 950 € HT",
    baseCost: 950
  },
  {
    title: "Pack Démo Salon : Mur LED Incurvé + Nuage Live",
    category: "stand",
    badge: "Formule Stand Clé-en-main",
    desc: "La formule exacte présentée sur notre stand : Mur LED 4x2m optimisé consommation électrique (<3.6 kW), régie vidéo compacte et interactivité smartphone temps réel pour capter l'attention.",
    specs: ["Basse Consommation PC16A", "QR Code & Sondage Live", "Montage en 2 Heures", "Impact Visuel x10"],
    price: "Offre Salon : 3 900 € HT",
    baseCost: 3900
  }
];

function initShowcase() {
  renderShowcaseGrid('all');

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      renderShowcaseGrid(chip.getAttribute('data-cat'));
    });
  });
}

function renderShowcaseGrid(category) {
  const grid = document.getElementById('showcase-cards-grid');
  if (!grid) return;

  const filtered = category === 'all' 
    ? SHOWCASE_ITEMS 
    : SHOWCASE_ITEMS.filter(it => it.category === category);

  grid.innerHTML = filtered.map(item => `
    <div class="showcase-card">
      <div class="showcase-img-wrap" style="background: linear-gradient(135deg, #070e1c, #00224d); display:flex; align-items:center; justify-content:center;">
        <span class="showcase-badge">${item.badge}</span>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(0,119,253,0.5)"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>
      </div>
      <div class="showcase-body">
        <h3 class="showcase-title">${item.title}</h3>
        <p class="showcase-desc">${item.desc}</p>
        <div class="showcase-specs">
          ${item.specs.map(s => `<span class="spec-badge">${s}</span>`).join('')}
        </div>
        <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
          <span style="font-size:13px; color:var(--mc-cyan); font-weight:800;">${item.price}</span>
          <button class="btn-primary-sm" onclick="pitchPack('${escapeHtml(item.title)}')">Présenter au Client</button>
        </div>
      </div>
    </div>
  `).join('');
}

window.pitchPack = function(packTitle) {
  switchView('dashboard');
  const notesEl = document.getElementById('lead-notes');
  if (notesEl) {
    notesEl.value = `[Client intéressé par : ${packTitle}] ` + notesEl.value;
    notesEl.focus();
  }
  showNotification(`Pack "${packTitle}" injecté dans le formulaire !`, 'info');
};

/* ESTIMATEUR DE BUDGET EXPRESS */
function initEstimator() {
  const calcBtn = document.getElementById('btn-calc-estimate');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const pax = parseInt(document.getElementById('est-pax')?.value || '200', 10);
    const hasLed = document.getElementById('est-opt-led')?.checked;
    const hasSound = document.getElementById('est-opt-sound')?.checked;
    const hasLight = document.getElementById('est-opt-light')?.checked;
    const hasStream = document.getElementById('est-opt-stream')?.checked;

    let base = 1500;
    if (pax > 500) base += 2500;
    else if (pax > 200) base += 1200;

    if (hasLed) base += 2800;
    if (hasSound) base += 1400;
    if (hasLight) base += 1600;
    if (hasStream) base += 1200;

    const minPrice = base.toLocaleString('fr-FR');
    const maxPrice = Math.round(base * 1.35).toLocaleString('fr-FR');

    const resEl = document.getElementById('est-result-val');
    if (resEl) {
      resEl.textContent = `${minPrice} € - ${maxPrice} € HT`;
    }
  });
}

/* ==========================================================================
   PASS CONTACT VISITEUR & VRAI QR CODE (VERS CONTACT.HTML)
   ========================================================================== */

function initQRConnect() {
  const qrBox = document.getElementById('mediacom-vcard-qr-box');
  if (!qrBox) return;

  qrBox.innerHTML = '';
  // Vrai QR code scannable par n'importe quel smartphone vers contact.html
  const targetUrl = window.location.href.replace(/index\.html.*/, 'contact.html').replace(/mediacom-standalone\.html.*/, 'contact.html');
  
  new QRCode(qrBox, {
    text: targetUrl,
    width: 220,
    height: 220,
    colorDark : "#0a0c10",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });
}

function downloadVCard() {
  // Toujours les coordonnées officielles d'Éric comme demandé par Mazen !
  const vcard = `BEGIN:VCARD
VERSION:3.0
N:Mediacom;Eric;;;
FN:Eric - Mediacom Marseille
ORG:Médiacom Marseille - Le Son, La Lumière, L'Image
TITLE:Direction Générale
TEL;TYPE=WORK,VOICE:04 91 35 55 55
TEL;TYPE=CELL:04 88 80 13 77
EMAIL;TYPE=PREF,INTERNET:contact@mediacom.org
URL:https://www.mediacom.org
ADR;TYPE=WORK:;;25 Boulevard de Saint-Marcel;Marseille;;13011;France
NOTE:Prestataire technique audiovisuel & événementiel depuis 1999.
END:VCARD`;

  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Mediacom_Eric_Marseille.vcf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showNotification('Fiche officielle d’Éric téléchargée !', 'success');
}

/* ==========================================================================
   CALCULATEUR ÉLECTRIQUE
   ========================================================================== */

function initPowerCalculator() {
  renderPowerGauges();
  const addLoadBtn = document.getElementById('btn-add-power-item');
  if (addLoadBtn) {
    addLoadBtn.addEventListener('click', () => {
      const name = document.getElementById('power-item-name')?.value || 'Appareil';
      const watts = parseInt(document.getElementById('power-item-watts')?.value || '500', 10);
      const line = document.getElementById('power-item-line')?.value || 'line1';

      AppState.powerLoads[line].items.push({ name, power: watts });
      renderPowerGauges();
      showNotification(`Ajouté à la ${line === 'line1' ? 'Ligne 1' : 'Ligne 2'} : +${watts}W`, 'info');
    });
  }
}

function renderPowerGauges() {
  const maxWattsPerLine = 3600;

  ['line1', 'line2'].forEach(lineKey => {
    const lineData = AppState.powerLoads[lineKey];
    const totalWatts = lineData.items.reduce((sum, item) => sum + item.power, 0);
    const percent = Math.min(100, Math.round((totalWatts / maxWattsPerLine) * 100));
    const amps = (totalWatts / 230).toFixed(1);

    const fillEl = document.getElementById(`${lineKey}-fill`);
    const valEl = document.getElementById(`${lineKey}-val`);
    const ampsEl = document.getElementById(`${lineKey}-amps`);
    const listEl = document.getElementById(`${lineKey}-items-list`);

    if (fillEl) {
      fillEl.style.width = `${percent}%`;
      if (percent > 85) fillEl.classList.add('danger');
      else fillEl.classList.remove('danger');
    }

    if (valEl) valEl.textContent = `${totalWatts} W / ${maxWattsPerLine} W (${percent}%)`;
    if (ampsEl) ampsEl.textContent = `${amps} A / 16 A`;

    if (listEl) {
      listEl.innerHTML = lineData.items.map((it, idx) => `
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
          <span>${escapeHtml(it.name)}</span>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="color:var(--mc-cyan); font-weight:700;">${it.power} W</span>
            <button onclick="removePowerItem('${lineKey}', ${idx})" style="background:none; border:none; color:var(--mc-red); cursor:pointer;">✕</button>
          </div>
        </div>
      `).join('');
    }
  });
}

window.removePowerItem = function(lineKey, index) {
  AppState.powerLoads[lineKey].items.splice(index, 1);
  renderPowerGauges();
};

/* ==========================================================================
   EXPORT CSV & UTILITAIRES
   ========================================================================== */

function exportLeadsCSV() {
  if (AppState.leads.length === 0) {
    showNotification("Aucun prospect à exporter.", "warning");
    return;
  }

  const headers = ["ID", "Date Enregistrement", "Nom", "Entreprise", "Email", "Téléphone", "Type Événement", "Date Souhaitée", "Budget", "Besoins", "Température", "Pris par", "Notes"];
  const rows = AppState.leads.map(l => [
    l.id,
    new Date(l.timestamp).toLocaleString('fr-FR'),
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.company.replace(/"/g, '""')}"`,
    `"${l.email}"`,
    `"${l.phone}"`,
    `"${l.eventType}"`,
    `"${l.date}"`,
    `"${l.budget}"`,
    `"${l.needs.join(', ')}"`,
    l.temperature,
    `"${l.operator}"`,
    `"${(l.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Mediacom_Leads_Salon_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showNotification("Fichier CSV téléchargé avec succès !", "success");
}

function showNotification(text, type = 'info') {
  const notif = document.createElement('div');
  notif.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    padding: 14px 22px;
    background: #131720;
    border: 1px solid ${type === 'success' ? 'var(--mc-green)' : type === 'warning' ? 'var(--mc-gold)' : 'var(--mc-blue)'};
    color: white;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 600;
    z-index: 999;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    animation: fadeIn 0.2s ease-out;
  `;
  notif.textContent = text;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3500);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

window.exportLeadsCSV = exportLeadsCSV;
window.setOperator = setOperator;
window.confirmTransfer = confirmTransfer;
window.closeModal = closeModal;
window.openLeadDetail = openLeadDetail;
window.generateAirDropQR = generateAirDropQR;
window.downloadVCard = downloadVCard;

const defaultRoles = [
  { rank: 0, official: "Espionne", name: "Espionne", power: "Gagnez un point si vous êtes le seul joueur en vie à l'avoir défaussée.", image: "" },
  { rank: 1, official: "Garde", name: "Garde", power: "Choisissez un joueur et nommez un rôle (sauf Rang 1). S'il l'a, il est éliminé.", image: "" },
  { rank: 2, official: "Prêtre", name: "Prêtre", power: "Regardez secrètement la main d'un autre joueur.", image: "" },
  { rank: 3, official: "Baron", name: "Baron", power: "Comparez votre main avec un autre joueur. La carte la plus basse est éliminée.", image: "" },
  { rank: 4, official: "Servante", name: "Servante", power: "Vous êtes protégé contre les effets des cartes jusqu'à votre prochain tour.", image: "" },
  { rank: 5, official: "Prince", name: "Prince", power: "Choisissez un joueur (ou vous). Il défausse sa main et en pioche une nouvelle.", image: "" },
  { rank: 6, official: "Chancelier", name: "Chancelier", power: "Piochez 2 cartes, gardez-en 1 et remettez les 2 autres sous le paquet.", image: "" },
  { rank: 7, official: "Roi", name: "Roi", power: "Échangez votre main avec celle d'un autre joueur.", image: "" },
  { rank: 8, official: "Comtesse", name: "Comtesse", power: "Si vous avez le Roi (7) ou le Prince (5) en main, vous devez la défausser.", image: "" },
  { rank: 9, official: "Princesse", name: "Princesse", power: "Si vous défaussez cette carte, vous êtes immédiatement éliminé.", image: "" }
];

let rolesData = JSON.parse(localStorage.getItem('unmasked_roles')) || defaultRoles;
let db = null;
let currentRoom = null;
let currentGameMode = 'multi';
const playerId = "p_" + Math.floor(Math.random() * 10000);
let myPlayerName = "Joueur";
let localState = null;
let currentBaronDuelData = null;
let currentPrinceData = null;
let currentChancellorData = null;
let selectedChancellorIndices = [];

document.addEventListener("DOMContentLoaded", function() {
  renderConfig();
  setupEvents();
  initFirebase();
  initGuardSelects();
});

function setupEvents() {
  document.getElementById('btn-tab-config').onclick = () => switchTab('config');
  document.getElementById('btn-tab-game').onclick = () => switchTab('game');
  document.getElementById('btn-connect-fb').onclick = initFirebase;
  document.getElementById('btn-save-local').onclick = saveLocal;
  document.getElementById('btn-export-json').onclick = exportJSONConfig;
  document.getElementById('btn-save-fb').onclick = saveFirebase;
  document.getElementById('btn-reset').onclick = resetRoles;
  document.getElementById('btn-join-room').onclick = joinRoom;
  document.getElementById('btn-start-game').onclick = startGameLogic;
}

function switchTab(tab) {
  document.getElementById('page-config').classList.toggle('active', tab === 'config');
  document.getElementById('page-game').classList.toggle('active', tab === 'game');
  document.getElementById('btn-tab-config').classList.toggle('active', tab === 'config');
  document.getElementById('btn-tab-game').classList.toggle('active', tab === 'game');
}

function setGameMode(mode) {
  currentGameMode = mode;
  document.getElementById('mode-multi-btn').classList.toggle('active', mode === 'multi');
  document.getElementById('mode-bot-btn').classList.toggle('active', mode === 'bot');
  document.getElementById('multi-panel').style.display = (mode === 'multi') ? 'block' : 'none';
  document.getElementById('bot-panel').style.display = (mode === 'bot') ? 'block' : 'none';
}

function renderConfig() {
  const container = document.getElementById('roles-list');
  container.innerHTML = '';
  rolesData.forEach((role, idx) => {
    const div = document.createElement('div');
    div.className = 'role-card';
    div.innerHTML = `
      <div class="role-header">Rang ${role.rank} : ${role.name || role.official}</div>
      <div class="role-power">${role.power}</div>
      <div class="form-group">
        <label>Nom Personnalisé :</label>
        <input type="text" value="${role.name || ''}" onchange="rolesData[${idx}].name = this.value">
      </div>
      <div class="form-group">
        <label>Image :</label>
        <input type="file" accept="image/*" onchange="handleImageUpload(${idx}, this)">
      </div>
      ${role.image ? `<img src="${role.image}" class="preview-img">` : ''}
    `;
    container.appendChild(div);
  });
}

function handleImageUpload(idx, input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => { rolesData[idx].image = e.target.result; renderConfig(); };
    reader.readAsDataURL(input.files[0]);
  }
}

function saveLocal() {
  localStorage.setItem('unmasked_roles', JSON.stringify(rolesData));
  alert("Sauvegardé localement !");
}

function exportJSONConfig() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rolesData));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "unmasked_roles_config.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJSONConfig(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        rolesData = JSON.parse(e.target.result);
        saveLocal();
        renderConfig();
        initGuardSelects();
        alert("Configuration et images importées avec succès !");
      } catch(err) { alert("Fichier invalide."); }
    };
    reader.readAsText(input.files[0]);
  }
}

function resetRoles() {
  if(confirm("Réinitialiser les rôles par défaut ?")) {
    rolesData = JSON.parse(JSON.stringify(defaultRoles));
    localStorage.removeItem('unmasked_roles');
    renderConfig();
    initGuardSelects();
  }
}

function initFirebase() {
  const url = document.getElementById('fb-url').value.trim();
  if (!url) return;
  try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      firebase.initializeApp({ databaseURL: url });
    }
    if (typeof firebase !== 'undefined') {
      db = firebase.database();
      document.getElementById('fb-status').innerText = "Connecté ✅";
    }
  } catch(e) { document.getElementById('fb-status').innerText = "Erreur : " + e.message; }
}

function saveFirebase() {
  if(db) db.ref('roles_config').set(rolesData).then(() => alert("Cartes enregistrées sur Firebase !"));
}

function joinRoom() {
  const code = document.getElementById('room-code').value.trim().toUpperCase();
  myPlayerName = document.getElementById('player-name').value.trim() || "Joueur";
  if(!code) return alert("Code requis !");

  currentRoom = code;
  document.getElementById('room-info').style.display = 'block';

  if(db) {
    const pRef = db.ref(`rooms/${currentRoom}/players/${playerId}`);
    pRef.set({ name: myPlayerName, id: playerId });
    pRef.onDisconnect().remove();

    db.ref(`rooms/${currentRoom}/players`).on('value', snap => {
      const players = snap.val() || {};
      document.getElementById('players-list').innerText = Object.values(players).map(p => p.name).join(', ');
    });

    db.ref(`rooms/${currentRoom}/gameState`).on('value', snap => {
      const state = snap.val();
      if(state) updateGameBoard(state);
    });
  }
}

function startGameLogic() {
  if(!db) return;
  db.ref(`rooms/${currentRoom}/players`).once('value').then(snap => {
    const playersObj = snap.val();
    if(!playersObj) return;
    const playerIds = Object.keys(playersObj);

    let deck = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    const removedCard = deck.pop();
    const hands = {};
    const playerNames = {};
    playerIds.forEach(id => { 
      hands[id] = [deck.pop()]; 
      playerNames[id] = playersObj[id].name;
    });
    hands[playerIds[0]].push(deck.pop());

    const gameState = {
      deck: deck,
      removedCard: removedCard,
      hands: hands,
      playerNames: playerNames,
      eliminated: {},
      currentTurnIndex: 0,
      playerOrder: playerIds,
      lastPlayed: null,
      lastLog: "Nouvelle partie démarrée !",
      baronEvent: null,
      princeEvent: null,
      chancellorEvent: null
    };

    db.ref(`rooms/${currentRoom}/gameState`).set(gameState);
  });
}

function startBotGame() {
  let deck = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const removedCard = deck.pop();

  localState = {
    deck: deck,
    removedCard: removedCard,
    hands: { [playerId]: [deck.pop()], "bot": [deck.pop()] },
    playerNames: { [playerId]: myPlayerName, "bot": "Robot" },
    eliminated: {},
    currentTurnIndex: 0,
    playerOrder: [playerId, "bot"],
    lastPlayed: null,
    lastLog: "Partie contre le Robot commencée !",
    baronEvent: null,
    princeEvent: null,
    chancellorEvent: null
  };

  localState.hands[playerId].push(localState.deck.pop());
  updateGameBoard(localState);
}

function initGuardSelects() {
  const roleSelect = document.getElementById('guard-target-role');
  roleSelect.innerHTML = '';
  rolesData.filter(r => r.rank !== 1).forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.rank;
    opt.innerText = `${r.rank} - ${r.name || r.official}`;
    roleSelect.appendChild(opt);
  });
}

function updateGameBoard(state) {
  document.getElementById('game-board').style.display = 'flex';
  const isEliminated = state.eliminated && state.eliminated[playerId];
  const isMyTurn = (state.playerOrder[state.currentTurnIndex] === playerId) && !isEliminated;
  
  const banner = document.getElementById('turn-banner');
  if(isEliminated) {
    banner.innerText = "💀 VOUS ÊTES ÉLIMINÉ DE LA MANCHE";
    banner.style.background = "#ef4444";
  } else {
    banner.innerText = isMyTurn ? "🎯 À VOTRE TOUR DE JOUER" : "⏳ Tour de l'Adversaire / Robot...";
    banner.style.background = isMyTurn ? "#22c55e" : "#eab308";
  }

  document.getElementById('log-banner').innerText = state.lastLog || "";
  document.getElementById('deck-count').innerText = state.deck ? state.deck.length : 0;
  
  const discardContainer = document.getElementById('discard-slot-container');
  if(state.lastPlayed) {
    const roleLP = rolesData.find(r => r.rank === state.lastPlayed.card) || { rank: state.lastPlayed.card, name: "Carte " + state.lastPlayed.card, power: "" };
    discardContainer.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:0.7rem; color:var(--accent); margin-bottom:2px; font-weight:bold;">${state.lastPlayed.player}</div>
        <div class="card-playable" style="cursor:default;">
          <div class="card-badge-num">${roleLP.rank}</div>
          <div class="card-title">${roleLP.name || roleLP.official}</div>
          <div class="card-img-holder">
            ${roleLP.image ? `<img src="${roleLP.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
          </div>
          <div class="card-desc-box">
            <strong>${roleLP.name || roleLP.official}</strong><br>${roleLP.power}
          </div>
        </div>
      </div>
    `;
  } else {
    discardContainer.innerHTML = `
      <div class="discard-slot">
        <span style="color:#94a3b8;">Dernière Carte Jouée</span>
        <span style="font-weight:bold; color:var(--accent); margin-top:5px;">Aucune</span>
      </div>
    `;
  }

  const handContainer = document.getElementById('my-hand');
  handContainer.innerHTML = '';
  const myCards = state.hands[playerId] || [];

  myCards.forEach((cardRank) => {
    const role = rolesData.find(r => r.rank === cardRank) || { rank: cardRank, name: "Carte " + cardRank, power: "" };
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-playable';
    cardDiv.innerHTML = `
      <div class="card-badge-num">${role.rank}</div>
      <div class="card-title">${role.name || role.official}</div>
      <div class="card-img-holder">
        ${role.image ? `<img src="${role.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
      </div>
      <div class="card-desc-box">
        <strong>${role.name || role.official}</strong><br>${role.power}
      </div>
    `;

    if(isMyTurn && !state.chancellorEvent) {
      cardDiv.onclick = () => onCardClicked(cardRank, state);
    } else {
      cardDiv.style.opacity = '0.6';
    }

    handContainer.appendChild(cardDiv);
  });

  if(state.baronEvent && !currentBaronDuelData) {
    checkAndDisplayBaronModal(state.baronEvent);
  }

  if(state.princeEvent && !currentPrinceData) {
    checkAndDisplayPrinceModal(state.princeEvent);
  }

  // GESTION DU CHANCELIER (FERMETURE SYNCHRONISÉE)
  if(state.chancellorEvent) {
    if(!currentChancellorData) {
      checkAndDisplayChancellorModal(state.chancellorEvent);
    }
  } else {
    // Si chancellorEvent devient null sur Firebase, fermer la modale pour tout le monde !
    document.getElementById('modal-chancellor').style.display = 'none';
    currentChancellorData = null;
  }
}

// DECLENCHEMENT DES EFFETS
function onCardClicked(cardRank, state) {
  if(cardRank === 1) { 
    openGuardModal(state);
  } else if(cardRank === 2) {
    openPriestModal(state);
  } else if(cardRank === 3) {
    openBaronModal(state);
  } else if(cardRank === 5) {
    openPrinceModal(state);
  } else if(cardRank === 6) { // RANG 6 : CHANCELIER
    initiateChancellorEffect(state);
  } else if(cardRank === 9) {
    playPrincessCard(state);
  } else {
    executePlayCard(cardRank, state);
  }
}

// --- RANG 6 : CHANCELIER ---
function initiateChancellorEffect(state) {
  // Retirer le Chancelier joué de la main
  const idx = state.hands[playerId].indexOf(6);
  if(idx > -1) state.hands[playerId].splice(idx, 1);

  // Piocher jusqu'à 2 cartes dans le paquet
  const drawnCards = [];
  if(state.deck && state.deck.length > 0) drawnCards.push(state.deck.pop());
  if(state.deck && state.deck.length > 0) drawnCards.push(state.deck.pop());

  const currentHandCards = [...state.hands[playerId]];
  const totalOptions = [...currentHandCards, ...drawnCards];

  const chancellorEventData = {
    casterId: playerId,
    casterName: myPlayerName,
    options: totalOptions, // Les 3 (ou 2) cartes à trier
    returnCount: drawnCards.length // Combien de cartes doivent retourner sous la pioche (généralement 2)
  };

  state.chancellorEvent = chancellorEventData;

  if(currentGameMode === 'bot') {
    checkAndDisplayChancellorModal(chancellorEventData);
  } else {
    db.ref(`rooms/${currentRoom}/gameState`).set(state);
  }
}

function checkAndDisplayChancellorModal(chancellorData) {
  currentChancellorData = chancellorData;
  selectedChancellorIndices = [];

  const title = document.getElementById('chancellor-title');
  const subtitle = document.getElementById('chancellor-subtitle');
  const container = document.getElementById('chancellor-cards-container');
  const btn = document.getElementById('btn-chancellor-confirm');

  container.innerHTML = '';

  if(chancellorData.casterId === playerId) {
    // JOUEUR ACTIF : CHOIX DES CARTES
    title.innerText = "📜 Action du Chancelier";
    subtitle.innerText = `Sélectionnez ${chancellorData.returnCount} carte(s) à remettre SOUS la pioche :`;
    btn.style.display = "block";
    btn.innerText = `Valider (${selectedChancellorIndices.length}/${chancellorData.returnCount})`;
    btn.style.opacity = "0.6";

    chancellorData.options.forEach((cardRank, index) => {
      const roleObj = rolesData.find(r => r.rank === cardRank) || { rank: cardRank, name: "Rang " + cardRank, power: "" };
      const cardDiv = document.createElement('div');
      cardDiv.className = 'card-playable';
      cardDiv.style.width = "115px";
      cardDiv.style.height = "165px";
      cardDiv.innerHTML = `
        <div class="card-badge-num">${roleObj.rank}</div>
        <div class="card-title">${roleObj.name || roleObj.official}</div>
        <div class="card-img-holder" style="height:65px;">
          ${roleObj.image ? `<img src="${roleObj.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
        </div>
        <div class="card-desc-box" style="font-size:0.55rem; max-height:45px;">
          <strong>${roleObj.name || roleObj.official}</strong>
        </div>
      `;

      cardDiv.onclick = () => toggleChancellorSelection(index, cardDiv, chancellorData.returnCount);
      container.appendChild(cardDiv);
    });
  } else {
    // SPECTATEURS : AFFICHAGE FACE CACHÉE
    title.innerText = "📜 Chancelier en cours...";
    subtitle.innerText = `${chancellorData.casterName} a joué le Chancelier et choisit ses cartes...`;
    btn.style.display = "none";

    chancellorData.options.forEach(() => {
      const backDiv = document.createElement('div');
      backDiv.className = 'card-back-style';
      backDiv.style.width = "110px";
      backDiv.style.height = "160px";
      backDiv.innerText = "🃏";
      container.appendChild(backDiv);
    });
  }

  document.getElementById('modal-chancellor').style.display = 'flex';

  // Si c'est le Robot qui joue le Chancelier, il fait son choix automatiquement après 1.5s
  if(chancellorData.casterId === 'bot') {
    setTimeout(executeBotChancellor, 1500);
  }
}

function toggleChancellorSelection(index, element, targetCount) {
  const existingIdx = selectedChancellorIndices.indexOf(index);

  if(existingIdx > -1) {
    selectedChancellorIndices.splice(existingIdx, 1);
    element.classList.remove('card-selected-return');
  } else {
    if(selectedChancellorIndices.length < targetCount) {
      selectedChancellorIndices.push(index);
      element.classList.add('card-selected-return');
    }
  }

  const btn = document.getElementById('btn-chancellor-confirm');
  btn.innerText = `Valider (${selectedChancellorIndices.length}/${targetCount}) 📥`;
  btn.style.opacity = (selectedChancellorIndices.length === targetCount) ? "1" : "0.6";
}

function confirmChancellorSelection() {
  const data = currentChancellorData;
  if(!data || selectedChancellorIndices.length !== data.returnCount) {
    alert(`Veuillez sélectionner exactement ${data.returnCount} carte(s) à remettre sous le paquet.`);
    return;
  }

  const returnedCards = [];
  const keptCards = [];

  data.options.forEach((cardRank, idx) => {
    if(selectedChancellorIndices.includes(idx)) {
      returnedCards.push(cardRank);
    } else {
      keptCards.push(cardRank);
    }
  });

  finishChancellorTurn(data.casterId, keptCards, returnedCards, data.casterName);
}

function executeBotChancellor() {
  const data = currentChancellorData;
  if(!data) return;

  // Le bot remet au hasard 2 cartes sous la pioche
  const shuffledOptions = [...data.options].sort(() => Math.random() - 0.5);
  const keptCards = [shuffledOptions.pop()];
  const returnedCards = shuffledOptions;

  finishChancellorTurn('bot', keptCards, returnedCards, "Robot");
}

function finishChancellorTurn(casterId, keptCards, returnedCards, casterName) {
  const state = (currentGameMode === 'multi') ? null : localState;

  function applyChancellorResult(currentState) {
    // 1. Mettre à jour la main du joueur avec les cartes conservées
    currentState.hands[casterId] = keptCards;

    // 2. Remettre les cartes sélectionnées au fond de la pioche (au début du tableau)
    if(!currentState.deck) currentState.deck = [];
    returnedCards.forEach(card => {
      currentState.deck.unshift(card);
    });

    currentState.chancellorEvent = null; // Ferme la modale chez tout le monde !
    const logMsg = `📜 ${casterName} a joué le Chancelier (Rang 6) et a remis ${returnedCards.length} carte(s) sous la pioche.`;

    executePlayCard(6, currentState, logMsg);
  }

  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      applyChancellorResult(snap.val());
    });
  } else {
    applyChancellorResult(state);
  }
}

// --- RANG 9 : PRINCESSE ---
function playPrincessCard(state) {
  if(!state.eliminated) state.eliminated = {};
  state.eliminated[playerId] = true;

  const princessObj = rolesData.find(r => r.rank === 9) || {};
  const princessName = princessObj.name || princessObj.official || "Princesse";
  const logMsg = `💀 ${myPlayerName} a défaussé ${princessName} (Rang 9) et est ÉLIMINÉ(E) !`;

  state.hands[playerId] = [];
  executePlayCard(9, state, logMsg);
}

// --- RANG 5 : PRINCE ---
function openPrinceModal(state) {
  const targetSelect = document.getElementById('prince-target-player');
  targetSelect.innerHTML = '';

  state.playerOrder.forEach(id => {
    if(!state.eliminated || !state.eliminated[id]) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = (id === playerId) ? `${myPlayerName} (Vous)` : (state.playerNames ? state.playerNames[id] : id);
      targetSelect.appendChild(opt);
    }
  });

  document.getElementById('modal-prince-select').style.display = 'flex';
}

function confirmPrinceSelection() {
  document.getElementById('modal-prince-select').style.display = 'none';
  const targetId = document.getElementById('prince-target-player').value;

  const state = (currentGameMode === 'multi') ? null : localState;
  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      initiatePrinceEffect(snap.val(), targetId);
    });
  } else {
    initiatePrinceEffect(state, targetId);
  }
}

function initiatePrinceEffect(state, targetId) {
  const targetName = state.playerNames[targetId] || "Robot";
  
  const targetCard = (targetId === playerId && state.hands[playerId].length > 1) 
    ? state.hands[playerId].filter(c => c !== 5)[0] 
    : state.hands[targetId][0];

  const princeEventData = {
    casterId: playerId,
    casterName: myPlayerName,
    targetId: targetId,
    targetName: targetName,
    targetCard: targetCard,
    discarded: false
  };

  state.princeEvent = princeEventData;

  if(currentGameMode === 'bot') {
    checkAndDisplayPrinceModal(princeEventData);
  } else {
    db.ref(`rooms/${currentRoom}/gameState`).set(state);
  }
}

function checkAndDisplayPrinceModal(princeData) {
  currentPrinceData = princeData;

  const subtitle = document.getElementById('prince-action-subtitle');
  const cardHolder = document.getElementById('prince-card-display');
  const timerMsg = document.getElementById('prince-timer-msg');
  const btn = document.getElementById('btn-prince-discard');

  cardHolder.innerHTML = '';
  timerMsg.innerText = '';
  
  subtitle.innerHTML = `<strong>${princeData.casterName}</strong> utilise le Prince sur <strong>${princeData.targetName}</strong> !`;

  if(princeData.targetId === playerId) {
    btn.style.display = "block";
    btn.innerText = "Défausser ma carte 🚮";
  } else {
    btn.style.display = "none";
    timerMsg.innerText = `En attente que ${princeData.targetName} défausse sa carte...`;
  }

  document.getElementById('modal-prince-action').style.display = 'flex';

  if(princeData.targetId === 'bot') {
    setTimeout(executePrinceDiscard, 1000);
  }
}

function executePrinceDiscard() {
  const data = currentPrinceData;
  if(!data) return;

  const cardHolder = document.getElementById('prince-card-display');
  const timerMsg = document.getElementById('prince-timer-msg');
  const btn = document.getElementById('btn-prince-discard');

  btn.style.display = "none";

  const roleObj = rolesData.find(r => r.rank === data.targetCard) || { rank: data.targetCard, name: "Rang " + data.targetCard };
  
  cardHolder.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:0.75rem; color:#ef4444; font-weight:bold; margin-bottom:4px;">Carte Défaussée par ${data.targetName}</div>
      <div class="card-playable" style="cursor:default;">
        <div class="card-badge-num">${roleObj.rank}</div>
        <div class="card-title">${roleObj.name || roleObj.official}</div>
        <div class="card-img-holder">
          ${roleObj.image ? `<img src="${roleObj.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
        </div>
        <div class="card-desc-box">
          <strong>${roleObj.name || roleObj.official}</strong><br>${roleObj.power}
        </div>
      </div>
    </div>
  `;

  let isPrincessEliminated = (data.targetCard === 9);

  let countdown = 5;
  timerMsg.innerText = isPrincessEliminated 
    ? `💀 C'était la Princesse (Rang 9) ! ${data.targetName} est ÉLIMINÉ(E) !` 
    : `Nouvelle carte piochée dans ${countdown}s...`;

  const interval = setInterval(() => {
    countdown--;
    if(countdown > 0 && !isPrincessEliminated) {
      timerMsg.innerText = `Nouvelle carte piochée dans ${countdown}s...`;
    } else if(countdown <= 0) {
      clearInterval(interval);
      document.getElementById('modal-prince-action').style.display = 'none';
      finishPrinceTurn(data, isPrincessEliminated);
    }
  }, 1000);
}

function finishPrinceTurn(data, isPrincessEliminated) {
  currentPrinceData = null;
  const targetId = data.targetId;
  const state = (currentGameMode === 'multi') ? null : localState;

  function applyPrinceResult(currentState) {
    if(isPrincessEliminated) {
      if(!currentState.eliminated) currentState.eliminated = {};
      currentState.eliminated[targetId] = true;
      currentState.hands[targetId] = [];
      currentState.lastPlayed = { player: data.targetName, card: 9 };
    } else {
      const idx = currentState.hands[targetId].indexOf(data.targetCard);
      if(idx > -1) currentState.hands[targetId].splice(idx, 1);

      let newCard = (currentState.deck && currentState.deck.length > 0) 
        ? currentState.deck.pop() 
        : currentState.removedCard;

      if(newCard !== undefined) {
        currentState.hands[targetId].push(newCard);
      }

      currentState.lastPlayed = { player: data.targetName, card: data.targetCard };
    }

    currentState.princeEvent = null;
    const logText = isPrincessEliminated 
      ? `👑 ${data.casterName} a joué le Prince sur ${data.targetName} qui a défaussé la Princesse (Rang 9) et est ÉLIMINÉ(E) !`
      : `👑 ${data.casterName} a forcé ${data.targetName} à défausser sa carte (Rang ${data.targetCard}) et à en repiocher une nouvelle !`;

    executePlayCard(5, currentState, logText);
  }

  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      applyPrinceResult(snap.val());
    });
  } else {
    applyPrinceResult(state);
  }
}

// --- RANG 1 : GARDE ---
function openGuardModal(state) {
  const targetSelect = document.getElementById('guard-target-player');
  targetSelect.innerHTML = '';

  state.playerOrder.forEach(id => {
    if(id !== playerId && (!state.eliminated || !state.eliminated[id])) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = state.playerNames ? state.playerNames[id] : id;
      targetSelect.appendChild(opt);
    }
  });

  if(targetSelect.options.length === 0) {
    executePlayCard(1, state, "Rang 1 joué mais personne ne peut être ciblé !");
    return;
  }

  document.getElementById('modal-guard').style.display = 'flex';
}

function confirmGuardAction() {
  document.getElementById('modal-guard').style.display = 'none';
  const targetId = document.getElementById('guard-target-player').value;
  const guessedRank = parseInt(document.getElementById('guard-target-role').value);
  
  const state = (currentGameMode === 'multi') ? null : localState;
  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      processGuardLogic(snap.val(), targetId, guessedRank);
    });
  } else {
    processGuardLogic(state, targetId, guessedRank);
  }
}

function processGuardLogic(state, targetId, guessedRank) {
  const targetHand = state.hands[targetId] || [];
  const targetName = state.playerNames[targetId] || "L'adversaire";
  const guessedRoleObj = rolesData.find(r => r.rank === guessedRank) || {};
  const guessedRoleName = guessedRoleObj.name || guessedRoleObj.official || guessedRank;

  let title = "";
  let message = "";

  if(targetHand.includes(guessedRank)) {
    if(!state.eliminated) state.eliminated = {};
    state.eliminated[targetId] = true;

    const droppedCard = targetHand.pop();
    state.hands[targetId] = [];
    state.lastPlayed = { player: targetName, card: droppedCard };
    
    title = "🎯 ÉLIMINATION !";
    message = `<strong>${myPlayerName}</strong> a deviné que <strong>${targetName}</strong> avait la carte <strong>${guessedRoleName} (Rang ${guessedRank})</strong>.<br><br><span style="color:#ef4444; font-weight:bold;">${targetName} est éliminé(e) de la manche !</span>`;
  } else {
    title = "❌ MAUVAISE DÉDUCTION";
    message = `<strong>${myPlayerName}</strong> a deviné la carte <strong>${guessedRoleName} (Rang ${guessedRank})</strong> sur <strong>${targetName}</strong>.<br><br><span style="color:#4ade80;">${targetName} n'a pas cette carte en main !</span>`;
  }

  showGuardResultModal(title, message);
  executePlayCard(1, state, `${myPlayerName} a joué le Garde (Rang 1) sur ${targetName}`);
}

function showGuardResultModal(title, htmlMessage) {
  document.getElementById('guard-result-title').innerText = title;
  document.getElementById('guard-result-text').innerHTML = htmlMessage;
  document.getElementById('modal-guard-result').style.display = 'flex';
}

function closeGuardResultModal() {
  document.getElementById('modal-guard-result').style.display = 'none';
}

// --- RANG 2 : PRÊTRE ---
function openPriestModal(state) {
  const targetSelect = document.getElementById('priest-target-player');
  targetSelect.innerHTML = '';

  state.playerOrder.forEach(id => {
    if(id !== playerId && (!state.eliminated || !state.eliminated[id])) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = state.playerNames ? state.playerNames[id] : id;
      targetSelect.appendChild(opt);
    }
  });

  if(targetSelect.options.length === 0) {
    executePlayCard(2, state, "Rang 2 joué mais personne ne peut être ciblé !");
    return;
  }

  document.getElementById('modal-priest').style.display = 'flex';
}

function confirmPriestAction() {
  document.getElementById('modal-priest').style.display = 'none';
  const targetId = document.getElementById('priest-target-player').value;

  const state = (currentGameMode === 'multi') ? null : localState;
  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      processPriestLogic(snap.val(), targetId);
    });
  } else {
    processPriestLogic(state, targetId);
  }
}

function processPriestLogic(state, targetId) {
  const targetHand = state.hands[targetId] || [];
  const targetName = state.playerNames[targetId] || "L'adversaire";
  const targetCardRank = targetHand[0];

  const roleObj = rolesData.find(r => r.rank === targetCardRank) || { rank: targetCardRank, name: "Carte " + targetCardRank, power: "" };

  showPriestResultModal(targetName, roleObj);
  const publicLog = `${myPlayerName} a regardé la main de ${targetName}`;
  executePlayCard(2, state, publicLog);
}

function showPriestResultModal(targetName, roleObj) {
  document.getElementById('priest-result-title').innerText = `👁️ Carte de ${targetName}`;
  
  const container = document.getElementById('priest-result-card');
  container.innerHTML = `
    <div class="card-playable" style="cursor:default;">
      <div class="card-badge-num">${roleObj.rank}</div>
      <div class="card-title">${roleObj.name || roleObj.official}</div>
      <div class="card-img-holder">
        ${roleObj.image ? `<img src="${roleObj.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
      </div>
      <div class="card-desc-box">
        <strong>${roleObj.name || roleObj.official}</strong><br>${roleObj.power}
      </div>
    </div>
  `;
  document.getElementById('modal-priest-result').style.display = 'flex';
}

function closePriestResultModal() {
  document.getElementById('modal-priest-result').style.display = 'none';
}

// --- RANG 3 : BARON ---
function openBaronModal(state) {
  const targetSelect = document.getElementById('baron-target-player');
  targetSelect.innerHTML = '';

  state.playerOrder.forEach(id => {
    if(id !== playerId && (!state.eliminated || !state.eliminated[id])) {
      const opt = document.createElement('option');
      opt.value = id;
      opt.innerText = state.playerNames ? state.playerNames[id] : id;
      targetSelect.appendChild(opt);
    }
  });

  if(targetSelect.options.length === 0) {
    executePlayCard(3, state, "Le Baron est joué mais personne ne peut être ciblé !");
    return;
  }

  document.getElementById('modal-baron-select').style.display = 'flex';
}

function confirmBaronSelection() {
  document.getElementById('modal-baron-select').style.display = 'none';
  const targetId = document.getElementById('baron-target-player').value;

  const state = (currentGameMode === 'multi') ? null : localState;
  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      initiateBaronDuel(snap.val(), targetId);
    });
  } else {
    initiateBaronDuel(state, targetId);
  }
}

function initiateBaronDuel(state, targetId) {
  const challengerName = myPlayerName;
  const targetName = state.playerNames[targetId] || "Robot";

  const challengerCard = (state.hands[playerId].filter(c => c !== 3)[0] !== undefined) ? state.hands[playerId].filter(c => c !== 3)[0] : state.hands[playerId][0];
  const targetCard = state.hands[targetId][0];

  const baronEventData = {
    challengerId: playerId,
    challengerName: challengerName,
    challengerCard: challengerCard,
    targetId: targetId,
    targetName: targetName,
    targetCard: targetCard,
    revealed: false
  };

  state.baronEvent = baronEventData;

  if(currentGameMode === 'bot') {
    checkAndDisplayBaronModal(baronEventData);
  } else {
    db.ref(`rooms/${currentRoom}/gameState`).set(state);
  }
}

function checkAndDisplayBaronModal(baronData) {
  currentBaronDuelData = baronData;

  const title = document.getElementById('baron-duel-title');
  const subtitle = document.getElementById('baron-duel-subtitle');
  const arena = document.getElementById('baron-duel-cards-container');
  const outcome = document.getElementById('baron-outcome-msg');
  const btn = document.getElementById('btn-baron-action');

  title.innerText = "⚔️ Duel du Baron !";
  outcome.innerText = "";
  
  const isChallenger = (baronData.challengerId === playerId);
  const isTarget = (baronData.targetId === playerId);

  if(isChallenger || isTarget) {
    subtitle.innerText = `${baronData.challengerName} défie ${baronData.targetName} en duel !`;
    
    arena.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:0.75rem; color:#4ade80; font-weight:bold;">${baronData.challengerName}</div>
        <div class="card-back-style">❓</div>
      </div>
      <div style="font-weight:bold; color:var(--accent);">VS</div>
      <div style="text-align:center;">
        <div style="font-size:0.75rem; color:#ef4444; font-weight:bold;">${baronData.targetName}</div>
        <div class="card-back-style">❓</div>
      </div>
    `;

    btn.innerText = "Retourner ma carte 🃏";
    btn.style.display = "block";
    btn.onclick = () => revealBaronCards();
  } else {
    subtitle.innerText = `${baronData.challengerName} et ${baronData.targetName} sont en duel...`;
    arena.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:0.75rem; font-weight:bold;">${baronData.challengerName}</div>
        <div class="card-back-style">🃏</div>
      </div>
      <div style="font-weight:bold; color:var(--accent);">VS</div>
      <div style="text-align:center;">
        <div style="font-size:0.75rem; font-weight:bold;">${baronData.targetName}</div>
        <div class="card-back-style">🃏</div>
      </div>
    `;
    btn.innerText = "Fermer 👍";
    btn.style.display = "block";
    btn.onclick = () => { document.getElementById('modal-baron-duel').style.display = 'none'; };
  }

  document.getElementById('modal-baron-duel').style.display = 'flex';
}

function revealBaronCards() {
  const data = currentBaronDuelData;
  if(!data) return;

  const arena = document.getElementById('baron-duel-cards-container');
  const outcome = document.getElementById('baron-outcome-msg');
  const btn = document.getElementById('btn-baron-action');

  const cRole = rolesData.find(r => r.rank === data.challengerCard) || { rank: data.challengerCard, name: "Rang " + data.challengerCard };
  const tRole = rolesData.find(r => r.rank === data.targetCard) || { rank: data.targetCard, name: "Rang " + data.targetCard };

  const isChallenger = (data.challengerId === playerId);
  const cColor = isChallenger ? "#4ade80" : "#ef4444";
  const tColor = !isChallenger ? "#4ade80" : "#ef4444";

  arena.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:0.75rem; color:${cColor}; font-weight:bold;">${data.challengerName}</div>
      ${getMiniCardHTML(cRole)}
    </div>
    <div style="font-weight:bold; color:var(--accent);">VS</div>
    <div style="text-align:center;">
      <div style="font-size:0.75rem; color:${tColor}; font-weight:bold;">${data.targetName}</div>
      ${getMiniCardHTML(tRole)}
    </div>
  `;

  setTimeout(() => {
    let loserId = null;
    let logText = "";

    if(data.challengerCard < data.targetCard) {
      loserId = data.challengerId;
      logText = `⚔️ ${data.targetName} remporte le duel ! ${data.challengerName} (Rang ${data.challengerCard}) est ÉLIMINÉ !`;
    } else if(data.targetCard < data.challengerCard) {
      loserId = data.targetId;
      logText = `⚔️ ${data.challengerName} remporte le duel ! ${data.targetName} (Rang ${data.targetCard}) est ÉLIMINÉ !`;
    } else {
      logText = `⚔️ ÉGALITÉ ! Personne n'est éliminé du duel.`;
    }

    if(loserId === playerId) {
      outcome.innerHTML = `<span style="color:#ef4444;">💀 VOUS AVEZ PERDU LE DUEL !</span>`;
    } else if(loserId !== null) {
      outcome.innerHTML = `<span style="color:#4ade80;">🏆 VOUS AVEZ GAGNÉ LE DUEL !</span>`;
    } else {
      outcome.innerHTML = `<span style="color:var(--accent);">🤝 ÉGALITÉ !</span>`;
    }

    btn.innerText = "Continuer le Jeu 🚀";
    btn.onclick = () => finishBaronTurn(loserId, logText);
  }, 1000);
}

function getMiniCardHTML(roleObj) {
  return `
    <div class="card-playable" style="cursor:default; width:110px; height:155px;">
      <div class="card-badge-num">${roleObj.rank}</div>
      <div class="card-title">${roleObj.name || roleObj.official}</div>
      <div class="card-img-holder" style="height:60px;">
        ${roleObj.image ? `<img src="${roleObj.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
      </div>
      <div class="card-desc-box" style="font-size:0.55rem; max-height:45px;">
        <strong>${roleObj.name || roleObj.official}</strong>
      </div>
    </div>
  `;
}

function finishBaronTurn(loserId, logText) {
  document.getElementById('modal-baron-duel').style.display = 'none';
  currentBaronDuelData = null;

  const state = (currentGameMode === 'multi') ? null : localState;
  
  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      const currentState = snap.val();
      if(loserId) {
        if(!currentState.eliminated) currentState.eliminated = {};
        currentState.eliminated[loserId] = true;
        const droppedCard = currentState.hands[loserId].pop();
        currentState.hands[loserId] = [];
        currentState.lastPlayed = { player: currentState.playerNames[loserId], card: droppedCard };
      }
      currentState.baronEvent = null;
      executePlayCard(3, currentState, logText);
    });
  } else {
    if(loserId) {
      if(!state.eliminated) state.eliminated = {};
      state.eliminated[loserId] = true;
      const droppedCard = state.hands[loserId].pop();
      state.hands[loserId] = [];
      state.lastPlayed = { player: state.playerNames[loserId], card: droppedCard };
    }
    state.baronEvent = null;
    executePlayCard(3, state, logText);
  }
}

// EXECUTION GENERALE DES TOURS
function executePlayCard(cardRank, state, customLog) {
  // Si le Rang est 6, on a déjà retiré la carte dans initiateChancellorEffect
  if(cardRank !== 6) {
    const idx = state.hands[playerId].indexOf(cardRank);
    if(idx > -1) state.hands[playerId].splice(idx, 1);
  }

  const playedRoleObj = rolesData.find(r => r.rank === cardRank) || {};
  const cardName = playedRoleObj.name || playedRoleObj.official || cardRank;

  state.lastPlayed = { player: myPlayerName, card: cardRank };
  state.lastLog = customLog || `${myPlayerName} a joué ${cardName} (Rang ${cardRank})`;

  let nextTurnIndex = state.currentTurnIndex;
  do {
    nextTurnIndex = (nextTurnIndex + 1) % state.playerOrder.length;
  } while(state.eliminated && state.eliminated[state.playerOrder[nextTurnIndex]] && nextTurnIndex !== state.currentTurnIndex);

  state.currentTurnIndex = nextTurnIndex;
  const nextPlayerId = state.playerOrder[nextTurnIndex];

  if(state.deck && state.deck.length > 0 && (!state.eliminated || !state.eliminated[nextPlayerId])) {
    if(!state.hands[nextPlayerId]) state.hands[nextPlayerId] = [];
    state.hands[nextPlayerId].push(state.deck.pop());
  }

  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).set(state);
  } else {
    localState = state;
    updateGameBoard(localState);

    if(nextPlayerId === 'bot' && (!localState.eliminated || !localState.eliminated['bot'])) {
      setTimeout(playBotTurn, 2200);
    }
  }
}

function playBotTurn() {
  if(!localState || localState.playerOrder[localState.currentTurnIndex] !== 'bot') return;

  const botCards = localState.hands['bot'];
  if(botCards && botCards.length > 0) {
    const playedCard = botCards.shift();
    const playedRoleObj = rolesData.find(r => r.rank === playedCard) || {};
    const cardName = playedRoleObj.name || playedRoleObj.official || playedCard;
    
    let logMsg = `Robot a joué ${cardName}`;

    if(playedCard === 1) {
      const botGuess = Math.floor(Math.random() * 9);
      const actualGuess = (botGuess === 1) ? 0 : botGuess;
      const userHand = localState.hands[playerId] || [];
      const guessedRoleObj = rolesData.find(r => r.rank === actualGuess) || {};
      const guessedName = guessedRoleObj.name || guessedRoleObj.official || actualGuess;

      if(userHand.includes(actualGuess)) {
        if(!localState.eliminated) localState.eliminated = {};
        localState.eliminated[playerId] = true;
        showGuardResultModal("💀 VOUS ÊTES ÉLIMINÉ !", `Le Robot a deviné que vous aviez <strong>${guessedName} (Rang ${actualGuess})</strong> !`);
      } else {
        showGuardResultModal("🛡️ ATTAQUE ÉVITÉE !", `Le Robot a deviné <strong>${guessedName} (Rang ${actualGuess})</strong> sur vous... Mais vous ne l'avez pas !`);
      }
    } else if(playedCard === 2) {
      logMsg = `Robot a joué le Prêtre (Rang 2) et a regardé votre main.`;
    } else if(playedCard === 3) {
      const botCardVal = botCards[0] || localState.hands['bot'][0];
      const userCardVal = localState.hands[playerId][0];
      
      const baronEventData = {
        challengerId: "bot",
        challengerName: "Robot",
        challengerCard: botCardVal,
        targetId: playerId,
        targetName: myPlayerName,
        targetCard: userCardVal,
        revealed: false
      };
      checkAndDisplayBaronModal(baronEventData);
      return;
    } else if(playedCard === 5) {
      initiatePrinceEffect(localState, playerId);
      return;
    } else if(playedCard === 6) {
      // Robot joue le Chancelier
      initiateChancellorEffect(localState);
      return;
    } else if(playedCard === 9) {
      if(!localState.eliminated) localState.eliminated = {};
      localState.eliminated['bot'] = true;
      logMsg = `💀 Robot a joué la Princesse (Rang 9) et s'est ÉLIMINÉ tout seul !`;
    }

    localState.lastPlayed = { player: "Robot", card: playedCard };
    localState.lastLog = logMsg;

    localState.currentTurnIndex = 0;
    if(localState.deck.length > 0 && (!localState.eliminated || !localState.eliminated[playerId])) {
      localState.hands[playerId].push(localState.deck.pop());
    }
    updateGameBoard(localState);
  }
}

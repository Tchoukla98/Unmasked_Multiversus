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

    deck.pop();
    const hands = {};
    const playerNames = {};
    playerIds.forEach(id => { 
      hands[id] = [deck.pop()]; 
      playerNames[id] = playersObj[id].name;
    });
    hands[playerIds[0]].push(deck.pop());

    const gameState = {
      deck: deck,
      hands: hands,
      playerNames: playerNames,
      eliminated: {},
      currentTurnIndex: 0,
      playerOrder: playerIds,
      lastPlayed: null,
      lastLog: "Nouvelle partie démarrée !"
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
  deck.pop();

  localState = {
    deck: deck,
    hands: { [playerId]: [deck.pop()], "bot": [deck.pop()] },
    playerNames: { [playerId]: myPlayerName, "bot": "Robot" },
    eliminated: {},
    currentTurnIndex: 0,
    playerOrder: [playerId, "bot"],
    lastPlayed: null,
    lastLog: "Partie contre le Robot commencée !"
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

    if(isMyTurn) {
      cardDiv.onclick = () => onCardClicked(cardRank, state);
    } else {
      cardDiv.style.opacity = '0.6';
    }

    handContainer.appendChild(cardDiv);
  });
}

function onCardClicked(cardRank, state) {
  if(cardRank === 1) { 
    openGuardModal(state);
  } else {
    executePlayCard(cardRank, state);
  }
}

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

function executePlayCard(cardRank, state, customLog) {
  const idx = state.hands[playerId].indexOf(cardRank);
  if(idx > -1) state.hands[playerId].splice(idx, 1);

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
      setTimeout(playBotTurn, 1400);
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

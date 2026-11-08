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
let currentKingData = null;
let currentEndRoundData = null;
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
      chancellorEvent: null,
      kingEvent: null,
      endRoundEvent: null
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
    chancellorEvent: null,
    kingEvent: null,
    endRoundEvent: null
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
  const hasCountess = myCards.includes(8);

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

    const isCardDisabledByCountess = hasCountess && (cardRank === 5 || cardRank === 7);

    if(isMyTurn && !isCardDisabledByCountess) {
      cardDiv.onclick = () => onCardClicked(cardRank, state);
    } else {
      cardDiv.style.opacity = '0.5';
      cardDiv.style.cursor = 'not-allowed';
      if(isCardDisabledByCountess) {
        cardDiv.title = "Désactivé : Vous devez jouer la Comtesse (Rang 8) !";
      }
    }

    handContainer.appendChild(cardDiv);
  });

  if(state.baronEvent && !currentBaronDuelData) checkAndDisplayBaronModal(state.baronEvent);
  if(state.princeEvent && !currentPrinceData) checkAndDisplayPrinceModal(state.princeEvent);
  if(state.chancellorEvent && !currentChancellorData) checkAndDisplayChancellorModal(state.chancellorEvent);
  if(state.kingEvent && !currentKingData) checkAndDisplayKingModal(state.kingEvent);
  if(state.endRoundEvent && !currentEndRoundData) triggerEndRoundModal(state.endRoundEvent);
}

// CLIC SUR LES CARTES
function onCardClicked(cardRank, state) {
  if(cardRank === 1) { 
    openGuardModal(state);
  } else if(cardRank === 2) {
    openPriestModal(state);
  } else if(cardRank === 3) {
    openBaronModal(state);
  } else if(cardRank === 5) {
    openPrinceModal(state);
  } else if(cardRank === 6) {
    initiateChancellorEffect(state, playerId);
  } else if(cardRank === 7) {
    openKingModal(state);
  } else if(cardRank === 9) {
    playPrincessCard(state);
  } else {
    executePlayCard(cardRank, state);
  }
}

// --- GESTION DE FIN DE MANCHE ---
function checkEndRoundCondition(state) {
  if(!state) return false;

  const alivePlayers = state.playerOrder.filter(id => !state.eliminated || !state.eliminated[id]);

  // CAS 1 : UN SEUL SURVIVANT (Victoire par élimination -> Ancien Pop-up court 4s)
  if(alivePlayers.length === 1) {
    const winnerId = alivePlayers[0];
    const winnerName = state.playerNames[winnerId] || "Joueur";
    
    const endRoundData = {
      reason: 'elimination',
      winnerId: winnerId,
      winnerName: winnerName,
      handsToReveal: state.hands
    };
    
    state.endRoundEvent = endRoundData;
    triggerEndRoundModal(endRoundData);
    return true;
  }

  // CAS 2 : PIOCHE ÉPUISÉE (Départage des 2+ survivants -> Comparatif cartes caché puis révélé)
  if(!state.deck || state.deck.length === 0) {
    let highestRank = -1;
    alivePlayers.forEach(id => {
      const cardVal = state.hands[id] ? state.hands[id][0] : -1;
      if(cardVal > highestRank) highestRank = cardVal;
    });

    const endRoundData = {
      reason: 'deck_empty',
      highestRank: highestRank,
      alivePlayers: alivePlayers,
      handsToReveal: state.hands
    };

    state.endRoundEvent = endRoundData;
    triggerEndRoundModal(endRoundData);
    return true;
  }

  return false;
}

function triggerEndRoundModal(endData) {
  currentEndRoundData = endData;

  const container = document.getElementById('end-round-cards-container');
  const statusMsg = document.getElementById('end-round-status-msg');
  const subtitle = document.getElementById('end-round-subtitle');

  container.innerHTML = '';
  
  if(endData.reason === 'elimination') {
    subtitle.innerHTML = `<span style="font-size:1.1rem; color:#4ade80;">🏆 <strong>${endData.winnerName}</strong> remporte la manche !</span><br><span style="font-size:0.85rem; color:#cbd5e1;">Tous les autres joueurs ont été éliminés.</span>`;
    
    // Pour l'élimination : pas de décompte carte cachée, affichage direct
    let countdownReset = 4;
    statusMsg.innerText = `Nouvelle manche dans ${countdownReset}s...`;

    document.getElementById('modal-end-round').style.display = 'flex';

    const resetTimer = setInterval(() => {
      countdownReset--;
      if(countdownReset > 0) {
        statusMsg.innerText = `Nouvelle manche dans ${countdownReset}s...`;
      } else {
        clearInterval(resetTimer);
        document.getElementById('modal-end-round').style.display = 'none';
        currentEndRoundData = null;

        if(currentGameMode === 'bot') {
          startBotGame();
        } else {
          startGameLogic();
        }
      }
    }, 1000);
    return;
  }

  // DECK ÉPUISÉ : 3 SECONDES FACE CACHÉE PUIS RÉVÉLATION
  subtitle.innerText = "📜 La pioche est épuisée ! La carte la plus forte gagne cette manche.";
  const aliveList = endData.alivePlayers || Object.keys(endData.handsToReveal);

  aliveList.forEach(pId => {
    const pName = (localState && localState.playerNames) ? localState.playerNames[pId] : pId;
    const cardSlot = document.createElement('div');
    cardSlot.style.textAlign = 'center';
    cardSlot.innerHTML = `
      <div style="font-size:0.75rem; color:var(--accent); font-weight:bold; margin-bottom:4px;">${pName}</div>
      <div class="card-back-style">❓</div>
    `;
    container.appendChild(cardSlot);
  });

  document.getElementById('modal-end-round').style.display = 'flex';

  let countdownReveal = 3;
  statusMsg.innerText = `Révélation des cartes dans ${countdownReveal}s...`;

  const revealTimer = setInterval(() => {
    countdownReveal--;
    if(countdownReveal > 0) {
      statusMsg.innerText = `Révélation des cartes dans ${countdownReveal}s...`;
    } else {
      clearInterval(revealTimer);
      revealEndRoundCards(endData);
    }
  }, 1000);
}

function revealEndRoundCards(endData) {
  const container = document.getElementById('end-round-cards-container');
  const statusMsg = document.getElementById('end-round-status-msg');

  container.innerHTML = '';

  const aliveList = endData.alivePlayers || Object.keys(endData.handsToReveal);
  const highestValue = endData.highestRank;

  aliveList.forEach(pId => {
    const pName = (localState && localState.playerNames) ? localState.playerNames[pId] : pId;
    const pCardVal = endData.handsToReveal[pId] ? endData.handsToReveal[pId][0] : 0;
    const roleObj = rolesData.find(r => r.rank === pCardVal) || { rank: pCardVal, name: "Rang " + pCardVal };

    const isWinner = (pCardVal === highestValue);

    const wrapper = document.createElement('div');
    wrapper.style.textAlign = 'center';

    wrapper.innerHTML = `
      <div style="font-size:0.75rem; color:${isWinner ? '#4ade80' : '#ef4444'}; font-weight:bold; margin-bottom:4px;">${pName}</div>
      <div class="card-playable ${isWinner ? 'winner-highlight' : 'loser-highlight'}" style="cursor:default; width:115px; height:160px;">
        <div class="card-badge-num">${roleObj.rank}</div>
        <div class="card-title">${roleObj.name || roleObj.official}</div>
        <div class="card-img-holder" style="height:65px;">
          ${roleObj.image ? `<img src="${roleObj.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
        </div>
        <div class="card-desc-box" style="font-size:0.55rem; max-height:45px;">
          <strong>${roleObj.name || roleObj.official}</strong>
        </div>
      </div>
    `;
    container.appendChild(wrapper);
  });

  let countdownReset = 4;
  statusMsg.innerText = `Nouvelle manche dans ${countdownReset}s...`;

  const resetTimer = setInterval(() => {
    countdownReset--;
    if(countdownReset > 0) {
      statusMsg.innerText = `Nouvelle manche dans ${countdownReset}s...`;
    } else {
      clearInterval(resetTimer);
      document.getElementById('modal-end-round').style.display = 'none';
      currentEndRoundData = null;

      if(currentGameMode === 'bot') {
        startBotGame();
      } else {
        startGameLogic();
      }
    }
  }, 1000);
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
    targetCard: targetCard
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

  title.innerText = "⚔️ Duel du Baron !";
  outcome.innerText = "";
  
  subtitle.innerText = `${baronData.challengerName} défie ${baronData.targetName} en duel ! Révélation dans 3 secondes...`;
  
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

  document.getElementById('modal-baron-duel').style.display = 'flex';

  setTimeout(() => {
    revealBaronCards();
  }, 3000);
}

function revealBaronCards() {
  const data = currentBaronDuelData;
  if(!data) return;

  const arena = document.getElementById('baron-duel-cards-container');
  const outcome = document.getElementById('baron-outcome-msg');
  const subtitle = document.getElementById('baron-duel-subtitle');

  subtitle.innerText = "Résultat du duel :";

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

  setTimeout(() => {
    finishBaronTurn(loserId, logText);
  }, 3000);
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

// --- RANG 7 : ROI ---
function openKingModal(state) {
  const targetSelect = document.getElementById('king-target-player');
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
    executePlayCard(7, state, "Le Roi est joué mais aucun joueur ne peut être ciblé !");
    return;
  }

  document.getElementById('modal-king-select').style.display = 'flex';
}

function confirmKingSelection() {
  document.getElementById('modal-king-select').style.display = 'none';
  const targetId = document.getElementById('king-target-player').value;

  const state = (currentGameMode === 'multi') ? null : localState;
  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      initiateKingEffect(snap.val(), targetId);
    });
  } else {
    initiateKingEffect(state, targetId);
  }
}

function initiateKingEffect(state, targetId) {
  const casterId = playerId;
  const casterName = myPlayerName;
  const targetName = state.playerNames[targetId] || "Robot";

  const casterCard = (state.hands[casterId].filter(c => c !== 7)[0] !== undefined)
    ? state.hands[casterId].filter(c => c !== 7)[0]
    : state.hands[casterId][0];

  const targetCard = state.hands[targetId][0];

  state.hands[casterId] = [targetCard];
  state.hands[targetId] = [casterCard];

  const kingEventData = {
    casterId: casterId,
    casterName: casterName,
    newCasterCard: targetCard,
    targetId: targetId,
    targetName: targetName,
    newTargetCard: casterCard
  };

  state.kingEvent = kingEventData;

  if(currentGameMode === 'bot') {
    checkAndDisplayKingModal(kingEventData);
  } else {
    db.ref(`rooms/${currentRoom}/gameState`).set(state);
  }
}

function checkAndDisplayKingModal(kingData) {
  currentKingData = kingData;

  const subtitle = document.getElementById('king-action-subtitle');
  const cardDisplay = document.getElementById('king-card-display');
  const timerMsg = document.getElementById('king-timer-msg');

  cardDisplay.innerHTML = '';
  
  const kingRoleObj = rolesData.find(r => r.rank === 7) || {};
  const kingName = kingRoleObj.name || kingRoleObj.official || "Roi";

  if(kingData.casterId === playerId || kingData.targetId === playerId) {
    const isCaster = (kingData.casterId === playerId);
    const newCardRank = isCaster ? kingData.newCasterCard : kingData.newTargetCard;
    const opponentName = isCaster ? kingData.targetName : kingData.casterName;

    subtitle.innerText = isCaster 
      ? `Vous avez échangé votre main avec celle de ${opponentName} !`
      : `${opponentName} a joué le ${kingName} et a échangé sa main avec la vôtre !`;

    const newRole = rolesData.find(r => r.rank === newCardRank) || { rank: newCardRank, name: "Rang " + newCardRank };

    cardDisplay.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:0.75rem; color:var(--accent); font-weight:bold; margin-bottom:4px;">Votre Nouvelle Carte</div>
        <div class="card-playable" style="cursor:default;">
          <div class="card-badge-num">${newRole.rank}</div>
          <div class="card-title">${newRole.name || newRole.official}</div>
          <div class="card-img-holder">
            ${newRole.image ? `<img src="${newRole.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
          </div>
          <div class="card-desc-box">
            <strong>${newRole.name || newRole.official}</strong><br>${newRole.power || ''}
          </div>
        </div>
      </div>
    `;
  } else {
    subtitle.innerText = `👑 ${kingData.casterName} a joué ${kingName} (Rang 7) contre ${kingData.targetName} !`;
  }

  document.getElementById('modal-king-action').style.display = 'flex';

  let countdown = 3;
  timerMsg.innerText = `Fermeture dans ${countdown}s...`;

  const interval = setInterval(() => {
    countdown--;
    if(countdown > 0) {
      timerMsg.innerText = `Fermeture dans ${countdown}s...`;
    } else {
      clearInterval(interval);
      document.getElementById('modal-king-action').style.display = 'none';
      finishKingTurn(kingData);
    }
  }, 1000);
}

function finishKingTurn(kingData) {
  currentKingData = null;
  const state = (currentGameMode === 'multi') ? null : localState;

  function applyKingResult(currentState) {
    currentState.kingEvent = null;
    const kingRoleObj = rolesData.find(r => r.rank === 7) || {};
    const kingName = kingRoleObj.name || kingRoleObj.official || "Roi";
    const logMsg = `👑 ${kingData.casterName} a joué ${kingName} (Rang 7) et a échangé sa main avec ${kingData.targetName}.`;

    executePlayCard(7, currentState, logMsg);
  }

  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      applyKingResult(snap.val());
    });
  } else {
    applyKingResult(state);
  }
}

// --- RANG 6 : CHANCELIER ---
function initiateChancellorEffect(state, activePlayerId) {
  const activeName = state.playerNames[activePlayerId] || "Robot";
  
  const idx = state.hands[activePlayerId].indexOf(6);
  if(idx > -1) state.hands[activePlayerId].splice(idx, 1);

  let drawn = [];
  if(state.deck && state.deck.length > 0) drawn.push(state.deck.pop());
  if(state.deck && state.deck.length > 0) drawn.push(state.deck.pop());

  const totalOptions = [...state.hands[activePlayerId], ...drawn];
  const requiredReturns = Math.min(2, drawn.length);

  const chancellorEventData = {
    playerId: activePlayerId,
    playerName: activeName,
    options: totalOptions,
    requiredReturns: requiredReturns
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

  const subtitle = document.getElementById('chancellor-subtitle');
  const choicesContainer = document.getElementById('chancellor-cards-choices');
  const timerStatus = document.getElementById('chancellor-timer-status');
  const confirmBtn = document.getElementById('btn-chancellor-confirm');

  choicesContainer.innerHTML = '';
  timerStatus.innerText = '';

  const isCurrentPlayer = (chancellorData.playerId === playerId);
  const needed = chancellorData.requiredReturns;

  if(isCurrentPlayer) {
    subtitle.innerText = `Sélectionnez les ${needed} carte(s) à remettre sous le paquet :`;
    confirmBtn.style.display = "block";
    updateChancellorConfirmBtn(needed);

    chancellorData.options.forEach((rank, optionIdx) => {
      const roleObj = rolesData.find(r => r.rank === rank) || { rank: rank, name: "Rang " + rank };
      const cardBtn = document.createElement('div');
      cardBtn.className = 'card-playable';
      cardBtn.dataset.idx = optionIdx;
      cardBtn.innerHTML = `
        <div class="card-badge-num">${roleObj.rank}</div>
        <div class="card-title">${roleObj.name || roleObj.official}</div>
        <div class="card-img-holder">
          ${roleObj.image ? `<img src="${roleObj.image}">` : '<div style="height:100%; background:#15803d; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.6rem;">Sans Image</div>'}
        </div>
        <div class="card-desc-box">
          <strong>${roleObj.name || roleObj.official}</strong>
        </div>
      `;

      cardBtn.onclick = () => toggleChancellorCardSelection(optionIdx, cardBtn, needed);
      choicesContainer.appendChild(cardBtn);
    });
  } else {
    subtitle.innerText = `${chancellorData.playerName} utilise le Chancelier et choisit ses cartes...`;
    confirmBtn.style.display = "none";

    for(let i = 0; i < chancellorData.options.length; i++) {
      const hiddenCard = document.createElement('div');
      hiddenCard.className = 'card-back-style';
      hiddenCard.innerText = '❓';
      choicesContainer.appendChild(hiddenCard);
    }

    if(chancellorData.playerId === 'bot') {
      let timeLeft = 3;
      timerStatus.innerText = `Le Robot réfléchit... (${timeLeft}s)`;
      
      const interval = setInterval(() => {
        timeLeft--;
        if(timeLeft > 0) {
          timerStatus.innerText = `Le Robot réfléchit... (${timeLeft}s)`;
        } else {
          clearInterval(interval);
          const indexedOptions = chancellorData.options.map((val, idx) => ({ val, idx }));
          indexedOptions.sort((a, b) => a.val - b.val);
          
          const returnIndices = indexedOptions.slice(0, needed).map(item => item.idx);
          executeChancellorSubmit(returnIndices, chancellorData);
        }
      }, 1000);
    }
  }

  document.getElementById('modal-chancellor').style.display = 'flex';
}

function toggleChancellorCardSelection(idx, element, needed) {
  const pos = selectedChancellorIndices.indexOf(idx);
  if(pos > -1) {
    selectedChancellorIndices.splice(pos, 1);
    element.classList.remove('selected-to-return');
  } else {
    if(selectedChancellorIndices.length < needed) {
      selectedChancellorIndices.push(idx);
      element.classList.add('selected-to-return');
    }
  }
  updateChancellorConfirmBtn(needed);
}

function updateChancellorConfirmBtn(needed) {
  const confirmBtn = document.getElementById('btn-chancellor-confirm');
  const count = selectedChancellorIndices.length;
  confirmBtn.innerText = `Valider la remise sous le paquet (${count}/${needed}) 📥`;
  confirmBtn.disabled = (count !== needed);
}

function submitChancellorSelection() {
  if(!currentChancellorData) return;
  const needed = currentChancellorData.requiredReturns;
  if(selectedChancellorIndices.length !== needed) return;

  executeChancellorSubmit(selectedChancellorIndices, currentChancellorData);
}

function executeChancellorSubmit(returnIndices, chancellorData) {
  document.getElementById('modal-chancellor').style.display = 'none';
  currentChancellorData = null;

  const state = (currentGameMode === 'multi') ? null : localState;
  const activeId = chancellorData.playerId;

  function applyChancellorChoice(currentState) {
    const returnCards = returnIndices.map(i => chancellorData.options[i]);
    const keepCards = chancellorData.options.filter((_, i) => !returnIndices.includes(i));

    currentState.hands[activeId] = keepCards;

    returnCards.forEach(c => currentState.deck.unshift(c));

    currentState.chancellorEvent = null;
    const logMsg = `📜 ${chancellorData.playerName} a joué le Chancelier (Rang 6) et a replacé ${returnCards.length} carte(s) sous le paquet.`;

    executePlayCard(6, currentState, logMsg);
  }

  if(currentGameMode === 'multi') {
    db.ref(`rooms/${currentRoom}/gameState`).once('value').then(snap => {
      applyChancellorChoice(snap.val());
    });
  } else {
    applyChancellorChoice(state);
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

  let countdown = 3;
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

// EXECUTION GENERALE DES TOURS
function executePlayCard(cardRank, state, customLog) {
  const idx = state.hands[playerId].indexOf(cardRank);
  if(idx > -1) state.hands[playerId].splice(idx, 1);

  const playedRoleObj = rolesData.find(r => r.rank === cardRank) || {};
  const cardName = playedRoleObj.name || playedRoleObj.official || cardRank;

  state.lastPlayed = { player: myPlayerName, card: cardRank };
  state.lastLog = customLog || `${myPlayerName} a joué ${cardName} (Rang ${cardRank})`;

  // VÉRIFICATION FIN DE MANCHE
  if(checkEndRoundCondition(state)) {
    if(currentGameMode === 'multi') db.ref(`rooms/${currentRoom}/gameState`).set(state);
    return;
  }

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

// IA (ROBOT) AUTOMATISÉE
function playBotTurn() {
  if(!localState || localState.playerOrder[localState.currentTurnIndex] !== 'bot') return;

  const botCards = localState.hands['bot'];
  if(botCards && botCards.length > 0) {
    let playedCard;
    if(botCards.includes(8) && (botCards.includes(5) || botCards.includes(7))) {
      playedCard = 8;
      const idx = botCards.indexOf(8);
      botCards.splice(idx, 1);
    } else {
      playedCard = botCards.shift();
    }

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
        targetCard: userCardVal
      };
      checkAndDisplayBaronModal(baronEventData);
      return;
    } else if(playedCard === 5) {
      initiatePrinceEffect(localState, playerId);
      return;
    } else if(playedCard === 6) {
      initiateChancellorEffect(localState, "bot");
      return;
    } else if(playedCard === 7) {
      initiateKingEffect(localState, playerId);
      return;
    } else if(playedCard === 9) {
      if(!localState.eliminated) localState.eliminated = {};
      localState.eliminated['bot'] = true;
      logMsg = `💀 Robot a joué la Princesse (Rang 9) et s'est ÉLIMINÉ tout seul !`;
    }

    localState.lastPlayed = { player: "Robot", card: playedCard };
    localState.lastLog = logMsg;

    if(checkEndRoundCondition(localState)) return;

    localState.currentTurnIndex = 0;
    if(localState.deck.length > 0 && (!localState.eliminated || !localState.eliminated[playerId])) {
      localState.hands[playerId].push(localState.deck.pop());
    }
    updateGameBoard(localState);
  }
}

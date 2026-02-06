// ========================================
// MULTIPLAYER GAME LOGIC - FULLY DEBUGGED
// ========================================

let currentGameId = null;
let currentGameCode = null;
let myPlayerId = null;
let myPlayerName = null;
let myPlayerRole = null; 
let selectedGameMode = 'original'; 
let gameRef = null;
let chatRef = null;
let reactionsRef = null;

// Global sync for round tracking
window.currentRoundNumber = 0;

const originalRules = { 
    paper: ['rock'], 
    rock: ['scissors'], 
    scissors: ['paper'] 
};

const bonusRules = {
    scissors: ['paper', 'lizard'],
    paper: ['rock', 'spock'],
    rock: ['lizard', 'scissors'],
    lizard: ['spock', 'paper'],
    spock: ['scissors', 'rock']
};

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    if (typeof FirebaseHelper === 'undefined') {
        console.error('❌ Firebase not loaded!');
        return;
    }
    console.log('✅ Initializing multiplayer...');
    initializeMultiplayer();
});

function initializeMultiplayer() {
    myPlayerId = localStorage.getItem('mp-player-id') || FirebaseHelper.generatePlayerId();
    localStorage.setItem('mp-player-id', myPlayerId);
    setupEventListeners();
    loadPlayerStats();
    showSection('mode-selection');
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
    // Mode selection
    document.getElementById('btn-vs-computer').onclick = () => window.location.href = 'index.html';
    document.getElementById('btn-vs-player').onclick = () => showSection('lobby');
    document.getElementById('btn-view-history').onclick = () => {
        loadPlayerHistory();
        showSection('history');
    };

    // Lobby
    document.getElementById('lobby-back').onclick = () => showSection('mode-selection');
    document.getElementById('btn-create-game').onclick = createGame;
    document.getElementById('btn-join-game').onclick = joinGame;

    // Mode toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedGameMode = e.currentTarget.dataset.mode;
        };
    });

    // Waiting room
    document.getElementById('waiting-back').onclick = cancelGame;
    document.getElementById('btn-copy-code').onclick = copyGameCode;
    document.getElementById('btn-copy-link').onclick = copyGameLink;

    // Gameplay
    document.getElementById('game-back').onclick = leaveGame;
    document.querySelectorAll('.mp-choice-btn').forEach(btn => {
        btn.onclick = (e) => {
            const choice = e.currentTarget.dataset.choice;
            if (choice) makeChoice(choice);
        };
    });

    // Chat - FIXED IDs to match HTML
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send'); // FIXED: was 'btn-send-chat'
    const chatToggle = document.getElementById('chat-toggle');
    
    if (chatSendBtn) {
        chatSendBtn.onclick = sendChatMessage;
    }
    if (chatInput) {
        chatInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendChatMessage();
        };
    }
    if (chatToggle) {
        chatToggle.onclick = toggleChat;
    }

    // Emoji reactions - NOW IMPLEMENTED
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.onclick = (e) => {
            const emoji = e.currentTarget.dataset.reaction;
            if (emoji) sendReaction(emoji);
        };
    });

    // Round results
    document.getElementById('btn-next-round').onclick = nextRound;

    // Match end
    document.getElementById('btn-rematch').onclick = requestRematch;
    document.getElementById('btn-leave-match').onclick = () => {
        leaveGame();
        showSection('mode-selection');
    };
    document.getElementById('btn-view-history-end').onclick = () => {
        loadPlayerHistory();
        showSection('history');
    };

    // History
    document.getElementById('history-back').onclick = () => showSection('mode-selection');

    // Enter shortcuts
    document.getElementById('player-name').onkeypress = (e) => {
        if (e.key === 'Enter') createGame();
    };
    document.getElementById('game-code-input').onkeypress = (e) => {
        if (e.key === 'Enter') joinGame();
    };
}

// ========================================
// SECTION NAVIGATION
// ========================================

function showSection(name) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    const target = document.querySelector(`[data-section="${name}"]`);
    if (target) {
        target.classList.add('active');
    }
}

// ========================================
// GAME CREATION
// ========================================

function createGame() {
    const nameInput = document.getElementById('player-name');
    myPlayerName = nameInput.value.trim();

    if (!myPlayerName) {
        alert('Please enter your name!');
        nameInput.focus();
        return;
    }

    localStorage.setItem('mp-player-name', myPlayerName);

    currentGameCode = FirebaseHelper.generateGameCode();
    currentGameId = 'game_' + Date.now();

    gameRef = FirebaseHelper.db.ref('games/' + currentGameId);
    
    const gameData = {
        gameCode: currentGameCode,
        status: 'waiting',
        mode: selectedGameMode,
        createdAt: FirebaseHelper.getTimestamp(),
        winner: null,
        player1: { 
            id: myPlayerId, 
            name: myPlayerName, 
            matchScore: 0, 
            connected: true 
        },
        player2: null,
        currentRound: 0,
        rounds: {},
        chat: {},
        reactions: { player1: null, player2: null }
    };

    gameRef.set(gameData).then(() => {
        myPlayerRole = 'player1';
        console.log('✅ Game created:', currentGameCode);
        showWaitingRoom();
        listenToGameUpdates();
        initializeChat();
    }).catch(err => {
        console.error('❌ Game creation failed:', err);
        alert('Failed to create game. Please try again.');
    });
}

// ========================================
// GAME JOINING
// ========================================

function joinGame() {
    const nameInput = document.getElementById('player-name');
    const codeInput = document.getElementById('game-code-input');
    
    myPlayerName = nameInput.value.trim();
    const gameCode = codeInput.value.trim().toUpperCase();

    if (!myPlayerName) {
        alert('Please enter your name!');
        nameInput.focus();
        return;
    }

    if (!gameCode || gameCode.length !== 6) {
        alert('Please enter a valid 6-character game code!');
        codeInput.focus();
        return;
    }

    localStorage.setItem('mp-player-name', myPlayerName);

    // Find game by code
    FirebaseHelper.db.ref('games')
        .orderByChild('gameCode')
        .equalTo(gameCode)
        .once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                alert('Game not found! Check the code and try again.');
                return;
            }

            const games = snapshot.val();
            currentGameId = Object.keys(games)[0];
            const game = games[currentGameId];

            if (game.status !== 'waiting') {
                alert('This game has already started or ended.');
                return;
            }

            if (game.player2) {
                alert('This game is full!');
                return;
            }

            selectedGameMode = game.mode;
            myPlayerRole = 'player2';
            gameRef = FirebaseHelper.db.ref('games/' + currentGameId);

            // Join game and start first round
            gameRef.update({
                player2: { 
                    id: myPlayerId, 
                    name: myPlayerName, 
                    matchScore: 0, 
                    connected: true 
                },
                status: 'playing',
                currentRound: 1
            }).then(() => {
                console.log('✅ Joined game:', gameCode);
                
                // CRITICAL FIX: Initialize first round
                return gameRef.child('rounds/round1').set({
                    player1Choice: null,
                    player2Choice: null,
                    player1Ready: false,
                    player2Ready: false,
                    result: null,
                    timestamp: FirebaseHelper.getTimestamp()
                });
            }).then(() => {
                listenToGameUpdates();
                initializeChat();
                startGameplay();
            }).catch(err => {
                console.error('❌ Join failed:', err);
                alert('Failed to join. Please try again.');
            });
        });
}

// ========================================
// GAME UPDATES LISTENER
// ========================================

function listenToGameUpdates() {
    gameRef.on('value', snapshot => {
        const game = snapshot.val();
        
        if (!game) {
            console.log('❌ Game ended/deleted');
            showToast('Game ended by host');
            resetGame();
            showSection('mode-selection');
            return;
        }

        window.currentRoundNumber = game.currentRound;

        // Player 1 waits for player 2
        if (myPlayerRole === 'player1' && game.player2 && game.status === 'playing') {
            startGameplay();
        }

        // Update scoreboard
        updateScoreboard(game);

        // Check for match end (FIRST TO 10)
        checkMatchEnd(game);

        // Handle current round
        const roundNum = game.currentRound;
        if (roundNum > 0) {
            const round = game.rounds ? game.rounds[`round${roundNum}`] : null;
            
            if (round) {
                // Determine winner if both ready
                if (round.player1Ready && round.player2Ready && !round.result) {
                    // Only player1 determines to avoid conflicts
                    if (myPlayerRole === 'player1') {
                        determineRoundWinner(round, roundNum);
                    }
                }

                // Show result if available and not already showing
                const resultSection = document.querySelector('[data-section="round-result"]');
                if (round.result && !resultSection.classList.contains('active')) {
                    showRoundResult(round, game);
                }
            }
        }
    });

    // Disconnect handling
    gameRef.child(`${myPlayerRole}/connected`).onDisconnect().set(false);
}

// ========================================
// GAMEPLAY
// ========================================

function startGameplay() {
    const currentSection = document.querySelector('section.active');
    if (currentSection?.dataset.section === 'gameplay') return; // Already in gameplay

    showSection('gameplay');
    
    // Show correct choice set
    if (selectedGameMode === 'bonus') {
        document.getElementById('mp-choices-original').style.display = 'none';
        document.getElementById('mp-choices-bonus').style.display = 'block';
    } else {
        document.getElementById('mp-choices-original').style.display = 'flex';
        document.getElementById('mp-choices-bonus').style.display = 'none';
    }

    updateStatus('Make your choice!');
}

function makeChoice(choice) {
    if (!choice || !window.currentRoundNumber) {
        console.log('❌ Invalid choice or no round');
        return;
    }

    const roundNum = window.currentRoundNumber;

    gameRef.child(`rounds/round${roundNum}`).update({
        [`${myPlayerRole}Choice`]: choice,
        [`${myPlayerRole}Ready`]: true
    });

    updateStatus('Waiting for opponent...');
    console.log(`✅ Choice made: ${choice} for round ${roundNum}`);
}

function determineRoundWinner(round, roundNum) {
    const rules = selectedGameMode === 'bonus' ? bonusRules : originalRules;
    const p1 = round.player1Choice;
    const p2 = round.player2Choice;
    
    let result;
    if (p1 === p2) {
        result = 'draw';
    } else if (rules[p1] && rules[p1].includes(p2)) {
        result = 'player1';
    } else {
        result = 'player2';
    }

    console.log(`🎯 Round ${roundNum} result: ${result} (${p1} vs ${p2})`);

    // Get current scores and update
    gameRef.once('value').then(snapshot => {
        const game = snapshot.val();
        const p1Score = game.player1.matchScore || 0;
        const p2Score = game.player2.matchScore || 0;

        const updates = {
            [`rounds/round${roundNum}/result`]: result
        };

        // Winner gets +1, loser gets 0 (NO SUBTRACTION)
        if (result === 'player1') {
            updates['player1/matchScore'] = p1Score + 1;
        } else if (result === 'player2') {
            updates['player2/matchScore'] = p2Score + 1;
        }

        gameRef.update(updates);
    });
}

// ========================================
// SCOREBOARD
// ========================================

function updateScoreboard(game) {
    if (!game || !game.player1) return;

    const p1 = game.player1;
    const p2 = game.player2 || { name: 'Waiting...', matchScore: 0 };

    // Update names and scores based on player role
    if (myPlayerRole === 'player1') {
        document.getElementById('mp-your-name').textContent = p1.name;
        document.getElementById('mp-your-score').textContent = p1.matchScore || 0;
        document.getElementById('mp-opponent-name').textContent = p2.name;
        document.getElementById('mp-opponent-score').textContent = p2.matchScore || 0;
    } else if (myPlayerRole === 'player2') {
        document.getElementById('mp-your-name').textContent = p2.name;
        document.getElementById('mp-your-score').textContent = p2.matchScore || 0;
        document.getElementById('mp-opponent-name').textContent = p1.name;
        document.getElementById('mp-opponent-score').textContent = p1.matchScore || 0;
    }
}

function updateStatus(message) {
    const statusEl = document.getElementById('mp-status-text');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// ========================================
// MATCH END (FIRST TO 10)
// ========================================

function checkMatchEnd(game) {
    if (!game.player1 || !game.player2) return;

    const p1Score = game.player1.matchScore || 0;
    const p2Score = game.player2.matchScore || 0;

    // FIRST TO 10 WINS
    if (p1Score >= 10 || p2Score >= 10) {
        const winner = p1Score >= 10 ? 'player1' : 'player2';
        
        // Only trigger once
        if (game.winner !== winner) {
            console.log(`🏆 Match end! Winner: ${winner}`);
            endMatch(winner, game);
        }
    }
}

function endMatch(winner, game) {
    const isWinner = (winner === 'player1' && myPlayerRole === 'player1') || 
                     (winner === 'player2' && myPlayerRole === 'player2');

    document.getElementById('match-end-title').textContent = 
        isWinner ? '🏆 YOU WIN THE MATCH! 🏆' : '😔 YOU LOSE THE MATCH';

    const p1Score = game.player1.matchScore || 0;
    const p2Score = game.player2.matchScore || 0;
    
    let finalScore;
    if (myPlayerRole === 'player1') {
        finalScore = `${p1Score} - ${p2Score}`;
    } else {
        finalScore = `${p2Score} - ${p1Score}`;
    }
    
    document.getElementById('final-score-display').textContent = finalScore;

    // Save to history
    const opponentName = myPlayerRole === 'player1' ? game.player2.name : game.player1.name;
    saveMatchToHistory(opponentName, isWinner ? 'win' : 'loss', finalScore);

    // Update game status
    gameRef.update({ 
        status: 'finished', 
        winner: winner 
    });

    showSection('match-end');
}

function requestRematch() {
    if (!gameRef) return;

    console.log('🔄 Requesting rematch...');

    // Reset for new match
    gameRef.update({
        status: 'playing',
        winner: null,
        currentRound: 1,
        'player1/matchScore': 0,
        'player2/matchScore': 0,
        rounds: {},
        'reactions/player1': null,
        'reactions/player2': null
    }).then(() => {
        // Initialize first round
        return gameRef.child('rounds/round1').set({
            player1Choice: null,
            player2Choice: null,
            player1Ready: false,
            player2Ready: false,
            result: null,
            timestamp: FirebaseHelper.getTimestamp()
        });
    }).then(() => {
        addSystemMessage('🔄 Rematch started!');
        startGameplay();
    });
}

// ========================================
// ROUND RESULT - FIXED WITH ICONS
// ========================================

function showRoundResult(round, game) {
    const p1Choice = round.player1Choice;
    const p2Choice = round.player2Choice;
    const result = round.result;

    let yourChoice, opponentChoice;
    if (myPlayerRole === 'player1') {
        yourChoice = p1Choice;
        opponentChoice = p2Choice;
    } else {
        yourChoice = p2Choice;
        opponentChoice = p1Choice;
    }

    // FIXED: Use icons instead of text
    document.getElementById('result-your-choice').innerHTML = createChoiceIcon(yourChoice);
    document.getElementById('result-opponent-choice').innerHTML = createChoiceIcon(opponentChoice);

    // Result message
    let message;
    if (result === 'draw') {
        message = "IT'S A DRAW!";
    } else if ((result === 'player1' && myPlayerRole === 'player1') || 
               (result === 'player2' && myPlayerRole === 'player2')) {
        message = '🎉 YOU WIN! 🎉';
    } else {
        message = '😔 YOU LOSE';
    }
    
    document.getElementById('result-message').textContent = message;

    // Update score display
    const p1 = game.player1;
    const p2 = game.player2;
    
    let scoreText;
    if (myPlayerRole === 'player1') {
        scoreText = `You: ${p1.matchScore || 0} - ${p2.name}: ${p2.matchScore || 0}`;
    } else {
        scoreText = `You: ${p2.matchScore || 0} - ${p1.name}: ${p1.matchScore || 0}`;
    }
    
    document.getElementById('result-score-display').textContent = scoreText;

    showSection('round-result');
}

function createChoiceIcon(choice) {
    const icons = {
        rock: '🪨',
        paper: '📄',
        scissors: '✂️',
        lizard: '🦎',
        spock: '🖖'
    };
    return `<div class="choice-icon" style="font-size: 80px;">${icons[choice] || '❓'}</div>`;
}

function nextRound() {
    const newRoundNum = window.currentRoundNumber + 1;
    
    console.log(`➡️ Starting round ${newRoundNum}`);
    
    // Update round number
    gameRef.update({ currentRound: newRoundNum });
    
    // Initialize new round
    gameRef.child(`rounds/round${newRoundNum}`).set({
        player1Choice: null,
        player2Choice: null,
        player1Ready: false,
        player2Ready: false,
        result: null,
        timestamp: FirebaseHelper.getTimestamp()
    });

    showSection('gameplay');
    updateStatus('Make your choice!');
}

// ========================================
// CHAT SYSTEM - NOW WORKING
// ========================================

function initializeChat() {
    chatRef = gameRef.child('chat');
    reactionsRef = gameRef.child('reactions');

    console.log('💬 Chat initialized');

    // Listen for new messages
    chatRef.on('child_added', snapshot => {
        const message = snapshot.val();
        displayChatMessage(message);
    });

    // Listen for reactions
    reactionsRef.on('value', snapshot => {
        const reactions = snapshot.val();
        if (reactions) {
            displayReactions(reactions);
        }
    });

    addSystemMessage('Game started! Good luck! 🎮');
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || !chatRef) return;

    chatRef.push({
        playerId: myPlayerId,
        playerRole: myPlayerRole,
        playerName: myPlayerName,
        type: 'text',
        content: message,
        timestamp: FirebaseHelper.getTimestamp()
    });

    input.value = '';
    console.log('💬 Message sent');
}

function displayChatMessage(message) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const isMyMessage = message.playerRole === myPlayerRole;
    const messageClass = isMyMessage ? 'my-message' : 'opponent-message';

    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${messageClass}`;
    
    if (message.type === 'text') {
        messageEl.innerHTML = `
            <span class="message-author">${escapeHtml(message.playerName)}:</span>
            <span class="message-text">${escapeHtml(message.content)}</span>
        `;
    } else if (message.type === 'emoji') {
        messageEl.innerHTML = `
            <span class="message-author">${escapeHtml(message.playerName)}</span>
            <span class="message-emoji">${message.content}</span>
        `;
    }

    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;

    // Keep only last 50 messages
    while (container.children.length > 50) {
        container.removeChild(container.firstChild);
    }
}

function addSystemMessage(text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message system';
    messageEl.textContent = text;
    
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

function toggleChat() {
    const chatContent = document.getElementById('chat-content');
    const chatToggle = document.getElementById('chat-toggle');
    
    if (chatContent && chatToggle) {
        chatContent.classList.toggle('collapsed');
        chatToggle.textContent = chatContent.classList.contains('collapsed') ? '▲' : '▼';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// EMOJI REACTIONS - NOW WORKING
// ========================================

function sendReaction(emoji) {
    if (!reactionsRef) return;

    console.log(`😊 Reaction sent: ${emoji}`);

    // Update my reaction
    reactionsRef.update({ [myPlayerRole]: emoji });

    // Also send to chat
    if (chatRef) {
        chatRef.push({
            playerId: myPlayerId,
            playerRole: myPlayerRole,
            playerName: myPlayerName,
            type: 'emoji',
            content: emoji,
            timestamp: FirebaseHelper.getTimestamp()
        });
    }

    // Clear after 3 seconds
    setTimeout(() => {
        reactionsRef.update({ [myPlayerRole]: null });
    }, 3000);

    // Show animation
    showReactionAnimation(emoji, 'my-reaction');
}

function displayReactions(reactions) {
    const opponentRole = myPlayerRole === 'player1' ? 'player2' : 'player1';
    const opponentReaction = reactions[opponentRole];

    if (opponentReaction) {
        showReactionAnimation(opponentReaction, 'opponent-reaction');
    }
}

function showReactionAnimation(emoji, className) {
    // Remove existing
    const existing = document.querySelector(`.reaction-animation.${className}`);
    if (existing) existing.remove();

    const animation = document.createElement('div');
    animation.className = `reaction-animation ${className}`;
    animation.textContent = emoji;
    document.body.appendChild(animation);

    setTimeout(() => animation.classList.add('show'), 10);
    setTimeout(() => {
        animation.classList.remove('show');
        setTimeout(() => animation.remove(), 300);
    }, 2500);
}

// ========================================
// UTILITIES
// ========================================

function showWaitingRoom() {
    document.getElementById('display-game-code').textContent = currentGameCode;
    document.getElementById('host-name').textContent = myPlayerName;
    document.getElementById('game-mode-display').textContent = 
        selectedGameMode === 'bonus' ? '5 Choices (Bonus)' : '3 Choices';
    showSection('waiting');
}

function copyGameCode() {
    navigator.clipboard.writeText(currentGameCode).then(() => {
        showToast('Game code copied!');
    }).catch(() => {
        alert('Code: ' + currentGameCode);
    });
}

function copyGameLink() {
    const link = window.location.origin + window.location.pathname + '?join=' + currentGameCode;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Link copied!');
    }).catch(() => {
        alert('Link: ' + link);
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function cancelGame() {
    if (gameRef && myPlayerRole === 'player1') {
        gameRef.remove();
    }
    resetGame();
    showSection('lobby');
}

function leaveGame() {
    if (gameRef && myPlayerRole) {
        gameRef.child(`${myPlayerRole}/connected`).set(false);
    }
    resetGame();
    showSection('mode-selection');
}

function resetGame() {
    if (gameRef) gameRef.off();
    if (chatRef) chatRef.off();
    if (reactionsRef) reactionsRef.off();
    
    currentGameId = null;
    currentGameCode = null;
    myPlayerRole = null;
    gameRef = null;
    chatRef = null;
    reactionsRef = null;
    window.currentRoundNumber = 0;

    // Clear chat
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
        chatContainer.innerHTML = '<div class="chat-message system">Game started! Good luck! 🎮</div>';
    }
}

// ========================================
// PLAYER HISTORY - NOW WORKING
// ========================================

function saveMatchToHistory(opponentName, result, finalScore) {
    const historyRef = FirebaseHelper.db.ref('playerHistory/' + myPlayerId);
    
    historyRef.once('value').then(snapshot => {
        const history = snapshot.val() || { 
            totalGames: 0, 
            wins: 0, 
            losses: 0, 
            winStreak: 0,
            longestStreak: 0,
            matches: {} 
        };

        history.totalGames++;
        if (result === 'win') {
            history.wins++;
            history.winStreak++;
            if (history.winStreak > history.longestStreak) {
                history.longestStreak = history.winStreak;
            }
        } else {
            history.losses++;
            history.winStreak = 0;
        }

        const matchId = 'match_' + Date.now();
        history.matches[matchId] = {
            opponent: opponentName,
            result: result,
            finalScore: finalScore,
            mode: selectedGameMode,
            date: Date.now()
        };

        historyRef.set(history);
        loadPlayerStats();
        console.log('📊 History saved');
    });
}

function loadPlayerStats() {
    const historyRef = FirebaseHelper.db.ref('playerHistory/' + myPlayerId);
    
    historyRef.once('value').then(snapshot => {
        const history = snapshot.val();
        
        if (!history) {
            document.getElementById('player-stats').textContent = '0-0';
            return;
        }

        const wins = history.wins || 0;
        const losses = history.losses || 0;
        document.getElementById('player-stats').textContent = `${wins}-${losses}`;
    });
}

function loadPlayerHistory() {
    const historyRef = FirebaseHelper.db.ref('playerHistory/' + myPlayerId);
    
    historyRef.once('value').then(snapshot => {
        const history = snapshot.val();
        
        if (!history) {
            document.getElementById('stat-total-games').textContent = '0';
            document.getElementById('stat-wins').textContent = '0';
            document.getElementById('stat-losses').textContent = '0';
            document.getElementById('stat-win-rate').textContent = '0%';
            document.getElementById('stat-current-streak').textContent = '0';
            document.getElementById('stat-best-streak').textContent = '0';
            document.getElementById('recent-matches').innerHTML = 
                '<div class="no-matches">No matches played yet. Start your first game!</div>';
            return;
        }

        document.getElementById('stat-total-games').textContent = history.totalGames || 0;
        document.getElementById('stat-wins').textContent = history.wins || 0;
        document.getElementById('stat-losses').textContent = history.losses || 0;
        
        const winRate = history.totalGames > 0 ? 
            Math.round((history.wins / history.totalGames) * 100) : 0;
        document.getElementById('stat-win-rate').textContent = winRate + '%';
        
        document.getElementById('stat-current-streak').textContent = history.winStreak || 0;
        document.getElementById('stat-best-streak').textContent = history.longestStreak || 0;

        displayRecentMatches(history.matches);
    });
}

function displayRecentMatches(matches) {
    const container = document.getElementById('recent-matches');
    
    if (!matches || Object.keys(matches).length === 0) {
        container.innerHTML = '<div class="no-matches">No matches played yet. Start your first game!</div>';
        return;
    }

    const matchArray = Object.entries(matches)
        .map(([id, match]) => ({ id, ...match }))
        .sort((a, b) => b.date - a.date)
        .slice(0, 10);
    
    container.innerHTML = matchArray.map(match => `
        <div class="match-item ${match.result}">
            <div class="match-opponent">vs ${escapeHtml(match.opponent)}</div>
            <div class="match-result">${match.result.toUpperCase()}</div>
            <div class="match-score">${match.finalScore}</div>
        </div>
    `).join('');
}

// ========================================
// URL PARAMETER HANDLING
// ========================================

const urlParams = new URLSearchParams(window.location.search);
const joinCode = urlParams.get('join');
if (joinCode) {
    setTimeout(() => {
        document.getElementById('game-code-input').value = joinCode;
        showSection('lobby');
    }, 100);
}

console.log('✅ Multiplayer.js loaded successfully');
// ========================================
// ROCK PAPER SCISSORS GAME - COMPLETE LOGIC
// ========================================

// ========================================
// GLOBAL STATE & CONFIGURATION
// ========================================

let currentPage = 'original'; // 'original' or 'bonus'
let userChoice = null;
let computerChoice = null;
let score = 0;
let gameCount = 0;

// Game Rules
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

// Choice wrapper classes for dynamic insertion
const choiceWrappers = {
    paper: 'paper2',
    rock: 'rock2',
    scissors: 'scissors2',
    lizard: 'lizard2',
    spock: 'spock2'
};


// ========================================
// SOUND EFFECTS MANAGER
// ========================================

const soundEffects = {
    win: null,
    lose: null,
    draw: null,
    click: null
};

function initSounds() {
    // Check if sound files exist, create Audio objects
    try {
        soundEffects.win = new Audio('sounds/win.mp3');
        soundEffects.lose = new Audio('sounds/lose.mp3');
        soundEffects.draw = new Audio('sounds/draw.mp3');
        soundEffects.click = new Audio('sounds/click.mp3');
        
        // Set volume levels
        Object.values(soundEffects).forEach(sound => {
            if (sound) sound.volume = 0.5;
        });
    } catch (e) {
        console.log('Sound files not found. Game will run without sound effects.');
    }
}

function playSound(soundName) {
    const sound = soundEffects[soundName];
    if (sound) {
        // Reset to start if already playing
        sound.currentTime = 0;
        sound.play().catch(e => {
            // Ignore errors (browser might block autoplay)
            console.log('Sound playback blocked:', e);
        });
    }
}


// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
});

function initializeGame() {
    // Detect which page we're on
    currentPage = document.querySelector('.bonus-step-1') ? 'bonus' : 'original';
    
    // Initialize sounds
    initSounds();
    
    // Load score from localStorage
    loadScore();
    
    // Setup event listeners
    setupChoiceListeners();
    setupPlayAgainListeners();
    setupRulesListeners();
    setupModalListeners();
    
    // Show bonus navigation modal on first visit (bonus page only)
    if (currentPage === 'bonus') {
        showBonusNavModal();
    }
    
    // Check if we should show bonus promo (original page only)
    if (currentPage === 'original') {
        checkBonusPromo();
    }
    
    console.log('🎮 Rock Paper Scissors Game Initialized');
    console.log(`📄 Current Page: ${currentPage}`);
    console.log(`🏆 Current Score: ${score}`);
    console.log(`🎯 Games Played: ${gameCount}`);
}


// ========================================
// SCORE MANAGEMENT
// ========================================

function loadScore() {
    const savedScore = localStorage.getItem('rps-score');
    const savedGameCount = localStorage.getItem('rps-game-count');
    
    score = savedScore ? parseInt(savedScore) : 0;
    gameCount = savedGameCount ? parseInt(savedGameCount) : 0;
    
    updateScoreDisplay();
}

function saveScore() {
    localStorage.setItem('rps-score', score);
    localStorage.setItem('rps-game-count', gameCount);
}

function updateScoreDisplay() {
    // Update main score display
    const mainScoreEl = document.getElementById(currentPage === 'bonus' ? 'bonus-score-display' : 'score-display');
    if (mainScoreEl) {
        mainScoreEl.textContent = score;
    }
    
    // Update all synced score displays
    const syncClass = currentPage === 'bonus' ? 'bonus-score-sync' : 'score-sync';
    document.querySelectorAll(`.${syncClass}`).forEach(el => {
        el.textContent = score;
    });
}

function incrementScore() {
    score++;
    saveScore();
    updateScoreDisplay();
}

function decrementScore() {
    score--;
    saveScore();
    updateScoreDisplay();
}


// ========================================
// SECTION NAVIGATION
// ========================================

function showSection(sectionName) {
    // Remove active class from all sections
    document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Add active class to target section
    const targetSection = document.querySelector(`[data-section="${sectionName}"]`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}


// ========================================
// CHOICE SELECTION & GAME FLOW
// ========================================

function setupChoiceListeners() {
    // Original game choices
    const originalChoices = document.querySelectorAll('.step-1 .choice');
    originalChoices.forEach(choice => {
        choice.addEventListener('click', () => {
            playSound('click');
            handleUserChoice(choice);
        });
    });
    
    // Bonus game choices
    const bonusChoices = document.querySelectorAll('.bonus-step-1 .choice2');
    bonusChoices.forEach(choice => {
        choice.addEventListener('click', () => {
            playSound('click');
            handleUserChoice(choice);
        });
    });
}

function handleUserChoice(choiceElement) {
    // Get user's choice from data attribute
    userChoice = choiceElement.dataset.choice;
    
    // Determine step names based on current page
    const step2 = currentPage === 'bonus' ? 'bonus-step-2' : 'step-2';
    const step3 = currentPage === 'bonus' ? 'bonus-step-3' : 'step-3';
    
    // Show step 2 with user's choice
    showSection(step2);
    displayUserChoice(userChoice, step2);
    
    // Generate computer choice (done now, but hidden from user)
    const choices = currentPage === 'bonus' 
        ? ['rock', 'paper', 'scissors', 'lizard', 'spock']
        : ['rock', 'paper', 'scissors'];
    computerChoice = choices[Math.floor(Math.random() * choices.length)];
    
    // After 1.5 seconds (ripple effect), show step 3 with computer choice
    setTimeout(() => {
        showSection(step3);
        displayUserChoice(userChoice, step3);
        displayComputerChoice(computerChoice, step3);
        
        // After another 1 second, determine winner and show result
        setTimeout(() => {
            determineWinner();
        }, 1000);
    }, 1800);
}

function displayUserChoice(choice, section) {
    const containerPrefix = currentPage === 'bonus' ? 'bonus-' : '';
    let containerId;
    
    if (section.includes('step-2')) {
        containerId = `${containerPrefix}user-choice-container`;
    } else if (section.includes('step-3')) {
        containerId = `${containerPrefix}user-choice-step3`;
    }
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const choiceHTML = createChoiceHTML(choice);
    container.innerHTML = choiceHTML;
}

function displayComputerChoice(choice, section) {
    const containerPrefix = currentPage === 'bonus' ? 'bonus-' : '';
    const containerId = `${containerPrefix}computer-choice-step3`;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const choiceHTML = createChoiceHTML(choice);
    container.innerHTML = choiceHTML;
    
    // Add zoom animation
    const choiceWrapper = container.querySelector(`.${choiceWrappers[choice]}`);
    if (choiceWrapper) {
        choiceWrapper.classList.add('computer-choice-animate');
    }
}

function createChoiceHTML(choice) {
    const wrapperClass = choiceWrappers[choice];
    const choiceClass = `choice-${choice}`;
    const imgSrc = `images/icon-${choice}.svg`;
    const imgClass = `${choice}-img`;
    
    return `
        <div class="${wrapperClass}">
            <div class="choice ${choiceClass}">
                <img src="${imgSrc}" alt="${choice}" class="${imgClass}">
            </div>
        </div>
    `;
}


// ========================================
// GAME LOGIC & WINNER DETERMINATION
// ========================================

function determineWinner() {
    const rules = currentPage === 'bonus' ? bonusRules : originalRules;
    
    let result;
    if (userChoice === computerChoice) {
        result = 'draw';
        // No score change on draw
    } else if (rules[userChoice] && rules[userChoice].includes(computerChoice)) {
        result = 'win';
        incrementScore();
    } else {
        result = 'lose';
        decrementScore();
    }
    
    // Increment game count
    gameCount++;
    saveScore();
    
    // Play sound effect
    playSound(result);
    
    // Show result section
    showResultSection(result);
}

function showResultSection(result) {
    const containerPrefix = currentPage === 'bonus' ? 'bonus-' : '';
    let sectionName;
    
    if (result === 'draw') {
        sectionName = `${containerPrefix}draw`;
    } else if (result === 'win') {
        sectionName = `${containerPrefix}win`;
    } else {
        sectionName = `${containerPrefix}lose`;
    }
    
    showSection(sectionName);
    
    // Display choices in result section
    displayResultChoices(result);
}

function displayResultChoices(result) {
    const containerPrefix = currentPage === 'bonus' ? 'bonus-' : '';
    
    if (result === 'win') {
        // User choice (with winner glow)
        const userContainer = document.getElementById(`${containerPrefix}user-choice-win`);
        if (userContainer) {
            userContainer.innerHTML = createChoiceHTML(userChoice);
            // Add winner glow to wrapper
            const wrapper = userContainer.querySelector(`.${choiceWrappers[userChoice]}`);
            if (wrapper) {
                wrapper.classList.add('winner-glow');
            }
        }
        
        // Computer choice (no glow)
        const computerContainer = document.getElementById(`${containerPrefix}computer-choice-win`);
        if (computerContainer) {
            computerContainer.innerHTML = createChoiceHTML(computerChoice);
        }
        
    } else if (result === 'lose') {
        // User choice (no glow)
        const userContainer = document.getElementById(`${containerPrefix}user-choice-lose`);
        if (userContainer) {
            userContainer.innerHTML = createChoiceHTML(userChoice);
        }
        
        // Computer choice (with winner glow)
        const computerContainer = document.getElementById(`${containerPrefix}computer-choice-lose`);
        if (computerContainer) {
            computerContainer.innerHTML = createChoiceHTML(computerChoice);
            // Add winner glow to wrapper
            const wrapper = computerContainer.querySelector(`.${choiceWrappers[computerChoice]}`);
            if (wrapper) {
                wrapper.classList.add('winner-glow');
            }
        }
        
    } else if (result === 'draw') {
        // Both choices, no glow
        const userContainer = document.getElementById(`${containerPrefix}user-choice-draw`);
        if (userContainer) {
            userContainer.innerHTML = createChoiceHTML(userChoice);
        }
        
        const computerContainer = document.getElementById(`${containerPrefix}computer-choice-draw`);
        if (computerContainer) {
            computerContainer.innerHTML = createChoiceHTML(computerChoice);
        }
    }
}


// ========================================
// PLAY AGAIN FUNCTIONALITY
// ========================================

function setupPlayAgainListeners() {
    const playAgainButtons = document.querySelectorAll('.play-again');
    playAgainButtons.forEach(button => {
        button.addEventListener('click', () => {
            playSound('click');
            resetGame();
        });
    });
}

function resetGame() {
    // Reset choices
    userChoice = null;
    computerChoice = null;
    
    // Go back to step 1
    const step1 = currentPage === 'bonus' ? 'bonus-step-1' : 'step-1';
    showSection(step1);
    
    // Check if we should show bonus promo (every 3 games on original)
    if (currentPage === 'original') {
        checkBonusPromo();
    }
}


// ========================================
// MODAL MANAGEMENT
// ========================================

function setupRulesListeners() {
    // Get all rules buttons
    const rulesButtons = document.querySelectorAll('.rules-btn');
    rulesButtons.forEach(button => {
        button.addEventListener('click', () => {
            playSound('click');
            showRulesModal();
        });
    });
}

function setupModalListeners() {
    // Rules modal close buttons
    const closeRulesDesktop = document.getElementById(currentPage === 'bonus' ? 'bonus-close-rules-desktop' : 'close-rules-desktop');
    const closeRulesMobile = document.getElementById(currentPage === 'bonus' ? 'bonus-close-rules-mobile' : 'close-rules-mobile');
    
    if (closeRulesDesktop) {
        closeRulesDesktop.addEventListener('click', () => {
            playSound('click');
            closeRulesModal();
        });
    }
    if (closeRulesMobile) {
        closeRulesMobile.addEventListener('click', () => {
            playSound('click');
            closeRulesModal();
        });
    }
    
    // Bonus promo modal (original page)
    if (currentPage === 'original') {
        const closePromo = document.getElementById('close-bonus-promo');
        const bonusNowBtn = document.getElementById('bonus-now-btn');
        
        if (closePromo) {
            closePromo.addEventListener('click', () => {
                playSound('click');
                closeBonusPromoModal();
            });
        }
        if (bonusNowBtn) {
            bonusNowBtn.addEventListener('click', () => {
                playSound('click');
                goToBonusGame();
            });
        }
    }
    
    // Bonus nav info modal (bonus page)
    if (currentPage === 'bonus') {
        const closeNavInfo = document.getElementById('close-bonus-nav-info');
        if (closeNavInfo) {
            closeNavInfo.addEventListener('click', () => {
                playSound('click');
                closeBonusNavModal();
            });
        }
    }
    
    // Close modals when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                playSound('click');
                modal.classList.remove('show');
            }
        });
    });
}

function showRulesModal() {
    const modalId = currentPage === 'bonus' ? 'bonus-rules-modal' : 'rules-modal';
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        console.log('📖 Rules modal opened:', modalId);
    } else {
        console.error('❌ Rules modal not found:', modalId);
    }
}

function closeRulesModal() {
    const modalId = currentPage === 'bonus' ? 'bonus-rules-modal' : 'rules-modal';
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        console.log('📖 Rules modal closed:', modalId);
    }
}

function checkBonusPromo() {
    // Show bonus promo modal after every 3 games
    if (gameCount > 0 && gameCount % 3 === 0) {
        const alreadyShown = sessionStorage.getItem('bonus-promo-shown');
        if (!alreadyShown) {
            setTimeout(() => {
                showBonusPromoModal();
                sessionStorage.setItem('bonus-promo-shown', 'true');
            }, 500);
        }
    }
}

function showBonusPromoModal() {
    const modal = document.getElementById('bonus-promo-modal');
    if (modal) {
        modal.classList.add('show');
        console.log('🎁 Bonus promo modal opened');
    }
}

function closeBonusPromoModal() {
    const modal = document.getElementById('bonus-promo-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function goToBonusGame() {
    window.location.href = 'BOnus.html';
}

function showBonusNavModal() {
    // Only show once per session
    const alreadyShown = sessionStorage.getItem('bonus-nav-shown');
    if (!alreadyShown) {
        setTimeout(() => {
            const modal = document.getElementById('bonus-nav-info-modal');
            if (modal) {
                modal.classList.add('show');
                sessionStorage.setItem('bonus-nav-shown', 'true');
                console.log('ℹ️ Bonus nav info modal opened');
            }
        }, 500);
    }
}

function closeBonusNavModal() {
    const modal = document.getElementById('bonus-nav-info-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}


// ========================================
// UTILITY FUNCTIONS
// ========================================

// Prevent page navigation during active game
window.addEventListener('beforeunload', (e) => {
    // Score is already saved, no warning needed
    // This is just a placeholder if you want to add warnings later
});

// Handle logo clicks for smooth navigation
document.addEventListener('click', (e) => {
    if (e.target.closest('a[href="BOnus.html"], a[href="index.html"]')) {
        // Let the default navigation happen
        // Score is already saved in localStorage
    }
});
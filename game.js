// ========================================
// ROCK PAPER SCISSORS — GAME LOGIC
// ========================================

let currentPage = 'original';
let userChoice = null;
let computerChoice = null;
let score = 0;
let gameCount = 0;

// Keep a direct reference to the currently active section.
// showSection() only touches this one element + the new target,
// instead of looping all 7+ sections every transition.
let activeSection = null;

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

const choiceWrappers = {
    paper: 'paper2',
    rock: 'rock2',
    scissors: 'scissors2',
    lizard: 'lizard2',
    spock: 'spock2'
};


// ========================================
// SOUND EFFECTS
// ========================================

const soundEffects = { win: null, lose: null, draw: null, click: null };

function initSounds() {
    try {
        soundEffects.win   = new Audio('sounds/win.mp3');
        soundEffects.lose  = new Audio('sounds/lose.mp3');
        soundEffects.draw  = new Audio('sounds/draw.mp3');
        soundEffects.click = new Audio('sounds/click.mp3');

        // Prefetch: tell the browser to fetch + decode now,
        // so the first .play() is instant instead of waiting for network.
        for (const key in soundEffects) {
            const s = soundEffects[key];
            s.volume = 0.5;
            s.preload = 'auto';
            s.load();           // triggers the fetch immediately
        }
    } catch (e) {
        // No sound files — game runs silently, no errors.
    }
}

function playSound(name) {
    const s = soundEffects[name];
    if (!s) return;
    s.currentTime = 0;
    s.play().catch(() => {});   // swallow autoplay block silently
}


// ========================================
// INIT
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    currentPage = document.querySelector('.bonus-step-1') ? 'bonus' : 'original';

    initSounds();
    loadScore();

    // Cache the initially active section
    activeSection = document.querySelector('section.active');

    setupChoiceListeners();
    setupPlayAgainListeners();
    setupRulesListeners();
    setupModalListeners();

    if (currentPage === 'bonus') {
        showBonusNavModal();
    } else {
        checkBonusPromo();
    }
});


// ========================================
// SCORE
// ========================================

function loadScore() {
    score     = parseInt(localStorage.getItem('rps-score'), 10)     || 0;
    gameCount = parseInt(localStorage.getItem('rps-game-count'), 10) || 0;
    updateScoreDisplay();
}

function saveScore() {
    localStorage.setItem('rps-score', score);
    localStorage.setItem('rps-game-count', gameCount);
}

function updateScoreDisplay() {
    const syncClass = currentPage === 'bonus' ? 'bonus-score-sync' : 'score-sync';
    const mainId    = currentPage === 'bonus' ? 'bonus-score-display' : 'score-display';

    const mainEl = document.getElementById(mainId);
    if (mainEl) mainEl.textContent = score;

    document.querySelectorAll('.' + syncClass).forEach(el => {
        el.textContent = score;
    });
}


// ========================================
// SECTION NAVIGATION (optimised)
// ========================================

function showSection(sectionName) {
    // Hide only the currently active section — no loop over all sections.
    if (activeSection) {
        activeSection.classList.remove('active');
    }

    const target = document.querySelector('[data-section="' + sectionName + '"]');
    if (target) {
        target.classList.add('active');
        activeSection = target;
    }
}


// ========================================
// GAME FLOW
// ========================================

function setupChoiceListeners() {
    document.querySelectorAll('.step-1 .choice').forEach(el => {
        el.addEventListener('click', () => { playSound('click'); handleUserChoice(el); });
    });
    document.querySelectorAll('.bonus-step-1 .choice2').forEach(el => {
        el.addEventListener('click', () => { playSound('click'); handleUserChoice(el); });
    });
}

function handleUserChoice(choiceElement) {
    userChoice = choiceElement.dataset.choice;

    const step2 = currentPage === 'bonus' ? 'bonus-step-2' : 'step-2';
    const step3 = currentPage === 'bonus' ? 'bonus-step-3' : 'step-3';

    showSection(step2);
    displayUserChoice(userChoice, step2);

    // Generate computer choice now (hidden from user until step3)
    const pool = currentPage === 'bonus'
        ? ['rock', 'paper', 'scissors', 'lizard', 'spock']
        : ['rock', 'paper', 'scissors'];
    computerChoice = pool[Math.floor(Math.random() * pool.length)];

    // Ripple plays for 1.8s, then reveal computer choice.
    // Computer zoom animation is 0.5s; after that 600ms is enough before showing result.
    // Total: 1800 + 600 = 2400ms (was 2800ms).
    setTimeout(() => {
        showSection(step3);
        displayUserChoice(userChoice, step3);
        displayComputerChoice(computerChoice, step3);

        setTimeout(determineWinner, 600);
    }, 1800);
}

function displayUserChoice(choice, section) {
    const prefix = currentPage === 'bonus' ? 'bonus-' : '';
    const id = section.includes('step-2')
        ? prefix + 'user-choice-container'
        : prefix + 'user-choice-step3';

    const el = document.getElementById(id);
    if (el) el.innerHTML = createChoiceHTML(choice);
}

function displayComputerChoice(choice) {
    const prefix = currentPage === 'bonus' ? 'bonus-' : '';
    const el = document.getElementById(prefix + 'computer-choice-step3');
    if (!el) return;

    el.innerHTML = createChoiceHTML(choice);

    const wrapper = el.querySelector('.' + choiceWrappers[choice]);
    if (wrapper) wrapper.classList.add('computer-choice-animate');
}

function createChoiceHTML(choice) {
    return '<div class="' + choiceWrappers[choice] + '">'
         + '<div class="choice choice-' + choice + '">'
         + '<img src="images/icon-' + choice + '.svg" alt="' + choice + '" class="' + choice + '-img">'
         + '</div></div>';
}


// ========================================
// WINNER LOGIC
// ========================================

function determineWinner() {
    const rules = currentPage === 'bonus' ? bonusRules : originalRules;
    let result;

    if (userChoice === computerChoice) {
        result = 'draw';
    } else if (rules[userChoice] && rules[userChoice].includes(computerChoice)) {
        result = 'win';
        score++;
    } else {
        result = 'lose';
        score--;
    }

    gameCount++;
    saveScore();
    updateScoreDisplay();
    playSound(result);
    showResultSection(result);
}

function showResultSection(result) {
    const prefix = currentPage === 'bonus' ? 'bonus-' : '';
    showSection(prefix + result);
    displayResultChoices(result);
}

function displayResultChoices(result) {
    const prefix = currentPage === 'bonus' ? 'bonus-' : '';

    const userEl     = document.getElementById(prefix + 'user-choice-'     + result);
    const compEl     = document.getElementById(prefix + 'computer-choice-' + result);

    if (userEl)  userEl.innerHTML  = createChoiceHTML(userChoice);
    if (compEl)  compEl.innerHTML  = createChoiceHTML(computerChoice);

    // Winner gets the glow — user on win, computer on lose, neither on draw.
    if (result === 'win' && userEl) {
        const w = userEl.querySelector('.' + choiceWrappers[userChoice]);
        if (w) w.classList.add('winner-glow');
    }
    if (result === 'lose' && compEl) {
        const w = compEl.querySelector('.' + choiceWrappers[computerChoice]);
        if (w) w.classList.add('winner-glow');
    }
}


// ========================================
// PLAY AGAIN
// ========================================

function setupPlayAgainListeners() {
    document.querySelectorAll('.play-again').forEach(btn => {
        btn.addEventListener('click', () => {
            playSound('click');
            userChoice = null;
            computerChoice = null;
            showSection(currentPage === 'bonus' ? 'bonus-step-1' : 'step-1');
            if (currentPage === 'original') checkBonusPromo();
        });
    });
}


// ========================================
// MODALS
// ========================================

function setupRulesListeners() {
    document.querySelectorAll('.rules-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            playSound('click');
            const modalId = currentPage === 'bonus' ? 'bonus-rules-modal' : 'rules-modal';
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.add('show');
        });
    });
}

function setupModalListeners() {
    // Close buttons for rules modal
    const closeDesktop = document.getElementById(
        currentPage === 'bonus' ? 'bonus-close-rules-desktop' : 'close-rules-desktop'
    );
    const closeMobile = document.getElementById(
        currentPage === 'bonus' ? 'bonus-close-rules-mobile' : 'close-rules-mobile'
    );

    const closeRules = () => {
        playSound('click');
        const modalId = currentPage === 'bonus' ? 'bonus-rules-modal' : 'rules-modal';
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('show');
    };

    if (closeDesktop) closeDesktop.addEventListener('click', closeRules);
    if (closeMobile)  closeMobile.addEventListener('click', closeRules);

    // Bonus promo modal (original page only)
    if (currentPage === 'original') {
        const closePromo = document.getElementById('close-bonus-promo');
        if (closePromo) {
            closePromo.addEventListener('click', () => {
                playSound('click');
                const m = document.getElementById('bonus-promo-modal');
                if (m) m.classList.remove('show');
            });
        }
        const bonusNow = document.getElementById('bonus-now-btn');
        if (bonusNow) {
            bonusNow.addEventListener('click', () => {
                playSound('click');
                window.location.href = 'BOnus.html';
            });
        }
    }

    // Nav info modal (bonus page only)
    if (currentPage === 'bonus') {
        const closeNav = document.getElementById('close-bonus-nav-info');
        if (closeNav) {
            closeNav.addEventListener('click', () => {
                playSound('click');
                const m = document.getElementById('bonus-nav-info-modal');
                if (m) m.classList.remove('show');
            });
        }
    }

    // Click-outside-to-close for every modal
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                playSound('click');
                modal.classList.remove('show');
            }
        });
    });
}

function checkBonusPromo() {
    if (gameCount > 0 && gameCount % 3 === 0 && !sessionStorage.getItem('bonus-promo-shown')) {
        setTimeout(() => {
            const m = document.getElementById('bonus-promo-modal');
            if (m) m.classList.add('show');
            sessionStorage.setItem('bonus-promo-shown', 'true');
        }, 500);
    }
}

function showBonusNavModal() {
    if (!sessionStorage.getItem('bonus-nav-shown')) {
        setTimeout(() => {
            const m = document.getElementById('bonus-nav-info-modal');
            if (m) m.classList.add('show');
            sessionStorage.setItem('bonus-nav-shown', 'true');
        }, 500);
    }
}
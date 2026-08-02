import {
    PIECE_TYPES,
    SPRINT_TARGET_LINES,
    VERSUS_WIDTH,
    VERSUS_HEIGHT,
    MAX_PENDING_GARBAGE,
} from './src/js/constants.js';
import {
    shuffleBag,
    clearFullRows,
    addGarbageLines,
    collide,
    createMatrix,
    createPiece,
    rotate,
    merge,
    isEditableTarget,
    formatElapsedTime,
} from './src/js/board.js';
import {
    calculateGarbageAttack,
    eventMessageFor,
    buildScoreResult,
    qualifiesForBackToBack,
} from './src/js/scoring.js';
import { evaluateOpponentBoard, chooseOpponentMove } from './src/js/ai.js';
import { createAudioSystem, themeMelody, themeMelodyName } from './src/js/audio.js';
import { createRenderer } from './src/js/renderer.js';
import { readLeaderboard, writeLeaderboard, renderLeaderboard } from './src/js/leaderboard.js';
import {
    SCENARIO_STAGES,
    createScenarioProgress,
    normalizeScenarioProgress,
    canPlayScenarioStage,
    scenarioUpgradeEffects,
} from './src/js/scenario.js';

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold');
const holdContext = holdCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const leaderboardElement = document.getElementById('leaderboard');
const modalOverlay = document.getElementById('modal-overlay');
const startScreen = document.getElementById('start-screen');
const exitScreen = document.getElementById('exit-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const finalScoreElement = document.getElementById('final-score');
const gameOverTitleElement = document.getElementById('game-over-title');
const nicknameInput = document.getElementById('nickname');
const saveScoreBtn = document.getElementById('save-score-btn');
const startGameBtn = document.getElementById('start-game-btn');
const scenarioContinueBtn = document.getElementById('scenario-continue-btn');
const scenarioContinueDetail = document.getElementById('scenario-continue-detail');
const scenarioMapScreen = document.getElementById('scenario-map-screen');
const scenarioStageList = document.getElementById('scenario-stage-list');
const scenarioStageRival = document.getElementById('scenario-stage-rival');
const scenarioStageName = document.getElementById('scenario-stage-name');
const scenarioStageObjective = document.getElementById('scenario-stage-objective');
const scenarioStageModifier = document.getElementById('scenario-stage-modifier');
const scenarioStageBest = document.getElementById('scenario-stage-best');
const scenarioPlayBtn = document.getElementById('scenario-play-btn');
const scenarioMapBackBtn = document.getElementById('scenario-map-back-btn');
const scenarioResetBtn = document.getElementById('scenario-reset-btn');
const scenarioBriefingScreen = document.getElementById('scenario-briefing-screen');
const scenarioBriefingRival = document.getElementById('scenario-briefing-rival');
const scenarioBriefingName = document.getElementById('scenario-briefing-name');
const scenarioBriefingObjective = document.getElementById('scenario-briefing-objective');
const scenarioBriefingModifier = document.getElementById('scenario-briefing-modifier');
const scenarioStageStartBtn = document.getElementById('scenario-stage-start-btn');
const scenarioBriefingBackBtn = document.getElementById('scenario-briefing-back-btn');
const scenarioObjective = document.getElementById('scenario-objective');
const scenarioResultScreen = document.getElementById('scenario-result-screen');
const scenarioResultTitle = document.getElementById('scenario-result-title');
const scenarioResultStars = document.getElementById('scenario-result-stars');
const scenarioResultDetail = document.getElementById('scenario-result-detail');
const scenarioRetryBtn = document.getElementById('scenario-retry-btn');
const scenarioResultMapBtn = document.getElementById('scenario-result-map-btn');
const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
const menuExitBtn = document.getElementById('menu-exit-btn');
const exitReturnBtn = document.getElementById('exit-return-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const exitGameBtn = document.getElementById('exit-game-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeGameBtn = document.getElementById('resume-game-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');
const gameModeSelect = document.getElementById('game-mode');
const modeElement = document.getElementById('mode');
const timerElement = document.getElementById('timer');
const comboElement = document.getElementById('combo');
const backToBackElement = document.getElementById('back-to-back');
const eventMessageElement = document.getElementById('event-message');
const gameOverMenuBtn = document.getElementById('game-over-menu-btn');
const opponentCanvas = document.getElementById('opponent-board');
const opponentContext = opponentCanvas.getContext('2d');
const opponentPanel = document.getElementById('opponent-panel');
const opponentLinesElement = document.getElementById('opponent-lines');
const opponentGarbageElement = document.getElementById('opponent-garbage');
const playerGarbageElement = document.getElementById('player-garbage');
const opponentGarbageMeter = document.getElementById('opponent-garbage-meter');
const playerGarbageMeter = document.getElementById('player-garbage-meter');

const bgmToggle = document.getElementById('bgm-toggle');
const sfxToggle = document.getElementById('sfx-toggle');
const touchControls = document.getElementById('touch-controls');
const modeCards = [...document.querySelectorAll('[data-mode-card]')];
const PREFERENCES_KEY = 'neonDropPreferences';
const SCENARIO_KEY = 'neonDropScenario';
const touchActions = {
    'touch-left': () => playerMove(-1),
    'touch-rotate': () => playerRotate(1),
    'touch-right': () => playerMove(1),
    'touch-down': () => playerDrop(true),
    'touch-drop': () => playerHardDrop(),
    'touch-hold': () => playerHold(),
};

context.scale(20, 20);
nextContext.scale(20, 20);
holdContext.scale(20, 20);
opponentContext.scale(20, 20);

const audioSystem = createAudioSystem(bgmToggle, sfxToggle);
const {audioCtx, startBGM, stopBGM, isBGMRunning, sounds} = audioSystem;

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let animationFrameId = null;
let combo = 0;
let comboTimer = 0;
let shakeTime = 0;
let flashingLines = [];
let pieceBag = [];
let gameMode = 'marathon';
let elapsedTime = 0;
let backToBackActive = false;
let lastActionWasRotate = false;
let lastEventMessage = '';
let eventMessageTimer = 0;
let playerPendingGarbage = 0;
let matchEventLog = [];
let scenarioProgress = readScenarioProgress();
let selectedScenarioStageId = scenarioProgress.unlockedStage;
let activeScenarioStage = null;
let scenarioHazardTimer = 0;
let firewallCharges = 0;
let scenarioResolved = false;

let isGameOver = false;
let isPaused = false;

const arena = createMatrix(12, 20);
const opponent = {
    arena: createMatrix(VERSUS_WIDTH, VERSUS_HEIGHT),
    pos: {x: 0, y: 0},
    matrix: null,
    next: null,
    pieceBag: [],
    score: 0,
    lines: 0,
    combo: 0,
    backToBackActive: false,
    pendingGarbage: 0,
    gameOver: false,
};

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    next: null,
    hold: null,
    canHold: true,
    score: 0,
    level: 1,
    lines: 0,
    lockTimer: 0,
    lockDelay: 500,
};

const renderer = createRenderer({
    canvas, context, nextCanvas, nextContext, holdCanvas, holdContext,
    opponentCanvas, opponentContext, VERSUS_WIDTH, VERSUS_HEIGHT,
    setShakeTime: value => { shakeTime = value; },
    getState: () => ({
        shakeTime, arena, player, combo, flashingLines,
        gameMode, opponent,
    }),
});
const {draw, drawNext, drawHold, drawOpponent} = renderer;

function screenShake(intensity = 5) {
    shakeTime = intensity;
}

function canAcceptGameInput() {
    return Boolean(player.matrix) && !isPaused && !isGameOver;
}

function selectGameMode(mode) {
    gameModeSelect.value = mode;
    modeCards.forEach(card => {
        card.setAttribute('aria-pressed', String(card.dataset.mode === mode));
    });
}

function readPreferences() {
    try {
        const preferences = JSON.parse(localStorage.getItem(PREFERENCES_KEY));
        return preferences && typeof preferences === 'object' ? preferences : {};
    } catch {
        return {};
    }
}

function writePreferences() {
    try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
            mode: gameModeSelect.value,
            bgm: bgmToggle.checked,
            sfx: sfxToggle.checked,
        }));
    } catch {
        // Preferences are optional when storage is unavailable.
    }
}

function readScenarioProgress() {
    try {
        return normalizeScenarioProgress(JSON.parse(localStorage.getItem(SCENARIO_KEY)));
    } catch {
        return createScenarioProgress();
    }
}

function writeScenarioProgress() {
    try {
        localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenarioProgress));
    } catch {
        // Campaign play remains available when storage is unavailable.
    }
}

function restorePreferences() {
    const preferences = readPreferences();
    if (['marathon', 'sprint', 'versus'].includes(preferences.mode)) {
        gameModeSelect.value = preferences.mode;
    }
    if (typeof preferences.bgm === 'boolean') bgmToggle.checked = preferences.bgm;
    if (typeof preferences.sfx === 'boolean') sfxToggle.checked = preferences.sfx;
    selectGameMode(gameModeSelect.value);
}

function openModal(labelId, focusTarget) {
    modalOverlay.style.display = 'flex';
    modalOverlay.setAttribute('aria-labelledby', labelId);
    gameContainer.inert = true;
    touchControls.inert = true;
    focusTarget.focus();
}

function closeModal() {
    modalOverlay.style.display = 'none';
    gameContainer.inert = false;
    touchControls.inert = false;
}

const scenarioCopy = {
    1: stage => ({objective: `Clear ${stage.lineGoal} lines.`, modifier: 'Standard drop speed.'}),
    2: stage => ({
        objective: `Clear ${stage.lineGoal} lines before time expires.`,
        modifier: `Faster drop speed · ${formatElapsedTime(stage.timeLimitMs)} limit.`,
    }),
    3: stage => ({
        objective: `Clear ${stage.lineGoal} lines.`,
        modifier: `Interference every ${stage.hazardIntervalMs / 1000} seconds.`,
    }),
    4: stage => ({
        objective: `Defeat ${stage.rival}.`,
        modifier: `${stage.opponentTurns === 1 ? 'One' : stage.opponentTurns} opponent turn${stage.opponentTurns === 1 ? '' : 's'} per lock.`,
    }),
    5: stage => ({
        objective: `Defeat ${stage.rival}.`,
        modifier: `${stage.opponentTurns} opponent turns per lock · interference every ${stage.hazardIntervalMs / 1000} seconds.`,
    }),
};

function hideModalScreens() {
    startScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    exitScreen.style.display = 'none';
    scenarioMapScreen.style.display = 'none';
    scenarioBriefingScreen.style.display = 'none';
    scenarioResultScreen.style.display = 'none';
}

function renderScenarioMap() {
    if (!canPlayScenarioStage(scenarioProgress, selectedScenarioStageId)) {
        selectedScenarioStageId = scenarioProgress.unlockedStage;
    }

    const buttons = SCENARIO_STAGES.map(stage => {
        const button = document.createElement('button');
        const unlocked = canPlayScenarioStage(scenarioProgress, stage.id);
        const result = scenarioProgress.results[stage.id];
        const stars = Math.max(0, Math.min(3, result?.stars || 0));
        const starsLabel = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`;
        button.type = 'button';
        button.dataset.scenarioStage = stage.id;
        button.disabled = !unlocked;
        button.textContent = unlocked
            ? `STAGE ${String(stage.id).padStart(2, '0')}\n${stage.name}\n${stage.rival}\n${starsLabel}`
            : `STAGE ${String(stage.id).padStart(2, '0')}\nLOCKED`;
        button.setAttribute('aria-label', unlocked
            ? `Stage ${String(stage.id).padStart(2, '0')}, ${stage.name}, rival ${stage.rival}, ${stars} of 3 stars`
            : `Stage ${String(stage.id).padStart(2, '0')}, ${stage.name}, locked`);
        if (stage.id === selectedScenarioStageId) button.setAttribute('aria-current', 'step');
        button.addEventListener('click', () => {
            if (!canPlayScenarioStage(scenarioProgress, stage.id)) return;
            selectedScenarioStageId = stage.id;
            renderScenarioMap();
            scenarioStageList.querySelector(`[data-scenario-stage="${stage.id}"]`)?.focus();
        });
        return button;
    });
    scenarioStageList.replaceChildren(...buttons);

    const stage = SCENARIO_STAGES.find(candidate => candidate.id === selectedScenarioStageId);
    const copy = scenarioCopy[stage.id](stage);
    const result = scenarioProgress.results[stage.id];
    scenarioStageRival.textContent = `RIVAL · ${stage.rival}`;
    scenarioStageName.textContent = `STAGE ${String(stage.id).padStart(2, '0')} · ${stage.name}`;
    scenarioStageObjective.textContent = copy.objective;
    scenarioStageModifier.textContent = copy.modifier;
    scenarioStageBest.textContent = `BEST ${result ? formatElapsedTime(result.bestTimeMs) : '--:--'}`;
    scenarioPlayBtn.disabled = !canPlayScenarioStage(scenarioProgress, stage.id);
}

function showScenarioMap() {
    renderScenarioMap();
    hideModalScreens();
    scenarioMapScreen.style.display = 'block';
    const selectedButton = scenarioStageList.querySelector(`[data-scenario-stage="${selectedScenarioStageId}"]`);
    openModal('scenario-map-title', selectedButton);
}

function showScenarioBriefing() {
    if (!canPlayScenarioStage(scenarioProgress, selectedScenarioStageId)) return false;
    const stage = SCENARIO_STAGES.find(candidate => candidate.id === selectedScenarioStageId);
    if (!stage) return false;
    const copy = scenarioCopy[stage.id](stage);
    scenarioBriefingRival.textContent = stage.rival;
    scenarioBriefingName.textContent = stage.name;
    scenarioBriefingObjective.textContent = copy.objective;
    scenarioBriefingModifier.textContent = copy.modifier;
    hideModalScreens();
    scenarioBriefingScreen.style.display = 'block';
    openModal('scenario-briefing-title', scenarioStageStartBtn);
    return true;
}

function startScenarioStage(stageId) {
    const stage = SCENARIO_STAGES.find(candidate => candidate.id === stageId);
    if (!stage || !canPlayScenarioStage(scenarioProgress, stageId)) return false;

    cancelScheduledUpdate();
    if (audioCtx) void audioCtx.resume().catch(() => {});
    startBGM();
    activeScenarioStage = stage;
    gameMode = 'scenario';
    isGameOver = false;
    isPaused = false;
    opponentPanel.style.display = stage.kind === 'opponent' ? 'block' : 'none';
    gameContainer.classList.toggle('versus-active', stage.kind === 'opponent');
    closeModal();
    hideModalScreens();
    touchControls.hidden = false;
    resetGameState();
    playerReset();
    lastTime = performance.now();
    scheduleUpdate();
    return true;
}

function returnToMenu() {
    cancelScheduledUpdate();
    stopBGM();
    isPaused = false;
    isGameOver = true;
    resetGameState();
    activeScenarioStage = null;
    showStartScreen();
}

function nextPieceType() {
    if (pieceBag.length === 0) {
        pieceBag = shuffleBag();
    }
    return pieceBag.shift();
}

function queueGarbageForOpponent(amount) {
    if (gameMode !== 'versus' || amount <= 0) return;
    opponent.pendingGarbage = Math.min(MAX_PENDING_GARBAGE, opponent.pendingGarbage + amount);
    emitMatchEvent('attack-sent', {from: 'player', amount});
}

function queueGarbageForPlayer(amount) {
    if (!playerGarbageActive() || amount <= 0) return;
    playerPendingGarbage = Math.min(MAX_PENDING_GARBAGE, playerPendingGarbage + amount);
    emitMatchEvent('attack-sent', {from: 'ai', amount});
}

function playerGarbageActive() {
    return gameMode === 'versus'
        || (gameMode === 'scenario' && activeScenarioStage?.id >= 3);
}

function scenarioDropInterval() {
    const stepMs = gameMode === 'scenario' && activeScenarioStage
        ? activeScenarioStage.dropStepMs : 100;
    const base = Math.max(100, 1000 - (player.level - 1) * stepMs);
    const multiplier = gameMode === 'scenario'
        ? scenarioUpgradeEffects(scenarioProgress.upgrades).dropIntervalMultiplier : 1;
    return Math.round(base * multiplier);
}

function applyPendingGarbage(target, count, recipient) {
    if (count <= 0) return;
    const overflowed = addGarbageLines(target, count);
    emitMatchEvent('garbage-received', {to: recipient, amount: count});
    return overflowed;
}

function scoreLines(rowCount, pivot = false) {
    const qualifies = qualifiesForBackToBack(rowCount, pivot);
    const hadBackToBack = backToBackActive && qualifies;

    if (qualifies) {
        backToBackActive = true;
    } else if (rowCount > 0) {
        backToBackActive = false;
    }

    if (rowCount > 0) {
        combo = combo > 0 ? combo + 1 : 1;
        comboTimer = 2000;
        player.lines += rowCount;
        player.level = Math.floor(player.lines / 10) + 1;
        dropInterval = scenarioDropInterval();
        completeScenarioLineProgress(rowCount);
    } else if (!pivot) {
        combo = 0;
    }

    const {points, attack} = buildScoreResult({
        rowCount, pivot, hadBackToBack, level: player.level, comboValue: combo,
    });
    player.score += points;
    queueGarbageForOpponent(attack);
    lastEventMessage = eventMessageFor(rowCount, pivot);
    eventMessageTimer = 2000;
    updateScore();
    return player.score;
}

function arenaSweep(pivot = false) {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        flashingLines.push({y, time: 100});
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        rowCount++;
    }

    if (rowCount > 0) {
        sounds.clear();
        if (rowCount === 4) screenShake(10);
    }

    if (rowCount > 0 || pivot) {
        scoreLines(rowCount, pivot);
    } else {
        combo = 0;
        lastEventMessage = '';
        eventMessageTimer = 0;
        updateScore();
    }

    return rowCount;
}

function isPivot() {
    if (!lastActionWasRotate || !player.matrix || player.matrix.length !== 3) return false;
    if (!player.matrix.some(row => row.includes(1))) return false;

    const centerX = player.pos.x + 1;
    const centerY = player.pos.y + 1;
    const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    const occupiedCorners = corners.filter(([x, y]) => {
        const row = arena[centerY + y];
        return !row || row[centerX + x] !== 0;
    });
    return occupiedCorners.length >= 3;
}

function playerDrop(manual = false) {
    if (manual) lastActionWasRotate = false;
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;

        if (player.lockTimer === 0) {
            player.lockTimer = player.lockDelay;
        }

        if (player.lockTimer <= 0) {
            lockPiece();
        }
    } else {
        player.lockTimer = 0;
    }
    dropCounter = 0;
}

function endVersusMatch(title, eventType) {
    if (gameMode !== 'versus' || isGameOver) return;
    opponent.gameOver = true;
    emitMatchEvent(eventType);
    showHighScoreModal(title);
}

function runOpponentTurn() {
    if (gameMode !== 'versus' || isGameOver || opponent.gameOver || !opponent.matrix) return;

    if (opponent.pendingGarbage > 0) {
        const incoming = opponent.pendingGarbage;
        opponent.pendingGarbage = 0;
        if (applyPendingGarbage(opponent.arena, incoming, 'ai')) {
            endVersusMatch('You Win!', 'match-win');
            return;
        }
    }

    const move = chooseOpponentMove(opponent.matrix, opponent.arena);
    if (!move) {
        endVersusMatch('You Win!', 'match-win');
        return;
    }

    opponent.matrix = move.matrix;
    opponent.pos = {x: move.x, y: move.y};
    merge(opponent.arena, opponent);

    const rowCount = clearFullRows(opponent.arena);
    const qualifies = qualifiesForBackToBack(rowCount, false);
    const hadBackToBack = opponent.backToBackActive && qualifies;
    if (qualifies) {
        opponent.backToBackActive = true;
    } else if (rowCount > 0) {
        opponent.backToBackActive = false;
    }

    if (rowCount > 0) {
        opponent.combo = opponent.combo > 0 ? opponent.combo + 1 : 1;
        opponent.lines += rowCount;
    } else {
        opponent.combo = 0;
    }

    const {points, attack} = buildScoreResult({
        rowCount, pivot: false, hadBackToBack, level: 1, comboValue: opponent.combo,
    });
    opponent.score += points;
    queueGarbageForPlayer(attack);

    opponent.matrix = opponent.next;
    opponent.next = createPiece(nextOpponentPieceType());
    opponent.pos = {
        x: (VERSUS_WIDTH / 2 | 0) - (opponent.matrix[0].length / 2 | 0),
        y: 0,
    };
    if (collide(opponent.arena, opponent)) {
        endVersusMatch('You Win!', 'match-win');
    }
    drawOpponent();
    updateScore();
}

function checkSprintCompletion() {
    if (gameMode !== 'sprint' || player.lines < SPRINT_TARGET_LINES) return false;
    showHighScoreModal('Sprint Complete!');
    return true;
}

function lockCurrentPiece() {
    const pivot = isPivot();
    merge(arena, player);
    sounds.drop();
    arenaSweep(pivot);
    updateScore();
    player.lockTimer = 0;
    lastActionWasRotate = false;

    if (!checkSprintCompletion()) {
        if (gameMode === 'versus') runOpponentTurn();
        if (!isGameOver) playerReset();
    }
}

function lockPiece() {
    lockCurrentPiece();
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;

    lockCurrentPiece();
    dropCounter = 0;
}

function playerMove(dir) {
    lastActionWasRotate = false;
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    } else {
        sounds.move();
    }
}

function playerReset() {
    if (player.next === null) {
        player.next = createPiece(nextPieceType());
    }

    player.matrix = player.next;
    player.next = createPiece(nextPieceType());

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);
    player.canHold = true;
    player.lockTimer = 0;
    if (playerGarbageActive() && playerPendingGarbage > 0) {
        const incoming = playerPendingGarbage;
        playerPendingGarbage = 0;
        if (applyPendingGarbage(arena, incoming, 'player')) {
            if (gameMode === 'versus') {
                endVersusMatch('You Lose!', 'match-lose');
            } else if (activeScenarioStage?.kind === 'lines') {
                failScenarioStage('SYSTEM OVERLOAD');
            } else {
                showHighScoreModal();
            }
            return;
        }
    }
    if (collide(arena, player)) {
        if (gameMode === 'versus') {
            endVersusMatch('You Lose!', 'match-lose');
        } else if (gameMode === 'scenario' && activeScenarioStage?.kind === 'lines') {
            failScenarioStage('SYSTEM OVERLOAD');
        } else {
            showHighScoreModal();
        }
    }
    drawNext();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    lastActionWasRotate = false;
    rotate(player.matrix, dir);
    if (!collide(arena, player)) {
        lastActionWasRotate = true;
        sounds.rotate();
    } else {
        while (collide(arena, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir);
                player.pos.x = pos;
                return;
            }
        }
        lastActionWasRotate = true;
        sounds.rotate();
    }
}

function update(time = 0) {
    animationFrameId = null;
    if (isGameOver || isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    elapsedTime += Math.max(0, deltaTime);
    if (eventMessageTimer > 0) {
        eventMessageTimer -= deltaTime;
        if (eventMessageTimer <= 0) lastEventMessage = '';
    }
    updateScenarioState(Math.max(0, deltaTime));
    if (scenarioResolved) return;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    if (player.lockTimer > 0) {
        player.lockTimer -= deltaTime;
        if (player.lockTimer <= 0) {
            lockPiece();
        }
    }

    if (comboTimer > 0) {
        comboTimer -= deltaTime;
        if (comboTimer <= 0) combo = 0;
    }

    updateScore();
    draw();
    drawOpponent();
    drawNext();
    drawHold();
    scheduleUpdate();
}

function scheduleUpdate() {
    if (animationFrameId === null && !isGameOver && !isPaused) {
        animationFrameId = requestAnimationFrame(update);
    }
}

function cancelScheduledUpdate() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function updateScore() {
    scoreElement.innerText = 'Score: ' + player.score;
    levelElement.innerText = 'Level: ' + player.level;
    linesElement.innerText = 'Lines: ' + player.lines;
    const modeLabel = gameMode === 'sprint'
        ? 'Sprint'
        : (gameMode === 'versus' ? '2P · Versus AI' : (gameMode === 'scenario' ? 'Neon Circuit' : 'Marathon'));
    modeElement.innerText = 'Mode: ' + modeLabel;
    timerElement.innerText = 'Time: ' + formatElapsedTime(elapsedTime);
    comboElement.innerText = 'Combo: ' + combo;
    backToBackElement.innerText = 'B2B: ' + (backToBackActive ? 'Active' : 'Ready');
    eventMessageElement.innerText = lastEventMessage || ' ';
    opponentLinesElement.innerText = 'AI LINES ' + String(opponent.lines).padStart(2, '0');
    opponentGarbageElement.innerText = 'AI INCOMING ' + String(opponent.pendingGarbage).padStart(2, '0');
    playerGarbageElement.innerText = 'YOU INCOMING ' + String(playerPendingGarbage).padStart(2, '0');
    opponentGarbageMeter.style.width = `${opponent.pendingGarbage / MAX_PENDING_GARBAGE * 100}%`;
    playerGarbageMeter.style.width = `${playerPendingGarbage / MAX_PENDING_GARBAGE * 100}%`;
    const scenarioActive = gameMode === 'scenario' && Boolean(activeScenarioStage);
    scenarioObjective.hidden = !scenarioActive;
    if (scenarioActive) {
        scenarioObjective.textContent = activeScenarioStage.kind === 'lines'
            ? `OBJECTIVE ${Math.min(player.lines, activeScenarioStage.lineGoal)} / ${activeScenarioStage.lineGoal}`
            : 'OBJECTIVE DEFEAT RIVAL';
    }
}

function completeScenarioLineProgress(rowCount) {
    if (rowCount <= 0 || gameMode !== 'scenario' || scenarioResolved
        || activeScenarioStage?.kind !== 'lines') return false;
    if (player.lines < activeScenarioStage.lineGoal) return false;
    completeScenarioStage();
    return true;
}

function updateScenarioState(deltaTime) {
    if (gameMode !== 'scenario' || !activeScenarioStage || scenarioResolved || isPaused) return;
    if (activeScenarioStage.timeLimitMs !== null && elapsedTime >= activeScenarioStage.timeLimitMs) {
        failScenarioStage('Time Up!');
        return;
    }
    if (!activeScenarioStage.hazardIntervalMs) return;
    scenarioHazardTimer -= deltaTime;
    if (scenarioHazardTimer <= 0) {
        queueGarbageForPlayer(1);
        scenarioHazardTimer = activeScenarioStage.hazardIntervalMs;
        lastEventMessage = 'INTERFERENCE +1';
        eventMessageTimer = 2000;
        updateScore();
    }
}

function completeScenarioStage() {
    if (gameMode !== 'scenario' || !activeScenarioStage || scenarioResolved) return false;
    scenarioResolved = true;
    isGameOver = true;
    cancelScheduledUpdate();
    stopBGM();
    touchControls.hidden = true;
    hideModalScreens();
    scenarioResultTitle.textContent = 'STAGE CLEAR';
    scenarioResultStars.textContent = '';
    scenarioResultDetail.textContent = `${activeScenarioStage.name} · ${formatElapsedTime(elapsedTime)}`;
    scenarioResultScreen.style.display = 'block';
    openModal('scenario-result-title', scenarioRetryBtn);
    return true;
}

function failScenarioStage(title) {
    if (gameMode !== 'scenario' || !activeScenarioStage || scenarioResolved) return false;
    scenarioResolved = true;
    isGameOver = true;
    cancelScheduledUpdate();
    stopBGM();
    touchControls.hidden = true;
    hideModalScreens();
    scenarioResultTitle.textContent = title;
    scenarioResultStars.textContent = '';
    scenarioResultDetail.textContent = 'Retry Stage';
    scenarioResultScreen.style.display = 'block';
    openModal('scenario-result-title', scenarioRetryBtn);
    return true;
}

function leaveScenarioForMap() {
    const stageId = activeScenarioStage?.id ?? selectedScenarioStageId;
    cancelScheduledUpdate();
    stopBGM();
    isPaused = false;
    isGameOver = true;
    resetGameState();
    activeScenarioStage = null;
    selectedScenarioStageId = stageId;
    touchControls.hidden = true;
    scenarioObjective.hidden = true;
    opponentPanel.style.display = 'none';
    gameContainer.classList.remove('versus-active');
    showScenarioMap();
}

function updateLeaderboard() {
    renderLeaderboard(leaderboardElement, readLeaderboard());
}

function showStartScreen() {
    if (activeScenarioStage) {
        resetGameState();
        activeScenarioStage = null;
    }
    opponentPanel.style.display = 'none';
    touchControls.hidden = true;
    scenarioObjective.hidden = true;
    gameContainer.classList.remove('versus-active');
    hideModalScreens();
    startScreen.style.display = 'block';
    const unlockedStage = SCENARIO_STAGES[scenarioProgress.unlockedStage - 1];
    scenarioContinueDetail.textContent = scenarioProgress.completed
        ? 'CHAMPION · 5/5 STAGES'
        : `STAGE ${String(unlockedStage.id).padStart(2, '0')} · ${unlockedStage.rival}`;
    openModal('start-screen-title', scenarioContinueBtn);
}

function exitApplication() {
    if (!window.confirm('Neon Drop을 종료하시겠습니까?')) return;
    cancelScheduledUpdate();
    stopBGM();
    isGameOver = true;
    window.close();
    setTimeout(() => {
        if (window.closed) return;
        startScreen.style.display = 'none';
        exitScreen.style.display = 'block';
        openModal('exit-screen-title', exitReturnBtn);
    }, 0);
}

function showPauseScreen() {
    touchControls.hidden = true;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    pauseScreen.style.display = 'block';
    openModal('pause-screen-title', resumeGameBtn);
}

function showHighScoreModal(title = 'Game Over!') {
    isGameOver = true;
    touchControls.hidden = true;
    sounds.gameOver();

    const scores = readLeaderboard();
    const topScore = scores.length > 0 ? scores[0].score : 0;

    startScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    gameOverScreen.style.display = 'block';
    gameOverTitleElement.innerText = title;
    finalScoreElement.innerText = player.score;

    if (player.score > topScore || scores.length < 5) {
        document.getElementById('high-score-input-group').style.display = 'block';
    } else {
        document.getElementById('high-score-input-group').style.display = 'none';
    }
    const scoreInputVisible = document.getElementById('high-score-input-group').style.display !== 'none';
    openModal('game-over-title', scoreInputVisible ? nicknameInput : gameOverMenuBtn);
}

saveScoreBtn.addEventListener('click', () => {
    const name = nicknameInput.value.trim() || 'Anonymous';
    const newScore = { name, score: player.score };

    let scores = readLeaderboard();
    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);

    writeLeaderboard(scores);
    updateLeaderboard();

    gameOverScreen.style.display = 'none';
    resetGameState();
    isGameOver = false;

    showStartScreen();
});

startGameBtn.addEventListener('click', () => {
    cancelScheduledUpdate();
    if (audioCtx) {
        void audioCtx.resume().catch(() => {});
    }
    startBGM();
    gameMode = gameModeSelect.value;
    opponentPanel.style.display = gameMode === 'versus' ? 'block' : 'none';
    gameContainer.classList.toggle('versus-active', gameMode === 'versus');
    isGameOver = false;
    isPaused = false;
    closeModal();
    startScreen.style.display = 'none';
    touchControls.hidden = false;
    resetGameState();
    emitMatchEvent('match-start');
    gameOverTitleElement.innerText = 'Game Over!';
    playerReset();
    lastTime = performance.now();
    scheduleUpdate();
});

scenarioContinueBtn.addEventListener('click', () => {
    selectedScenarioStageId = scenarioProgress.unlockedStage;
    showScenarioMap();
});
scenarioPlayBtn.addEventListener('click', showScenarioBriefing);
scenarioMapBackBtn.addEventListener('click', showStartScreen);
scenarioBriefingBackBtn.addEventListener('click', showScenarioMap);
scenarioStageStartBtn.addEventListener('click', () => startScenarioStage(selectedScenarioStageId));
scenarioRetryBtn.addEventListener('click', () => startScenarioStage(activeScenarioStage.id));
scenarioResultMapBtn.addEventListener('click', leaveScenarioForMap);
scenarioResetBtn.addEventListener('click', () => {
    if (!window.confirm('Neon Circuit 진행도를 초기화하시겠습니까?')) return;
    scenarioProgress = createScenarioProgress();
    writeScenarioProgress();
    selectedScenarioStageId = 1;
    renderScenarioMap();
    scenarioStageList.querySelector('[data-scenario-stage="1"]')?.focus();
});

modeCards.forEach(card => {
    card.addEventListener('click', () => {
        selectGameMode(card.dataset.mode);
        writePreferences();
    });
});

gameModeSelect.addEventListener('change', () => {
    selectGameMode(gameModeSelect.value);
    writePreferences();
});

bgmToggle.addEventListener('change', writePreferences);
sfxToggle.addEventListener('change', writePreferences);

gameOverMenuBtn.addEventListener('click', returnToMenu);

Object.entries(touchActions).forEach(([id, action]) => {
    document.getElementById(id).addEventListener('click', () => {
        if (canAcceptGameInput()) action();
    });
});

viewLeaderboardBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    leaderboardScreen.style.display = 'block';
    renderLeaderboard(leaderboardList, readLeaderboard());
    openModal('leaderboard-screen-title', closeLeaderboardBtn);
});

closeLeaderboardBtn.addEventListener('click', () => {
    showStartScreen();
});

menuExitBtn.addEventListener('click', exitApplication);
exitReturnBtn.addEventListener('click', showStartScreen);

resumeGameBtn.addEventListener('click', () => {
    isPaused = false;
    closeModal();
    pauseScreen.style.display = 'none';
    touchControls.hidden = false;
    lastTime = performance.now();
    scheduleUpdate();
});

quitToMenuBtn.addEventListener('click', () => {
    returnToMenu();
});

function emitMatchEvent(type, payload = {}) {
    if (gameMode !== 'versus') return;
    matchEventLog.push({type, ...payload});
    if (matchEventLog.length > 20) matchEventLog.shift();
}

function nextOpponentPieceType() {
    if (opponent.pieceBag.length === 0) {
        opponent.pieceBag = shuffleBag();
    }
    return opponent.pieceBag.shift();
}

function resetOpponentState() {
    opponent.arena.forEach(row => row.fill(0));
    opponent.pos = {x: 0, y: 0};
    opponent.pieceBag = [];
    opponent.matrix = null;
    opponent.next = null;
    opponent.score = 0;
    opponent.lines = 0;
    opponent.combo = 0;
    opponent.backToBackActive = false;
    opponent.pendingGarbage = 0;
    opponent.gameOver = false;
    if (gameMode !== 'versus') return;
    opponent.matrix = createPiece(nextOpponentPieceType());
    opponent.next = createPiece(nextOpponentPieceType());
    opponent.pos = {
        x: (VERSUS_WIDTH / 2 | 0) - (opponent.matrix[0].length / 2 | 0),
        y: 0,
    };
}

function resetGameState() {
    arena.forEach(row => row.fill(0));
    pieceBag = [];
    player.pos = {x: 0, y: 0};
    player.matrix = null;
    player.next = null;
    player.hold = null;
    player.canHold = true;
    player.score = 0;
    player.level = 1;
    player.lines = 0;
    player.lockTimer = 0;

    dropCounter = 0;
    combo = 0;
    comboTimer = 0;
    shakeTime = 0;
    flashingLines = [];
    dropInterval = scenarioDropInterval();
    elapsedTime = 0;
    backToBackActive = false;
    lastActionWasRotate = false;
    lastEventMessage = '';
    eventMessageTimer = 0;
    playerPendingGarbage = 0;
    matchEventLog = [];
    scenarioHazardTimer = gameMode === 'scenario'
        ? activeScenarioStage?.hazardIntervalMs || 0 : 0;
    firewallCharges = 0;
    scenarioResolved = false;
    resetOpponentState();

    drawHold();
    drawOpponent();
    updateScore();
}

function playerHold() {
    if (!player.canHold || !player.matrix || isPaused || isGameOver) return;

    lastActionWasRotate = false;
    const currentPiece = player.matrix.map(row => [...row]);
    if (player.hold === null) {
        player.hold = currentPiece;
        playerReset();
    } else {
        const holdPiece = player.hold;
        player.hold = currentPiece;
        player.matrix = holdPiece.map(row => [...row]);
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
        player.lockTimer = 0;
        if (collide(arena, player)) {
            if (gameMode === 'versus') {
                endVersusMatch('You Lose!', 'match-lose');
            } else if (gameMode === 'scenario' && activeScenarioStage?.kind === 'lines') {
                failScenarioStage('SYSTEM OVERLOAD');
            } else {
                showHighScoreModal();
            }
        }
    }
    player.canHold = false;
    drawHold();
}

function togglePause() {
    if (!player.matrix || isGameOver) return;

    isPaused = !isPaused;
    if (isPaused) {
        showPauseScreen();
    } else {
        closeModal();
        pauseScreen.style.display = 'none';
        lastTime = performance.now();
        scheduleUpdate();
    }
}

document.addEventListener('keydown', event => {
    if (isEditableTarget(event.target)) return;

    if (audioCtx && audioCtx.state === 'suspended' && player.matrix && !isGameOver) {
        audioCtx.resume();
        startBGM();
    }

    const key = event.key.toLowerCase();
    if (!player.matrix && startScreen.style.display !== 'none' && key === 'enter' &&
        event.target.matches('[data-mode-card]')) {
        event.preventDefault();
        selectGameMode(event.target.dataset.mode);
        writePreferences();
        startGameBtn.click();
        return;
    }
    if (key === 'escape' || key === 'p') {
        togglePause();
        return;
    }

    if (isGameOver || isPaused || !player.matrix) return;

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop(true);
    } else if (event.key === 'ArrowUp') {
        playerRotate(1);
    } else if (event.key === ' ') {
        event.preventDefault();
        playerHardDrop();
    } else if (key === 'c') {
        playerHold();
    } else if (key === 'q') {
        quitGame();
    }
});

function quitGame() {
    if (!player.matrix || isGameOver) return;
    if (!confirm('정말로 게임을 종료하시겠습니까?')) return;
    returnToMenu();
}

exitGameBtn.addEventListener('click', quitGame);

//Expose state and functions to Playwright tests that rely on global scope.
const exposed = {
    arena, player, opponent,
    gameOverTitleElement, gameOverScreen, startScreen, pauseScreen, modalOverlay,
    calculateGarbageAttack, scoreLines, createPiece, createMatrix,
    chooseOpponentMove, evaluateOpponentBoard, nextPieceType,
    endVersusMatch, resetGameState, clearFullRows, addGarbageLines,
    collide, merge, rotate,
    nextOpponentPieceType, resetOpponentState, arenaSweep,
    readLeaderboard, writeLeaderboard, renderLeaderboard,
    shuffleBag, emitMatchEvent, playerReset, playerHold, playerMove,
    playerRotate, playerDrop, playerHardDrop, lockPiece, lockCurrentPiece,
    queueGarbageForOpponent, queueGarbageForPlayer, runOpponentTurn,
    checkSprintCompletion, showHighScoreModal, showStartScreen, showPauseScreen, exitApplication,
    togglePause, quitGame, returnToMenu, selectGameMode, canAcceptGameInput, update, formatElapsedTime,
    createScenarioProgress, readScenarioProgress, writeScenarioProgress, renderScenarioMap,
    showScenarioMap, showScenarioBriefing, startScenarioStage, canPlayScenarioStage,
    completeScenarioLineProgress, updateScenarioState, completeScenarioStage,
    failScenarioStage, leaveScenarioForMap, playerGarbageActive, scenarioUpgradeEffects,
    themeMelody, themeMelodyName,
    isBgmRunning: isBGMRunning,
    PIECE_TYPES, SPRINT_TARGET_LINES, VERSUS_WIDTH, VERSUS_HEIGHT, MAX_PENDING_GARBAGE,
    SCENARIO_STAGES,
};
//Live-bound scalar state: tests read these via window.<name> and mutate them too.
const liveState = {
    isGameOver: [() => isGameOver, (v) => { isGameOver = v; }],
    isPaused: [() => isPaused, (v) => { isPaused = v; }],
    combo: [() => combo, (v) => { combo = v; }],
    comboTimer: [() => comboTimer, (v) => { comboTimer = v; }],
    backToBackActive: [() => backToBackActive, (v) => { backToBackActive = v; }],
    pieceBag: [() => pieceBag, (v) => { pieceBag = v; }],
    playerPendingGarbage: [() => playerPendingGarbage, (v) => { playerPendingGarbage = v; }],
    lastEventMessage: [() => lastEventMessage, (v) => { lastEventMessage = v; }],
    elapsedTime: [() => elapsedTime, (v) => { elapsedTime = v; }],
    matchEventLog: [() => matchEventLog, (v) => { matchEventLog = v; }],
    flashingLines: [() => flashingLines, (v) => { flashingLines = v; }],
    gameMode: [() => gameMode, (v) => { gameMode = v; }],
    shakeTime: [() => shakeTime, (v) => { shakeTime = v; }],
    animationFrameId: [() => animationFrameId, (v) => { animationFrameId = v; }],
    scenarioProgress: [() => scenarioProgress, (v) => { scenarioProgress = v; }],
    selectedScenarioStageId: [() => selectedScenarioStageId, (v) => { selectedScenarioStageId = v; }],
    activeScenarioStage: [() => activeScenarioStage, (v) => { activeScenarioStage = v; }],
    scenarioHazardTimer: [() => scenarioHazardTimer, (v) => { scenarioHazardTimer = v; }],
    firewallCharges: [() => firewallCharges, (v) => { firewallCharges = v; }],
    scenarioResolved: [() => scenarioResolved, (v) => { scenarioResolved = v; }],
    dropInterval: [() => dropInterval, (v) => { dropInterval = v; }],
    eventMessageTimer: [() => eventMessageTimer, (v) => { eventMessageTimer = v; }],
};

for (const [name, value] of Object.entries(exposed)) {
    window[name] = value;
}
for (const [name, [getter, setter]] of Object.entries(liveState)) {
    Object.defineProperty(window, name, { get: getter, set: setter, configurable: true });
}

//Initialize Game
restorePreferences();
showStartScreen();
updateScore();
updateLeaderboard();

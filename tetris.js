import {
    PIECE_TYPES,
    SPRINT_TARGET_LINES,
    VERSUS_WIDTH,
    VERSUS_HEIGHT,
    MAX_PENDING_GARBAGE,
    SOFT_DROP_POINT,
    HARD_DROP_POINT,
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
    detectTSpin,
    isPerfectClear,
} from './src/js/scoring.js';
import { evaluateOpponentBoard, chooseOpponentMove } from './src/js/ai.js';
import { createAudioSystem, themeMelody, themeMelodyName } from './src/js/audio.js';
import { createRenderer } from './src/js/renderer.js';
import { readLeaderboard, writeLeaderboard, renderLeaderboard } from './src/js/leaderboard.js';
import {
    SCENARIO_STAGES,
    SCENARIO_UPGRADES,
    createScenarioProgress,
    normalizeScenarioProgress,
    canPlayScenarioStage,
    starsForScenarioStage,
    scenarioUpgradeEffects,
} from './src/js/scenario.js';
import { createPieceQueue } from './src/js/queue.js';
import { tryRotateSrs } from './src/js/srs.js';
import {
    createLockState,
    onGroundContact,
    onSuccessfulMove,
    tickLock,
    clearLock,
} from './src/js/lock.js';
import { createInputController } from './src/js/input.js';
import {
    normalizeSettings,
    DEFAULT_SETTINGS,
} from './src/js/settings.js';

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
const scenarioResetError = document.getElementById('scenario-reset-error');
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
const scenarioRewardOpenBtn = document.getElementById('scenario-reward-open-btn');
const scenarioRetryBtn = document.getElementById('scenario-retry-btn');
const scenarioResultMapBtn = document.getElementById('scenario-result-map-btn');
const scenarioRewardScreen = document.getElementById('scenario-reward-screen');
const scenarioRewardError = document.getElementById('scenario-reward-error');
const scenarioRewardOptions = document.getElementById('scenario-reward-options');
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
    'touch-rotate': () => playerRotate(1),
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

let settings = normalizeSettings(DEFAULT_SETTINGS);
const pieceQueue = createPieceQueue();
const inputController = createInputController({
    das: settings.timing.das,
    arr: settings.timing.arr,
});
let lockState = createLockState(settings.timing.lockDelay);

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
    holdRotation: 0,
    canHold: true,
    score: 0,
    level: 1,
    lines: 0,
    rotation: 0,
    lastRotateUsedKick: false,
    lockTimer: 0,
    lockDelay: settings.timing.lockDelay,
};

const renderer = createRenderer({
    canvas, context, nextCanvas, nextContext, holdCanvas, holdContext,
    opponentCanvas, opponentContext, VERSUS_WIDTH, VERSUS_HEIGHT,
    setShakeTime: value => { shakeTime = value; },
    getState: () => ({
        shakeTime, arena, player, combo, flashingLines,
        opponentActive: opponentPlayActive(), opponent,
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
        return normalizeSettings(JSON.parse(localStorage.getItem(PREFERENCES_KEY)));
    } catch {
        return normalizeSettings({});
    }
}

function writePreferences() {
    try {
        settings = normalizeSettings({
            ...settings,
            mode: gameModeSelect.value,
            bgm: bgmToggle.checked,
            sfx: sfxToggle.checked,
        });
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(settings));
    } catch {
        // Preferences are optional when storage is unavailable.
    }
}

function applyLiveSettings(next = settings) {
    settings = normalizeSettings(next);
    inputController.setTiming(settings.timing);
    player.lockDelay = settings.timing.lockDelay;
    lockState = createLockState(settings.timing.lockDelay);
    player.lockTimer = 0;
}

function readScenarioProgress() {
    try {
        return normalizeScenarioProgress(JSON.parse(localStorage.getItem(SCENARIO_KEY)));
    } catch {
        return createScenarioProgress();
    }
}

function writeScenarioProgress(value = scenarioProgress) {
    try {
        localStorage.setItem(SCENARIO_KEY, JSON.stringify(value));
        return true;
    } catch {
        // Campaign play remains available when storage is unavailable.
        return false;
    }
}

function restorePreferences() {
    applyLiveSettings(readPreferences());
    if (['marathon', 'sprint', 'versus'].includes(settings.mode)) {
        gameModeSelect.value = settings.mode;
    }
    bgmToggle.checked = settings.bgm;
    sfxToggle.checked = settings.sfx;
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
    scenarioRewardScreen.style.display = 'none';
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
    if (scenarioProgress.pendingRewardStage !== null) return showScenarioReward();
    renderScenarioMap();
    hideModalScreens();
    scenarioMapScreen.style.display = 'block';
    const selectedButton = scenarioStageList.querySelector(`[data-scenario-stage="${selectedScenarioStageId}"]`);
    openModal('scenario-map-title', selectedButton);
    return true;
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
    emitMatchEvent('match-start');
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

/**
 * Spawn matrices for B/C/S are not Guideline R0; align SRS rotation
 * index to the geometry createPiece() returns.
 * B (J-like vertical) ≡ R3, C (L-like vertical) ≡ R1, S (I vertical) ≡ R3.
 */
function initialRotationFor(type) {
    if (type === 'B') return 3;
    if (type === 'C') return 1;
    if (type === 'S') return 3;
    return 0;
}

function nextPieceType() {
    return pieceQueue.next();
}

function syncPlayerNextPreview() {
    const preview = pieceQueue.preview(5);
    player.next = preview.length ? createPiece(preview[0]) : null;
}

function nextPreviewMatrices() {
    return pieceQueue.preview(5).map(type => createPiece(type)).filter(Boolean);
}

function actionForCode(code) {
    for (const [action, codes] of Object.entries(settings.bindings)) {
        if (codes.includes(code)) return action;
    }
    return null;
}

function emitHorizontal(action) {
    if (action === 'moveLeft') playerMove(-1);
    else if (action === 'moveRight') playerMove(1);
}

function pieceIsGrounded() {
    if (!player.matrix) return false;
    player.pos.y++;
    const grounded = collide(arena, player);
    player.pos.y--;
    return grounded;
}

function refreshLockAfterMove() {
    if (pieceIsGrounded()) {
        lockState = onSuccessfulMove(lockState);
        player.lockTimer = lockState.timer;
    } else {
        lockState = clearLock(lockState);
        player.lockTimer = 0;
    }
}

function normalizeTSpinArg(tSpinOrPivot = 'none') {
    if (typeof tSpinOrPivot === 'boolean') return tSpinOrPivot ? 'full' : 'none';
    return tSpinOrPivot || 'none';
}

function queueGarbageForOpponent(amount) {
    if (!opponentPlayActive() || amount <= 0) return;
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

function hasScenarioOpponent() {
    return gameMode === 'scenario' && activeScenarioStage?.kind === 'opponent';
}

function opponentPlayActive() {
    return gameMode === 'versus' || hasScenarioOpponent();
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

function scoreLines(rowCount, tSpinOrPivot = 'none', perfectClear = false) {
    const tSpin = normalizeTSpinArg(tSpinOrPivot);
    const qualifies = qualifiesForBackToBack(rowCount, tSpin);
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
    } else if (tSpin === 'none') {
        combo = 0;
    }

    const {points, attack} = buildScoreResult({
        rowCount, tSpin, perfectClear, hadBackToBack, level: player.level, comboValue: combo,
    });
    const upgradeEffects = gameMode === 'scenario'
        ? scenarioUpgradeEffects(scenarioProgress.upgrades) : null;
    player.score += upgradeEffects ? Math.round(points * upgradeEffects.scoreMultiplier) : points;
    // Pulse Amp: outgoing garbage bonus only when attack > 0.
    queueGarbageForOpponent(attack > 0 ? attack + (upgradeEffects?.outgoingGarbageBonus || 0) : 0);
    lastEventMessage = eventMessageFor(rowCount, tSpin, perfectClear);
    eventMessageTimer = 2000;
    updateScore();
    return player.score;
}

function arenaSweep(tSpinOrPivot = 'none') {
    const tSpin = normalizeTSpinArg(tSpinOrPivot);
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

    const perfectClear = rowCount > 0 && isPerfectClear(arena);
    if (rowCount > 0 || tSpin !== 'none') {
        scoreLines(rowCount, tSpin, perfectClear);
    } else {
        combo = 0;
        lastEventMessage = '';
        eventMessageTimer = 0;
        updateScore();
    }

    return rowCount;
}

function playerDrop(manual = false) {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        lockState = onGroundContact(lockState);
        player.lockTimer = lockState.timer;
    } else {
        if (manual) lastActionWasRotate = false;
        lockState = clearLock(lockState);
        player.lockTimer = 0;
        if (manual) player.score += SOFT_DROP_POINT;
    }
    dropCounter = 0;
}

function endVersusMatch(title, eventType) {
    if (!opponentPlayActive() || isGameOver || scenarioResolved) return;
    opponent.gameOver = true;
    emitMatchEvent(eventType);
    if (hasScenarioOpponent()) {
        if (eventType === 'match-win') completeScenarioStage();
        else failScenarioStage(title);
    } else {
        showHighScoreModal(title);
    }
}

function runOpponentTurn() {
    if (!opponentPlayActive() || isGameOver || scenarioResolved || opponent.gameOver || !opponent.matrix) return;

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

function runOpponentTurnsAfterLock() {
    const turnLimit = gameMode === 'versus' ? 1
        : (hasScenarioOpponent() ? activeScenarioStage.opponentTurns : 0);
    let turnsRun = 0;
    while (turnsRun < turnLimit && !isGameOver && !scenarioResolved
        && !opponent.gameOver && opponent.matrix) {
        runOpponentTurn();
        turnsRun++;
    }
    return turnsRun;
}

function checkSprintCompletion() {
    if (gameMode !== 'sprint' || player.lines < SPRINT_TARGET_LINES) return false;
    showHighScoreModal('Sprint Complete!');
    return true;
}

function lockCurrentPiece() {
    const tSpin = detectTSpin({
        arena,
        player,
        lastActionWasRotate,
        usedKick: player.lastRotateUsedKick,
    });
    merge(arena, player);
    sounds.drop();
    arenaSweep(tSpin);
    updateScore();
    lockState = clearLock(lockState);
    player.lockTimer = 0;
    lastActionWasRotate = false;
    player.lastRotateUsedKick = false;

    if (!checkSprintCompletion()) {
        runOpponentTurnsAfterLock();
        if (!isGameOver) playerReset();
    }
}

function lockPiece() {
    lockCurrentPiece();
}

function playerHardDrop() {
    let cells = 0;
    while (true) {
        player.pos.y++;
        if (collide(arena, player)) {
            player.pos.y--;
            break;
        }
        cells++;
    }
    player.score += HARD_DROP_POINT * cells;
    lockCurrentPiece();
    dropCounter = 0;
}

function playerMove(dir) {
    lastActionWasRotate = false;
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
        return false;
    }
    sounds.move();
    refreshLockAfterMove();
    return true;
}

function playerReset() {
    const type = pieceQueue.next();
    player.matrix = createPiece(type);
    player.rotation = initialRotationFor(type);
    player.lastRotateUsedKick = false;
    syncPlayerNextPreview();

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);
    player.canHold = true;
    lockState = clearLock(lockState);
    player.lockTimer = 0;
    lastActionWasRotate = false;
    if (playerGarbageActive() && playerPendingGarbage > 0) {
        const incoming = playerPendingGarbage;
        playerPendingGarbage = 0;
        if (gameMode === 'scenario' && firewallCharges > 0) {
            firewallCharges--;
            lastEventMessage = 'FIREWALL BLOCK';
            eventMessageTimer = 2000;
            updateScore();
        } else if (applyPendingGarbage(arena, incoming, 'player')) {
            if (opponentPlayActive()) {
                const title = hasScenarioOpponent() ? 'SYSTEM OVERLOAD' : 'You Lose!';
                endVersusMatch(title, 'match-lose');
            } else if (activeScenarioStage?.kind === 'lines') {
                failScenarioStage('SYSTEM OVERLOAD');
            } else {
                showHighScoreModal();
            }
            return;
        }
    }
    if (collide(arena, player)) {
        if (opponentPlayActive()) {
            endVersusMatch('You Lose!', 'match-lose');
        } else if (gameMode === 'scenario' && activeScenarioStage?.kind === 'lines') {
            failScenarioStage('SYSTEM OVERLOAD');
        } else {
            showHighScoreModal();
        }
    }
    drawNext(nextPreviewMatrices());
}

function playerRotate(dir) {
    if (!player.matrix) return;
    const result = tryRotateSrs(arena, player, dir, collide);
    lastActionWasRotate = result.ok;
    if (!result.ok) return;
    sounds.rotate();
    refreshLockAfterMove();
}

function update(time = 0) {
    animationFrameId = null;
    if (isGameOver || isPaused) return;

    const deltaTime = time - lastTime;
    lastTime = time;
    const frameDt = Math.max(0, deltaTime);

    inputController.tick(frameDt, action => {
        if (canAcceptGameInput()) emitHorizontal(action);
    });

    elapsedTime += frameDt;
    if (eventMessageTimer > 0) {
        eventMessageTimer -= deltaTime;
        if (eventMessageTimer <= 0) lastEventMessage = '';
    }
    updateScenarioState(frameDt);
    if (scenarioResolved) return;

    const gravityInterval = inputController.isSoftDropping()
        ? dropInterval / 20
        : dropInterval;
    dropCounter += deltaTime;
    if (dropCounter > gravityInterval) {
        playerDrop(inputController.isSoftDropping());
    }

    if (player.matrix && pieceIsGrounded()) {
        lockState = onGroundContact(lockState);
        lockState = tickLock(lockState, frameDt);
        player.lockTimer = lockState.timer;
        if (lockState.shouldLock) {
            lockPiece();
        }
    } else if (lockState.active) {
        lockState = clearLock(lockState);
        player.lockTimer = 0;
    }

    if (comboTimer > 0) {
        comboTimer -= deltaTime;
        if (comboTimer <= 0) combo = 0;
    }

    updateScore();
    draw();
    drawOpponent();
    drawNext(nextPreviewMatrices());
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
    let waves = 0;
    while (scenarioHazardTimer <= 0 && waves < 3) {
        queueGarbageForPlayer(1);
        scenarioHazardTimer += activeScenarioStage.hazardIntervalMs;
        waves++;
    }
    if (scenarioHazardTimer < 0) scenarioHazardTimer = 0;
    if (waves > 0) {
        lastEventMessage = waves === 1 ? 'INTERFERENCE +1' : `INTERFERENCE +${waves}`;
        eventMessageTimer = 2000;
        updateScore();
    }
}

function completeScenarioStage() {
    if (gameMode !== 'scenario' || !activeScenarioStage || scenarioResolved
        || !Number.isFinite(elapsedTime) || elapsedTime < 0) return false;
    scenarioResolved = true;
    isGameOver = true;
    cancelScheduledUpdate();
    stopBGM();
    touchControls.hidden = true;
    const stageId = activeScenarioStage.id;
    const stars = starsForScenarioStage(activeScenarioStage, elapsedTime);
    const previous = scenarioProgress.results[stageId];
    const candidate = {
        ...scenarioProgress,
        results: {
            ...scenarioProgress.results,
            [stageId]: {
                stars: Math.max(previous?.stars || 0, stars),
                bestTimeMs: previous ? Math.min(previous.bestTimeMs, elapsedTime) : elapsedTime,
            },
        },
        upgrades: {...scenarioProgress.upgrades},
        unlockedStage: Math.max(scenarioProgress.unlockedStage, Math.min(5, stageId + 1)),
        pendingRewardStage: stageId === 5 ? null
            : previous ? scenarioProgress.pendingRewardStage : stageId,
        completed: scenarioProgress.completed || stageId === 5,
    };
    if (!writeScenarioProgress(candidate)) {
        showScenarioResult(false, 0, 'SAVE FAILED');
        scenarioResultDetail.textContent = 'Progress could not be saved. Check browser storage and retry.';
        scenarioResultMapBtn.style.display = 'none';
        return false;
    }
    scenarioProgress = candidate;
    showScenarioResult(true, stars);
    return true;
}

function failScenarioStage(title) {
    if (gameMode !== 'scenario' || !activeScenarioStage || scenarioResolved) return false;
    scenarioResolved = true;
    isGameOver = true;
    cancelScheduledUpdate();
    stopBGM();
    touchControls.hidden = true;
    showScenarioResult(false, 0, title);
    return true;
}

function showScenarioResult(success, stars = 0, failureTitle = 'SYSTEM OVERLOAD') {
    hideModalScreens();
    scenarioResultTitle.textContent = success ? 'STAGE CLEAR' : failureTitle;
    scenarioResultStars.textContent = success ? '★'.repeat(stars) : '';
    scenarioResultStars.setAttribute('aria-label', `${success ? stars : 0} of 3 stars`);
    scenarioResultDetail.textContent = success
        ? `${activeScenarioStage.name} · TIME ${formatElapsedTime(elapsedTime)}`
        : 'Retry Stage';
    scenarioRewardOpenBtn.style.display = success && scenarioProgress.pendingRewardStage !== null ? '' : 'none';
    scenarioResultMapBtn.style.display = '';
    scenarioResultScreen.style.display = 'block';
    openModal('scenario-result-title', scenarioRetryBtn);
}

function showScenarioReward() {
    if (!Number.isInteger(scenarioProgress.pendingRewardStage)) return false;
    scenarioRewardError.textContent = '';
    const buttons = SCENARIO_UPGRADES.map(upgrade => {
        const stack = scenarioProgress.upgrades[upgrade.id];
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.scenarioUpgrade = upgrade.id;
        button.dataset.stack = stack;
        button.disabled = stack >= 4;
        button.textContent = `${upgrade.name}\n${upgrade.description}\n${button.disabled ? 'MAX' : `CURRENT ${stack} / 4`}`;
        button.addEventListener('click', () => chooseScenarioUpgrade(upgrade.id));
        return button;
    });
    scenarioRewardOptions.replaceChildren(...buttons);
    hideModalScreens();
    scenarioRewardScreen.style.display = 'block';
    openModal('scenario-reward-title', buttons.find(button => !button.disabled) || buttons[0]);
    return true;
}

function chooseScenarioUpgrade(id) {
    if (!Number.isInteger(scenarioProgress.pendingRewardStage)
        || scenarioProgress.pendingRewardStage < 1 || scenarioProgress.pendingRewardStage > 4
        || !SCENARIO_UPGRADES.some(upgrade => upgrade.id === id)
        || scenarioProgress.upgrades[id] >= 4) return false;
    const candidate = {
        ...scenarioProgress,
        results: {...scenarioProgress.results},
        upgrades: {...scenarioProgress.upgrades, [id]: scenarioProgress.upgrades[id] + 1},
        pendingRewardStage: null,
    };
    if (!writeScenarioProgress(candidate)) {
        scenarioRewardError.textContent = 'Progress could not be saved. Try again.';
        return false;
    }
    scenarioProgress = candidate;
    selectedScenarioStageId = scenarioProgress.unlockedStage;
    showScenarioMap();
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
    scenarioContinueDetail.textContent = scenarioProgress.pendingRewardStage !== null
        ? `UPGRADE READY · STAGE ${String(scenarioProgress.pendingRewardStage).padStart(2, '0')}`
        : scenarioProgress.completed
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
scenarioRewardOpenBtn.addEventListener('click', showScenarioReward);
scenarioResetBtn.addEventListener('click', () => {
    if (!window.confirm('Neon Circuit 진행도를 초기화하시겠습니까?')) return;
    const candidate = createScenarioProgress();
    if (!writeScenarioProgress(candidate)) {
        scenarioResetError.textContent = 'New Campaign could not be saved. Check browser storage and try again.';
        return;
    }
    scenarioProgress = candidate;
    scenarioResetError.textContent = '';
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

function bindTouchHorizontal(id, action) {
    const button = document.getElementById(id);
    const release = () => inputController.release(action);
    button.addEventListener('pointerdown', event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        if (canAcceptGameInput()) inputController.press(action, emitHorizontal);
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
}

bindTouchHorizontal('touch-left', 'moveLeft');
bindTouchHorizontal('touch-right', 'moveRight');

const touchSoftDrop = document.getElementById('touch-down');
const releaseTouchSoftDrop = () => inputController.release('softDrop');
touchSoftDrop.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (canAcceptGameInput()) inputController.press('softDrop');
});
touchSoftDrop.addEventListener('pointerup', releaseTouchSoftDrop);
touchSoftDrop.addEventListener('pointerleave', releaseTouchSoftDrop);
touchSoftDrop.addEventListener('pointercancel', releaseTouchSoftDrop);

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
    if (!opponentPlayActive()) return;
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
    if (!opponentPlayActive()) return;
    opponent.matrix = createPiece(nextOpponentPieceType());
    opponent.next = createPiece(nextOpponentPieceType());
    opponent.pos = {
        x: (VERSUS_WIDTH / 2 | 0) - (opponent.matrix[0].length / 2 | 0),
        y: 0,
    };
}

function resetGameState() {
    arena.forEach(row => row.fill(0));
    pieceQueue.reset();
    inputController.reset();
    lockState = createLockState(settings.timing.lockDelay);
    player.pos = {x: 0, y: 0};
    player.matrix = null;
    player.next = null;
    player.hold = null;
    player.holdRotation = 0;
    player.canHold = true;
    player.score = 0;
    player.level = 1;
    player.lines = 0;
    player.rotation = 0;
    player.lastRotateUsedKick = false;
    player.lockDelay = settings.timing.lockDelay;
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
    firewallCharges = gameMode === 'scenario'
        ? scenarioUpgradeEffects(scenarioProgress.upgrades).firewallCharges : 0;
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
    const currentRotation = player.rotation ?? 0;
    if (player.hold === null) {
        player.hold = currentPiece;
        player.holdRotation = currentRotation;
        playerReset();
    } else {
        const holdPiece = player.hold;
        const holdRotation = player.holdRotation ?? 0;
        player.hold = currentPiece;
        player.holdRotation = currentRotation;
        player.matrix = holdPiece.map(row => [...row]);
        player.rotation = holdRotation;
        player.lastRotateUsedKick = false;
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
        lockState = clearLock(lockState);
        player.lockTimer = 0;
        if (collide(arena, player)) {
            if (opponentPlayActive()) {
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

    const action = actionForCode(event.code);
    if (!action) return;

    if (action === 'pause') {
        event.preventDefault();
        togglePause();
        return;
    }

    if (!canAcceptGameInput()) return;

    event.preventDefault();
    if (event.repeat && (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop')) {
        return;
    }

    if (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop') {
        if (!event.repeat) inputController.press(action, emitHorizontal);
        return;
    }
    if (event.repeat) return;

    if (action === 'hardDrop') playerHardDrop();
    else if (action === 'rotateCW') playerRotate(1);
    else if (action === 'rotateCCW') playerRotate(-1);
    else if (action === 'rotate180') {
        playerRotate(1);
        playerRotate(1);
    } else if (action === 'hold') playerHold();
    else if (action === 'quit') quitGame();
});

document.addEventListener('keyup', event => {
    if (isEditableTarget(event.target)) return;
    const action = actionForCode(event.code);
    if (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop') {
        inputController.release(action);
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
    arena, player, opponent, pieceQueue, inputController,
    gameOverTitleElement, gameOverScreen, startScreen, pauseScreen, modalOverlay,
    calculateGarbageAttack, scoreLines, createPiece, createMatrix,
    chooseOpponentMove, evaluateOpponentBoard, nextPieceType, initialRotationFor,
    detectTSpin, isPerfectClear, tryRotateSrs,
    endVersusMatch, resetGameState, clearFullRows, addGarbageLines,
    collide, merge, rotate,
    nextOpponentPieceType, resetOpponentState, arenaSweep,
    readLeaderboard, writeLeaderboard, renderLeaderboard,
    shuffleBag, emitMatchEvent, playerReset, playerHold, playerMove,
    playerRotate, playerDrop, playerHardDrop, lockPiece, lockCurrentPiece,
    queueGarbageForOpponent, queueGarbageForPlayer, runOpponentTurn, runOpponentTurnsAfterLock,
    checkSprintCompletion, showHighScoreModal, showStartScreen, showPauseScreen, exitApplication,
    togglePause, quitGame, returnToMenu, selectGameMode, canAcceptGameInput, update, formatElapsedTime,
    createScenarioProgress, readScenarioProgress, writeScenarioProgress, renderScenarioMap,
    showScenarioMap, showScenarioBriefing, startScenarioStage, canPlayScenarioStage,
    completeScenarioLineProgress, updateScenarioState, completeScenarioStage,
    failScenarioStage, showScenarioResult, showScenarioReward, chooseScenarioUpgrade,
    leaveScenarioForMap, playerGarbageActive, hasScenarioOpponent,
    opponentPlayActive, scenarioUpgradeEffects,
    themeMelody, themeMelodyName,
    isBgmRunning: isBGMRunning,
    PIECE_TYPES, SPRINT_TARGET_LINES, VERSUS_WIDTH, VERSUS_HEIGHT, MAX_PENDING_GARBAGE,
    SOFT_DROP_POINT, HARD_DROP_POINT,
    SCENARIO_STAGES, SCENARIO_UPGRADES, starsForScenarioStage,
};
//Live-bound scalar state: tests read these via window.<name> and mutate them too.
const liveState = {
    isGameOver: [() => isGameOver, (v) => { isGameOver = v; }],
    isPaused: [() => isPaused, (v) => { isPaused = v; }],
    combo: [() => combo, (v) => { combo = v; }],
    comboTimer: [() => comboTimer, (v) => { comboTimer = v; }],
    backToBackActive: [() => backToBackActive, (v) => { backToBackActive = v; }],
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
    lockState: [() => lockState, (v) => { lockState = v; }],
    settings: [() => settings, (v) => { settings = v; }],
    lastActionWasRotate: [() => lastActionWasRotate, (v) => { lastActionWasRotate = v; }],
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

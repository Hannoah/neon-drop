import {t, setLanguage, getLanguage} from './src/js/i18n.js';
import {applyTranslations, setText, scenarioCopy, translateEvent} from './src/js/ui.js';
import {
    PIECE_TYPES,
    PIECE_COLORS,
    SPRINT_TARGET_LINES,
    MARATHON_TARGET_LEVEL,
    MARATHON_CLEAR_BONUS,
    VERSUS_WIDTH,
    VERSUS_HEIGHT,
    MAX_PENDING_GARBAGE,
    SOFT_DROP_POINT,
    HARD_DROP_POINT,
} from './src/js/constants.js';
import { mulberry32, dailySeed, dateKeyUTC } from './src/js/rng.js';
import {
    readMeta,
    writeMeta,
    recordRun,
    noteTetris,
    noteCombo,
    noteRunEnd,
    markTutorialDone,
    paceValueAt,
    FRAME_UNLOCKS,
    CLEAR_UNLOCKS,
} from './src/js/meta.js';
import {
    shuffleBag,
    createBagFactory,
    clearFullRows,
    addGarbageLines,
    collide,
    createMatrix,
    createPiece,
    rotate,
    merge,
    isEditableTarget,
    formatElapsedTime,
    pieceTypeFromMatrix,
    initialRotationFor,
    hasGarbage,
} from './src/js/board.js';
import {
    calculateGarbageAttack,
    eventMessageFor,
    buildScoreResult,
    qualifiesForBackToBack,
    detectTSpin,
    isPerfectClear,
    comboAfterLock,
} from './src/js/scoring.js';
import { evaluateOpponentBoard, chooseOpponentMove } from './src/js/ai.js';
import { createAudioSystem, themeMelody, themeMelodyName } from './src/js/audio.js';
import { createRenderer, expireFlashingLines } from './src/js/renderer.js';
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
import { tryRotateSrs, tryRotate180 } from './src/js/srs.js';
import {
    createLockState,
    onGroundContact,
    onSuccessfulMove,
    tickLock,
    clearLock,
} from './src/js/lock.js';
import { createInputController } from './src/js/input.js';
import { isInstantGravity } from './src/js/gravity.js';
import {
    formatRunGrade,
    formatUnlocks,
    controlLegendRows,
    dailyCardDetail,
    msUntilNextUtcDay,
    fanfareKind,
} from './src/js/juice.js';
import {
    normalizeSettings,
    DEFAULT_SETTINGS,
    applyPreset,
    assignBinding,
} from './src/js/settings.js';
import { createParticleSystem } from './src/js/particles.js';
import { createModalManager, trapFocus } from './src/js/modal.js';

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
const menuTutorialBtn = document.getElementById('menu-tutorial-btn');
const firstRunNudge = document.getElementById('first-run-nudge');
const firstRunTutorialBtn = document.getElementById('first-run-tutorial-btn');
const playModeHint = document.getElementById('play-mode-hint');
const pauseControls = document.getElementById('pause-controls');
const unlockToast = document.getElementById('unlock-toast');
const pbSummary = document.getElementById('pb-summary');
const paceGhostElement = document.getElementById('pace-ghost');
const runGradeElement = document.getElementById('run-grade');
const cosmeticFrames = document.getElementById('cosmetic-frames');
const cosmeticClears = document.getElementById('cosmetic-clears');
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
const pauseGameBtn = document.getElementById('pause-game-btn');
const pauseScreen = document.getElementById('pause-screen');
const resumeGameBtn = document.getElementById('resume-game-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const pauseSettingsBtn = document.getElementById('pause-settings-btn');
const quitToMenuBtn = document.getElementById('quit-to-menu-btn');
const quitConfirmScreen = document.getElementById('quit-confirm-screen');
const quitConfirmYesBtn = document.getElementById('quit-confirm-yes-btn');
const quitConfirmNoBtn = document.getElementById('quit-confirm-no-btn');
const settingsScreen = document.getElementById('settings-screen');
const settingsLanguage = document.getElementById('settings-language');
const menuSettingsBtn = document.getElementById('menu-settings-btn');
const settingsBackBtn = document.getElementById('settings-back-btn');
const settingsResetBtn = document.getElementById('settings-reset-btn');
const presetClassicRadio = document.getElementById('preset-classic');
const presetGuidelineRadio = document.getElementById('preset-guideline');
const settingsDas = document.getElementById('settings-das');
const settingsArr = document.getElementById('settings-arr');
const settingsLockDelay = document.getElementById('settings-lock-delay');
const settingsDasValue = document.getElementById('settings-das-value');
const settingsArrValue = document.getElementById('settings-arr-value');
const settingsLockDelayValue = document.getElementById('settings-lock-delay-value');
const rebindButtons = [...document.querySelectorAll('[data-rebind]')];
const gameModeSelect = document.getElementById('game-mode');
const modeElement = document.getElementById('mode');
const timerElement = document.getElementById('timer');
const comboElement = document.getElementById('combo');
const backToBackElement = document.getElementById('back-to-back');
const flowRow = document.getElementById('flow-row');
const flowValueElement = document.getElementById('flow-value');
const flowMeterFill = document.getElementById('flow-meter-fill');
const eventMessageElement = document.getElementById('event-message');
const clearRewardElement = document.getElementById('clear-reward');
let clearRewardTimer = 0;
const gameOverMenuBtn = document.getElementById('game-over-menu-btn');
const playAgainBtn = document.getElementById('play-again-btn');
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
    'touch-180': () => {
        if (!player.matrix) return;
        const result = tryRotate180(arena, player, collide);
        lastActionWasRotate = result.ok;
        if (result.ok) {
            sounds.rotate();
            refreshLockAfterMove();
        }
    },
    'touch-drop': () => playerHardDrop(),
    'touch-hold': () => playerHold(),
};

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
/** @type {null | {tSpin: string, rowCount: number, ys: number[], life: number}} */
let pendingClear = null;
let runStatsSaved = false;
let gameMode = 'marathon';
let elapsedTime = 0;
let backToBackActive = false;
let b2bChain = 0;
let flowMeter = 0;
let meta = readMeta();
let paceSamples = [];
let lastPaceSampleAt = 0;
let tutorialStep = 0;
let activeSeed = null;
const RANKED_MODES = new Set(['marathon', 'sprint', 'ultra', 'versus', 'daily', 'cheese', 'invisible', 'twentyg', 'tutorial']);
const MODE_LABELS = {
    sprint: 'Sprint',
    ultra: 'Ultra',
    versus: 'Versus AI',
    scenario: 'Circuit',
    daily: 'Daily',
    cheese: 'Cheese',
    invisible: 'Invisible',
    twentyg: '20G',
    tutorial: 'Tutorial',
    marathon: 'Marathon',
};
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
let previousFocus = null;
let settingsReturnScreen = 'start';
let rebindingAction = null;

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

const particles = createParticleSystem();

const renderer = createRenderer({
    canvas, context, nextCanvas, nextContext, holdCanvas, holdContext,
    opponentCanvas, opponentContext, VERSUS_WIDTH, VERSUS_HEIGHT,
    setShakeTime: value => { shakeTime = value; },
    getState: () => ({
        shakeTime, arena, player, combo, flashingLines, particles,
        opponentActive: opponentPlayActive(), opponent,
        invisibleStack: gameMode === 'invisible',
    }),
});
const {draw, drawNext, drawHold, drawOpponent} = renderer;

function screenShake(intensity = 5) {
    shakeTime = intensity;
}

function canAcceptGameInput() {
    return Boolean(player.matrix) && !isPaused && !isGameOver;
}

function canPauseGame() {
    return !isGameOver && (Boolean(player.matrix) || Boolean(pendingClear));
}

function selectGameMode(mode) {
    gameModeSelect.value = mode;
    modeCards.forEach(card => {
        card.setAttribute('aria-pressed', String(card.dataset.mode === mode));
    });
    if (playModeHint) playModeHint.textContent = t(MODE_LABELS[mode] || 'Marathon');
    updateLeaderboard();
}

function formatPbTime(ms) {
    if (!Number.isFinite(ms)) return '—';
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function refreshPbSummary() {
    if (!pbSummary) return;
    const key = dateKeyUTC();
    const daily = meta.pb.daily?.dateKey === key ? meta.pb.daily : null;
    pbSummary.textContent = [
        t('Sprint PB {time}{grade}', {time: formatPbTime(meta.pb.sprintMs), grade: meta.pb.sprintGrade ? ` ${meta.pb.sprintGrade}` : ''}),
        t('Marathon PB {time}{grade}', {time: formatPbTime(meta.pb.marathonMs), grade: meta.pb.marathonGrade ? ` ${meta.pb.marathonGrade}` : ''}),
        t('Daily {date}{streak} {record}', {date: key, streak: meta.stats.dailyStreak ? t(' STREAK {count}', {count: meta.stats.dailyStreak}) : '', record: daily ? `${formatPbTime(daily.ms)} ${daily.grade || ''}`.trim() : '—'}),
    ].join(' · ');

    const dailyCard = document.querySelector('[data-mode-card="daily"] span');
    if (dailyCard) {
        dailyCard.textContent = dailyCardDetail({
            dateKey: key,
            streak: meta.stats.dailyStreak || 0,
            msLeft: msUntilNextUtcDay(),
        });
    }
}

function applyCosmetics() {
    gameContainer.classList.remove('frame-gold', 'frame-rival', 'frame-mint', 'clear-flare', 'clear-pulse');
    const frame = FRAME_UNLOCKS[meta.unlocks.selectedFrame];
    const clearFx = CLEAR_UNLOCKS[meta.unlocks.selectedClear];
    if (frame?.css) gameContainer.classList.add(frame.css);
    if (clearFx?.css) gameContainer.classList.add(clearFx.css);
}

function renderCosmeticPickers() {
    if (!cosmeticFrames || !cosmeticClears) return;
    const frameHtml = meta.unlocks.frames.map(id => {
        const item = FRAME_UNLOCKS[id];
        const checked = meta.unlocks.selectedFrame === id ? 'checked' : '';
        return `<label><input type="radio" name="cosmetic-frame" value="${id}" ${checked}> ${t(item.name)}</label>`;
    }).join('');
    const clearHtml = meta.unlocks.clears.map(id => {
        const item = CLEAR_UNLOCKS[id];
        const checked = meta.unlocks.selectedClear === id ? 'checked' : '';
        return `<label><input type="radio" name="cosmetic-clear" value="${id}" ${checked}> ${t(item.name)}</label>`;
    }).join('');
    cosmeticFrames.innerHTML = frameHtml || '<span style="color:var(--muted)">Ink</span>';
    cosmeticClears.innerHTML = clearHtml || '<span style="color:var(--muted)">Mint</span>';
}

function punchClear(rows) {
    const stage = document.querySelector('#player-panel .board-stage');
    if (stage) {
        stage.classList.remove('clear-punch');
        void stage.offsetWidth;
        stage.classList.add('clear-punch');
        window.setTimeout(() => stage.classList.remove('clear-punch'), 280);
    }
    if (rows >= 3) sounds.stinger?.();
}

function modeLineGoal() {
    if (gameMode === 'sprint' || gameMode === 'daily' || gameMode === 'invisible') return SPRINT_TARGET_LINES;
    if (gameMode === 'twentyg') return 20;
    return null;
    return null;
}

function configureRunSeedAndQueue() {
    activeSeed = null;
    if (gameMode === 'daily') {
        activeSeed = dailySeed();
        pieceQueue.setBagFactory(createBagFactory(mulberry32(activeSeed)));
    } else {
        pieceQueue.setBagFactory(shuffleBag);
    }
    pieceQueue.reset();
}

function tutorialObjectiveText() {
    if (tutorialStep <= 0) return t('TUTORIAL · Clear 1 line');
    if (tutorialStep === 1) return t('TUTORIAL · Clear a Double+');
    if (tutorialStep === 2) return t('TUTORIAL · Use Hold ({key})', {key: bindingLabel(settings.bindings.hold)});
    return t('TUTORIAL · Done');
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
    setLanguage(settings.language);
    inputController.setTiming(settings.timing);
    player.lockDelay = settings.timing.lockDelay;
    if (lockState.active) {
        // Keep active lock timer/resets; only adopt the new delay for future resets.
        lockState = {...lockState, lockDelay: settings.timing.lockDelay};
        player.lockTimer = lockState.timer;
    } else {
        lockState = createLockState(settings.timing.lockDelay);
        player.lockTimer = 0;
    }
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
    if (RANKED_MODES.has(settings.mode)) {
        gameModeSelect.value = settings.mode;
    }
    bgmToggle.checked = settings.bgm;
    sfxToggle.checked = settings.sfx;
    selectGameMode(gameModeSelect.value);
}

const modalManager = createModalManager({ modalOverlay, gameContainer, touchControls });
const { openModal, closeModal, restorePreviousFocus } = modalManager;

function settingsScreenOpen() {
    return settingsScreen.style.display !== 'none';
}

function bindingLabel(codes) {
    return codes.length ? codes.join(', ') : '—';
}

function cancelRebind() {
    rebindingAction = null;
    rebindButtons.forEach(button => {
        button.setAttribute('aria-pressed', 'false');
    });
}

function syncSettingsUI() {
    settingsLanguage.value = settings.language;
    presetClassicRadio.checked = settings.preset === 'classic';
    presetGuidelineRadio.checked = settings.preset === 'guideline';
    settingsDas.value = String(settings.timing.das);
    settingsArr.value = String(settings.timing.arr);
    settingsLockDelay.value = String(settings.timing.lockDelay);
    settingsDasValue.textContent = String(settings.timing.das);
    settingsArrValue.textContent = String(settings.timing.arr);
    settingsLockDelayValue.textContent = String(settings.timing.lockDelay);
    rebindButtons.forEach(button => {
        const action = button.dataset.rebind;
        const capturing = rebindingAction === action;
        button.setAttribute('aria-pressed', String(capturing));
        button.textContent = capturing
            ? t('Press a key…')
            : bindingLabel(settings.bindings[action] ?? []);
    });
}

function persistSettings(next = settings) {
    applyLiveSettings(next);
    syncSettingsUI();
    writePreferences();
}

function showSettings(returnScreen = 'start') {
    settingsReturnScreen = returnScreen;
    cancelRebind();
    hideModalScreens();
    settingsScreen.style.display = 'block';
    syncSettingsUI();
    renderCosmeticPickers();
    openModal('settings-screen-title', settingsBackBtn);
}

function closeSettings() {
    cancelRebind();
    hideModalScreens();
    if (settingsReturnScreen === 'pause') {
        pauseScreen.style.display = 'block';
        openModal('pause-screen-title', pauseSettingsBtn);
        return;
    }
    startScreen.style.display = 'block';
    openModal('start-screen-title', menuSettingsBtn);
}

function hideModalScreens() {
    startScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    settingsScreen.style.display = 'none';
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
            ? t('STAGE {stage}\n{name}\n{rival}\n{stars}', {stage: String(stage.id).padStart(2, '0'), name: t(stage.name), rival: stage.rival, stars: starsLabel})
            : t('STAGE {stage}\nLOCKED', {stage: String(stage.id).padStart(2, '0')});
        button.setAttribute('aria-label', unlocked
            ? t('Stage {stage}, {name}, rival {rival}, {stars} of 3 stars', {stage: String(stage.id).padStart(2, '0'), name: t(stage.name), rival: stage.rival, stars})
            : t('Stage {stage}, {name}, locked', {stage: String(stage.id).padStart(2, '0'), name: t(stage.name)}));
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
    const copy = scenarioCopy(stage);
    const result = scenarioProgress.results[stage.id];
    scenarioStageRival.textContent = t('RIVAL · {rival}', {rival: stage.rival});
    scenarioStageName.textContent = t('STAGE {stage} · {name}', {stage: String(stage.id).padStart(2, '0'), name: t(stage.name)});
    scenarioStageObjective.textContent = copy.objective;
    scenarioStageModifier.textContent = copy.modifier;
    scenarioStageBest.textContent = t('BEST {time}', {time: result ? formatElapsedTime(result.bestTimeMs) : '--:--'});
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
    const copy = scenarioCopy(stage);
    scenarioBriefingRival.textContent = stage.rival;
    scenarioBriefingName.textContent = t(stage.name);
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
    opponentPanel.style.display = stage.kind === 'opponent' ? 'flex' : 'none';
    gameContainer.classList.toggle('versus-active', stage.kind === 'opponent');
    gameContainer.classList.remove('play-enter');
    void gameContainer.offsetWidth;
    gameContainer.classList.add('play-enter');
    modalOverlay.classList.remove('menu-enter');
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
    if (quitConfirmScreen) quitConfirmScreen.style.display = 'none';
    resetGameState();
    activeScenarioStage = null;
    showStartScreen();
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
    if (action === 'moveLeft') return playerMove(-1);
    if (action === 'moveRight') return playerMove(1);
    return false;
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
    if (gameMode === 'twentyg') return 1;
    const stepMs = gameMode === 'scenario' && activeScenarioStage
        ? activeScenarioStage.dropStepMs
        : (gameMode === 'marathon' ? 70 : 100);
    const startMs = gameMode === 'marathon' ? 1100 : 1000;
    const floorMs = gameMode === 'marathon' ? 140 : 100;
    let base = Math.max(floorMs, startMs - (player.level - 1) * stepMs);
    // Marathon phase storm: snappier gravity from level 10.
    if (gameMode === 'marathon' && player.level >= 10) base = Math.max(floorMs, Math.round(base * 0.85));
    const multiplier = gameMode === 'scenario'
        ? scenarioUpgradeEffects(scenarioProgress.upgrades).dropIntervalMultiplier : 1;
    return Math.round(base * multiplier);
}

function triggerMarathonPhases(prevLevel, nextLevel) {
    if (gameMode !== 'marathon' || nextLevel <= prevLevel) return null;
    if (prevLevel < 5 && nextLevel >= 5) {
        flowMeter = Math.min(100, flowMeter + 20);
        sounds.stinger?.();
        return 'PHASE · EDGE';
    }
    if (prevLevel < 10 && nextLevel >= 10) {
        addGarbageLines(arena, 2);
        sounds.stinger?.();
        screenShake(5);
        return 'PHASE · STORM';
    }
    return null;
}

/** Marathon streak spice — milestone clear bonuses (scaled by level). */
function marathonComboRushBonus(comboValue, level) {
    if (comboValue === 3) return 250 * level;
    if (comboValue === 5) return 600 * level;
    if (comboValue === 8) return 1400 * level;
    if (comboValue === 10) return 2400 * level;
    if (comboValue >= 12 && comboValue % 2 === 0) return 900 * level;
    return 0;
}

/** Extra payout for Double / Triple / Tetris so multi-line clears feel rewarding. */
function multiClearBounty(rowCount, level) {
    const table = [0, 0, 120, 280, 600];
    return (table[rowCount] ?? 0) * level;
}

function showClearReward(points, rowCount, kind = 'clear') {
    if (!clearRewardElement || points <= 0 || rowCount <= 0) return;
    clearRewardElement.hidden = false;
    clearRewardElement.dataset.tier = String(Math.min(4, rowCount));
    clearRewardElement.dataset.kind = kind;
    clearRewardElement.textContent = kind === 'perfect' ? 'PERFECT'
        : kind === 'tetris' ? 'TETRIS'
        : kind === 'tspin' ? (lastEventMessage || 'T-SPIN')
        : kind === 'combo' ? (combo >= 2 ? `COMBO x${combo}` : `+${points}`)
        : `+${points}`;
    clearRewardElement.textContent = translateEvent(clearRewardElement.textContent);
    clearRewardElement.classList.remove('is-on');
    void clearRewardElement.offsetWidth;
    clearRewardElement.classList.add('is-on');
    clearRewardTimer = 900;
}

function marathonFlowMultiplier() {
    return 1 + Math.floor(Math.max(0, Math.min(100, flowMeter)) / 50) * 0.25;
}

function bumpMarathonFlow(rowCount) {
    if (gameMode !== 'marathon' || rowCount <= 0) return;
    flowMeter = Math.min(100, flowMeter + 10 + rowCount * 8 + Math.min(16, combo * 2));
}

function drainMarathonFlow(amount = 28) {
    if (gameMode !== 'marathon') return;
    flowMeter = Math.max(0, flowMeter - amount);
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
    const prevLevel = player.level;

    if (qualifies) {
        backToBackActive = true;
        b2bChain = hadBackToBack ? b2bChain + 1 : 1;
    } else if (rowCount > 0) {
        backToBackActive = false;
        b2bChain = 0;
    }

    let phaseEvent = null;
    if (rowCount > 0) {
        combo = comboAfterLock(combo, rowCount);
        // Piece-based combo: stays until a lock with no clear (no wall-clock expiry).
        comboTimer = 0;
        player.lines += rowCount;
        player.level = Math.floor(player.lines / 10) + 1;
        phaseEvent = triggerMarathonPhases(prevLevel, player.level);
        dropInterval = scenarioDropInterval();
        completeScenarioLineProgress(rowCount);
        bumpMarathonFlow(rowCount);
        meta = noteCombo(meta, combo);
        if (rowCount === 4) {
            const tetrisNote = noteTetris(meta);
            meta = tetrisNote.meta;
            if (tetrisNote.unlocks.length) {
                writeMeta(meta);
                showUnlockToast(tetrisNote.unlocks);
            }
        }
        if (gameMode === 'tutorial') {
            if (tutorialStep === 0 && rowCount >= 1) tutorialStep = 1;
            else if (tutorialStep === 1 && rowCount >= 2) tutorialStep = 2;
        }
    } else {
        combo = comboAfterLock(combo, 0);
    }

    const {points, attack} = buildScoreResult({
        rowCount, tSpin, perfectClear, hadBackToBack, level: player.level, comboValue: combo,
    });
    // Marathon: double the usual combo table bonus + milestone rush payouts.
    const marathonComboExtra = gameMode === 'marathon' && rowCount > 0
        ? Math.max(0, combo - 1) * 50 * player.level
        : 0;
    const rushBonus = gameMode === 'marathon' && rowCount > 0
        ? marathonComboRushBonus(combo, player.level) : 0;
    const b2bChainBonus = gameMode === 'marathon' && rowCount > 0 && b2bChain >= 2
        ? 200 * b2bChain * player.level : 0;
    const multiBonus = rowCount >= 2 ? multiClearBounty(rowCount, player.level) : 0;
    const leveledUp = rowCount > 0 && player.level > prevLevel;
    const levelBonus = leveledUp ? 400 * player.level : 0;
    const flowMult = gameMode === 'marathon' && rowCount > 0 ? marathonFlowMultiplier() : 1;
    const upgradeEffects = gameMode === 'scenario'
        ? scenarioUpgradeEffects(scenarioProgress.upgrades) : null;
    const awarded = Math.round(
        (points + marathonComboExtra + rushBonus + b2bChainBonus + multiBonus) * flowMult
        + levelBonus,
    );
    player.score += upgradeEffects ? Math.round(awarded * upgradeEffects.scoreMultiplier) : awarded;
    // Pulse Amp: outgoing garbage bonus only when attack > 0.
    queueGarbageForOpponent(attack > 0 ? attack + (upgradeEffects?.outgoingGarbageBonus || 0) : 0);

    let event = eventMessageFor(rowCount, tSpin, perfectClear);
    if (phaseEvent) {
        event = phaseEvent;
        eventMessageTimer = 2400;
    } else if (leveledUp) {
        event = `LEVEL ${player.level}`;
        screenShake(5);
    } else if (rushBonus > 0) {
        event = `COMBO RUSH x${combo}`;
        if (combo >= 5) screenShake(4 + Math.min(6, combo));
    } else if (flowMeter >= 100 && rowCount > 0 && gameMode === 'marathon') {
        event = event ? `${event} · FLOW MAX` : 'FLOW MAX';
    } else if (b2bChain >= 2 && rowCount > 0) {
        event = event ? `${event} · B2B x${b2bChain}` : `B2B x${b2bChain}`;
    } else if (rowCount > 0 && combo >= 2) {
        event = event ? `${event} · x${combo}` : `COMBO x${combo}`;
    }
    if (rowCount >= 2 && awarded > 0 && !leveledUp && rushBonus <= 0) {
        event = event ? `${event} · +${awarded}` : `+${awarded}`;
    }
    lastEventMessage = event;
    if (!phaseEvent) {
        eventMessageTimer = leveledUp || rushBonus > 0 || rowCount >= 3 ? 2400 : 2000;
    }
    const kind = fanfareKind({rowCount, tSpin, perfectClear, combo});
    sounds.fanfare?.(kind, {combo});
    if (rowCount > 0 && (kind === 'perfect' || kind === 'combo' || kind === 'clear')) {
        showClearReward(awarded, rowCount, kind);
    }
    if (perfectClear) {
        particles.spawnSpecialBurst(VERSUS_WIDTH / 2, VERSUS_HEIGHT / 2, '#FF6A3D', 40);
    }
    if (leveledUp) {
        sounds.levelUp?.();
    }
    updateScore();
    return player.score;
}

function fullRowIndices(board) {
    const ys = [];
    for (let y = board.length - 1; y >= 0; --y) {
        if (board[y].every(cell => cell !== 0)) ys.push(y);
    }
    return ys;
}

function removeRowsByIndex(board, ys) {
    if (!ys.length) return;
    const drop = new Set(ys);
    const width = board[0].length;
    const height = board.length;
    const kept = [];
    for (let y = 0; y < height; y++) {
        if (!drop.has(y)) kept.push(board[y]);
    }
    while (kept.length < height) {
        kept.unshift(new Array(width).fill(0));
    }
    for (let y = 0; y < height; y++) {
        board[y] = kept[y];
    }
}

function clearFlashPeak(rowCount) {
    return 260 + rowCount * 40;
}

function beginClearFlash(ys, rowCount) {
    const peak = clearFlashPeak(rowCount);
    flashingLines = ys.map(y => ({y, time: peak, peak}));
    return peak;
}

function resolvePendingClear() {
    if (!pendingClear) return 0;
    const {tSpin, rowCount, ys} = pendingClear;
    pendingClear = null;
    removeRowsByIndex(arena, ys);
    flashingLines = [];
    const perfectClear = isPerfectClear(arena);
    scoreLines(rowCount, tSpin, perfectClear);
    return rowCount;
}

function finishLockAfterSweep() {
    if (!checkSprintCompletion() && !checkMarathonCompletion()
        && !checkCheeseCompletion() && !checkTutorialCompletion()) {
        runOpponentTurnsAfterLock();
        if (!isGameOver) playerReset();
    }
}

/** Test / sync helper: finish a deferred clear immediately. */
function flushPendingClear() {
    if (!pendingClear) return false;
    resolvePendingClear();
    finishLockAfterSweep();
    return true;
}

/**
 * Clear full rows. Pass `{ defer: true }` from piece lock so the flash plays
 * on still-visible lines before rows are removed (avoids wrong-Y flash after splice).
 */
function arenaSweep(tSpinOrPivot = 'none', options = {}) {
    const tSpin = normalizeTSpinArg(tSpinOrPivot);
    const defer = Boolean(options && options.defer);
    const ys = fullRowIndices(arena);
    const rowCount = ys.length;

    if (rowCount === 0) {
        if (tSpin !== 'none') {
            scoreLines(0, tSpin, false);
        } else {
            combo = 0;
            b2bChain = 0;
            drainMarathonFlow(28);
            lastEventMessage = '';
            eventMessageTimer = 0;
            updateScore();
        }
        return 0;
    }

    if (pendingClear) resolvePendingClear();

    const peak = beginClearFlash(ys, rowCount);
    for (const y of ys) {
        particles.spawnLineClear(y, arena[y]);
    }
    sounds.clear(rowCount);
    punchClear(rowCount);
    const flashKind = fanfareKind({rowCount, tSpin, perfectClear: false, combo});
    if (flashKind === 'tetris' || flashKind === 'tspin') {
        showClearReward(1, rowCount, flashKind);
    }
    if (tSpin !== 'none') {
        particles.spawnSpecialBurst(player.pos.x + 1.5, player.pos.y + 1.5, '#E06B7A', 25);
    } else if (rowCount === 4) {
        particles.spawnSpecialBurst(VERSUS_WIDTH / 2, ys[1] !== undefined ? ys[1] : 10, '#5BA4D9', 30);
    }
    if (rowCount >= 2) screenShake(2 + rowCount * 1.5);

    if (defer) {
        pendingClear = {tSpin, rowCount, ys: ys.slice(), life: peak};
        return rowCount;
    }

    removeRowsByIndex(arena, ys);
    const perfectClear = isPerfectClear(arena);
    scoreLines(rowCount, tSpin, perfectClear);
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

function finishRankedRun(title, {awardClearBonus = false} = {}) {
    if (awardClearBonus) {
        player.score += MARATHON_CLEAR_BONUS;
        lastEventMessage = 'MARATHON CLEAR';
        eventMessageTimer = 2500;
        updateScore();
        screenShake(8);
    }
    if (gameMode === 'tutorial') {
        meta = markTutorialDone(meta);
        writeMeta(meta);
        applyCosmetics();
        if (runGradeElement) {
            runGradeElement.hidden = false;
            runGradeElement.dataset.grade = '';
            runGradeElement.classList.remove('is-pb');
            setText(runGradeElement, 'Tutorial complete · Mint frame unlocked');
        }
        showUnlockToast(['frame:mint']);
        showHighScoreModal('Tutorial Complete!');
        return;
    }
    if (['sprint', 'daily', 'marathon', 'ultra'].includes(gameMode)) {
        const result = recordRun(meta, {
            mode: gameMode,
            elapsedMs: elapsedTime,
            score: player.score,
            paceSamples,
        });
        meta = result.meta;
        writeMeta(meta);
        runStatsSaved = true;
        applyCosmetics();
        refreshPbSummary();
        if (runGradeElement) {
            runGradeElement.hidden = false;
            runGradeElement.dataset.grade = result.grade || '';
            runGradeElement.classList.toggle('is-pb', Boolean(result.isPb));
            runGradeElement.textContent = formatRunGrade(result);
        }
        if (result.unlocks.length) showUnlockToast(result.unlocks);
    } else if (runGradeElement) {
        runGradeElement.hidden = true;
        runGradeElement.textContent = '';
    }
    showHighScoreModal(title);
}

function checkSprintCompletion() {
    const goal = modeLineGoal();
    if (goal == null || player.lines < goal) return false;
    if (gameMode === 'tutorial' && tutorialStep < 2) return false;
    const titles = {
        sprint: 'Sprint Complete!',
        daily: 'Daily Clear!',
        cheese: 'Cheese Clear!',
        invisible: 'Invisible Clear!',
        twentyg: '20G Clear!',
        tutorial: 'Tutorial Complete!',
    };
    finishRankedRun(titles[gameMode] || 'Clear!');
    return true;
}

function checkCheeseCompletion() {
    if (gameMode !== 'cheese' || hasGarbage(arena)) return false;
    finishRankedRun('Cheese Clear!');
    return true;
}

function checkMarathonCompletion() {
    if (gameMode !== 'marathon' || player.level < MARATHON_TARGET_LEVEL) return false;
    finishRankedRun('Marathon Clear!', {awardClearBonus: true});
    return true;
}

function checkTutorialCompletion() {
    if (gameMode !== 'tutorial' || tutorialStep < 3) return false;
    finishRankedRun('Tutorial Complete!');
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
    // Piece is already merged — hide it so the clear flash isn't double-drawn.
    player.matrix = null;
    arenaSweep(tSpin, {defer: true});
    updateScore();
    lockState = clearLock(lockState);
    player.lockTimer = 0;
    lastActionWasRotate = false;
    player.lastRotateUsedKick = false;

    if (pendingClear) return;
    finishLockAfterSweep();
}

function lockPiece() {
    lockCurrentPiece();
}

function playerHardDrop() {
    let cells = 0;
    const startY = player.pos.y;
    while (true) {
        player.pos.y++;
        if (collide(arena, player)) {
            player.pos.y--;
            break;
        }
        cells++;
    }
    player.score += HARD_DROP_POINT * cells;
    sounds.hardDrop?.();
    if (cells > 0 && player.matrix) {
        const cols = new Set();
        const impactCells = [];
        const pieceColor = PIECE_COLORS[player.matrix.flat().find(v => v !== 0) || 1] || '#FF6A3D';
        for (let y = 0; y < player.matrix.length; y++) {
            for (let x = 0; x < player.matrix[y].length; x++) {
                if (player.matrix[y][x] !== 0) {
                    const boardX = player.pos.x + x;
                    const boardY = player.pos.y + y;
                    cols.add(boardX);
                    impactCells.push({x: boardX, y: boardY});
                }
            }
        }
        particles.spawnDropBeams?.(Array.from(cols), startY, player.pos.y, pieceColor);
        particles.spawnGroundImpact?.(impactCells, pieceColor);
    }
    // Tall hard-drops keep score; shake stays reserved for clears / level-ups.
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
        return canAcceptGameInput() && emitHorizontal(action);
    });

    elapsedTime += frameDt;
    particles.update(frameDt / 1000);

    if (gameMode === 'ultra' && !isGameOver && !isPaused && player.matrix) {
        if (elapsedTime >= 120000) {
            elapsedTime = 120000;
            updateScore();
            finishRankedRun(t('Time Up!'));
            return;
        }
    }
    if (['sprint', 'marathon', 'daily'].includes(gameMode) && elapsedTime - lastPaceSampleAt >= 1000) {
        lastPaceSampleAt = elapsedTime;
        paceSamples.push({
            t: Math.round(elapsedTime),
            v: gameMode === 'marathon' ? player.level : player.lines,
        });
    }
    if (eventMessageTimer > 0) {
        eventMessageTimer -= deltaTime;
        if (eventMessageTimer <= 0) lastEventMessage = '';
    }
    if (clearRewardTimer > 0) {
        clearRewardTimer -= frameDt;
        if (clearRewardTimer <= 0 && clearRewardElement) {
            clearRewardElement.classList.remove('is-on');
            clearRewardElement.hidden = true;
            clearRewardTimer = 0;
        }
    }
    updateScenarioState(frameDt);
    if (scenarioResolved) return;

    if (pendingClear) {
        pendingClear.life -= frameDt;
        for (const line of flashingLines) {
            line.time = pendingClear.life;
        }
        if (pendingClear.life <= 0) {
            resolvePendingClear();
            finishLockAfterSweep();
        }
    } else {
        if (flashingLines.length) {
            flashingLines = expireFlashingLines(flashingLines, frameDt);
        }

        const gravityInterval = inputController.isSoftDropping()
            ? dropInterval / 20
            : dropInterval;
        if (isInstantGravity(gravityInterval)) {
            dropCounter = 0;
            while (player.matrix) {
                const y = player.pos.y;
                playerDrop(inputController.isSoftDropping());
                if (!player.matrix || player.pos.y === y) break;
            }
        } else {
            dropCounter += frameDt;
            if (dropCounter > gravityInterval) {
                playerDrop(inputController.isSoftDropping());
                dropCounter = 0;
            }
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
    scoreElement.innerText = String(player.score);
    levelElement.innerText = String(player.level);
    linesElement.innerText = String(player.lines);
    modeElement.innerText = t(MODE_LABELS[gameMode] || 'Marathon');
    timerElement.innerText = gameMode === 'ultra'
        ? formatElapsedTime(Math.max(0, 120000 - elapsedTime))
        : formatElapsedTime(elapsedTime);
    comboElement.innerText = String(combo);
    comboElement.closest('.status-row')?.classList.toggle('is-hot', combo >= 3);
    backToBackElement.innerText = b2bChain >= 2
        ? `x${b2bChain}`
        : t(backToBackActive ? 'Active' : 'Ready');
    backToBackElement.closest('.status-row')?.classList.toggle('is-hot', b2bChain >= 2);
    const playerStage = document.querySelector('#player-panel .board-stage');
    if (playerStage) {
        const isDanger = arena.slice(0, 6).some(row => row.some(cell => cell !== 0));
        const isSurge = combo >= 2 || b2bChain >= 2 || (typeof flowMeter === 'number' && flowMeter >= 80);
        playerStage.classList.toggle('is-danger', isDanger);
        playerStage.classList.toggle('is-surge', isSurge && !isDanger);
    }
    const showFlow = gameMode === 'marathon';
    if (flowRow) flowRow.hidden = !showFlow;
    if (showFlow && flowValueElement && flowMeterFill) {
        const flowPct = Math.round(flowMeter);
        flowValueElement.innerText = `${flowPct}%`;
        flowMeterFill.style.width = `${flowPct}%`;
    }
    eventMessageElement.innerText = translateEvent(lastEventMessage || '—');
    eventMessageElement.classList.toggle(
        'is-big',
        /TETRIS|PERFECT|T-SPIN|COMBO RUSH|FLOW MAX/.test(lastEventMessage || ''),
    );
    opponentLinesElement.innerText = String(opponent.lines).padStart(2, '0');
    opponentGarbageElement.innerText = String(opponent.pendingGarbage).padStart(2, '0');
    playerGarbageElement.innerText = String(playerPendingGarbage).padStart(2, '0');
    opponentGarbageMeter.style.width = `${opponent.pendingGarbage / MAX_PENDING_GARBAGE * 100}%`;
    playerGarbageMeter.style.width = `${playerPendingGarbage / MAX_PENDING_GARBAGE * 100}%`;
    const scenarioActive = gameMode === 'scenario' && Boolean(activeScenarioStage);
    const marathonActive = gameMode === 'marathon';
    const lineGoal = modeLineGoal();
    const showObjective = scenarioActive || marathonActive || lineGoal != null
        || gameMode === 'tutorial' || gameMode === 'cheese' || gameMode === 'ultra';
    scenarioObjective.hidden = !showObjective;
    if (scenarioActive) {
        scenarioObjective.textContent = activeScenarioStage.kind === 'lines'
            ? t('OBJECTIVE {value} / {goal}', {value: Math.min(player.lines, activeScenarioStage.lineGoal), goal: activeScenarioStage.lineGoal})
            : t('OBJECTIVE DEFEAT RIVAL');
    } else if (gameMode === 'tutorial') {
        scenarioObjective.textContent = tutorialObjectiveText();
    } else if (marathonActive) {
        const lv = Math.min(player.level, MARATHON_TARGET_LEVEL);
        scenarioObjective.textContent = t('CLEAR LV {level} / {goal}', {level: lv, goal: MARATHON_TARGET_LEVEL});
    } else if (gameMode === 'cheese') {
        const garbageRows = arena.filter(row => row.includes(8)).length;
        scenarioObjective.textContent = t('DIG {rows} GARBAGE', {rows: garbageRows});
    } else if (gameMode === 'ultra') {
        scenarioObjective.textContent = t('2-min score attack');
    } else if (lineGoal != null) {
        scenarioObjective.textContent = t('CLEAR {value} / {goal}', {value: Math.min(player.lines, lineGoal), goal: lineGoal});
    }

    const paceKey = gameMode === 'daily' ? 'daily' : (gameMode === 'sprint' ? 'sprint' : (gameMode === 'marathon' ? 'marathon' : null));
    if (paceGhostElement) {
        if (!paceKey || !meta.pace[paceKey]?.length) {
            paceGhostElement.hidden = true;
        } else {
            const pbVal = paceValueAt(meta.pace[paceKey], elapsedTime);
            const nowVal = gameMode === 'marathon' ? player.level : player.lines;
            const delta = nowVal - pbVal;
            const unit = gameMode === 'marathon' ? 'LV' : 'L';
            paceGhostElement.hidden = false;
            paceGhostElement.textContent = delta === 0
                ? t('PB PACE · even')
                : (delta > 0 ? t('PB PACE · {delta}{unit}', {delta: `+${delta}`, unit: t(unit)}) : t('PB PACE · {delta}{unit}', {delta, unit: t(unit)}));
        }
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
        scenarioResultDetail.textContent = t('Progress could not be saved. Check browser storage and retry.');
        scenarioResultMapBtn.style.display = 'none';
        return false;
    }
    scenarioProgress = candidate;
    persistRunStats({incrementGames: true});
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
    persistRunStats({incrementGames: true});
    showScenarioResult(false, 0, title);
    return true;
}

function showScenarioResult(success, stars = 0, failureTitle = 'SYSTEM OVERLOAD') {
    hideModalScreens();
    setText(scenarioResultTitle, success ? 'STAGE CLEAR' : failureTitle);
    scenarioResultStars.textContent = success ? '★'.repeat(stars) : '';
    scenarioResultStars.setAttribute('aria-label', t('{stars} of 3 stars', {stars: success ? stars : 0}));
    scenarioResultDetail.textContent = success
        ? t('{name} · TIME {time}', {name: t(activeScenarioStage.name), time: formatElapsedTime(elapsedTime)})
        : t('Retry Stage');
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
        button.textContent = `${t(upgrade.name)}\n${t(upgrade.description)}\n${button.disabled ? t('MAX') : t('CURRENT {stack} / 4', {stack})}`;
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
        scenarioRewardError.textContent = t('Progress could not be saved. Try again.');
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

function currentBoardMode() {
    if (startScreen.style.display !== 'none') {
        return gameModeSelect.value || 'marathon';
    }
    return gameMode || gameModeSelect.value || 'marathon';
}

function persistRunStats({incrementGames = false} = {}) {
    if (incrementGames && !runStatsSaved) {
        meta = noteRunEnd(meta);
    }
    writeMeta(meta);
    runStatsSaved = true;
}

function updateLeaderboard() {
    renderLeaderboard(leaderboardElement, readLeaderboard(localStorage, currentBoardMode()));
}

function showStartScreen() {
    if (activeScenarioStage) {
        resetGameState();
        activeScenarioStage = null;
    }
    opponentPanel.style.display = 'none';
    touchControls.hidden = true;
    scenarioObjective.hidden = true;
    gameContainer.classList.remove('versus-active', 'play-enter');
    hideModalScreens();
    startScreen.style.display = 'block';
    modalOverlay.classList.add('menu-enter');
    refreshCampaignSummary();
    selectGameMode(gameModeSelect.value);
    refreshPbSummary();
    refreshFirstRunNudge();
    renderCosmeticPickers();
    applyCosmetics();
    openModal('start-screen-title', startGameBtn);
}

function refreshCampaignSummary() {
    const unlockedStage = SCENARIO_STAGES[scenarioProgress.unlockedStage - 1];
    scenarioContinueDetail.textContent = scenarioProgress.pendingRewardStage !== null
        ? t('UPGRADE READY · STAGE {stage}', {stage: String(scenarioProgress.pendingRewardStage).padStart(2, '0')})
        : scenarioProgress.completed
        ? t('CHAMPION · 5/5 STAGES')
        : t('STAGE {stage} · {rival}', {stage: String(unlockedStage.id).padStart(2, '0'), rival: unlockedStage.rival});
}

function exitApplication() {
    if (!window.confirm(t('Exit Neon Drop?'))) return;
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

function renderPauseControls() {
    if (!pauseControls) return;
    pauseControls.replaceChildren();
    for (const row of controlLegendRows(settings.bindings)) {
        const dt = document.createElement('dt');
        dt.textContent = row.label;
        const dd = document.createElement('dd');
        dd.textContent = row.keys;
        pauseControls.append(dt, dd);
    }
}

function refreshFirstRunNudge() {
    if (!firstRunNudge) return;
    firstRunNudge.hidden = Boolean(meta.stats.tutorialDone);
}

let unlockToastTimer = 0;
function showUnlockToast(unlocks) {
    if (!unlockToast || !unlocks?.length) return;
    unlockToast.hidden = false;
    unlockToast.textContent = t('UNLOCKED · {names}', {names: formatUnlocks(unlocks)});
    unlockToast.classList.remove('is-on');
    void unlockToast.offsetWidth;
    unlockToast.classList.add('is-on');
    sounds.unlock?.();
    window.clearTimeout(unlockToastTimer);
    unlockToastTimer = window.setTimeout(() => {
        unlockToast.classList.remove('is-on');
        unlockToast.hidden = true;
    }, 2800);
}

function showPauseScreen() {
    touchControls.hidden = true;
    startScreen.style.display = 'none';
    settingsScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    pauseScreen.style.display = 'block';
    renderPauseControls();
    openModal('pause-screen-title', resumeGameBtn);
}

function showHighScoreModal(title = 'Game Over') {
    isGameOver = true;
    touchControls.hidden = true;
    sounds.gameOver();
    persistRunStats({incrementGames: true});

    const scores = readLeaderboard(localStorage, currentBoardMode());
    const topScore = scores.length > 0 ? scores[0].score : 0;

    startScreen.style.display = 'none';
    pauseScreen.style.display = 'none';
    leaderboardScreen.style.display = 'none';
    gameOverScreen.style.display = 'block';
    setText(gameOverTitleElement, title);
    finalScoreElement.innerText = player.score;
    if (title === 'Game Over' && runGradeElement) {
        runGradeElement.hidden = true;
        runGradeElement.textContent = '';
        runGradeElement.dataset.grade = '';
        runGradeElement.classList.remove('is-pb');
    }

    if (player.score > topScore || scores.length < 5) {
        document.getElementById('high-score-input-group').style.display = 'grid';
    } else {
        document.getElementById('high-score-input-group').style.display = 'none';
    }
    const scoreInputVisible = document.getElementById('high-score-input-group').style.display !== 'none';
    openModal('game-over-title', scoreInputVisible ? nicknameInput : gameOverMenuBtn);
}

saveScoreBtn.addEventListener('click', () => {
    const name = nicknameInput.value.trim() || t('Anonymous');
    const newScore = { name, score: player.score };
    const mode = currentBoardMode();

    let scores = readLeaderboard(localStorage, mode);
    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);

    writeLeaderboard(scores, localStorage, mode);
    updateLeaderboard();

    gameOverScreen.style.display = 'none';
    resetGameState();
    isGameOver = false;

    showStartScreen();
});

function beginSelectedRun() {
    cancelScheduledUpdate();
    if (audioCtx) {
        void audioCtx.resume().catch(() => {});
    }
    startBGM();
    gameMode = gameModeSelect.value;
    opponentPanel.style.display = gameMode === 'versus' ? 'flex' : 'none';
    gameContainer.classList.toggle('versus-active', gameMode === 'versus');
    gameContainer.classList.remove('play-enter');
    void gameContainer.offsetWidth;
    gameContainer.classList.add('play-enter');
    modalOverlay.classList.remove('menu-enter');
    isGameOver = false;
    isPaused = false;
    closeModal();
    startScreen.style.display = 'none';
    touchControls.hidden = false;
    if (runGradeElement) {
        runGradeElement.hidden = true;
        runGradeElement.textContent = '';
    }
    resetGameState();
    emitMatchEvent('match-start');
    setText(gameOverTitleElement, 'Game Over');
    playerReset();
    lastTime = performance.now();
    scheduleUpdate();
}

startGameBtn.addEventListener('click', beginSelectedRun);

menuTutorialBtn?.addEventListener('click', () => {
    selectGameMode('tutorial');
    beginSelectedRun();
});
firstRunTutorialBtn?.addEventListener('click', () => {
    selectGameMode('tutorial');
    beginSelectedRun();
});

cosmeticFrames?.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.name !== 'cosmetic-frame') return;
    if (!meta.unlocks.frames.includes(input.value)) return;
    meta.unlocks.selectedFrame = input.value;
    writeMeta(meta);
    applyCosmetics();
});

cosmeticClears?.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.name !== 'cosmetic-clear') return;
    if (!meta.unlocks.clears.includes(input.value)) return;
    meta.unlocks.selectedClear = input.value;
    writeMeta(meta);
    applyCosmetics();
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
    if (!window.confirm(t('Reset your Neon Circuit progress?'))) return;
    const candidate = createScenarioProgress();
    if (!writeScenarioProgress(candidate)) {
        scenarioResetError.textContent = t('New Campaign could not be saved. Check browser storage and try again.');
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
playAgainBtn?.addEventListener('click', () => {
    sounds.restart?.();
    gameOverScreen.style.display = 'none';
    closeModal();
    resetGameState();
    isGameOver = false;
    beginSelectedRun();
});

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
    renderLeaderboard(leaderboardList, readLeaderboard(localStorage, gameModeSelect.value || 'marathon'));
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
pauseRestartBtn?.addEventListener('click', () => {
    sounds.restart?.();
    isPaused = false;
    closeModal();
    pauseScreen.style.display = 'none';
    resetGameState();
    beginSelectedRun();
});

quitToMenuBtn.addEventListener('click', () => {
    returnToMenu();
});

menuSettingsBtn.addEventListener('click', () => showSettings('start'));
pauseSettingsBtn.addEventListener('click', () => showSettings('pause'));
settingsBackBtn.addEventListener('click', closeSettings);
settingsLanguage.addEventListener('change', () => {
    persistSettings({...settings, language: settingsLanguage.value});
    refreshLanguage();
});

function refreshLanguage() {
    document.documentElement.lang = getLanguage();
    applyTranslations();
    syncSettingsUI();
    selectGameMode(gameModeSelect.value);
    refreshPbSummary();
    refreshCampaignSummary();
    renderCosmeticPickers();
    renderPauseControls();
    updateLeaderboard();
    renderLeaderboard(leaderboardList, readLeaderboard(localStorage, currentBoardMode()));
    updateScore();
}

settingsResetBtn.addEventListener('click', () => {
    const preset = presetGuidelineRadio.checked ? 'guideline' : 'classic';
    cancelRebind();
    persistSettings(applyPreset(settings, preset));
});

presetClassicRadio.addEventListener('change', () => {
    if (!presetClassicRadio.checked) return;
    cancelRebind();
    persistSettings(applyPreset(settings, 'classic'));
});

presetGuidelineRadio.addEventListener('change', () => {
    if (!presetGuidelineRadio.checked) return;
    cancelRebind();
    persistSettings(applyPreset(settings, 'guideline'));
});

function updateTimingFromSliders() {
    persistSettings({
        ...settings,
        timing: {
            das: Number(settingsDas.value),
            arr: Number(settingsArr.value),
            lockDelay: Number(settingsLockDelay.value),
        },
    });
}

settingsDas.addEventListener('input', updateTimingFromSliders);
settingsArr.addEventListener('input', updateTimingFromSliders);
settingsLockDelay.addEventListener('input', updateTimingFromSliders);

rebindButtons.forEach(button => {
    button.addEventListener('click', () => {
        const action = button.dataset.rebind;
        if (rebindingAction === action) {
            cancelRebind();
            syncSettingsUI();
            return;
        }
        rebindingAction = action;
        syncSettingsUI();
    });
});

modalOverlay.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
        trapFocus(modalOverlay, event);
        return;
    }
    if (event.key === 'Escape' && settingsScreenOpen() && !rebindingAction) {
        event.preventDefault();
        event.stopPropagation();
        closeSettings();
        return;
    }
    if (event.key === 'Escape' && quitConfirmScreen && quitConfirmScreen.style.display !== 'none') {
        event.preventDefault();
        event.stopPropagation();
        cancelQuitConfirm();
        return;
    }
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
    configureRunSeedAndQueue();
    inputController.reset();
    particles.clear();
    if (quitConfirmScreen) quitConfirmScreen.style.display = 'none';
    document.querySelector('#player-panel .board-stage')?.classList.remove('is-danger', 'is-surge');
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
    b2bChain = 0;
    flowMeter = 0;
    paceSamples = [];
    lastPaceSampleAt = 0;
    tutorialStep = 0;
    shakeTime = 0;
    flashingLines = [];
    pendingClear = null;
    runStatsSaved = false;
    dropInterval = scenarioDropInterval();
    elapsedTime = 0;
    backToBackActive = false;
    if (gameMode === 'cheese') addGarbageLines(arena, 10);
    lastActionWasRotate = false;
    lastEventMessage = '';
    eventMessageTimer = 0;
    clearRewardTimer = 0;
    if (clearRewardElement) {
        clearRewardElement.classList.remove('is-on');
        clearRewardElement.hidden = true;
        clearRewardElement.textContent = '';
    }
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

    if (gameMode === 'tutorial' && tutorialStep === 2) {
        tutorialStep = 3;
        lastEventMessage = 'TUTORIAL · Hold OK';
        eventMessageTimer = 1600;
        updateScore();
        checkTutorialCompletion();
        if (isGameOver) return;
    }

    lastActionWasRotate = false;
    const currentType = pieceTypeFromMatrix(player.matrix);
    if (!currentType) return;
    if (player.hold === null) {
        player.hold = createPiece(currentType);
        player.holdRotation = initialRotationFor(currentType);
        playerReset();
    } else {
        const holdType = pieceTypeFromMatrix(player.hold);
        player.hold = createPiece(currentType);
        player.holdRotation = initialRotationFor(currentType);
        player.matrix = createPiece(holdType);
        player.rotation = initialRotationFor(holdType);
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
    if (!canPauseGame()) return;

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
    if (rebindingAction) {
        event.preventDefault();
        if (event.repeat) return;
        const action = rebindingAction;
        cancelRebind();
        persistSettings(assignBinding(settings, action, event.code));
        return;
    }

    if (settingsScreenOpen()) return;

    if (isEditableTarget(event.target)) return;

    if (event.code === 'KeyR' && !event.repeat) {
        if (isPaused) {
            event.preventDefault();
            sounds.restart?.();
            isPaused = false;
            closeModal();
            pauseScreen.style.display = 'none';
            resetGameState();
            beginSelectedRun();
            return;
        }
        if (isGameOver && gameOverScreen.style.display !== 'none') {
            event.preventDefault();
            sounds.restart?.();
            gameOverScreen.style.display = 'none';
            closeModal();
            resetGameState();
            isGameOver = false;
            beginSelectedRun();
            return;
        }
    }

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
        if (!player.matrix) return;
        const result = tryRotate180(arena, player, collide);
        lastActionWasRotate = result.ok;
        if (result.ok) {
            sounds.rotate();
            refreshLockAfterMove();
        }
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

function showQuitConfirm() {
    if (!player.matrix || isGameOver) return;
    if (!isPaused) togglePause();
    if (pauseScreen) pauseScreen.style.display = 'none';
    if (quitConfirmScreen) {
        quitConfirmScreen.style.display = 'block';
        openModal('quit-confirm-title', quitConfirmNoBtn);
    }
}

function cancelQuitConfirm() {
    if (quitConfirmScreen) quitConfirmScreen.style.display = 'none';
    closeModal();
    if (isPaused) togglePause();
}

function quitGame() {
    if (!player.matrix || isGameOver) return;
    showQuitConfirm();
}

quitConfirmYesBtn?.addEventListener('click', () => {
    if (quitConfirmScreen) quitConfirmScreen.style.display = 'none';
    returnToMenu();
});
quitConfirmNoBtn?.addEventListener('click', cancelQuitConfirm);

pauseGameBtn.addEventListener('click', () => {
    if (!canPauseGame()) return;
    if (!isPaused) togglePause();
});
exitGameBtn.addEventListener('click', quitGame);

//Expose state and functions to Playwright tests that rely on global scope.
const exposed = {
    arena, player, opponent, pieceQueue, inputController,
    gameOverTitleElement, gameOverScreen, startScreen, pauseScreen, settingsScreen, modalOverlay,
    quitConfirmScreen, showQuitConfirm, cancelQuitConfirm,
    calculateGarbageAttack, scoreLines, createPiece, createMatrix,
    chooseOpponentMove, evaluateOpponentBoard, nextPieceType, initialRotationFor,
    detectTSpin, isPerfectClear, tryRotateSrs, tryRotate180,
    endVersusMatch, resetGameState, clearFullRows, addGarbageLines,
    collide, merge, rotate,
    nextOpponentPieceType, resetOpponentState, arenaSweep, flushPendingClear,
    readLeaderboard, writeLeaderboard, renderLeaderboard,
    shuffleBag, emitMatchEvent, playerReset, playerHold, playerMove, emitHorizontal,
    playerRotate, playerDrop, playerHardDrop, lockPiece, lockCurrentPiece,
    queueGarbageForOpponent, queueGarbageForPlayer, runOpponentTurn, runOpponentTurnsAfterLock,
    checkSprintCompletion, checkMarathonCompletion, checkCheeseCompletion, checkTutorialCompletion, showHighScoreModal, showStartScreen, showPauseScreen, exitApplication,
    readMeta, writeMeta, recordRun, noteRunEnd, dailySeed, mulberry32, createBagFactory, paceValueAt,
    showSettings, closeSettings, syncSettingsUI, trapFocus,
    showUnlockToast, formatRunGrade, punchClear,
    createLockState, onGroundContact, tickLock, clearLock,
    togglePause, quitGame, returnToMenu, selectGameMode, canAcceptGameInput, canPauseGame, update, formatElapsedTime,
    createScenarioProgress, readScenarioProgress, writeScenarioProgress, renderScenarioMap,
    showScenarioMap, showScenarioBriefing, startScenarioStage, canPlayScenarioStage,
    completeScenarioLineProgress, updateScenarioState, completeScenarioStage,
    failScenarioStage, showScenarioResult, showScenarioReward, chooseScenarioUpgrade,
    leaveScenarioForMap, playerGarbageActive, hasScenarioOpponent,
    opponentPlayActive, scenarioUpgradeEffects,
    themeMelody, themeMelodyName,
    isBgmRunning: isBGMRunning,
    particles, updateScore, showClearReward, sounds,
    PIECE_TYPES, SPRINT_TARGET_LINES, MARATHON_TARGET_LEVEL, MARATHON_CLEAR_BONUS,
    VERSUS_WIDTH, VERSUS_HEIGHT, MAX_PENDING_GARBAGE,
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
    b2bChain: [() => b2bChain, (v) => { b2bChain = v; }],
    flowMeter: [() => flowMeter, (v) => { flowMeter = v; }],
    playerPendingGarbage: [() => playerPendingGarbage, (v) => { playerPendingGarbage = v; }],
    lastEventMessage: [() => lastEventMessage, (v) => { lastEventMessage = v; }],
    elapsedTime: [() => elapsedTime, (v) => { elapsedTime = v; }],
    matchEventLog: [() => matchEventLog, (v) => { matchEventLog = v; }],
    flashingLines: [() => flashingLines, (v) => { flashingLines = v; }],
    pendingClear: [() => pendingClear, (v) => { pendingClear = v; }],
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
    tutorialStep: [() => tutorialStep, (v) => { tutorialStep = v; }],
    activeSeed: [() => activeSeed, (v) => { activeSeed = v; }],
    paceSamples: [() => paceSamples, (v) => { paceSamples = v; }],
    meta: [() => meta, (v) => { meta = v; }],
};

const testMode = new URLSearchParams(location.search).has('test');
if (testMode) {
    window.exposed = exposed;
    for (const [name, value] of Object.entries(exposed)) {
        window[name] = value;
    }
    for (const [name, [getter, setter]] of Object.entries(liveState)) {
        Object.defineProperty(window, name, { get: getter, set: setter, configurable: true });
    }
}

//Initialize Game
restorePreferences();
refreshLanguage();
selectGameMode(gameModeSelect.value);
applyCosmetics();
refreshPbSummary();
showStartScreen();
updateScore();
updateLeaderboard();

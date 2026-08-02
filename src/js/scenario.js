export const SCENARIO_STAGES = Object.freeze([
    {id: 1, name: 'Boot Sequence', rival: 'BYTE', kind: 'lines', lineGoal: 8, dropStepMs: 100, timeLimitMs: null, hazardIntervalMs: null, opponentTurns: 0, starTimesMs: [120000, 75000]},
    {id: 2, name: 'Velocity Gate', rival: 'RUSH', kind: 'lines', lineGoal: 15, dropStepMs: 160, timeLimitMs: 150000, hazardIntervalMs: null, opponentTurns: 0, starTimesMs: [120000, 90000]},
    {id: 3, name: 'Interference Zone', rival: 'GLITCH', kind: 'lines', lineGoal: 18, dropStepMs: 120, timeLimitMs: null, hazardIntervalMs: 30000, opponentTurns: 0, starTimesMs: [180000, 120000]},
    {id: 4, name: 'Mirror Match', rival: 'MIRROR', kind: 'opponent', lineGoal: null, dropStepMs: 100, timeLimitMs: null, hazardIntervalMs: null, opponentTurns: 1, starTimesMs: [240000, 150000]},
    {id: 5, name: 'Crown Protocol', rival: 'OVERLORD', kind: 'opponent', lineGoal: null, dropStepMs: 100, timeLimitMs: null, hazardIntervalMs: 45000, opponentTurns: 2, starTimesMs: [300000, 210000]},
]);

export const SCENARIO_UPGRADES = Object.freeze([
    {id: 'pulse', name: 'Pulse Amp', description: '+20% score and +1 AI attack per stack'},
    {id: 'cryo', name: 'Cryo Field', description: '+10% drop interval per stack, max +30%'},
    {id: 'firewall', name: 'Firewall', description: 'Block one garbage application per stack'},
]);

export function createScenarioProgress() {
    return {
        version: 1,
        unlockedStage: 1,
        results: {},
        upgrades: {pulse: 0, cryo: 0, firewall: 0},
        pendingRewardStage: null,
        completed: false,
    };
}

function validUpgradeStack(value) {
    return Number.isInteger(value) && value >= 0 && value <= 4 ? value : 0;
}

function validResult(value) {
    return value && typeof value === 'object'
        && Number.isInteger(value.stage) && value.stage >= 1 && value.stage <= 5
        && Number.isInteger(value.stars) && value.stars >= 1 && value.stars <= 3
        && Number.isFinite(value.bestTimeMs) && value.bestTimeMs >= 0;
}

export function normalizeScenarioProgress(value) {
    if (!value || typeof value !== 'object' || value.version !== 1
        || !Number.isInteger(value.unlockedStage) || value.unlockedStage < 1 || value.unlockedStage > 5) {
        return createScenarioProgress();
    }

    const progress = createScenarioProgress();
    progress.unlockedStage = value.unlockedStage;
    if (value.results && typeof value.results === 'object' && !Array.isArray(value.results)) {
        progress.results = Object.fromEntries(Object.entries(value.results).filter(([, result]) => validResult(result)));
    }
    const upgrades = value.upgrades && typeof value.upgrades === 'object' ? value.upgrades : {};
    progress.upgrades = {
        pulse: validUpgradeStack(upgrades.pulse),
        cryo: validUpgradeStack(upgrades.cryo),
        firewall: validUpgradeStack(upgrades.firewall),
    };
    progress.pendingRewardStage = Number.isInteger(value.pendingRewardStage)
        && value.pendingRewardStage >= 1 && value.pendingRewardStage <= 4 ? value.pendingRewardStage : null;
    progress.completed = value.completed === true;
    return progress;
}

export function canPlayScenarioStage(progress, stageId) {
    return Number.isInteger(stageId) && stageId >= 1 && stageId <= SCENARIO_STAGES.length
        && progress?.unlockedStage >= stageId;
}

export function starsForScenarioStage(stage, elapsedMs) {
    if (!stage || !Number.isFinite(elapsedMs)) return 0;
    const [twoStarTime, threeStarTime] = stage.starTimesMs;
    return elapsedMs <= threeStarTime ? 3 : elapsedMs <= twoStarTime ? 2 : 1;
}

export function scenarioUpgradeEffects(upgrades = {}) {
    const pulse = validUpgradeStack(upgrades.pulse);
    const cryo = Math.min(3, validUpgradeStack(upgrades.cryo));
    const firewall = validUpgradeStack(upgrades.firewall);
    return {
        scoreMultiplier: 1 + pulse * 0.2,
        outgoingGarbageBonus: pulse,
        dropIntervalMultiplier: 1 + cryo * 0.1,
        firewallCharges: firewall,
    };
}

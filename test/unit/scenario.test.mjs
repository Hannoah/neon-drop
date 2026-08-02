import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    SCENARIO_STAGES,
    SCENARIO_UPGRADES,
    canPlayScenarioStage,
    createScenarioProgress,
    normalizeScenarioProgress,
    scenarioUpgradeEffects,
    starsForScenarioStage,
} from '../../src/js/scenario.js';

test('scenario stage and upgrade definitions match the campaign', () => {
    for (const [actual, expected] of [
        [SCENARIO_STAGES, [
            {id: 1, name: 'Boot Sequence', rival: 'BYTE', kind: 'lines', lineGoal: 8, dropStepMs: 100, timeLimitMs: null, hazardIntervalMs: null, opponentTurns: 0, starTimesMs: [120000, 75000]},
            {id: 2, name: 'Velocity Gate', rival: 'RUSH', kind: 'lines', lineGoal: 15, dropStepMs: 160, timeLimitMs: 150000, hazardIntervalMs: null, opponentTurns: 0, starTimesMs: [120000, 90000]},
            {id: 3, name: 'Interference Zone', rival: 'GLITCH', kind: 'lines', lineGoal: 18, dropStepMs: 120, timeLimitMs: null, hazardIntervalMs: 30000, opponentTurns: 0, starTimesMs: [180000, 120000]},
            {id: 4, name: 'Mirror Match', rival: 'MIRROR', kind: 'opponent', lineGoal: null, dropStepMs: 100, timeLimitMs: null, hazardIntervalMs: null, opponentTurns: 1, starTimesMs: [240000, 150000]},
            {id: 5, name: 'Crown Protocol', rival: 'OVERLORD', kind: 'opponent', lineGoal: null, dropStepMs: 100, timeLimitMs: null, hazardIntervalMs: 45000, opponentTurns: 2, starTimesMs: [300000, 210000]},
        ]],
        [SCENARIO_UPGRADES, [
            {id: 'pulse', name: 'Pulse Amp', description: '+20% score and +1 AI attack per stack'},
            {id: 'cryo', name: 'Cryo Field', description: '+10% drop interval per stack, max +30%'},
            {id: 'firewall', name: 'Firewall', description: 'Block one garbage application per stack'},
        ]],
    ]) assert.deepEqual(actual, expected);
});

test('scenario definitions are deeply immutable', () => {
    assert.equal(Object.isFrozen(SCENARIO_STAGES), true);
    assert.equal(Object.isFrozen(SCENARIO_UPGRADES), true);
    for (const stage of SCENARIO_STAGES) {
        assert.equal(Object.isFrozen(stage), true);
        assert.equal(Object.isFrozen(stage.starTimesMs), true);
    }
    for (const upgrade of SCENARIO_UPGRADES) assert.equal(Object.isFrozen(upgrade), true);
    assert.throws(() => { SCENARIO_STAGES[0].starTimesMs[0] = 0; }, TypeError);
    assert.throws(() => { SCENARIO_UPGRADES[0].name = 'Changed'; }, TypeError);
});

test('createScenarioProgress returns default scenario progress', () => {
    assert.deepEqual(createScenarioProgress(), {
        version: 1,
        unlockedStage: 1,
        results: {},
        upgrades: {pulse: 0, cryo: 0, firewall: 0},
        pendingRewardStage: null,
        completed: false,
    });
});

test('normalizeScenarioProgress falls back for invalid progress', () => {
    assert.deepEqual(normalizeScenarioProgress({unlockedStage: 99, upgrades: {pulse: -2}}), createScenarioProgress());
});

test('normalizeScenarioProgress keeps canonical valid stage result keys only', () => {
    const progress = normalizeScenarioProgress({
        version: 1,
        unlockedStage: 1,
        results: {
            1: {stars: 2, bestTimeMs: 90000},
            '01': {stars: 2, bestTimeMs: 90000},
            '1.0': {stars: 2, bestTimeMs: 90000},
            '1e0': {stars: 2, bestTimeMs: 90000},
            outside: {stars: 3, bestTimeMs: 1},
            2: {stars: 0, bestTimeMs: 1},
            3: {stars: 4, bestTimeMs: 1},
            4: {stars: 2, bestTimeMs: Infinity},
            5: {stars: 2, bestTimeMs: -1},
        },
    });
    assert.deepEqual(progress.results, {1: {stars: 2, bestTimeMs: 90000}});
});

test('normalizeScenarioProgress normalizes upgrade, reward, and completion boundaries', () => {
    for (const [input, expected] of [
        [{pulse: 4, cryo: 5, firewall: -1, pendingRewardStage: 4, completed: true}, {pulse: 4, cryo: 0, firewall: 0, pendingRewardStage: null, completed: false}],
        [{pulse: 1.5, cryo: 3, firewall: 9, pendingRewardStage: 5, completed: 'true'}, {pulse: 0, cryo: 3, firewall: 0, pendingRewardStage: null, completed: false}],
    ]) {
        const progress = normalizeScenarioProgress({version: 1, unlockedStage: 1, upgrades: input, ...input});
        assert.deepEqual({
            upgrades: progress.upgrades,
            pendingRewardStage: progress.pendingRewardStage,
            completed: progress.completed,
        }, {upgrades: {pulse: expected.pulse, cryo: expected.cryo, firewall: expected.firewall}, pendingRewardStage: expected.pendingRewardStage, completed: expected.completed});
    }
});

test('normalizeScenarioProgress rejects contradictory or unspendable completion state', () => {
    const result = {stars: 3, bestTimeMs: 70000};
    const progress = input => normalizeScenarioProgress({
        version: 1,
        results: {},
        upgrades: {pulse: 0, cryo: 0, firewall: 0},
        pendingRewardStage: null,
        completed: false,
        ...input,
    });

    assert.equal(progress({unlockedStage: 1, pendingRewardStage: 1}).pendingRewardStage, null,
        'a reward requires its stage result and next stage unlock');
    assert.equal(progress({unlockedStage: 3, results: {1: result}, pendingRewardStage: 2}).pendingRewardStage, null,
        'a reward requires a matching completed-stage result');
    assert.equal(progress({unlockedStage: 5, results: {4: result}, completed: true}).completed, false,
        'champion state requires a stage 5 result');

    const champion = progress({
        unlockedStage: 5,
        results: {1: result, 5: result},
        pendingRewardStage: 1,
        completed: true,
    });
    assert.equal(champion.completed, true);
    assert.equal(champion.pendingRewardStage, null, 'champion state cannot retain an earlier reward');

    const allMax = progress({
        unlockedStage: 2,
        results: {1: result},
        upgrades: {pulse: 4, cryo: 4, firewall: 4},
        pendingRewardStage: 1,
    });
    assert.equal(allMax.pendingRewardStage, null, 'an impossible all-max reward must not hardlock the campaign');

    assert.equal(progress({
        unlockedStage: 2,
        results: {1: result},
        pendingRewardStage: 1,
    }).pendingRewardStage, 1, 'a consistent spendable reward must survive normalization');
});

test('canPlayScenarioStage allows unlocked stages only', () => {
    const progress = {...createScenarioProgress(), unlockedStage: 3};
    assert.equal(canPlayScenarioStage(progress, 3), true);
    assert.equal(canPlayScenarioStage(progress, 4), false);
});

test('starsForScenarioStage awards stars at stage 1 thresholds', () => {
    const stage = SCENARIO_STAGES[0];
    assert.equal(starsForScenarioStage(stage, -1), 0);
    assert.equal(starsForScenarioStage(stage, Infinity), 0);
    assert.equal(starsForScenarioStage(stage, 121000), 1);
    assert.equal(starsForScenarioStage(stage, 120000), 2);
    assert.equal(starsForScenarioStage(stage, 75000), 3);
});

test('scenarioUpgradeEffects applies upgrade stacks', () => {
    assert.deepEqual(scenarioUpgradeEffects({pulse: 2, cryo: 4, firewall: 3}), {
        scoreMultiplier: 1.4,
        outgoingGarbageBonus: 2,
        dropIntervalMultiplier: 1.3,
        firewallCharges: 3,
    });
});

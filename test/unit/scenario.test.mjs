import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    SCENARIO_STAGES,
    canPlayScenarioStage,
    createScenarioProgress,
    normalizeScenarioProgress,
    scenarioUpgradeEffects,
    starsForScenarioStage,
} from '../../src/js/scenario.js';

test('SCENARIO_STAGES lists the five rivals in order', () => {
    assert.deepEqual(SCENARIO_STAGES.map(stage => stage.rival), ['BYTE', 'RUSH', 'GLITCH', 'MIRROR', 'OVERLORD']);
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

test('normalizeScenarioProgress keeps results with valid stage keys only', () => {
    const progress = normalizeScenarioProgress({
        version: 1,
        unlockedStage: 1,
        results: {
            1: {stars: 2, bestTimeMs: 90000},
            outside: {stage: 1, stars: 3, bestTimeMs: 1},
        },
    });
    assert.deepEqual(progress.results, {1: {stars: 2, bestTimeMs: 90000}});
});

test('canPlayScenarioStage allows unlocked stages only', () => {
    const progress = {...createScenarioProgress(), unlockedStage: 3};
    assert.equal(canPlayScenarioStage(progress, 3), true);
    assert.equal(canPlayScenarioStage(progress, 4), false);
});

test('starsForScenarioStage awards stars at stage 1 thresholds', () => {
    const stage = SCENARIO_STAGES[0];
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

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    calculateGarbageAttack,
    eventMessageFor,
    baseScoreFor,
    qualifiesForBackToBack,
    buildScoreResult,
} from '../../src/js/scoring.js';

test('calculateGarbageAttack returns 0 for single without combo or B2B', () => {
    assert.equal(calculateGarbageAttack(1, false, false, 1), 0);
});

test('calculateGarbageAttack scales for double, triple, and quad clear', () => {
    assert.equal(calculateGarbageAttack(2, false, false, 1), 1);
    assert.equal(calculateGarbageAttack(3, false, false, 1), 2);
    assert.equal(calculateGarbageAttack(4, false, false, 1), 4);
});

test('calculateGarbageAttack adds back-to-back bonus on quad clear when active', () => {
    assert.equal(calculateGarbageAttack(4, false, true, 1), 5, 'B2B quad clear sends base + 1');
});

test('calculateGarbageAttack adds combo bonus based on comboValue', () => {
    assert.equal(calculateGarbageAttack(4, false, true, 3), 7, 'base + B2B + (combo-1)');
});

test('calculateGarbageAttack uses Pivot table when pivot is true', () => {
    assert.equal(calculateGarbageAttack(0, true, false, 0), 0);
    assert.equal(calculateGarbageAttack(1, true, false, 1), 2);
    assert.equal(calculateGarbageAttack(2, true, false, 1), 4);
    assert.equal(calculateGarbageAttack(3, true, false, 1), 6);
});

test('calculateGarbageAttack zero-line Pivot does not qualify for B2B bonus', () => {
    assert.equal(calculateGarbageAttack(0, true, true, 0), 0, 'zero-line Pivot sends no garbage');
});

test('eventMessageFor names line clears correctly', () => {
    assert.equal(eventMessageFor(1, false), 'SINGLE');
    assert.equal(eventMessageFor(2, false), 'DOUBLE');
    assert.equal(eventMessageFor(3, false), 'TRIPLE');
    assert.equal(eventMessageFor(4, false), 'QUAD CLEAR');
    assert.equal(eventMessageFor(0, false), '');
    assert.equal(eventMessageFor(5, false), '');
});

test('eventMessageFor names Pivot variants', () => {
    assert.equal(eventMessageFor(0, true), 'PIVOT');
    assert.equal(eventMessageFor(1, true), 'PIVOT SINGLE');
    assert.equal(eventMessageFor(2, true), 'PIVOT DOUBLE');
    assert.equal(eventMessageFor(3, true), 'PIVOT TRIPLE');
});

test('baseScoreFor returns normal and Pivot base scores', () => {
    assert.equal(baseScoreFor(1, false), 100);
    assert.equal(baseScoreFor(2, false), 300);
    assert.equal(baseScoreFor(3, false), 500);
    assert.equal(baseScoreFor(4, false), 800);
    assert.equal(baseScoreFor(1, true), 800);
    assert.equal(baseScoreFor(2, true), 1200);
});

test('baseScoreFor caps Pivot triple to the maximum table value', () => {
    assert.equal(baseScoreFor(3, true), 1600);
    assert.equal(baseScoreFor(5, false), 5 * 200, 'non-standard line counts are extrapolated');
});

test('qualifiesForBackToBack flags quad clear and positive Pivots', () => {
    assert.equal(qualifiesForBackToBack(4, false), true);
    assert.equal(qualifiesForBackToBack(2, true), true);
    assert.equal(qualifiesForBackToBack(1, true), true);
    assert.equal(qualifiesForBackToBack(3, false), false);
    assert.equal(qualifiesForBackToBack(2, false), false);
    assert.equal(qualifiesForBackToBack(0, true), false, 'zero-line Pivots do NOT qualify for B2B');
});

test('buildScoreResult returns score and attack for a level 1 quad clear', () => {
    const result = buildScoreResult({rowCount: 4, pivot: false, hadBackToBack: false, level: 1, comboValue: 1});
    assert.equal(result.points, 800);
    assert.equal(result.attack, 4);
});

test('buildScoreResult applies the back-to-back multiplier of 1.5', () => {
    const result = buildScoreResult({rowCount: 4, pivot: false, hadBackToBack: true, level: 1, comboValue: 1});
    assert.equal(result.points, 1200, '800 * 1.5 * 1');
    assert.equal(result.attack, 5, 'base + B2B bonus');
});

test('buildScoreResult adds combo bonus scaled by level', () => {
    const result = buildScoreResult({rowCount: 4, pivot: false, hadBackToBack: false, level: 2, comboValue: 3});
    assert.equal(result.points, 800 * 2 + Math.max(0, 3 - 1) * 50 * 2);
    assert.equal(result.attack, 4 + Math.max(0, 3 - 1));
});

test('buildScoreResult ignores combo bonus when no rows are cleared', () => {
    const result = buildScoreResult({rowCount: 0, pivot: true, hadBackToBack: false, level: 1, comboValue: 5});
    assert.equal(result.points, 400, 'Pivot no-line base only, no combo bonus');
    assert.equal(result.attack, 0, 'zero-line Pivot sends no garbage');
});

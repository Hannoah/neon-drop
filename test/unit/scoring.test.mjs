import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    calculateGarbageAttack,
    eventMessageFor,
    baseScoreFor,
    qualifiesForBackToBack,
    buildScoreResult,
    detectTSpin,
    isPerfectClear,
    comboAfterLock,
} from '../../src/js/scoring.js';
import { createMatrix, createPiece, rotate } from '../../src/js/board.js';
import {
    PERFECT_CLEAR_BONUS,
    SOFT_DROP_POINT,
    HARD_DROP_POINT,
    TSPIN_LINE_SCORES,
} from '../../src/js/constants.js';

function emptyArena(w = 10, h = 20) {
    return createMatrix(w, h);
}

function makeAPlayer({x, y, rotation = 0} = {}) {
    const matrix = createPiece('A');
    for (let i = 0; i < rotation; i++) rotate(matrix, 1);
    return {matrix, pos: {x, y}, rotation, lastRotateUsedKick: false};
}

/** Fill the four diagonal corners around T center (pos+1,+1). */
function fillCorners(arena, player, which) {
    const cx = player.pos.x + 1;
    const cy = player.pos.y + 1;
    const map = {
        nw: [-1, -1],
        ne: [1, -1],
        sw: [-1, 1],
        se: [1, 1],
    };
    for (const key of which) {
        const [dx, dy] = map[key];
        const row = arena[cy + dy];
        if (row && row[cx + dx] !== undefined) row[cx + dx] = 8;
    }
}

// --- existing garbage / pivot alias tests ---

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

test('eventMessageFor names line clears correctly (legacy boolean path)', () => {
    assert.equal(eventMessageFor(1, false), 'SINGLE');
    assert.equal(eventMessageFor(2, false), 'DOUBLE');
    assert.equal(eventMessageFor(3, false), 'TRIPLE');
    assert.equal(eventMessageFor(4, false), 'QUAD CLEAR');
    assert.equal(eventMessageFor(0, false), '');
    assert.equal(eventMessageFor(5, false), '');
});

test('eventMessageFor names Pivot variants (legacy boolean alias)', () => {
    assert.equal(eventMessageFor(0, true), 'PIVOT');
    assert.equal(eventMessageFor(1, true), 'PIVOT SINGLE');
    assert.equal(eventMessageFor(2, true), 'PIVOT DOUBLE');
    assert.equal(eventMessageFor(3, true), 'PIVOT TRIPLE');
});

test('eventMessageFor uses Guideline labels on tSpin string path', () => {
    assert.equal(eventMessageFor(1, 'none'), 'SINGLE');
    assert.equal(eventMessageFor(2, 'none'), 'DOUBLE');
    assert.equal(eventMessageFor(3, 'none'), 'TRIPLE');
    assert.equal(eventMessageFor(4, 'none'), 'TETRIS');
    assert.equal(eventMessageFor(0, 'full'), 'T-SPIN');
    assert.equal(eventMessageFor(1, 'full'), 'T-SPIN SINGLE');
    assert.equal(eventMessageFor(2, 'full'), 'T-SPIN DOUBLE');
    assert.equal(eventMessageFor(3, 'full'), 'T-SPIN TRIPLE');
    assert.equal(eventMessageFor(0, 'mini'), 'T-SPIN MINI');
    assert.equal(eventMessageFor(1, 'mini'), 'T-SPIN MINI SINGLE');
    assert.equal(eventMessageFor(2, 'mini'), 'T-SPIN MINI DOUBLE');
});

test('eventMessageFor prefers PERFECT CLEAR when flagged', () => {
    assert.equal(eventMessageFor(4, 'none', true), 'PERFECT CLEAR');
    assert.equal(eventMessageFor(1, 'full', true), 'PERFECT CLEAR');
    assert.equal(eventMessageFor(2, false, true), 'PERFECT CLEAR');
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

test('baseScoreFor uses TSPIN mini and full tables', () => {
    assert.equal(baseScoreFor(0, 'mini'), TSPIN_LINE_SCORES.mini[0]);
    assert.equal(baseScoreFor(1, 'mini'), TSPIN_LINE_SCORES.mini[1]);
    assert.equal(baseScoreFor(2, 'mini'), TSPIN_LINE_SCORES.mini[2]);
    assert.equal(baseScoreFor(0, 'full'), TSPIN_LINE_SCORES.full[0]);
    assert.equal(baseScoreFor(1, 'full'), TSPIN_LINE_SCORES.full[1]);
    assert.equal(baseScoreFor(3, 'full'), TSPIN_LINE_SCORES.full[3]);
    assert.equal(baseScoreFor(1, 'none'), 100);
});

test('qualifiesForBackToBack flags quad clear and positive Pivots', () => {
    assert.equal(qualifiesForBackToBack(4, false), true);
    assert.equal(qualifiesForBackToBack(2, true), true);
    assert.equal(qualifiesForBackToBack(1, true), true);
    assert.equal(qualifiesForBackToBack(3, false), false);
    assert.equal(qualifiesForBackToBack(2, false), false);
    assert.equal(qualifiesForBackToBack(0, true), false, 'zero-line Pivots do NOT qualify for B2B');
});

test('qualifiesForBackToBack with tSpin strings', () => {
    assert.equal(qualifiesForBackToBack(4, 'none'), true);
    assert.equal(qualifiesForBackToBack(1, 'full'), true);
    assert.equal(qualifiesForBackToBack(2, 'mini'), true);
    assert.equal(qualifiesForBackToBack(0, 'full'), false);
    assert.equal(qualifiesForBackToBack(0, 'mini'), false);
    assert.equal(qualifiesForBackToBack(3, 'none'), false);
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

test('buildScoreResult maps pivot true to tSpin full when tSpin omitted', () => {
    const viaPivot = buildScoreResult({rowCount: 1, pivot: true, hadBackToBack: false, level: 1, comboValue: 1});
    const viaFull = buildScoreResult({rowCount: 1, tSpin: 'full', hadBackToBack: false, level: 1, comboValue: 1});
    assert.equal(viaPivot.points, viaFull.points);
    assert.equal(viaPivot.attack, viaFull.attack);
    assert.equal(viaFull.points, 800);
});

test('buildScoreResult adds soft and hard drop cell points', () => {
    const result = buildScoreResult({
        rowCount: 0,
        tSpin: 'none',
        softDropCells: 5,
        hardDropCells: 10,
        hadBackToBack: false,
        level: 1,
        comboValue: 0,
    });
    assert.equal(result.points, 5 * SOFT_DROP_POINT + 10 * HARD_DROP_POINT);
});

test('buildScoreResult adds Perfect Clear bonus scaled by level', () => {
    const result = buildScoreResult({
        rowCount: 4,
        tSpin: 'none',
        perfectClear: true,
        softDropCells: 0,
        hardDropCells: 0,
        hadBackToBack: false,
        level: 2,
        comboValue: 1,
    });
    assert.equal(result.points, 800 * 2 + PERFECT_CLEAR_BONUS[4] * 2);
});

test('buildScoreResult T-Spin Mini single includes drop points', () => {
    const result = buildScoreResult({
        rowCount: 1,
        tSpin: 'mini',
        softDropCells: 3,
        hardDropCells: 0,
        hadBackToBack: false,
        level: 1,
        comboValue: 1,
    });
    assert.equal(result.points, TSPIN_LINE_SCORES.mini[1] + 3 * SOFT_DROP_POINT);
    assert.equal(result.attack, 0, 'T-Spin Mini single sends no garbage');
});

test('calculateGarbageAttack uses a weaker Mini table than Full', () => {
    assert.equal(calculateGarbageAttack(1, 'mini', false, 1), 0);
    assert.equal(calculateGarbageAttack(2, 'mini', false, 1), 1);
    assert.equal(calculateGarbageAttack(1, 'full', false, 1), 2);
    assert.equal(calculateGarbageAttack(2, 'full', false, 1), 4);
});

test('comboAfterLock resets on a no-line lock including T-Spin', () => {
    assert.equal(comboAfterLock(4, 1), 5);
    assert.equal(comboAfterLock(0, 2), 1);
    assert.equal(comboAfterLock(3, 0), 0, 'zero-line locks break combo');
});

// --- detectTSpin ---

test('detectTSpin returns none when last action was not rotate', () => {
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10});
    fillCorners(arena, player, ['nw', 'ne', 'sw']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: false, usedKick: false}), 'none');
});

test('detectTSpin returns none for non-A pieces', () => {
    const arena = emptyArena();
    const matrix = createPiece('B');
    const player = {matrix, pos: {x: 3, y: 10}, rotation: 0};
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: false}), 'none');
});

test('detectTSpin returns none with fewer than 3 corners occupied', () => {
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10});
    fillCorners(arena, player, ['nw', 'ne']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: false}), 'none');
});

test('detectTSpin full when both front corners occupied (3 corners, with kick)', () => {
    // R0 pointing up: front = NW, NE. Fill NW, NE, SW (back SE open).
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10, rotation: 0});
    fillCorners(arena, player, ['nw', 'ne', 'sw']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: true}), 'full');
});

test('detectTSpin mini when exactly 3 corners, not both front, and usedKick', () => {
    // R0: front NW+NE. Fill NW, SW, SE (NE open) → 3 corners, only one front → mini with kick.
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10, rotation: 0});
    fillCorners(arena, player, ['nw', 'sw', 'se']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: true}), 'mini');
});

test('detectTSpin full when exactly 3 corners without kick (no mini)', () => {
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10, rotation: 0});
    fillCorners(arena, player, ['nw', 'sw', 'se']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: false}), 'full');
});

test('detectTSpin full when all 4 corners occupied', () => {
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10, rotation: 0});
    fillCorners(arena, player, ['nw', 'ne', 'sw', 'se']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: true}), 'full');
});

test('detectTSpin uses player.lastRotateUsedKick when usedKick omitted', () => {
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10, rotation: 0});
    player.lastRotateUsedKick = true;
    fillCorners(arena, player, ['nw', 'sw', 'se']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true}), 'mini');
});

test('detectTSpin treats out-of-bounds as occupied corners', () => {
    // Place T near top so NW/NE are above the board.
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: -1, rotation: 0});
    // center at (4, 0); NW=(3,-1) and NE=(5,-1) OOB → occupied; fill one bottom.
    fillCorners(arena, player, ['sw']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: false}), 'full');
});

test('detectTSpin front corners follow rotation (R1 pointing right)', () => {
    // R1 front = NE, SE. Fill NE, SE, NW → both front → full even with kick.
    const arena = emptyArena();
    const player = makeAPlayer({x: 3, y: 10, rotation: 1});
    fillCorners(arena, player, ['ne', 'se', 'nw']);
    assert.equal(detectTSpin({arena, player, lastActionWasRotate: true, usedKick: true}), 'full');
});

// --- isPerfectClear ---

test('isPerfectClear is true only when every cell is 0', () => {
    const empty = emptyArena(4, 4);
    assert.equal(isPerfectClear(empty), true);
    empty[2][1] = 3;
    assert.equal(isPerfectClear(empty), false);
});

test('isPerfectClear is false for a non-empty board', () => {
    const arena = emptyArena();
    arena[arena.length - 1][0] = 8;
    assert.equal(isPerfectClear(arena), false);
});

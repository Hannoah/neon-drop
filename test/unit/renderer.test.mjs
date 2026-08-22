import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createMatrix, createPiece } from '../../src/js/board.js';
import { createRenderer, expireFlashingLines, drawClearFlashes } from '../../src/js/renderer.js';

function fakeContext() {
    return {
        save() {},
        restore() {},
        translate() {},
        setTransform() {},
        fillRect() {},
        strokeRect() {},
        fillText() {},
    };
}

function countingContext() {
    const context = fakeContext();
    context.fillRectCount = 0;
    context.fillRect = () => { context.fillRectCount++; };
    return context;
}

test('renderer writes the decayed shake value back to game state', () => {
    const context = fakeContext();
    const arena = createMatrix(2, 4);
    const player = {matrix: [[1]], pos: {x: 0, y: 0}};
    let shakeTime = 5;

    const renderer = createRenderer({
        canvas: {width: 2, height: 4, clientWidth: 2, clientHeight: 4},
        context,
        nextCanvas: {width: 2, height: 2},
        nextContext: fakeContext(),
        holdCanvas: {width: 2, height: 2},
        holdContext: fakeContext(),
        opponentCanvas: {width: 2, height: 4},
        opponentContext: fakeContext(),
        VERSUS_WIDTH: 2,
        VERSUS_HEIGHT: 4,
        getState: () => ({
            shakeTime,
            arena,
            player,
            combo: 0,
            flashingLines: [],
            opponentActive: false,
            opponent: {arena, matrix: null, pos: {x: 0, y: 0}},
        }),
        setShakeTime: value => { shakeTime = value; },
    });

    renderer.draw();

    assert.equal(shakeTime, 4.4);
});

test('renderer skips an inactive opponent even when its matrix exists', () => {
    const opponentContext = countingContext();
    const arena = createMatrix(2, 4);
    const renderer = createRenderer({
        canvas: {width: 2, height: 4, clientWidth: 2, clientHeight: 4}, context: fakeContext(),
        nextCanvas: {width: 2, height: 2}, nextContext: fakeContext(),
        holdCanvas: {width: 2, height: 2}, holdContext: fakeContext(),
        opponentCanvas: {width: 2, height: 4}, opponentContext,
        VERSUS_WIDTH: 2, VERSUS_HEIGHT: 4,
        getState: () => ({
            opponentActive: false,
            opponent: {arena, matrix: [[1]], pos: {x: 0, y: 0}},
        }),
    });

    renderer.drawOpponent();

    assert.equal(opponentContext.fillRectCount, 1, 'only the canvas clear should be drawn');
});

test('renderer draws an active opponent without depending on game mode', () => {
    const opponentContext = countingContext();
    const arena = createMatrix(2, 4);
    const renderer = createRenderer({
        canvas: {width: 2, height: 4, clientWidth: 2, clientHeight: 4}, context: fakeContext(),
        nextCanvas: {width: 2, height: 2}, nextContext: fakeContext(),
        holdCanvas: {width: 2, height: 2}, holdContext: fakeContext(),
        opponentCanvas: {width: 2, height: 4}, opponentContext,
        VERSUS_WIDTH: 2, VERSUS_HEIGHT: 4,
        getState: () => ({
            opponentActive: true,
            opponent: {arena, matrix: [[1]], pos: {x: 0, y: 0}},
        }),
    });

    renderer.drawOpponent();

    assert.ok(opponentContext.fillRectCount > 1, 'the opponent piece should be drawn after the clear');
});

test('drawNext stacks every preview matrix in separate slots', () => {
    const nextContext = countingContext();
    const preview = ['A', 'B', 'C', 'D', 'S'].map(type => createPiece(type));
    const renderer = createRenderer({
        canvas: {width: 2, height: 4, clientWidth: 2, clientHeight: 4}, context: fakeContext(),
        nextCanvas: {width: 80, height: 400, clientWidth: 80, clientHeight: 400}, nextContext,
        holdCanvas: {width: 2, height: 2}, holdContext: fakeContext(),
        opponentCanvas: {width: 2, height: 4}, opponentContext: fakeContext(),
        VERSUS_WIDTH: 2, VERSUS_HEIGHT: 4,
        getState: () => ({player: {next: preview[0]}}),
    });

    renderer.drawNext(preview);

    assert.ok(nextContext.fillRectCount > preview.length, 'each preview piece should be drawn after the clear');
});

test('expireFlashingLines removes every expired entry in one pass', () => {
    const lines = [
        {y: 1, time: 0},
        {y: 2, time: 0},
        {y: 3, time: 50},
    ];
    assert.deepEqual(expireFlashingLines(lines, 16), [{y: 3, time: 34}]);
});

test('clear flash highlights each mino instead of painting a full-width slab', () => {
    const rects = [];
    const ctx = fakeContext();
    ctx.fillRect = (x, y, w, h) => {
        rects.push({x, y, w, h});
    };
    const arena = createMatrix(4, 4);
    arena[2].fill(1);

    drawClearFlashes(arena, [{y: 2, time: 200, peak: 200}], ctx, 4);

    const slab = rects.find(rect => rect.y === 2 && rect.x === 0 && rect.w >= 4 && rect.h >= 0.5);
    assert.equal(slab, undefined, 'a highlighter bar hides the minos');
    const cells = rects.filter(rect => rect.w < 1 && rect.h < 1 && rect.y >= 2 && rect.y < 3);
    assert.equal(cells.length, 4, 'every mino on the clearing row should flash');
});

test('board draw does not smear combo as 1px canvas text', () => {
    let fillTextCalls = 0;
    const context = fakeContext();
    context.fillText = () => { fillTextCalls++; };
    const arena = createMatrix(2, 4);
    const renderer = createRenderer({
        canvas: {width: 2, height: 4, clientWidth: 2, clientHeight: 4},
        context,
        nextCanvas: {width: 2, height: 2},
        nextContext: fakeContext(),
        holdCanvas: {width: 2, height: 2},
        holdContext: fakeContext(),
        opponentCanvas: {width: 2, height: 4},
        opponentContext: fakeContext(),
        VERSUS_WIDTH: 2,
        VERSUS_HEIGHT: 4,
        getState: () => ({
            shakeTime: 0,
            arena,
            player: {matrix: null, pos: {x: 0, y: 0}},
            combo: 6,
            flashingLines: [],
            opponentActive: false,
            opponent: {arena, matrix: null, pos: {x: 0, y: 0}},
        }),
        setShakeTime: () => {},
    });

    renderer.draw();

    assert.equal(fillTextCalls, 0, 'combo lives in the HUD, not as unreadable board text');
});

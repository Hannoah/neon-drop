import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createMatrix } from '../../src/js/board.js';
import { createRenderer } from '../../src/js/renderer.js';

function fakeContext() {
    return {
        save() {},
        restore() {},
        translate() {},
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
        canvas: {width: 2, height: 4},
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

    assert.equal(shakeTime, 4.5);
});

test('renderer skips an inactive opponent even when its matrix exists', () => {
    const opponentContext = countingContext();
    const arena = createMatrix(2, 4);
    const renderer = createRenderer({
        canvas: {width: 2, height: 4}, context: fakeContext(),
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
        canvas: {width: 2, height: 4}, context: fakeContext(),
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

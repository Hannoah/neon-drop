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
            gameMode: 'marathon',
            opponent: {arena, matrix: null, pos: {x: 0, y: 0}},
        }),
        setShakeTime: value => { shakeTime = value; },
    });

    renderer.draw();

    assert.equal(shakeTime, 4.5);
});

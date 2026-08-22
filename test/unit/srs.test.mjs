import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPiece, createMatrix, collide, cloneMatrix, rotate } from '../../src/js/board.js';
import { VERSUS_WIDTH, VERSUS_HEIGHT } from '../../src/js/constants.js';
import { tryRotateSrs, tryRotate180 } from '../../src/js/srs.js';

function emptyArena() {
    return createMatrix(VERSUS_WIDTH, VERSUS_HEIGHT);
}

function makePlayer(type, {x, y, rotation = 0} = {}) {
    const matrix = createPiece(type);
    // Advance matrix to the requested rotation without kicks.
    for (let i = 0; i < rotation; i++) {
        rotate(matrix, 1);
    }
    return {
        matrix,
        pos: {x, y},
        rotation,
        lastRotateUsedKick: false,
    };
}

test('tryRotateSrs kicks T-like piece A away from a wall', () => {
    const arena = emptyArena();
    // A at R1 (pointing right) pressed against the left wall: basic CW
    // collides, SRS kick (+1,0) must succeed.
    const player = makePlayer('A', {x: -1, y: 4, rotation: 1});
    assert.equal(collide(arena, player), false, 'setup pose must be legal');

    const result = tryRotateSrs(arena, player, 1, collide);

    assert.deepEqual(result, {ok: true, usedKick: true});
    assert.equal(player.rotation, 2);
    assert.equal(player.pos.x, 0, 'kick must shift off the wall');
    assert.equal(player.lastRotateUsedKick, true);
    assert.equal(collide(arena, player), false);
});

test('tryRotateSrs kicks I-like piece S when flattening against a wall', () => {
    const arena = emptyArena();
    // S spawn is vertical; CW to horizontal at x=-1 needs an I-table kick.
    const player = makePlayer('S', {x: -1, y: 2, rotation: 0});
    assert.equal(collide(arena, player), false, 'setup pose must be legal');

    const result = tryRotateSrs(arena, player, 1, collide);

    assert.deepEqual(result, {ok: true, usedKick: true});
    assert.equal(player.rotation, 1);
    assert.equal(player.pos.x, 0, 'I kick (+1,0) must clear the left wall');
    assert.equal(player.lastRotateUsedKick, true);
    assert.equal(collide(arena, player), false);
});

test('tryRotateSrs restores pose when every kick fails', () => {
    const arena = emptyArena();
    // Solid field — no kick can land.
    for (const row of arena) row.fill(8);

    const player = makePlayer('A', {x: 4, y: 8, rotation: 0});
    const matrixBefore = cloneMatrix(player.matrix);
    const posBefore = {x: player.pos.x, y: player.pos.y};

    const result = tryRotateSrs(arena, player, 1, collide);

    assert.deepEqual(result, {ok: false, usedKick: false});
    assert.equal(player.rotation, 0);
    assert.deepEqual(player.pos, posBefore);
    assert.deepEqual(player.matrix, matrixBefore);
    assert.equal(player.lastRotateUsedKick, false);
});

test('tryRotate180 turns T-like A from R0 to R2 without a leftover 90 pose', () => {
    const arena = emptyArena();
    const player = makePlayer('A', {x: 4, y: 6, rotation: 0});
    const result = tryRotate180(arena, player, collide);
    assert.deepEqual(result, {ok: true, usedKick: false});
    assert.equal(player.rotation, 2);
    assert.equal(collide(arena, player), false);
});

test('tryRotate180 restores the original pose when every kick fails', () => {
    const arena = emptyArena();
    for (const row of arena) row.fill(8);
    const player = makePlayer('A', {x: 4, y: 8, rotation: 1});
    const matrixBefore = cloneMatrix(player.matrix);
    const posBefore = {x: player.pos.x, y: player.pos.y};
    const result = tryRotate180(arena, player, collide);
    assert.deepEqual(result, {ok: false, usedKick: false});
    assert.equal(player.rotation, 1);
    assert.deepEqual(player.pos, posBefore);
    assert.deepEqual(player.matrix, matrixBefore);
});

test('tryRotateSrs rotates D (O-like) in place with zero offsets', () => {
    const arena = emptyArena();
    const player = makePlayer('D', {x: 5, y: 6, rotation: 0});
    const posBefore = {x: player.pos.x, y: player.pos.y};

    const result = tryRotateSrs(arena, player, 1, collide);

    assert.deepEqual(result, {ok: true, usedKick: false});
    assert.equal(player.rotation, 1);
    assert.deepEqual(player.pos, posBefore, 'O must not translate');
    assert.equal(player.lastRotateUsedKick, false);
    assert.equal(collide(arena, player), false);
});

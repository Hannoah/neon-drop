import { test } from 'node:test';
import assert from 'node:assert/strict';

//Minimal DOM stub so isEditableTarget can run in Node without a browser.
if (!globalThis.document) {
    const stub = () => ({
        matches: () => false,
        isContentEditable: false,
    });
    globalThis.document = { createElement: stub };
}

import {
    shuffleBag,
    cloneBoard,
    cloneMatrix,
    clearFullRows,
    addGarbageLines,
    collide,
    createMatrix,
    createPiece,
    rotate,
    merge,
    formatElapsedTime,
    pieceTypeFromMatrix,
    initialRotationFor,
    hasGarbage,
} from '../../src/js/board.js';

test('shuffleBag returns all seven piece types', () => {
    const bag = shuffleBag();
    assert.equal(bag.length, 7);
    assert.equal(new Set(bag).size, 7, 'bag must contain each piece once');
    for (const piece of bag) {
        assert.ok('ABCDEFS'.includes(piece), `unexpected piece type ${piece}`);
    }
});

test('shuffleBag produces varied distributions', () => {
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
        seen.add(shuffleBag().join(''));
    }
    assert.ok(seen.size > 1, 'shuffleBag must not always return the same order');
});

test('createMatrix constructs a zero-filled matrix', () => {
    const matrix = createMatrix(4, 3);
    assert.equal(matrix.length, 3);
    assert.deepEqual(matrix, [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
});

test('cloneBoard and cloneMatrix produce independent copies', () => {
    const board = [[1, 2], [3, 4]];
    const boardCopy = cloneBoard(board);
    const matrixCopy = cloneMatrix([[5, 6]]);
    boardCopy[0][0] = 99;
    matrixCopy[0][0] = 99;
    assert.equal(board[0][0], 1, 'cloneBoard must not mutate the source');
    assert.equal([[5, 6]][0][0], 5);
});

test('clearFullRows removes full rows and returns cleared count', () => {
    const board = [
        [1, 1, 1],
        [0, 1, 1],
        [2, 2, 2],
        [0, 0, 0],
    ];
    const cleared = clearFullRows(board);
    assert.equal(cleared, 2, 'both full rows must be cleared');
    assert.equal(board.length, 4);
    assert.deepEqual(board[0], [0, 0, 0]);
    assert.deepEqual(board[2], [0, 1, 1], 'partial rows must shift down');
});

test('addGarbageLines injects rows with one hole each', () => {
    const board = createMatrix(4, 6);
    addGarbageLines(board, 2, () => 0.5);
    assert.equal(board.length, 6, 'board height must remain stable');
    const garbageRows = board.slice(-2);
    for (const row of garbageRows) {
        const filled = row.filter(v => v === 8).length;
        const holes = row.filter(v => v === 0).length;
        assert.equal(filled, 3, 'garbage row must have width - 1 filled cells');
        assert.equal(holes, 1, 'garbage row must contain exactly one hole');
    }
    assert.deepEqual(board.slice(0, 4).flat(), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
});

test('addGarbageLines reports when occupied rows are pushed off the top', () => {
    const board = createMatrix(4, 4);
    board[0][0] = 1;

    const overflowed = addGarbageLines(board, 1, () => 0);

    assert.equal(overflowed, true, 'garbage overflow must be detectable by the game');
});

test('addGarbageLines reports no overflow for an empty board', () => {
    const board = createMatrix(4, 4);

    assert.equal(addGarbageLines(board, 1, () => 0), false);
});

test('addGarbageLines with zero count leaves board untouched', () => {
    const board = createMatrix(3, 3);
    addGarbageLines(board, 0);
    assert.deepEqual(board, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
});

test('addGarbageLines clamps overflowing counts to the board height', () => {
    const board = createMatrix(3, 2);
    addGarbageLines(board, 10, () => 0);
    assert.equal(board.filter(row => row.includes(0)).length, 2);
    assert.equal(board[0][0], 0, 'overflow must not corrupt the board');
});

test('collide returns true when a piece overlaps an existing block', () => {
    const arena = createMatrix(3, 3);
    arena[1][1] = 1;
    const player = {matrix: [[1, 0], [0, 0]], pos: {x: 0, y: 0}};
    assert.equal(collide(arena, player), false, 'piece sits on empty cells');
    player.matrix = [[0, 0], [0, 1]];
    assert.equal(collide(arena, player), true, 'overlapping cells must collide');
});

test('collide treats floor and walls as solid', () => {
    const arena = createMatrix(2, 2);
    const piece = {matrix: [[1]], pos: {x: 0, y: 2}};
    assert.equal(collide(arena, piece), true, 'cannot move below the floor');
    piece.pos = {x: 2, y: 0};
    assert.equal(collide(arena, piece), true, 'cannot move past the right wall');
    piece.pos = {x: -1, y: 0};
    assert.equal(collide(arena, piece), true, 'cannot move past the left wall');
});

test('collide returns true for null matrix', () => {
    assert.equal(collide(createMatrix(2, 2), {matrix: null, pos: {x: 0, y: 0}}), true);
});

test('createPiece returns the shape for every piece type', () => {
    for (const type of 'ABCDEFS') {
        const piece = createPiece(type);
        assert.ok(piece && piece.length > 0, `createPiece('${type}') must return a shape`);
    }
    assert.equal(createPiece('X'), undefined, 'unknown piece types return undefined');
});

test('rotate performs a clockwise rotation when dir > 0', () => {
    const matrix = [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ];
    rotate(matrix, 1);
    assert.deepEqual(matrix, [
        [0, 1, 0],
        [0, 1, 1],
        [0, 1, 0],
    ]);
});

test('rotate performs a counter-clockwise rotation when dir <= 0', () => {
    const matrix = [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ];
    rotate(matrix, -1);
    assert.deepEqual(matrix, [
        [0, 1, 0],
        [1, 1, 0],
        [0, 1, 0],
    ]);
});

test('merge stamps the player matrix into the arena at its position', () => {
    const arena = createMatrix(4, 4);
    const player = {matrix: [[1, 1]], pos: {x: 1, y: 2}};
    merge(arena, player);
    assert.deepEqual(arena[2], [0, 1, 1, 0]);
    assert.deepEqual(arena[0], [0, 0, 0, 0]);
});

test('formatElapsedTime formats milliseconds as MM:SS', () => {
    assert.equal(formatElapsedTime(0), '00:00');
    assert.equal(formatElapsedTime(5999), '00:05');
    assert.equal(formatElapsedTime(65000), '01:05');
    assert.equal(formatElapsedTime(3600000), '60:00');
});

test('pieceTypeFromMatrix reads the spawn letter from cell values', () => {
    assert.equal(pieceTypeFromMatrix(createPiece('A')), 'A');
    assert.equal(pieceTypeFromMatrix(createPiece('S')), 'S');
    const rotated = createPiece('B');
    rotate(rotated, 1);
    assert.equal(pieceTypeFromMatrix(rotated), 'B');
    assert.equal(pieceTypeFromMatrix([[0, 0], [0, 0]]), undefined);
});

test('initialRotationFor matches non-Guideline spawn matrices', () => {
    assert.equal(initialRotationFor('A'), 0);
    assert.equal(initialRotationFor('B'), 3);
    assert.equal(initialRotationFor('C'), 1);
    assert.equal(initialRotationFor('S'), 3);
});

test('hasGarbage is true only while garbage cells remain', () => {
    const board = createMatrix(4, 3);
    assert.equal(hasGarbage(board), false);
    board[2][1] = 8;
    assert.equal(hasGarbage(board), true);
    board[2][1] = 1;
    assert.equal(hasGarbage(board), false, 'player blocks are not cheese garbage');
});

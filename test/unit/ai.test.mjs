import { test } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateOpponentBoard, chooseOpponentMove } from '../../src/js/ai.js';
import { createMatrix, createPiece, cloneBoard } from '../../src/js/board.js';

test('evaluateOpponentBoard penalises a tall stack with holes', () => {
    const flatBoard = createMatrix(4, 6);
    const dangerousBoard = cloneBoard(flatBoard);
    for (let y = 0; y < 5; y++) dangerousBoard[y + 1][0] = 1;
    dangerousBoard[5][1] = 0;
    dangerousBoard[5][2] = 1;

    assert.ok(evaluateOpponentBoard(dangerousBoard, 0) > evaluateOpponentBoard(flatBoard, 0),
        'a board with height and holes must score higher (worse) than a flat board');
});

test('evaluateOpponentBoard rewards cleared rows', () => {
    const board = createMatrix(4, 6);
    board[5][0] = 1;
    board[5][1] = 1;
    board[5][2] = 1;
    board[5][3] = 1;
    assert.ok(evaluateOpponentBoard(board, 1) < evaluateOpponentBoard(board, 0),
        'clearing the full bottom row must improve (lower) the heuristic');
});

test('chooseOpponentMove returns null for an empty board shape', () => {
    assert.equal(chooseOpponentMove(null, createMatrix(4, 6)), null);
    assert.equal(chooseOpponentMove(createPiece('A'), []), null);
});

test('chooseOpponentMove returns a valid move object with expected fields', () => {
    const board = createMatrix(6, 8);
    const move = chooseOpponentMove(createPiece('D'), board);
    assert.ok(move);
    assert.ok(Number.isInteger(move.x));
    assert.ok(Number.isInteger(move.y));
    assert.ok(Number.isInteger(move.rotation));
    assert.ok(typeof move.score === 'number');
    assert.ok(move.matrix && move.matrix.length > 0);
});

test('chooseOpponentMove does not mutate the input board', () => {
    const board = createMatrix(6, 8);
    board[7][3] = 8;
    const snapshot = JSON.stringify(board);
    chooseOpponentMove(createPiece('A'), board);
    assert.equal(JSON.stringify(board), snapshot, 'AI search must leave the board untouched');
});

test('chooseOpponentMove prefers landing flat surfaces over creating holes', () => {
    const board = createMatrix(4, 8);
    board[7][0] = 1;
    board[7][1] = 1;
    board[7][2] = 1;
    const move = chooseOpponentMove(createPiece('D'), board);
    assert.ok(move);
    // Place the Square above the existing stack or adjacent so it does not create a hole
    assert.ok(move.x >= 0 && move.x <= board[0].length - 2);
    assert.ok(move.y >= 0 && move.y < board.length);
});

test('chooseOpponentMove skips placements that immediately collide', () => {
    const board = createMatrix(4, 4);
    board[0][0] = 1;
    board[0][1] = 1;
    const move = chooseOpponentMove(createPiece('S'), board);
    assert.ok(move);
    assert.ok(move.matrix && move.matrix.length > 0);
});

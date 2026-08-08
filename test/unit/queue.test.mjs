import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPieceQueue } from '../../src/js/queue.js';

test('createPieceQueue exposes five upcoming types and shifts one', () => {
    const q = createPieceQueue(() => ['A', 'B', 'C', 'D', 'E', 'F', 'S']);
    assert.deepEqual(q.preview(5), ['A', 'B', 'C', 'D', 'E']);
    assert.equal(q.next(), 'A');
    assert.deepEqual(q.preview(5), ['B', 'C', 'D', 'E', 'F']);
});

test('refills from bag when buffer runs low', () => {
    let bags = 0;
    const q = createPieceQueue(() => {
        bags++;
        return ['A', 'B', 'C', 'D', 'E', 'F', 'S'];
    });
    for (let i = 0; i < 7; i++) q.next();
    assert.equal(bags, 2);
    assert.equal(q.preview(5).length, 5);
});

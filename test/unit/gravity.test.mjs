import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumeGravity, isInstantGravity } from '../../src/js/gravity.js';

test('isInstantGravity treats 20G-scale intervals as lock-to-ground', () => {
    assert.equal(isInstantGravity(1), true);
    assert.equal(isInstantGravity(0.05), true);
    assert.equal(isInstantGravity(50), false);
    assert.equal(isInstantGravity(1000), false);
});

test('consumeGravity drops once per interval and keeps leftover time', () => {
    assert.deepEqual(consumeGravity(16, 50), {drops: 0, remaining: 16});
    assert.deepEqual(consumeGravity(51, 50), {drops: 1, remaining: 1});
    assert.deepEqual(consumeGravity(160, 50), {drops: 3, remaining: 10});
});

test('consumeGravity signals unlimited drops for instant gravity', () => {
    assert.deepEqual(consumeGravity(16, 1), {drops: Infinity, remaining: 0});
});

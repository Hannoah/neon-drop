import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    LEADERBOARD_GENERATION,
    readLeaderboard,
    writeLeaderboard,
} from '../../src/js/leaderboard.js';

function memoryStorage(initial = {}) {
    return {
        data: {...initial},
        getItem(key) { return this.data[key] ?? null; },
        setItem(key, value) { this.data[key] = value; },
    };
}

test('readLeaderboard returns an empty list for a missing mode board', () => {
    const storage = memoryStorage();
    assert.deepEqual(readLeaderboard(storage, 'sprint'), []);
});

test('writeLeaderboard stores scores per mode without mixing boards', () => {
    const storage = memoryStorage();
    writeLeaderboard([{name: 'A', score: 10}], storage, 'sprint');
    writeLeaderboard([{name: 'B', score: 20}], storage, 'marathon');
    assert.deepEqual(readLeaderboard(storage, 'sprint'), [{name: 'A', score: 10}]);
    assert.deepEqual(readLeaderboard(storage, 'marathon'), [{name: 'B', score: 20}]);
    const stored = JSON.parse(storage.data.tetrisLeaderboard);
    assert.equal(stored.generation, LEADERBOARD_GENERATION);
    assert.equal(stored.scores, undefined);
});

test('generation 2 scores are wiped instead of leaking across modes', () => {
    const storage = memoryStorage({
        tetrisLeaderboard: JSON.stringify({
            generation: 2,
            scores: [{name: 'OLD', score: 99}],
        }),
    });
    assert.deepEqual(readLeaderboard(storage, 'marathon'), []);
    const stored = JSON.parse(storage.data.tetrisLeaderboard);
    assert.equal(stored.generation, LEADERBOARD_GENERATION);
    assert.deepEqual(stored.boards, {});
});

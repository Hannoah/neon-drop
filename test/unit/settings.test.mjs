import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_SETTINGS,
    CLASSIC_BINDINGS,
    GUIDELINE_BINDINGS,
    normalizeSettings,
    applyPreset,
    assignBinding,
} from '../../src/js/settings.js';
import { readLeaderboard, LEADERBOARD_GENERATION } from '../../src/js/leaderboard.js';

test('normalizeSettings migrates v1 preferences', () => {
    const s = normalizeSettings({mode: 'sprint', bgm: false, sfx: true});
    assert.equal(s.version, 2);
    assert.equal(s.mode, 'sprint');
    assert.equal(s.bgm, false);
    assert.equal(s.preset, 'classic');
    assert.equal(s.timing.das, DEFAULT_SETTINGS.timing.das);
    assert.deepEqual(s.bindings.moveLeft, CLASSIC_BINDINGS.moveLeft);
});

test('applyPreset guideline overwrites bindings', () => {
    const s = applyPreset(normalizeSettings({}), 'guideline');
    assert.equal(s.preset, 'guideline');
    assert.deepEqual(s.bindings, GUIDELINE_BINDINGS);
});

test('assignBinding swaps on conflict', () => {
    let s = normalizeSettings({});
    const formerHold = [...s.bindings.hold];
    const key = s.bindings.pause[0]; // KeyP
    s = assignBinding(s, 'hold', key);
    assert.deepEqual(s.bindings.hold, [key]);
    assert.deepEqual(s.bindings.pause, formerHold);
    assert.ok(s.bindings.pause.includes('KeyC'));
    assert.ok(!s.bindings.pause.includes(key));
    assert.equal(s.preset, 'custom');
});

test('readLeaderboard clears foreign generation', () => {
    const storage = {
        data: {
            tetrisLeaderboard: JSON.stringify({
                generation: 0,
                scores: [{name: 'OLD', score: 999}],
            }),
        },
        getItem(k) { return this.data[k] ?? null; },
        setItem(k, v) { this.data[k] = v; },
    };
    assert.deepEqual(readLeaderboard(storage), []);
    assert.equal(JSON.parse(storage.data.tetrisLeaderboard).generation, LEADERBOARD_GENERATION);
});

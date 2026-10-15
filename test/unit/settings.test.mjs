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

test('language preference survives normalization and control preset changes', () => {
    const korean = normalizeSettings({version: 2, language: 'ko'});
    assert.equal(korean.language, 'ko');
    assert.equal(applyPreset(korean, 'guideline').language, 'ko');
    assert.equal(normalizeSettings({version: 2, language: 'en'}).language, 'en');
    assert.ok(['en', 'ko'].includes(normalizeSettings({language: 'unsupported'}).language));
});

test('missing or invalid timing values use finite defaults while ARR zero is preserved', () => {
    for (const timing of [undefined, {}, {das: 'bad', arr: 'bad', lockDelay: 'bad'},
        {das: Infinity, arr: Infinity, lockDelay: Infinity}]) {
        assert.deepEqual(normalizeSettings({version: 2, timing}).timing, DEFAULT_SETTINGS.timing);
    }
    assert.equal(normalizeSettings({version: 2, timing: {arr: 0}}).timing.arr, 0);
});

test('malformed saved bindings fall back per action without losing valid settings', () => {
    const s = normalizeSettings({version: 2, bgm: false, bindings: {
        moveLeft: 123, moveRight: 'KeyD', hold: ['KeyH', null, 42, ''], rotateCCW: [],
    }});
    assert.deepEqual(s.bindings.moveLeft, CLASSIC_BINDINGS.moveLeft);
    assert.deepEqual(s.bindings.moveRight, CLASSIC_BINDINGS.moveRight);
    assert.deepEqual(s.bindings.hold, ['KeyH']);
    assert.deepEqual(s.bindings.rotateCCW, []);
    assert.equal(s.bgm, false);
});

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

test('classic and guideline presets bind 180 to A', () => {
    assert.deepEqual(CLASSIC_BINDINGS.rotate180, ['KeyA']);
    assert.deepEqual(GUIDELINE_BINDINGS.rotate180, ['KeyA']);
    assert.deepEqual(normalizeSettings({}).bindings.rotate180, ['KeyA']);
});

test('normalizeSettings fills empty rotate180 with A when A is free', () => {
    const s = normalizeSettings({
        version: 2,
        preset: 'classic',
        bindings: {
            ...CLASSIC_BINDINGS,
            rotate180: [],
        },
    });
    assert.deepEqual(s.bindings.rotate180, ['KeyA']);
});

test('normalizeSettings does not steal A when it is already bound', () => {
    const s = normalizeSettings({
        version: 2,
        preset: 'custom',
        bindings: {
            ...CLASSIC_BINDINGS,
            rotate180: [],
            hold: ['KeyA'],
        },
    });
    assert.deepEqual(s.bindings.rotate180, []);
    assert.deepEqual(s.bindings.hold, ['KeyA']);
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

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    gradeForSprint,
    gradeForMarathon,
    starsForGrade,
    recordRun,
    createDefaultMeta,
    paceValueAt,
    noteTetris,
    noteRunEnd,
} from '../../src/js/meta.js';
import { dailySeed, mulberry32 } from '../../src/js/rng.js';
import { createBagFactory } from '../../src/js/board.js';
import { PIECE_TYPES } from '../../src/js/constants.js';

test('sprint and marathon grades map time thresholds', () => {
    assert.equal(gradeForSprint(59000), 'S');
    assert.equal(gradeForSprint(100000), 'B');
    assert.equal(gradeForMarathon(350000), 'S');
    assert.equal(gradeForMarathon(700000), 'C');
    assert.equal(starsForGrade('S'), 3);
    assert.equal(starsForGrade('B'), 2);
});

test('recordRun stores sprint PB and unlocks gold frame on A/S', () => {
    let meta = createDefaultMeta();
    const first = recordRun(meta, {mode: 'sprint', elapsedMs: 95000, paceSamples: [{t: 0, v: 0}, {t: 1000, v: 4}]});
    assert.equal(first.grade, 'B');
    assert.equal(first.isPb, true);
    meta = first.meta;
    const better = recordRun(meta, {mode: 'sprint', elapsedMs: 50000, paceSamples: [{t: 500, v: 10}]});
    assert.equal(better.grade, 'S');
    assert.equal(better.isPb, true);
    assert.ok(better.unlocks.includes('frame:gold'));
    assert.equal(better.meta.pb.sprintMs, 50000);
    assert.deepEqual(better.meta.pace.sprint, [{t: 500, v: 10}]);
});

test('paceValueAt returns last sample at or before elapsed time', () => {
    const samples = [{t: 0, v: 0}, {t: 1000, v: 5}, {t: 2000, v: 12}];
    assert.equal(paceValueAt(samples, 999), 0);
    assert.equal(paceValueAt(samples, 1000), 5);
    assert.equal(paceValueAt(samples, 2500), 12);
});

test('dailySeed and seeded bags are deterministic', () => {
    const seed = dailySeed(new Date('2026-08-09T12:00:00Z'));
    assert.equal(seed, 20260809);
    const a = createBagFactory(mulberry32(seed))();
    const b = createBagFactory(mulberry32(seed))();
    assert.deepEqual(a, b);
    assert.equal([...a].sort().join(''), [...PIECE_TYPES].sort().join(''));
});

test('noteRunEnd increments games without touching PBs', () => {
    const meta = createDefaultMeta();
    meta.stats.tetrises = 4;
    const next = noteRunEnd(meta);
    assert.equal(next.stats.games, 1);
    assert.equal(next.stats.tetrises, 4);
    assert.equal(next.pb.sprintMs, null);
});

test('noteTetris unlocks rival frame at 10 tetrises', () => {
    let meta = createDefaultMeta();
    meta.stats.tetrises = 9;
    const result = noteTetris(meta);
    assert.ok(result.unlocks.includes('frame:rival'));
    assert.ok(result.meta.unlocks.frames.includes('rival'));
});

test('daily clear starts a streak and continues on consecutive UTC days', () => {
    const first = recordRun(createDefaultMeta(), {
        mode: 'daily',
        elapsedMs: 80000,
        score: 1200,
        now: new Date('2026-08-21T18:00:00Z'),
    });
    assert.equal(first.meta.stats.dailyStreak, 1);
    assert.equal(first.meta.stats.lastDailyKey, '20260821');

    const sameDay = recordRun(first.meta, {
        mode: 'daily',
        elapsedMs: 70000,
        score: 1400,
        now: new Date('2026-08-21T22:00:00Z'),
    });
    assert.equal(sameDay.meta.stats.dailyStreak, 1, 'same UTC day must not double-count');

    const nextDay = recordRun(sameDay.meta, {
        mode: 'daily',
        elapsedMs: 75000,
        score: 1300,
        now: new Date('2026-08-22T01:00:00Z'),
    });
    assert.equal(nextDay.meta.stats.dailyStreak, 2);

    const skipped = recordRun(nextDay.meta, {
        mode: 'daily',
        elapsedMs: 90000,
        score: 900,
        now: new Date('2026-08-24T12:00:00Z'),
    });
    assert.equal(skipped.meta.stats.dailyStreak, 1, 'a missed day must reset the streak');
});

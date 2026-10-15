import { test } from 'node:test';
import assert from 'node:assert/strict';
import {setLanguage} from '../../src/js/i18n.js';
import {
    unlockLabel,
    formatUnlocks,
    codeLabel,
    bindingPhrase,
    controlLegendRows,
    msUntilNextUtcDay,
    formatHoursLeft,
    dailyCardDetail,
    fanfareKind,
    formatRunGrade,
} from '../../src/js/juice.js';

test('unlockLabel maps cosmetic ids to shop-readable names', () => {
    assert.equal(unlockLabel('frame:gold'), 'Gold Frame');
    assert.equal(unlockLabel('frame:rival'), 'Rival Frame');
    assert.equal(unlockLabel('clear:pulse'), 'Pulse Clear');
    assert.equal(unlockLabel('unknown'), 'unknown');
});

test('formatUnlocks joins human labels', () => {
    assert.equal(formatUnlocks(['frame:gold', 'clear:flare']), 'Gold Frame · Flare Clear');
    assert.equal(formatUnlocks([]), '');
});

test('codeLabel turns KeyboardEvent codes into pause-sheet keys', () => {
    assert.equal(codeLabel('KeyA'), 'A');
    assert.equal(codeLabel('ArrowLeft'), '←');
    assert.equal(codeLabel('Space'), 'Space');
    assert.equal(codeLabel('Escape'), 'Esc');
});

test('controlLegendRows lists the six actions a new player needs', () => {
    const rows = controlLegendRows({
        moveLeft: ['ArrowLeft'],
        moveRight: ['ArrowRight'],
        rotateCW: ['ArrowUp'],
        rotateCCW: [],
        rotate180: ['KeyA'],
        softDrop: ['ArrowDown'],
        hardDrop: ['Space'],
        hold: ['KeyC'],
        pause: ['KeyP', 'Escape'],
        quit: ['KeyQ'],
    });
    assert.deepEqual(rows.map(row => row.label), [
        'Move', 'Rotate', 'Soft Drop', 'Hard Drop', 'Hold', 'Pause',
    ]);
    assert.equal(rows[0].keys, '←, →');
    assert.equal(rows[1].keys, '↑, A');
    assert.equal(bindingPhrase([]), '—');
});

test('daily card copy prefers streak and hours-left over a raw seed', () => {
    const noon = new Date('2026-08-22T12:00:00Z');
    assert.equal(msUntilNextUtcDay(noon), 12 * 3600000);
    assert.equal(formatHoursLeft(5 * 3600000), '5h left');
    assert.equal(formatHoursLeft(1), '1h left');
    assert.equal(
        dailyCardDetail({dateKey: '20260822', streak: 3, msLeft: 5 * 3600000}),
        'STREAK 3 · 5h left',
    );
    assert.equal(
        dailyCardDetail({dateKey: '20260822', streak: 0, msLeft: 12 * 3600000}),
        'Seed 20260822 · 12h left',
    );
});

test('fanfareKind picks the loudest beat of a lock', () => {
    assert.equal(fanfareKind({rowCount: 4, tSpin: 'none', perfectClear: false, combo: 1}), 'tetris');
    assert.equal(fanfareKind({rowCount: 1, tSpin: 'full', perfectClear: false, combo: 1}), 'tspin');
    assert.equal(fanfareKind({rowCount: 4, tSpin: 'none', perfectClear: true, combo: 1}), 'perfect');
    assert.equal(fanfareKind({rowCount: 2, tSpin: 'none', perfectClear: false, combo: 6}), 'combo');
    assert.equal(fanfareKind({rowCount: 0, tSpin: 'none', perfectClear: false, combo: 0}), 'none');
});

test('formatRunGrade shouts grade, PB, and unlocks', () => {
    assert.equal(
        formatRunGrade({grade: 'S', stars: 3, isPb: true, unlocks: ['frame:gold']}),
        'Grade S · ★★★ · NEW PB · UNLOCKED Gold Frame',
    );
});

test('Korean run copy translates time, grade, unlocks and controls', () => {
    setLanguage('ko');
    try {
        assert.equal(formatHoursLeft(3600000), '1시간 남음');
        assert.equal(dailyCardDetail({dateKey: '20261015', streak: 2, msLeft: 3600000}), '2일 연속 · 1시간 남음');
        assert.equal(formatRunGrade({grade: 'S', isPb: true, unlocks: ['frame:gold']}),
            '등급 S · 최고 기록 갱신 · 해금 골드 테두리');
        assert.equal(controlLegendRows()[0].label, '이동');
    } finally {
        setLanguage('en');
    }
});

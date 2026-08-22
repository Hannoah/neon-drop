import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInputController } from '../../src/js/input.js';

test('press with emit performs immediate horizontal step', () => {
    const input = createInputController({das: 167, arr: 33});
    const moves = [];
    input.press('moveLeft', action => moves.push(action));
    assert.deepEqual(moves, ['moveLeft']);
});

test('no auto-repeat during DAS wait', () => {
    const input = createInputController({das: 100, arr: 50});
    const moves = [];
    input.press('moveRight', action => moves.push(action));
    input.tick(99, action => moves.push(action));
    assert.deepEqual(moves, ['moveRight']);
});

test('DAS then ARR emits moves', () => {
    const input = createInputController({das: 100, arr: 50});
    const moves = [];
    input.press('moveLeft');
    input.tick(100, action => moves.push(action));
    input.tick(50, action => moves.push(action));
    assert.deepEqual(moves, ['moveLeft', 'moveLeft']);
});

test('DAS elapsed without press emit still repeats after delay', () => {
    const input = createInputController({das: 100, arr: 50});
    const moves = [];
    input.press('moveLeft');
    input.tick(100, action => moves.push(action));
    assert.ok(moves.filter(m => m === 'moveLeft').length >= 1);
});

test('ARR zero slides until emit returns false after DAS', () => {
    const input = createInputController({das: 50, arr: 0});
    const moves = [];
    let room = 10;
    input.press('moveRight');
    input.tick(50, action => {
        moves.push(action);
        room -= 1;
        return room > 0;
    });
    assert.equal(moves.length, 10, 'one post-DAS tick must travel to the wall');
    assert.ok(moves.every(action => action === 'moveRight'));

    const extra = [];
    input.tick(16, action => {
        extra.push(action);
        return false;
    });
    assert.deepEqual(extra, ['moveRight'], 'later ticks still probe once, then stop');
});

test('most recent horizontal press wins over opposite hold', () => {
    const input = createInputController({das: 100, arr: 50});
    const moves = [];
    input.press('moveLeft');
    input.press('moveRight', action => moves.push(action));
    input.tick(100, action => moves.push(action));
    input.tick(50, action => moves.push(action));
    assert.ok(moves.every(m => m === 'moveRight'));
    assert.deepEqual(moves, ['moveRight', 'moveRight', 'moveRight']);
});

test('release clears horizontal auto-repeat', () => {
    const input = createInputController({das: 100, arr: 50});
    const moves = [];
    input.press('moveLeft');
    input.release('moveLeft');
    input.tick(200, action => moves.push(action));
    assert.deepEqual(moves, []);
});

test('soft drop held until release', () => {
    const input = createInputController({das: 167, arr: 33});
    assert.equal(input.isSoftDropping(), false);
    input.press('softDrop');
    assert.equal(input.isSoftDropping(), true);
    input.release('softDrop');
    assert.equal(input.isSoftDropping(), false);
});

test('setTiming applies to subsequent holds', () => {
    const input = createInputController({das: 200, arr: 100});
    input.setTiming({das: 50, arr: 25});
    const moves = [];
    input.press('moveLeft');
    input.tick(50, action => moves.push(action));
    input.tick(25, action => moves.push(action));
    assert.deepEqual(moves, ['moveLeft', 'moveLeft']);
});

test('reset clears repeat and soft drop state', () => {
    const input = createInputController({das: 100, arr: 50});
    input.press('softDrop');
    input.press('moveLeft');
    input.reset();
    assert.equal(input.isSoftDropping(), false);
    const moves = [];
    input.tick(200, action => moves.push(action));
    assert.deepEqual(moves, []);
});

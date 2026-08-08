import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLockState, onGroundContact, onSuccessfulMove, tickLock, LOCK_RESET_CAP } from '../../src/js/lock.js';

test('lock starts on ground and expires', () => {
    let lock = createLockState(500);
    lock = onGroundContact(lock);
    assert.equal(lock.active, true);
    lock = tickLock(lock, 500);
    assert.equal(lock.shouldLock, true);
});

test('successful move resets until cap', () => {
    let lock = onGroundContact(createLockState(500));
    for (let i = 0; i < LOCK_RESET_CAP; i++) {
        lock = onSuccessfulMove(lock);
        assert.equal(lock.timer, 500);
    }
    const timerBefore = lock.timer;
    // drain a bit then try reset past cap
    lock = tickLock(lock, 100);
    lock = onSuccessfulMove(lock);
    assert.equal(lock.resets, LOCK_RESET_CAP);
    assert.notEqual(lock.timer, 500); // must NOT restore to lockDelay past cap
});

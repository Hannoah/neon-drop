export const LOCK_RESET_CAP = 15;

export function createLockState(lockDelay) {
    return {lockDelay, timer: 0, active: false, resets: 0, shouldLock: false};
}

export function onGroundContact(state) {
    if (state.active) return {...state, shouldLock: false};
    return {...state, active: true, timer: state.lockDelay, shouldLock: false};
}

export function onSuccessfulMove(state) {
    if (!state.active) return state;
    if (state.resets >= LOCK_RESET_CAP) return {...state, shouldLock: false};
    return {...state, timer: state.lockDelay, resets: state.resets + 1, shouldLock: false};
}

export function tickLock(state, dt) {
    if (!state.active) return {...state, shouldLock: false};
    const timer = state.timer - dt;
    return {...state, timer, shouldLock: timer <= 0};
}

export function clearLock(state) {
    return createLockState(state.lockDelay);
}

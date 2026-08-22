const HORIZONTAL = new Set(['moveLeft', 'moveRight']);

/**
 * Pure DAS/ARR controller for horizontal movement and soft-drop hold.
 *
 * On moveLeft/moveRight press: optional immediate step via emit, then DAS, then ARR repeats from tick().
 * ARR 0: after DAS, every tick emits while the direction remains held.
 * Opposite horizontal keys: the most recent press wins.
 */
export function createInputController({das, arr}) {
    const timing = {das, arr};
    let repeatDir = null;
    let dasRemaining = 0;
    let arrRemaining = 0;
    let dasComplete = false;
    let softDrop = false;

    function beginHorizontal(action) {
        repeatDir = action;
        dasComplete = false;
        dasRemaining = timing.das;
        arrRemaining = 0;
    }

    return {
        press(action, emit) {
            if (action === 'softDrop') {
                softDrop = true;
                return;
            }
            if (!HORIZONTAL.has(action)) return;
            beginHorizontal(action);
            if (emit) emit(action);
        },

        release(action) {
            if (action === 'softDrop') {
                softDrop = false;
                return;
            }
            if (HORIZONTAL.has(action) && action === repeatDir) {
                repeatDir = null;
                dasComplete = false;
                dasRemaining = 0;
                arrRemaining = 0;
            }
        },

        setTiming({das: newDas, arr: newArr}) {
            if (newDas !== undefined) timing.das = newDas;
            if (newArr !== undefined) timing.arr = newArr;
        },

        tick(dt, emit) {
            if (!repeatDir || !emit) return;

            let remaining = dt;
            while (remaining > 0) {
                if (!dasComplete) {
                    if (remaining < dasRemaining) {
                        dasRemaining -= remaining;
                        return;
                    }
                    remaining -= dasRemaining;
                    dasRemaining = 0;
                    dasComplete = true;
                    if (timing.arr === 0) {
                        while (emit(repeatDir)) { /* slide to wall */ }
                        return;
                    }
                    emit(repeatDir);
                    arrRemaining = timing.arr;
                    continue;
                }

                if (timing.arr === 0) {
                    while (emit(repeatDir)) { /* already sliding; later ticks probe */ }
                    return;
                }

                if (remaining < arrRemaining) {
                    arrRemaining -= remaining;
                    return;
                }
                remaining -= arrRemaining;
                emit(repeatDir);
                arrRemaining = timing.arr;
            }
        },

        isSoftDropping() {
            return softDrop;
        },

        reset() {
            repeatDir = null;
            dasComplete = false;
            dasRemaining = 0;
            arrRemaining = 0;
            softDrop = false;
        },
    };
}

/** Gravity intervals at or below 1ms are treated as 20G (lock to ground). */
export function isInstantGravity(interval) {
    return Number.isFinite(interval) && interval <= 1;
}

/**
 * How many gravity steps a frame should apply.
 * Instant gravity returns Infinity so the loop can drop until grounded.
 */
export function consumeGravity(dropCounter, interval) {
    if (isInstantGravity(interval)) {
        return {drops: Infinity, remaining: 0};
    }
    if (!(interval > 0) || !(dropCounter > interval)) {
        return {drops: 0, remaining: dropCounter};
    }
    let remaining = dropCounter;
    let drops = 0;
    while (remaining > interval) {
        drops += 1;
        remaining -= interval;
    }
    return {drops, remaining};
}

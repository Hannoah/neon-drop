/** Mulberry32 — deterministic [0,1) PRNG from a 32-bit seed. */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** UTC YYYYMMDD integer used as the daily challenge seed. */
export function dailySeed(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    return y * 10000 + m * 100 + d;
}

export function dateKeyUTC(date = new Date()) {
    return String(dailySeed(date));
}

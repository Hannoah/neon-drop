import { dateKeyUTC } from './rng.js';

export const META_KEY = 'neonDropMeta';
export const META_VERSION = 1;

export const FRAME_UNLOCKS = {
    ink: {name: 'Ink', css: ''},
    gold: {name: 'Gold', css: 'frame-gold'},
    rival: {name: 'Rival', css: 'frame-rival'},
    mint: {name: 'Mint', css: 'frame-mint'},
};

export const CLEAR_UNLOCKS = {
    mint: {name: 'Mint Flash', css: ''},
    flare: {name: 'Flare', css: 'clear-flare'},
    pulse: {name: 'Pulse', css: 'clear-pulse'},
};

export function createDefaultMeta() {
    return {
        version: META_VERSION,
        pb: {
            sprintMs: null,
            sprintGrade: null,
            marathonMs: null,
            marathonGrade: null,
            daily: {dateKey: null, ms: null, score: null, grade: null},
        },
        pace: {
            sprint: [],
            marathon: [],
            daily: [],
        },
        unlocks: {
            frames: ['ink'],
            clears: ['mint'],
            selectedFrame: 'ink',
            selectedClear: 'mint',
        },
        stats: {
            games: 0,
            tetrises: 0,
            maxCombo: 0,
            marathonClears: 0,
            tutorialDone: false,
            dailyStreak: 0,
            lastDailyKey: null,
        },
    };
}

function asFinite(value) {
    return Number.isFinite(value) ? value : null;
}

export function normalizeMeta(raw) {
    const base = createDefaultMeta();
    if (!raw || typeof raw !== 'object' || raw.version !== META_VERSION) return base;

    const pb = raw.pb && typeof raw.pb === 'object' ? raw.pb : {};
    const daily = pb.daily && typeof pb.daily === 'object' ? pb.daily : {};
    const unlocks = raw.unlocks && typeof raw.unlocks === 'object' ? raw.unlocks : {};
    const stats = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
    const pace = raw.pace && typeof raw.pace === 'object' ? raw.pace : {};

    const frames = Array.isArray(unlocks.frames)
        ? [...new Set(['ink', ...unlocks.frames.filter(id => FRAME_UNLOCKS[id])])]
        : ['ink'];
    const clears = Array.isArray(unlocks.clears)
        ? [...new Set(['mint', ...unlocks.clears.filter(id => CLEAR_UNLOCKS[id])])]
        : ['mint'];

    return {
        version: META_VERSION,
        pb: {
            sprintMs: asFinite(pb.sprintMs),
            sprintGrade: typeof pb.sprintGrade === 'string' ? pb.sprintGrade : null,
            marathonMs: asFinite(pb.marathonMs),
            marathonGrade: typeof pb.marathonGrade === 'string' ? pb.marathonGrade : null,
            daily: {
                dateKey: typeof daily.dateKey === 'string' ? daily.dateKey : null,
                ms: asFinite(daily.ms),
                score: asFinite(daily.score),
                grade: typeof daily.grade === 'string' ? daily.grade : null,
            },
        },
        pace: {
            sprint: sanitizePace(pace.sprint),
            marathon: sanitizePace(pace.marathon),
            daily: sanitizePace(pace.daily),
        },
        unlocks: {
            frames,
            clears,
            selectedFrame: frames.includes(unlocks.selectedFrame) ? unlocks.selectedFrame : 'ink',
            selectedClear: clears.includes(unlocks.selectedClear) ? unlocks.selectedClear : 'mint',
        },
        stats: {
            games: Math.max(0, Number(stats.games) || 0),
            tetrises: Math.max(0, Number(stats.tetrises) || 0),
            maxCombo: Math.max(0, Number(stats.maxCombo) || 0),
            marathonClears: Math.max(0, Number(stats.marathonClears) || 0),
            tutorialDone: Boolean(stats.tutorialDone),
            dailyStreak: Math.max(0, Number(stats.dailyStreak) || 0),
            lastDailyKey: typeof stats.lastDailyKey === 'string' ? stats.lastDailyKey : null,
        },
    };
}

function sanitizePace(list) {
    if (!Array.isArray(list)) return [];
    return list
        .filter(sample => sample && Number.isFinite(sample.t) && Number.isFinite(sample.v))
        .slice(0, 600)
        .map(sample => ({t: sample.t, v: sample.v}));
}

export function readMeta(storage = localStorage) {
    try {
        const stored = storage.getItem(META_KEY);
        if (!stored) return createDefaultMeta();
        return normalizeMeta(JSON.parse(stored));
    } catch {
        return createDefaultMeta();
    }
}

export function writeMeta(meta, storage = localStorage) {
    try {
        storage.setItem(META_KEY, JSON.stringify(normalizeMeta(meta)));
    } catch {
        // private mode / quota
    }
}

/** Sprint grades by clear time. */
export function gradeForSprint(ms) {
    if (!Number.isFinite(ms)) return 'D';
    if (ms <= 60000) return 'S';
    if (ms <= 90000) return 'A';
    if (ms <= 120000) return 'B';
    if (ms <= 180000) return 'C';
    return 'D';
}

/** Marathon grades by time to Level 15. */
export function gradeForMarathon(ms) {
    if (!Number.isFinite(ms)) return 'D';
    if (ms <= 360000) return 'S';
    if (ms <= 480000) return 'A';
    if (ms <= 600000) return 'B';
    if (ms <= 900000) return 'C';
    return 'D';
}

export function starsForGrade(grade) {
    if (grade === 'S' || grade === 'A') return 3;
    if (grade === 'B') return 2;
    return 1;
}

export function paceValueAt(samples, elapsedMs) {
    if (!samples?.length || !Number.isFinite(elapsedMs)) return 0;
    let best = 0;
    for (const sample of samples) {
        if (sample.t <= elapsedMs) best = sample.v;
        else break;
    }
    return best;
}

function utcDayIndex(key) {
    if (typeof key !== 'string' || !/^\d{8}$/.test(key)) return null;
    const y = Number(key.slice(0, 4));
    const m = Number(key.slice(4, 6));
    const d = Number(key.slice(6, 8));
    if (!y || m < 1 || d < 1) return null;
    return Date.UTC(y, m - 1, d) / 86400000;
}

export function nextDailyStreak(prevKey, nextKey, prevStreak = 0) {
    if (prevKey === nextKey) return Math.max(1, Number(prevStreak) || 0);
    const prev = utcDayIndex(prevKey);
    const next = utcDayIndex(nextKey);
    if (prev != null && next === prev + 1) return (Number(prevStreak) || 0) + 1;
    return 1;
}

/**
 * Record a finished run into meta. Returns {grade, stars, isPb, unlocks[]}.
 */
export function recordRun(meta, {
    mode,
    elapsedMs,
    score = 0,
    paceSamples = [],
    now = new Date(),
}) {
    const next = normalizeMeta(meta);
    const unlocks = [];
    next.stats.games += 1;

    if (mode === 'sprint' || mode === 'daily') {
        const grade = gradeForSprint(elapsedMs);
        const stars = starsForGrade(grade);
        if (mode === 'sprint') {
            const isPb = next.pb.sprintMs == null || elapsedMs < next.pb.sprintMs;
            if (isPb) {
                next.pb.sprintMs = elapsedMs;
                next.pb.sprintGrade = grade;
                next.pace.sprint = sanitizePace(paceSamples);
            }
            if (grade === 'S' || grade === 'A') {
                if (!next.unlocks.frames.includes('gold')) {
                    next.unlocks.frames.push('gold');
                    unlocks.push('frame:gold');
                }
            }
            return {grade, stars, isPb, unlocks, meta: next};
        }

        const key = dateKeyUTC(now);
        const sameDay = next.pb.daily.dateKey === key;
        const isPb = !sameDay || next.pb.daily.ms == null || elapsedMs < next.pb.daily.ms;
        if (!sameDay || isPb) {
            next.pb.daily = {dateKey: key, ms: elapsedMs, score, grade};
            if (isPb) next.pace.daily = sanitizePace(paceSamples);
        }
        next.stats.dailyStreak = nextDailyStreak(next.stats.lastDailyKey, key, next.stats.dailyStreak);
        next.stats.lastDailyKey = key;
        if (grade === 'S' && !next.unlocks.clears.includes('pulse')) {
            next.unlocks.clears.push('pulse');
            unlocks.push('clear:pulse');
        }
        return {grade, stars, isPb, unlocks, meta: next};
    }

    if (mode === 'marathon') {
        const grade = gradeForMarathon(elapsedMs);
        const stars = starsForGrade(grade);
        const isPb = next.pb.marathonMs == null || elapsedMs < next.pb.marathonMs;
        if (isPb) {
            next.pb.marathonMs = elapsedMs;
            next.pb.marathonGrade = grade;
            next.pace.marathon = sanitizePace(paceSamples);
        }
        next.stats.marathonClears += 1;
        if (!next.unlocks.clears.includes('flare')) {
            next.unlocks.clears.push('flare');
            unlocks.push('clear:flare');
        }
        if (next.stats.marathonClears >= 3 && !next.unlocks.frames.includes('mint')) {
            next.unlocks.frames.push('mint');
            unlocks.push('frame:mint');
        }
        return {grade, stars, isPb, unlocks, meta: next};
    }

    return {grade: null, stars: 0, isPb: false, unlocks, meta: next};
}

export function noteTetris(meta) {
    const next = normalizeMeta(meta);
    next.stats.tetrises += 1;
    const unlocks = [];
    if (next.stats.tetrises >= 10 && !next.unlocks.frames.includes('rival')) {
        next.unlocks.frames.push('rival');
        unlocks.push('frame:rival');
    }
    return {meta: next, unlocks};
}

export function noteRunEnd(meta) {
    const next = normalizeMeta(meta);
    next.stats.games += 1;
    return next;
}

export function noteCombo(meta, comboValue) {
    const next = normalizeMeta(meta);
    if (comboValue > next.stats.maxCombo) next.stats.maxCombo = comboValue;
    return next;
}

export function markTutorialDone(meta) {
    const next = normalizeMeta(meta);
    next.stats.tutorialDone = true;
    if (!next.unlocks.frames.includes('mint')) next.unlocks.frames.push('mint');
    return next;
}

import {
    NORMAL_GARBAGE_SCORES,
    PIVOT_GARBAGE_SCORES,
    NORMAL_LINE_SCORES,
    PIVOT_LINE_SCORES,
} from './constants.js';

export function calculateGarbageAttack(rowCount, pivot, hadBackToBack, comboValue) {
    const baseScore = pivot
        ? (PIVOT_GARBAGE_SCORES[rowCount] ?? 0)
        : (NORMAL_GARBAGE_SCORES[rowCount] ?? 0);
    const qualifiesForBackToBack = rowCount === 4 || (pivot && rowCount > 0);
    return baseScore + (qualifiesForBackToBack && hadBackToBack ? 1 : 0) + Math.max(0, comboValue - 1);
}

export function eventMessageFor(rowCount, pivot) {
    if (pivot) {
        return rowCount === 0 ? 'PIVOT' : `PIVOT ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][rowCount]}`;
    }
    return ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD CLEAR'][rowCount] || '';
}

export function baseScoreFor(rowCount, pivot) {
    if (pivot) {
        return PIVOT_LINE_SCORES[rowCount] ?? PIVOT_LINE_SCORES[PIVOT_LINE_SCORES.length - 1];
    }
    return NORMAL_LINE_SCORES[rowCount] ?? rowCount * 200;
}

export function qualifiesForBackToBack(rowCount, pivot) {
    return rowCount === 4 || (pivot && rowCount > 0);
}

export function buildScoreResult({rowCount, pivot, hadBackToBack, level, comboValue}) {
    const baseScore = baseScoreFor(rowCount, pivot);
    const multiplier = hadBackToBack ? 1.5 : 1;
    const comboBonus = rowCount > 0 ? Math.max(0, comboValue - 1) * 50 * level : 0;
    const points = Math.round(baseScore * multiplier * level) + comboBonus;
    const attack = calculateGarbageAttack(rowCount, pivot, hadBackToBack, rowCount > 0 ? comboValue : 0);
    return {points, attack};
}

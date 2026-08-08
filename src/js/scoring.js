import {
    HARD_DROP_POINT,
    NORMAL_GARBAGE_SCORES,
    NORMAL_LINE_SCORES,
    PERFECT_CLEAR_BONUS,
    PIVOT_GARBAGE_SCORES,
    PIVOT_LINE_SCORES,
    SOFT_DROP_POINT,
    TSPIN_LINE_SCORES,
} from './constants.js';

/** @typedef {'none'|'mini'|'full'} TSpinKind */

/**
 * Normalize legacy `pivot` boolean or tSpin string to a TSpinKind.
 * @param {boolean|TSpinKind|undefined} value
 * @returns {TSpinKind}
 */
function normalizeTSpin(value) {
    if (value === true) return 'full';
    if (value === false || value == null) return 'none';
    return value;
}

/**
 * Corner offsets relative to T center (pos+1,+1), Y-down.
 * Front corners are the pair in the piece's pointing direction.
 */
const CORNER_OFFSETS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const FRONT_CORNERS = {
    0: [[-1, -1], [1, -1]], // up
    1: [[1, -1], [1, 1]],   // right
    2: [[-1, 1], [1, 1]],   // down
    3: [[-1, -1], [-1, 1]], // left
};

function isOccupiedCorner(arena, x, y) {
    const row = arena[y];
    return !row || row[x] !== 0;
}

function isPieceA(matrix) {
    return Boolean(matrix?.some(row => row.includes(1)));
}

/**
 * Guideline T-Spin detection for piece A (T-like).
 *
 * Requires lastActionWasRotate and the 3-corner rule (OOB counts as filled).
 *
 * Mini vs Full:
 * - Mini: exactly 3 corners occupied, NOT both front corners, AND usedKick
 * - Full: 3+ corners with both front corners occupied, OR exactly 3 corners
 *   without a kick (immobile / no-kick spins are Full)
 *
 * @param {{arena: number[][], player: {matrix: number[][], pos: {x:number,y:number}, rotation?: number, lastRotateUsedKick?: boolean}, lastActionWasRotate: boolean, usedKick?: boolean}} args
 * @returns {TSpinKind}
 */
export function detectTSpin({arena, player, lastActionWasRotate, usedKick}) {
    if (!lastActionWasRotate || !player?.matrix || !isPieceA(player.matrix)) {
        return 'none';
    }

    const centerX = player.pos.x + 1;
    const centerY = player.pos.y + 1;
    const occupied = CORNER_OFFSETS.filter(([dx, dy]) =>
        isOccupiedCorner(arena, centerX + dx, centerY + dy));
    if (occupied.length < 3) return 'none';

    const rotation = ((player.rotation ?? 0) % 4 + 4) % 4;
    const fronts = FRONT_CORNERS[rotation];
    const bothFront = fronts.every(([dx, dy]) =>
        isOccupiedCorner(arena, centerX + dx, centerY + dy));

    if (bothFront || occupied.length >= 4) return 'full';

    const kicked = usedKick ?? player.lastRotateUsedKick ?? false;
    // Exactly 3 corners, not both front: kick → Mini; no kick → Full.
    return kicked ? 'mini' : 'full';
}

/** True when every cell on the board is empty (0). */
export function isPerfectClear(arena) {
    return arena.every(row => row.every(cell => cell === 0));
}

export function calculateGarbageAttack(rowCount, pivot, hadBackToBack, comboValue) {
    const isSpin = normalizeTSpin(pivot) !== 'none';
    const baseScore = isSpin
        ? (PIVOT_GARBAGE_SCORES[rowCount] ?? 0)
        : (NORMAL_GARBAGE_SCORES[rowCount] ?? 0);
    const qualifies = rowCount === 4 || (isSpin && rowCount > 0);
    return baseScore + (qualifies && hadBackToBack ? 1 : 0) + Math.max(0, comboValue - 1);
}

/**
 * Event label for a clear.
 * - Boolean second arg: legacy Pivot / QUAD CLEAR wording (migration alias)
 * - String tSpin: Guideline labels (TETRIS, T-SPIN, T-SPIN MINI, …)
 */
export function eventMessageFor(rowCount, tSpinOrPivot = 'none', perfectClear = false) {
    if (perfectClear) return 'PERFECT CLEAR';

    if (typeof tSpinOrPivot === 'boolean') {
        if (tSpinOrPivot) {
            return rowCount === 0 ? 'PIVOT' : `PIVOT ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][rowCount]}`;
        }
        return ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD CLEAR'][rowCount] || '';
    }

    const tSpin = normalizeTSpin(tSpinOrPivot);
    if (tSpin === 'mini') {
        return rowCount === 0
            ? 'T-SPIN MINI'
            : `T-SPIN MINI ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][rowCount] || ''}`.trim();
    }
    if (tSpin === 'full') {
        return rowCount === 0
            ? 'T-SPIN'
            : `T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][rowCount] || ''}`.trim();
    }
    return ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][rowCount] || '';
}

export function baseScoreFor(rowCount, tSpinOrPivot) {
    const tSpin = normalizeTSpin(tSpinOrPivot);
    if (tSpin === 'mini') {
        return TSPIN_LINE_SCORES.mini[rowCount]
            ?? TSPIN_LINE_SCORES.mini[TSPIN_LINE_SCORES.mini.length - 1];
    }
    if (tSpin === 'full') {
        // Prefer TSPIN table; PIVOT_LINE_SCORES kept for migration parity.
        return TSPIN_LINE_SCORES.full[rowCount]
            ?? PIVOT_LINE_SCORES[rowCount]
            ?? TSPIN_LINE_SCORES.full[TSPIN_LINE_SCORES.full.length - 1];
    }
    return NORMAL_LINE_SCORES[rowCount] ?? rowCount * 200;
}

export function qualifiesForBackToBack(rowCount, tSpinOrPivot) {
    const tSpin = normalizeTSpin(tSpinOrPivot);
    return rowCount === 4 || (tSpin !== 'none' && rowCount > 0);
}

export function buildScoreResult({
    rowCount,
    pivot,
    tSpin,
    perfectClear = false,
    softDropCells = 0,
    hardDropCells = 0,
    hadBackToBack,
    level,
    comboValue,
}) {
    const kind = tSpin !== undefined ? normalizeTSpin(tSpin) : (pivot ? 'full' : 'none');
    const baseScore = baseScoreFor(rowCount, kind);
    const multiplier = hadBackToBack ? 1.5 : 1;
    const comboBonus = rowCount > 0 ? Math.max(0, comboValue - 1) * 50 * level : 0;
    const pcBonus = perfectClear ? (PERFECT_CLEAR_BONUS[rowCount] ?? 0) * level : 0;
    const dropPoints = softDropCells * SOFT_DROP_POINT + hardDropCells * HARD_DROP_POINT;
    const points = Math.round(baseScore * multiplier * level) + comboBonus + pcBonus + dropPoints;
    const attack = calculateGarbageAttack(
        rowCount,
        kind !== 'none',
        hadBackToBack,
        rowCount > 0 ? comboValue : 0,
    );
    return {points, attack};
}

/**
 * Super Rotation System (SRS) wall kicks for Neon Drop.
 *
 * Coordinate note: board Y increases downward. Kick tables are the standard
 * Guideline / Tetriswiki offsets with Y negated from the Y-up wiki form.
 *
 * Piece map: A=T, B=J, C=L, D=O, E=S, F=Z, S=I.
 *
 * tryRotateSrs returns `{ ok, usedKick }` and also sets
 * `player.lastRotateUsedKick` for scoring (T-Spin Mini).
 */

import { rotate } from './board.js';

// JLSTZ (A, B, C, E, F) — Y-down
const JLSTZ_KICKS = {
    '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

// I (S) — Y-down
const I_KICKS = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// O (D) — no translation
const O_KICKS = {
    '0>1': [[0, 0]],
    '1>0': [[0, 0]],
    '1>2': [[0, 0]],
    '2>1': [[0, 0]],
    '2>3': [[0, 0]],
    '3>2': [[0, 0]],
    '3>0': [[0, 0]],
    '0>3': [[0, 0]],
};

function pieceCellValue(matrix) {
    for (const row of matrix) {
        for (const value of row) {
            if (value) return value;
        }
    }
    return 0;
}

function kickTableFor(matrix) {
    const value = pieceCellValue(matrix);
    // 1=A(T), 2=B(J), 3=C(L), 5=E(S), 6=F(Z)
    if (value === 4) return O_KICKS;
    if (value === 7) return I_KICKS;
    return JLSTZ_KICKS;
}

/**
 * Attempt an SRS rotation.
 * @param {number[][]} arena
 * @param {{matrix: number[][], pos: {x:number,y:number}, rotation?: number, lastRotateUsedKick?: boolean}} player
 * @param {number} dir +1 CW, -1 CCW
 * @param {(arena: number[][], player: object) => boolean} collideFn
 * @returns {{ok: boolean, usedKick: boolean}}
 */
export function tryRotateSrs(arena, player, dir, collideFn) {
    const from = player.rotation ?? 0;
    const to = (from + (dir > 0 ? 1 : 3)) % 4;
    const originX = player.pos.x;
    const originY = player.pos.y;

    rotate(player.matrix, dir);

    const table = kickTableFor(player.matrix);
    const offsets = table[`${from}>${to}`] || [[0, 0]];

    for (let i = 0; i < offsets.length; i++) {
        const [dx, dy] = offsets[i];
        player.pos.x = originX + dx;
        player.pos.y = originY + dy;
        if (!collideFn(arena, player)) {
            player.rotation = to;
            const usedKick = i > 0;
            player.lastRotateUsedKick = usedKick;
            return {ok: true, usedKick};
        }
    }

    rotate(player.matrix, -dir);
    player.pos.x = originX;
    player.pos.y = originY;
    player.rotation = from;
    player.lastRotateUsedKick = false;
    return {ok: false, usedKick: false};
}

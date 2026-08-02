import { PIECE_SHAPES, PIECE_TYPES } from './constants.js';

export function shuffleBag() {
    const bag = PIECE_TYPES.split('');
    for (let index = bag.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
    }
    return bag;
}

export function cloneBoard(board) {
    return board.map(row => [...row]);
}

export function cloneMatrix(matrix) {
    return matrix.map(row => [...row]);
}

export function clearFullRows(board) {
    let cleared = 0;
    for (let y = board.length - 1; y >= 0; y--) {
        if (board[y].every(Boolean)) {
            board.splice(y, 1);
            board.unshift(new Array(board[0].length).fill(0));
            cleared++;
            y++;
        }
    }
    return cleared;
}

export function addGarbageLines(board, count, random = Math.random) {
    const rows = Math.min(Math.max(0, count), board.length);
    let overflowed = false;
    for (let index = 0; index < rows; index++) {
        const row = new Array(board[0].length).fill(8);
        row[Math.floor(random() * board[0].length)] = 0;
        const removed = board.shift();
        overflowed ||= removed.some(Boolean);
        board.push(row);
    }
    return overflowed;
}

export function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    if (!m) return true;

    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

export function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

export function createPiece(type) {
    const shape = PIECE_SHAPES[type];
    return shape ? cloneMatrix(shape) : undefined;
}

export function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

export function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

export function isEditableTarget(target) {
    return target instanceof HTMLElement && (
        target.matches('input, textarea, select, [contenteditable="true"]') ||
        target.isContentEditable
    );
}

export function formatElapsedTime(elapsedTime) {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

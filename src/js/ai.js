import { merge, cloneMatrix, cloneBoard, clearFullRows, collide, rotate } from './board.js';

export function evaluateOpponentBoard(board, cleared) {
    const heights = board[0].map((_, x) => {
        const first = board.findIndex(row => row[x] !== 0);
        return first === -1 ? 0 : board.length - first;
    });
    const holes = heights.reduce((total, height, x) => {
        const first = board.length - height;
        return total + (height === 0 ? 0 : board.slice(first).filter(row => row[x] === 0).length);
    }, 0);
    const aggregateHeight = heights.reduce((sum, height) => sum + height, 0);
    const bumpiness = heights.slice(1).reduce((sum, height, x) => sum + Math.abs(height - heights[x]), 0);
    return aggregateHeight * 0.45 + holes * 5 + bumpiness * 0.7 + Math.max(...heights) * 0.35 - cleared * 3;
}

export function chooseOpponentMove(matrix, board) {
    if (!matrix || !board.length) return null;

    let bestMove = null;
    let candidateMatrix = cloneMatrix(matrix);
    for (let rotation = 0; rotation < 4; rotation++) {
        const width = candidateMatrix[0].length;
        for (let x = 0; x <= board[0].length - width; x++) {
            const candidate = {
                matrix: cloneMatrix(candidateMatrix),
                pos: {x, y: 0},
            };
            if (collide(board, candidate)) continue;

            while (!collide(board, {matrix: candidate.matrix, pos: {x, y: candidate.pos.y + 1}})) {
                candidate.pos.y++;
            }

            const simulatedBoard = cloneBoard(board);
            merge(simulatedBoard, candidate);
            const cleared = clearFullRows(simulatedBoard);
            const score = evaluateOpponentBoard(simulatedBoard, cleared);
            if (!bestMove || score < bestMove.score) {
                bestMove = {
                    x,
                    y: candidate.pos.y,
                    rotation,
                    matrix: cloneMatrix(candidate.matrix),
                    cleared,
                    score,
                };
            }
        }
        rotate(candidateMatrix, 1);
    }

    return bestMove;
}

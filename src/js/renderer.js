import { PIECE_COLORS } from './constants.js';
import { collide } from './board.js';

export function expireFlashingLines(flashingLines, delta = 16) {
    for (const line of flashingLines) line.time -= delta;
    return flashingLines.filter(line => line.time > 0);
}

export function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const color = PIECE_COLORS[value];

                ctx.fillStyle = color;
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);

                ctx.lineWidth = 0.05;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.strokeRect(x + offset.x + 0.05, y + offset.y + 0.05, 0.9, 0.9);

                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(x + offset.x, y + offset.y, 1, 0.1);
                ctx.fillRect(x + offset.x, y + offset.y, 0.1, 1);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillRect(x + offset.x, y + offset.y + 0.9, 1, 0.1);
                ctx.fillRect(x + offset.x + 0.9, y + offset.y, 0.1, 1);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.fillRect(x + offset.x + 0.1, y + offset.y + 0.1, 0.8, 0.8);
            }
        });
    });
}

export function createRenderer({
    canvas, context, nextCanvas, nextContext, holdCanvas, holdContext,
    opponentCanvas, opponentContext, VERSUS_WIDTH, VERSUS_HEIGHT,
    getState, setShakeTime = () => {},
}) {
    function draw() {
        context.save();
        const {shakeTime, arena, player, combo, flashingLines} = getState();
        if (shakeTime > 0) {
            const dx = (Math.random() - 0.5) * shakeTime;
            const dy = (Math.random() - 0.5) * shakeTime;
            context.translate(dx / 20, dy / 20);
            const nextShakeTime = shakeTime * 0.9;
            setShakeTime(nextShakeTime < 0.5 ? 0 : nextShakeTime);
        }

        context.fillStyle = '#000';
        context.fillRect(0, 0, canvas.width, canvas.height);

        drawGhostPiece();
        drawMatrix(arena, {x: 0, y: 0}, context);
        drawMatrix(player.matrix, player.pos, context);

        const nextFlash = expireFlashingLines(flashingLines, 16);
        flashingLines.length = 0;
        flashingLines.push(...nextFlash);
        for (const line of flashingLines) {
            context.fillStyle = 'rgba(255, 255, 255, 0.8)';
            context.fillRect(0, line.y, 12, 1);
        }

        if (combo > 1) {
            context.fillStyle = '#f1c40f';
            context.font = '1px Arial';
            context.textAlign = 'center';
            context.fillText(`COMBO x${combo}`, 6, 2);
        }

        context.restore();
    }

    function drawGhostPiece() {
        const {arena, player} = getState();
        const ghostPos = { x: player.pos.x, y: player.pos.y };
        while (!collide(arena, { pos: ghostPos, matrix: player.matrix })) {
            ghostPos.y++;
        }
        ghostPos.y--;

        context.globalAlpha = 0.3;
        drawMatrix(player.matrix, ghostPos, context);
        context.globalAlpha = 1.0;
    }

    function drawNext(previewMatrices) {
        nextContext.fillStyle = '#000';
        nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

        let matrices = previewMatrices;
        if (!matrices || matrices.length === 0) {
            const {player} = getState();
            matrices = player.next ? [player.next] : [];
        }

        const logicalW = nextCanvas.width / 20;
        const logicalH = nextCanvas.height / 20;
        const count = matrices.length;
        if (count === 0) return;

        const gap = 0.12;
        const slotStep = logicalH / count;

        matrices.forEach((matrix, index) => {
            if (!matrix?.length) return;
            const pieceW = matrix[0].length;
            const pieceH = matrix.length;
            const offset = {
                x: (logicalW - pieceW) / 2,
                y: index * slotStep + (slotStep - pieceH - gap) / 2 + gap / 2,
            };
            drawMatrix(matrix, offset, nextContext);
        });
    }

    function drawHold() {
        holdContext.fillStyle = '#000';
        holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
        const {player} = getState();
        if (player.hold) {
            const offset = {
                x: (holdCanvas.width / 20 - player.hold[0].length) / 2,
                y: (holdCanvas.height / 20 - player.hold.length) / 2
            };
            drawMatrix(player.hold, offset, holdContext);
        }
    }

    function drawOpponent() {
        opponentContext.fillStyle = '#000';
        opponentContext.fillRect(0, 0, VERSUS_WIDTH, VERSUS_HEIGHT);
        const {opponentActive, opponent} = getState();
        if (!opponentActive || !opponent.matrix) return;

        drawMatrix(opponent.arena, {x: 0, y: 0}, opponentContext);
        drawMatrix(opponent.matrix, opponent.pos, opponentContext);
    }

    return {draw, drawNext, drawHold, drawOpponent};
}

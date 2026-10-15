import { PIECE_COLORS } from './constants.js';
import { collide } from './board.js';

const BOARD_BG = '#0f0f0f';
const BLOCK_EDGE = 'rgba(242, 242, 242, 0.14)';
const BLOCK_HI = 'rgba(242, 242, 242, 0.12)';
const BLOCK_LO = 'rgba(0, 0, 0, 0.28)';
const PREVIEW_COLS = 4;

function prepareCanvasContext(canvas, ctx, logicalCols, logicalRows) {
    const dpr = globalThis.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.width / dpr;
    const cssH = canvas.clientHeight || canvas.height / dpr;
    const bufferW = Math.max(1, Math.round(cssW * dpr));
    const bufferH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== bufferW || canvas.height !== bufferH) {
        canvas.width = bufferW;
        canvas.height = bufferH;
    }
    ctx.setTransform(bufferW / logicalCols, 0, 0, bufferH / logicalRows, 0, 0);
    return { logicalW: logicalCols, logicalH: logicalRows };
}

function prepareNextContext(canvas, ctx) {
    const dpr = globalThis.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || canvas.width / dpr;
    const cssH = canvas.clientHeight || canvas.height / dpr;
    const cell = cssW / PREVIEW_COLS;
    const logicalRows = Math.max(PREVIEW_COLS, cssH / cell);
    return prepareCanvasContext(canvas, ctx, PREVIEW_COLS, logicalRows);
}

export function expireFlashingLines(flashingLines, delta = 16) {
    for (const line of flashingLines) line.time -= delta;
    return flashingLines.filter(line => line.time > 0);
}

/** White-out each clearing mino so the stack stays readable (no full-row slab). */
export function drawClearFlashes(arena, flashingLines, ctx, logicalW) {
    if (!arena || !flashingLines?.length) return;
    for (const line of flashingLines) {
        const y = line.y;
        const row = arena[y];
        if (!row) continue;
        const peak = line.peak || 100;
        const t = Math.max(0, Math.min(1, line.time / peak));
        const hot = flashingLines.length >= 4 || peak >= 380;
        ctx.fillStyle = hot
            ? `rgba(242, 242, 242, ${0.42 + 0.52 * t})`
            : `rgba(255, 255, 255, ${0.28 + 0.5 * t})`;
        for (let x = 0; x < row.length; x++) {
            if (!row[x]) continue;
            ctx.fillRect(x + 0.08, y + 0.08, 0.84, 0.84);
        }
        ctx.fillStyle = `rgba(255, 106, 61, ${0.22 + 0.28 * t})`;
        ctx.fillRect(0, y, logicalW, 0.05);
        ctx.fillRect(0, y + 0.95, logicalW, 0.05);
    }
}

export function drawMatrix(matrix, offset, ctx, options = {}) {
    const ghost = Boolean(options.ghost);
    const buried = Boolean(options.buried);
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const color = PIECE_COLORS[value];
                const px = x + offset.x;
                const py = y + offset.y;

                if (ghost) {
                    ctx.lineWidth = 0.08;
                    ctx.strokeStyle = color;
                    ctx.strokeRect(px + 0.12, py + 0.12, 0.76, 0.76);
                    return;
                }

                if (buried) {
                    ctx.fillStyle = '#151922';
                    ctx.fillRect(px, py, 1, 1);
                    ctx.lineWidth = 0.04;
                    ctx.strokeStyle = 'rgba(245, 247, 250, 0.08)';
                    ctx.strokeRect(px + 0.08, py + 0.08, 0.84, 0.84);
                    return;
                }

                ctx.fillStyle = color;
                ctx.fillRect(px, py, 1, 1);

                ctx.fillStyle = BLOCK_HI;
                ctx.fillRect(px, py, 1, 0.08);
                ctx.fillRect(px, py, 0.08, 1);

                ctx.fillStyle = BLOCK_LO;
                ctx.fillRect(px, py + 0.92, 1, 0.08);
                ctx.fillRect(px + 0.92, py, 0.08, 1);

                ctx.lineWidth = 0.04;
                ctx.strokeStyle = BLOCK_EDGE;
                ctx.strokeRect(px + 0.04, py + 0.04, 0.92, 0.92);
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
        const {shakeTime, arena, player, flashingLines} = getState();
        const {logicalW, logicalH} = prepareCanvasContext(canvas, context, VERSUS_WIDTH, VERSUS_HEIGHT);
        if (shakeTime > 0) {
            const dx = (Math.random() - 0.5) * shakeTime;
            const dy = (Math.random() - 0.5) * shakeTime;
            context.translate(dx / 28, dy / 28);
            const nextShakeTime = shakeTime * 0.88;
            setShakeTime(nextShakeTime < 0.4 ? 0 : nextShakeTime);
        }

        context.fillStyle = BOARD_BG;
        context.fillRect(0, 0, logicalW, logicalH);

        drawGhostPiece();
        const buried = Boolean(getState().invisibleStack);
        drawMatrix(arena, {x: 0, y: 0}, context, {buried});
        if (player.matrix) {
            drawMatrix(player.matrix, player.pos, context);
        }

        drawClearFlashes(arena, flashingLines, context, logicalW);

        const {particles} = getState();
        if (particles && typeof particles.draw === 'function') {
            particles.draw(context);
        }

        context.restore();
    }

    function drawGhostPiece() {
        const {arena, player} = getState();
        if (!player.matrix) return;
        const ghostPos = { x: player.pos.x, y: player.pos.y };
        while (!collide(arena, { pos: ghostPos, matrix: player.matrix })) {
            ghostPos.y++;
        }
        ghostPos.y--;

        const pulse = 0.40 + Math.sin(Date.now() / 220) * 0.12;
        context.globalAlpha = Math.max(0.18, Math.min(0.65, pulse));
        drawMatrix(player.matrix, ghostPos, context, { ghost: true });
        context.globalAlpha = 1.0;
    }

    function drawNext(previewMatrices) {
        const {logicalW, logicalH} = prepareNextContext(nextCanvas, nextContext);
        nextContext.fillStyle = BOARD_BG;
        nextContext.fillRect(0, 0, logicalW, logicalH);

        let matrices = previewMatrices;
        if (!matrices || matrices.length === 0) {
            const {player} = getState();
            matrices = player.next ? [player.next] : [];
        }

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
        const {logicalW, logicalH} = prepareCanvasContext(holdCanvas, holdContext, PREVIEW_COLS, PREVIEW_COLS);
        holdContext.fillStyle = BOARD_BG;
        holdContext.fillRect(0, 0, logicalW, logicalH);
        const {player} = getState();
        if (player.hold) {
            const offset = {
                x: (logicalW - player.hold[0].length) / 2,
                y: (logicalH - player.hold.length) / 2,
            };
            drawMatrix(player.hold, offset, holdContext);
        }
    }

    function drawOpponent() {
        const {logicalW, logicalH} = prepareCanvasContext(
            opponentCanvas, opponentContext, VERSUS_WIDTH, VERSUS_HEIGHT,
        );
        opponentContext.fillStyle = BOARD_BG;
        opponentContext.fillRect(0, 0, logicalW, logicalH);
        const {opponentActive, opponent} = getState();
        if (!opponentActive || !opponent.matrix) return;

        drawMatrix(opponent.arena, {x: 0, y: 0}, opponentContext);
        drawMatrix(opponent.matrix, opponent.pos, opponentContext);
    }

    return {draw, drawNext, drawHold, drawOpponent};
}

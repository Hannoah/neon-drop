// Neon Drop — original falling-block game.
// Piece identifiers use neutral letters distinct from the Tetris Company's
// protected naming. All gameplay terminology (Quad Clear, Pivot, B2B) is
// original wording; do not reintroduce protected terms here.

export const PIECE_TYPES = 'ABCDEFS';
export const SPRINT_TARGET_LINES = 40;
export const VERSUS_WIDTH = 12;
export const VERSUS_HEIGHT = 20;
export const MAX_PENDING_GARBAGE = 20;

// Original palette: tuned for contrast against the neon theme and
// deuteranopia/protanopia friendliness (no red/green pair ambiguity).
export const PIECE_COLORS = [
    null,
    '#FF5C8A', // A — coral
    '#19C2E0', // B — cyan
    '#2BD868', // C — emerald
    '#B26CFF', // D — violet
    '#FF9F1A', // E — amber
    '#F2D027', // F — sunflower (kept distinct from amber via luminance)
    '#3E7BFF', // S — indigo
    '#9AA4AE', // garbage
];

// Shapes remain functionally identical to standard SRS for competitive
// parity, but they are presented under original piece IDs/names.
export const PIECE_SHAPES = {
    // A — Pivot (T-like 3x3 spinner)
    A: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    // B — Bend-L (J-like)
    B: [
        [0, 2, 0],
        [0, 2, 0],
        [2, 2, 0],
    ],
    // C — Bend-R (L-like)
    C: [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
    ],
    // D — Square (O-like)
    D: [
        [4, 4],
        [4, 4],
    ],
    // E — Zig-S (S-like)
    E: [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0],
    ],
    // F — Zag-Z (Z-like)
    F: [
        [6, 6, 0],
        [0, 6, 6],
        [0, 0, 0],
    ],
    // S — Spark (I-like 4-long bar)
    S: [
        [0, 7, 0, 0],
        [0, 7, 0, 0],
        [0, 7, 0, 0],
        [0, 7, 0, 0],
    ],
};

export const NORMAL_LINE_SCORES = [0, 100, 300, 500, 800];
export const PIVOT_LINE_SCORES    = [400, 800, 1200, 1600];
export const NORMAL_GARBAGE_SCORES = [0, 0, 1, 2, 4];
export const PIVOT_GARBAGE_SCORES   = [0, 2, 4, 6];

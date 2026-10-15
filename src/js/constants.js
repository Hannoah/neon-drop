// Neon Drop — original falling-block game.
// Piece identifiers use neutral letters (A–S). Wave A scoring event labels
// follow Guideline-style copy (TETRIS, T-SPIN, …) approved in the design.

export const PIECE_TYPES = 'ABCDEFS';
export const SPRINT_TARGET_LINES = 40;
/** Marathon clear goal — reach this level to beat the run. */
export const MARATHON_TARGET_LEVEL = 15;
export const MARATHON_CLEAR_BONUS = 15000;
export const VERSUS_WIDTH = 12;
export const VERSUS_HEIGHT = 20;
export const MAX_PENDING_GARBAGE = 20;

// Concrete Arcade palette: solid jewel tones on #121212, distinct by hue +
// luminance for deuteranopia/protanopia (no red/green-only pair).
export const PIECE_COLORS = [
    null,
    '#E06B7A', // A — rose
    '#5BA4D9', // B — sky
    '#5DC98A', // C — sage
    '#D4A84B', // D — sand
    '#E08A5A', // E — peach
    '#C97A8E', // F — mauve (kept apart from rose via cooler chroma)
    '#FF6A3D', // S — coral (matches UI accent)
    '#5A6270', // garbage
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
export const PIVOT_LINE_SCORES    = [400, 800, 1200, 1600]; // legacy alias of full T-Spin
export const NORMAL_GARBAGE_SCORES = [0, 0, 1, 2, 4];
export const PIVOT_GARBAGE_SCORES   = [0, 2, 4, 6];
export const MINI_GARBAGE_SCORES    = [0, 0, 1, 2];

// Guideline-style score tables (lines cleared indexes the arrays).
export const TSPIN_LINE_SCORES = {mini: [100, 200, 400], full: [400, 800, 1200, 1600]};
export const PERFECT_CLEAR_BONUS = [0, 800, 1200, 1800, 2000];
export const SOFT_DROP_POINT = 1;
export const HARD_DROP_POINT = 2;

# Guideline Core Upgrade (Wave A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Guideline-class piece handling and scoring across all modes (SRS, DAS/ARR, lock delay, held soft drop, Next 5, T-Spin/PC), full settings (rebind + timing + presets), and the 2026-08-08 review defect fixes.

**Architecture:** Extract pure modules under `src/js/` (`queue`, `srs`, `lock`, `input`, `settings`) and extend `scoring`/`renderer`/`leaderboard`. Keep `tetris.js` as the rAF/DOM orchestrator. Gate `window` test hooks behind `?test=1`. Prefer TDD: failing unit tests first for each pure module.

**Tech Stack:** Vanilla JS ES modules, Canvas, localStorage, Node `node:test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-08-guideline-core-upgrade-design.md`

---

## File Map

| Path | Role |
| --- | --- |
| Create `src/js/queue.js` | 7-bag + Next-5 preview API |
| Create `src/js/srs.js` | SRS rotate-with-kicks for pieces A–F/S |
| Create `src/js/lock.js` | Lock delay / reset / cap helpers |
| Create `src/js/input.js` | DAS/ARR / soft-drop hold state machine |
| Create `src/js/settings.js` | Preferences v2, presets, binding swap, migrate |
| Modify `src/js/scoring.js` | T-Spin Mini/Full, PC, soft/hard drop, B2B, event labels |
| Modify `src/js/constants.js` | Score tables for T-Spin/PC/drop; keep piece IDs A–S |
| Modify `src/js/board.js` | Export helpers needed by SRS if any; keep `rotate` |
| Modify `src/js/renderer.js` | Next 5 draw; safe `flashingLines` expiry |
| Modify `src/js/leaderboard.js` | Generation marker clears legacy scores |
| Modify `tetris.js` | Wire modules; focus trap; test API gate; settings I/O |
| Modify `index.html` | Taller Next canvas; Settings panel markup/CSS |
| Modify `package.json` | Add new unit test files to `test:unit` |
| Create `test/unit/queue.test.mjs` | Next-5 / bag |
| Create `test/unit/srs.test.mjs` | Kick success/fail |
| Create `test/unit/lock.test.mjs` | Reset/cap/timeout |
| Create `test/unit/input.test.mjs` | DAS/ARR/opposite |
| Create `test/unit/settings.test.mjs` | Migrate/preset/swap |
| Modify `test/unit/scoring.test.mjs` | T-Spin/PC/drop/B2B |
| Modify `test/unit/renderer.test.mjs` | Flash splice; Next 5 if pure-testable |
| Modify `test/unit/package.test.mjs` | Settings markup / script tags if asserted |
| Modify `test-tetris.cjs` | `?test=1`, settings, Next 5, a11y, leaderboard wipe |
| Modify `README.md` | Controls, settings, scoring, Pulse Amp wording |
| Create `llmwiki/guideline-core-2026-08-08.md`; update `llmwiki/index.md`, `llmwiki/log.md` | Delivery record |

Piece letter map (unchanged IDs): A=T-like, B=J, C=L, D=O, E=S, F=Z, S=I.

---

### Task 1: Safe flashingLines expiry

**Files:**
- Modify: `src/js/renderer.js`
- Modify: `test/unit/renderer.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `test/unit/renderer.test.mjs`:

```js
import { expireFlashingLines } from '../../src/js/renderer.js';

test('expireFlashingLines removes every expired entry in one pass', () => {
    const lines = [
        {y: 1, time: 0},
        {y: 2, time: 0},
        {y: 3, time: 50},
    ];
    assert.deepEqual(expireFlashingLines(lines, 16), [{y: 3, time: 34}]);
});
```

- [ ] **Step 2: Run RED**

Run: `node --test test/unit/renderer.test.mjs`  
Expected: FAIL (`expireFlashingLines` not exported).

- [ ] **Step 3: Implement**

In `src/js/renderer.js`, add and use:

```js
export function expireFlashingLines(flashingLines, delta = 16) {
    for (const line of flashingLines) line.time -= delta;
    return flashingLines.filter(line => line.time > 0);
}
```

Replace the `forEach`+`splice` block in `draw()` with assigning filtered results back onto the live array:

```js
const nextFlash = expireFlashingLines(flashingLines, 16);
flashingLines.length = 0;
flashingLines.push(...nextFlash);
for (const line of flashingLines) {
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillRect(0, line.y, 12, 1);
}
```

(Keep drawing before or after filter consistently; times must decrement once per frame.)

- [ ] **Step 4: Run GREEN**

Run: `node --test test/unit/renderer.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/js/renderer.js test/unit/renderer.test.mjs
git commit -m "fix: expire flashing lines without splice skips"
```

---

### Task 2: Scenario hazard timer clamp

**Files:**
- Modify: `tetris.js` (`updateScenarioState`)
- Modify: `test-tetris.cjs` (adjust or add clamp expectation)

- [ ] **Step 1: Change clamp behavior in `updateScenarioState`**

Replace the hazard block with:

```js
if (!activeScenarioStage.hazardIntervalMs) return;
scenarioHazardTimer -= deltaTime;
let waves = 0;
while (scenarioHazardTimer <= 0 && waves < 3) {
    queueGarbageForPlayer(1);
    scenarioHazardTimer += activeScenarioStage.hazardIntervalMs;
    waves++;
}
if (scenarioHazardTimer < 0) scenarioHazardTimer = 0;
if (waves > 0) {
    lastEventMessage = waves === 1 ? 'INTERFERENCE +1' : `INTERFERENCE +${waves}`;
    eventMessageTimer = 2000;
    updateScore();
}
```

- [ ] **Step 2: Update Playwright expectation**

Find the huge-delta hazard test in `test-tetris.cjs` that expects a deeply negative timer. Change it to assert `timer === 0` (or `>= 0`) and that pending garbage increased by at most 3 for one huge frame.

- [ ] **Step 3: Commit**

```bash
git add tetris.js test-tetris.cjs
git commit -m "fix: clamp scenario hazard catch-up waves"
```

---

### Task 3: Piece queue (Next 5)

**Files:**
- Create: `src/js/queue.js`
- Create: `test/unit/queue.test.mjs`
- Modify: `package.json` `test:unit` list

- [ ] **Step 1: Failing tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPieceQueue } from '../../src/js/queue.js';

test('createPieceQueue exposes five upcoming types and shifts one', () => {
    const q = createPieceQueue(() => ['A', 'B', 'C', 'D', 'E', 'F', 'S']);
    assert.deepEqual(q.preview(5), ['A', 'B', 'C', 'D', 'E']);
    assert.equal(q.next(), 'A');
    assert.deepEqual(q.preview(5), ['B', 'C', 'D', 'E', 'F']);
});

test('refills from bag when buffer runs low', () => {
    let bags = 0;
    const q = createPieceQueue(() => {
        bags++;
        return ['A', 'B', 'C', 'D', 'E', 'F', 'S'];
    });
    for (let i = 0; i < 7; i++) q.next();
    assert.equal(bags, 2);
    assert.equal(q.preview(5).length, 5);
});
```

Add `test/unit/queue.test.mjs` to `package.json` `test:unit`.

- [ ] **Step 2: RED** — `npm run test:unit` fails module not found.

- [ ] **Step 3: Implement `src/js/queue.js`**

```js
import { shuffleBag } from './board.js';

export function createPieceQueue(bagFactory = shuffleBag) {
    const buffer = [];
    function ensure(min) {
        while (buffer.length < min) buffer.push(...bagFactory());
    }
    return {
        next() {
            ensure(1);
            return buffer.shift();
        },
        preview(count = 5) {
            ensure(count);
            return buffer.slice(0, count);
        },
        reset() {
            buffer.length = 0;
        },
    };
}
```

- [ ] **Step 4: GREEN** — queue tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/js/queue.js test/unit/queue.test.mjs package.json
git commit -m "feat: add Next-5 piece queue module"
```

---

### Task 4: Settings v2 + leaderboard generation clear

**Files:**
- Create: `src/js/settings.js`
- Create: `test/unit/settings.test.mjs`
- Modify: `src/js/leaderboard.js`
- Modify: `package.json`

- [ ] **Step 1: Failing tests** (`test/unit/settings.test.mjs`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_SETTINGS,
    CLASSIC_BINDINGS,
    GUIDELINE_BINDINGS,
    normalizeSettings,
    applyPreset,
    assignBinding,
} from '../../src/js/settings.js';
import { readLeaderboard, LEADERBOARD_GENERATION } from '../../src/js/leaderboard.js';

test('normalizeSettings migrates v1 preferences', () => {
    const s = normalizeSettings({mode: 'sprint', bgm: false, sfx: true});
    assert.equal(s.version, 2);
    assert.equal(s.mode, 'sprint');
    assert.equal(s.bgm, false);
    assert.equal(s.preset, 'classic');
    assert.equal(s.timing.das, DEFAULT_SETTINGS.timing.das);
    assert.deepEqual(s.bindings.moveLeft, CLASSIC_BINDINGS.moveLeft);
});

test('applyPreset guideline overwrites bindings', () => {
    const s = applyPreset(normalizeSettings({}), 'guideline');
    assert.equal(s.preset, 'guideline');
    assert.deepEqual(s.bindings, GUIDELINE_BINDINGS);
});

test('assignBinding swaps on conflict', () => {
    let s = normalizeSettings({});
    s = assignBinding(s, 'hold', s.bindings.pause[0]);
    assert.ok(s.bindings.hold.includes(s.bindings.pause[0]) || s.bindings.pause.length === 0 || !s.bindings.pause.includes(s.bindings.hold[0]));
    // Stronger: after assigning pause's key to hold, pause no longer has that key
    s = normalizeSettings({});
    const key = s.bindings.pause[0];
    s = assignBinding(s, 'hold', key);
    assert.ok(s.bindings.hold.includes(key));
    assert.ok(!s.bindings.pause.includes(key));
});

test('readLeaderboard clears foreign generation', () => {
    const storage = {
        data: {
            tetrisLeaderboard: JSON.stringify({
                generation: 0,
                scores: [{name: 'OLD', score: 999}],
            }),
        },
        getItem(k) { return this.data[k] ?? null; },
        setItem(k, v) { this.data[k] = v; },
    };
    assert.deepEqual(readLeaderboard(storage), []);
    assert.equal(JSON.parse(storage.data.tetrisLeaderboard).generation, LEADERBOARD_GENERATION);
});
```

Use a clear `assignBinding` contract: replace action’s keys with `[code]`, remove `code` from every other action, set `preset` to `'custom'`.

- [ ] **Step 2: RED**

- [ ] **Step 3: Implement `settings.js`**

Export:

```js
export const DEFAULT_TIMING = {das: 167, arr: 33, lockDelay: 500};
export const CLASSIC_BINDINGS = {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    hardDrop: ['Space'],
    rotateCW: ['ArrowUp'],
    rotateCCW: [],
    rotate180: [],
    hold: ['KeyC'],
    pause: ['KeyP', 'Escape'],
    quit: ['KeyQ'],
};
export const GUIDELINE_BINDINGS = {
    moveLeft: ['ArrowLeft'],
    moveRight: ['ArrowRight'],
    softDrop: ['ArrowDown'],
    hardDrop: ['Space'],
    rotateCW: ['KeyX', 'ArrowUp'],
    rotateCCW: ['KeyZ'],
    rotate180: [],
    hold: ['KeyC'],
    pause: ['KeyP', 'Escape'],
    quit: ['KeyQ'],
};
export const DEFAULT_SETTINGS = {
    version: 2,
    mode: 'marathon',
    bgm: true,
    sfx: true,
    preset: 'classic',
    bindings: structuredClone(CLASSIC_BINDINGS),
    timing: {...DEFAULT_TIMING},
};

export function normalizeSettings(raw) { /* merge v1/v2; clamp timing ranges das 50–400, arr 0–100, lockDelay 100–1000 */ }
export function applyPreset(settings, preset) { /* classic|guideline */ }
export function assignBinding(settings, action, code) { /* swap/remove conflicts; preset=custom */ }
export function clampTiming(timing) { /* return clamped copy */ }
```

Store KeyboardEvent.`code` strings (not `key`) so layout is stable.

- [ ] **Step 4: Leaderboard generation**

```js
export const LEADERBOARD_GENERATION = 2;
export const LEADERBOARD_KEY = 'tetrisLeaderboard';

export function readLeaderboard(storage = localStorage) {
    try {
        const stored = storage.getItem(LEADERBOARD_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        // Legacy array form → clear
        if (Array.isArray(parsed)) {
            writeLeaderboard([], storage);
            return [];
        }
        if (!parsed || parsed.generation !== LEADERBOARD_GENERATION || !Array.isArray(parsed.scores)) {
            writeLeaderboard([], storage);
            return [];
        }
        return parsed.scores
            .filter(score => score && typeof score.name === 'string' && Number.isFinite(score.score))
            .map(score => ({name: score.name, score: score.score}))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    } catch {
        return [];
    }
}

export function writeLeaderboard(scores, storage = localStorage) {
    try {
        storage.setItem(LEADERBOARD_KEY, JSON.stringify({
            generation: LEADERBOARD_GENERATION,
            scores,
        }));
    } catch { /* optional */ }
}
```

Update any Playwright tests that read raw `tetrisLeaderboard` JSON as an array.

- [ ] **Step 5: GREEN + commit**

```bash
git add src/js/settings.js src/js/leaderboard.js test/unit/settings.test.mjs package.json
git commit -m "feat: add settings v2 and reset leaderboard generation"
```

---

### Task 5: SRS wall kicks

**Files:**
- Create: `src/js/srs.js`
- Create: `test/unit/srs.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Failing test** — wall-kick success for piece S (I-like) and A (T-like) against a simple arena; O (D) rotates in place; failed kick restores pose.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPiece, createMatrix, collide } from '../../src/js/board.js';
import { tryRotateSrs } from '../../src/js/srs.js';

function emptyArena() {
    return Array.from({length: 20}, () => Array(10).fill(0));
}

test('tryRotateSrs kicks T-like piece A away from a wall', () => {
    const arena = emptyArena();
    const player = {matrix: createPiece('A'), pos: {x: -1, y: 0}, rotation: 0};
    // shift to left wall legal spawn-ish
    player.pos.x = 0;
    const ok = tryRotateSrs(arena, player, 1, collide);
    assert.equal(ok, true);
    assert.equal(player.rotation, 1);
    assert.equal(collide(arena, player), false);
});
```

Add more cases: I-piece kick; blocked rotate returns false and restores matrix/pos/rotation.

- [ ] **Step 2: RED**

- [ ] **Step 3: Implement `srs.js`**

Include JLSTZ and I kick offset tables (Guideline), map piece types:

- JLSTZ table → A,B,C,E,F  
- I table → S  
- O → D (offsets all zero)

API:

```js
export function tryRotateSrs(arena, player, dir, collideFn) {
    // dir: +1 CW, -1 CCW
    // mutates player.matrix via board.rotate, tries kicks, updates player.rotation 0..3
    // on failure restores matrix, pos, rotation; returns boolean
}
```

Track `player.rotation` (0–3). Initialize to 0 on spawn in later wiring task.

- [ ] **Step 4: GREEN + commit**

```bash
git add src/js/srs.js test/unit/srs.test.mjs package.json
git commit -m "feat: add SRS wall-kick rotation"
```

---

### Task 6: Lock delay helper

**Files:**
- Create: `src/js/lock.js`
- Create: `test/unit/lock.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Tests**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLockState, onGroundContact, onSuccessfulMove, tickLock, LOCK_RESET_CAP } from '../../src/js/lock.js';

test('lock starts on ground and expires', () => {
    let lock = createLockState(500);
    lock = onGroundContact(lock);
    assert.equal(lock.active, true);
    lock = tickLock(lock, 500);
    assert.equal(lock.shouldLock, true);
});

test('successful move resets until cap', () => {
    let lock = onGroundContact(createLockState(500));
    for (let i = 0; i < LOCK_RESET_CAP; i++) {
        lock = onSuccessfulMove(lock);
        assert.equal(lock.timer, 500);
    }
    lock = onSuccessfulMove(lock);
    assert.equal(lock.resets, LOCK_RESET_CAP);
    assert.equal(lock.timer < 500 || lock.timer === lock.timer, true); // no further reset past cap
});
```

Make the last assertion precise: after cap, `onSuccessfulMove` does not restore `timer` to `lockDelay`.

- [ ] **Step 2–4: Implement + GREEN**

```js
export const LOCK_RESET_CAP = 15;

export function createLockState(lockDelay) {
    return {lockDelay, timer: 0, active: false, resets: 0, shouldLock: false};
}
export function onGroundContact(state) {
    if (state.active) return {...state, shouldLock: false};
    return {...state, active: true, timer: state.lockDelay, shouldLock: false};
}
export function onSuccessfulMove(state) {
    if (!state.active) return state;
    if (state.resets >= LOCK_RESET_CAP) return {...state, shouldLock: false};
    return {...state, timer: state.lockDelay, resets: state.resets + 1, shouldLock: false};
}
export function tickLock(state, dt) {
    if (!state.active) return {...state, shouldLock: false};
    const timer = state.timer - dt;
    return {...state, timer, shouldLock: timer <= 0};
}
export function clearLock(state) {
    return createLockState(state.lockDelay);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/js/lock.js test/unit/lock.test.mjs package.json
git commit -m "feat: add lock delay reset helper"
```

---

### Task 7: Input DAS/ARR state machine

**Files:**
- Create: `src/js/input.js`
- Create: `test/unit/input.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Tests** covering: keydown starts DAS wait; after DAS, ARR steps; ARR=0 moves every tick while held; opposite key wins; softDrop held flag; keyup clears.

```js
import { createInputController } from '../../src/js/input.js';

test('DAS then ARR emits moves', () => {
    const input = createInputController({das: 100, arr: 50});
    const moves = [];
    input.press('moveLeft');
    input.tick(100, action => moves.push(action)); // DAS elapsed → first repeat or initial
    input.tick(50, action => moves.push(action));
    assert.ok(moves.filter(m => m === 'moveLeft').length >= 1);
});
```

Define precise semantics in implementation comments and match tests:

1. On press of moveLeft/Right: immediate one-step move, then DAS timer, then ARR.
2. ARR `0`: every `tick` while held emits move (infinite ARR).
3. Soft drop: `press('softDrop')` sets `softDroping=true` until release; gravity handled by orchestrator.

- [ ] **Step 2–4: Implement + GREEN**

API sketch:

```js
export function createInputController({das, arr}) {
    return {
        press(action) {},
        release(action) {},
        setTiming({das, arr}) {},
        tick(dt, emit) {}, // emit('moveLeft'|'moveRight') for auto-repeat
        isSoftDropping() { return false; },
        reset() {},
    };
}
```

- [ ] **Step 5: Commit**

```bash
git add src/js/input.js test/unit/input.test.mjs package.json
git commit -m "feat: add DAS/ARR input controller"
```

---

### Task 8: Scoring — T-Spin, PC, drops, B2B labels

**Files:**
- Modify: `src/js/constants.js`
- Modify: `src/js/scoring.js`
- Modify: `test/unit/scoring.test.mjs`

- [ ] **Step 1: Expand tests** for:

- `detectTSpin({arena, player, lastActionWasRotate})` → `'none' | 'mini' | 'full'`
- `isPerfectClear(arena)`
- `buildScoreResult` accepts `{tSpin, perfectClear, softDropCells, hardDropCells}`
- B2B qualifies on Tetris (4) or any T-Spin with lines
- `eventMessageFor` returns Guideline-style strings approved in the design (`T-SPIN SINGLE`, `TETRIS`, `PERFECT CLEAR`, …)

Keep supporting the old `pivot` boolean as a deprecated alias mapped from `tSpin !== 'none'` during migration inside `buildScoreResult` so Versus/scenario call sites can update gradually in Task 9.

Score tables (add to constants):

```js
export const TSPIN_LINE_SCORES = {mini: [100, 200, 400], full: [400, 800, 1200, 1600]};
export const PERFECT_CLEAR_BONUS = [0, 800, 1200, 1800, 2000]; // by lines cleared in that action
export const SOFT_DROP_POINT = 1;
export const HARD_DROP_POINT = 2;
```

(Use values consistent with common Guideline guides; document in README.)

- [ ] **Step 2: RED for new assertions**

- [ ] **Step 3: Implement detection + scoring updates**

T-Spin detection for piece A only (center at `pos+1,pos+1`, 3-corner rule). Mini: exactly 3 corners and used a kick (pass `usedKick` flag from `tryRotateSrs` result). Full: 3+ corners with front corners filled, or 3 corners without kick—implement one clear documented rule and test it.

- [ ] **Step 4: GREEN + commit**

```bash
git add src/js/constants.js src/js/scoring.js test/unit/scoring.test.mjs
git commit -m "feat: add T-Spin, Perfect Clear, and drop scoring"
```

---

### Task 9: Wire engine into `tetris.js`

**Files:**
- Modify: `tetris.js`
- Modify: `test-tetris.cjs` as needed for new globals

- [ ] **Step 1: Import new modules**; replace `pieceBag` / `nextPieceType` with `createPieceQueue`; `player.next` becomes queue-driven (`matrix` from `createPiece(queue.next())`, preview via `queue.preview(5)`).

- [ ] **Step 2: Replace `playerRotate` body with `tryRotateSrs`; set `lastActionWasRotate` / `lastRotateUsedKick` from result; call `onSuccessfulMove` on lock state when rotate/move succeeds.

- [ ] **Step 3: Replace ad-hoc `player.lockTimer` math with `lock.js` state updated from settings `timing.lockDelay`. On hard drop: award hard-drop cells, `lockCurrentPiece` immediately. Soft drop: if `input.isSoftDropping()`, use `dropInterval / 20` and add soft-drop points per cell in `playerDrop(true)`.

- [ ] **Step 4: Key handlers** — map `event.code` through `settings.bindings`; `keydown`/`keyup` call `input.press/release`; `input.tick(deltaTime, …)` inside `update` before gravity. Remove immediate repeat-on-keydown for left/right (controller owns repeat). Keep `preventDefault` for bound game keys when `canAcceptGameInput()`.

- [ ] **Step 5: Preferences** — use `normalizeSettings` / `write` full v2 object; restore bindings + timing into live controller.

- [ ] **Step 6: Replace `isPivot` usage** with `detectTSpin` + perfect clear after sweep; pass into `scoreLines` / `buildScoreResult`.

- [ ] **Step 7: Manual smoke** — `npm start`, play one Marathon game verifying DAS, kicks, Next 5 data path (UI may still show 1 until Task 10).

- [ ] **Step 8: Commit**

```bash
git add tetris.js
git commit -m "feat: wire SRS, DAS/ARR, lock, queue, and new scoring"
```

---

### Task 10: Next 5 HUD + renderer

**Files:**
- Modify: `index.html` — `#next` canvas height for 5 previews (e.g. width 80, height 400) and CSS
- Modify: `src/js/renderer.js` `drawNext` to accept `previewMatrices` array and stack them with gaps
- Modify: `tetris.js` `drawNext` wiring from `queue.preview(5)`
- Modify: `test/unit/renderer.test.mjs` if `drawNext` is unit-tested via mock canvas

- [ ] **Step 1: Implement stacked Next draw** (5 slots, scale unchanged).
- [ ] **Step 2: Visual check desktop + mobile CSS (no Arena scroll regression at 1280×720).
- [ ] **Step 3: Commit**

```bash
git add index.html src/js/renderer.js tetris.js test/unit/renderer.test.mjs
git commit -m "feat: render Next 5 preview stack"
```

---

### Task 11: Settings UI + modal focus trap

**Files:**
- Modify: `index.html` — Settings button on start + pause; settings screen with preset radios, rebind buttons, DAS/ARR/lock sliders, Save/Back
- Modify: `tetris.js` — open/close settings; rebind capture mode; apply preset; persist; focus trap helpers

Focus trap sketch:

```js
function trapFocus(container, event) {
    if (event.key !== 'Tab') return;
    const nodes = [...container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )].filter(n => !n.disabled && n.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
```

Escape: if settings open → close settings; else if start/pause/result hierarchy → existing behavior / close one layer; during play → `togglePause`.

- [ ] **Step 1: Markup + styles matching existing modal panels**
- [ ] **Step 2: Wire logic + focus trap on `modalOverlay` keydown**
- [ ] **Step 3: Commit**

```bash
git add index.html tetris.js
git commit -m "feat: add settings UI with rebind, timing, and focus trap"
```

---

### Task 12: Gate window test API

**Files:**
- Modify: `tetris.js` exposure block
- Modify: `test-tetris.cjs` to open with `?test=1` (or inject before module load)

- [ ] **Step 1: Wrap exposure**

```js
const testMode = new URLSearchParams(location.search).has('test');
if (testMode) {
    for (const [name, value] of Object.entries(exposed)) window[name] = value;
    for (const [name, [getter, setter]] of Object.entries(liveState)) {
        Object.defineProperty(window, name, {get: getter, set: setter, configurable: true});
    }
}
```

- [ ] **Step 2: Playwright** — default page URL includes `?test=1`. Add a test that loads without `?test=1` and asserts `window.scoreLines === undefined`.

- [ ] **Step 3: Commit**

```bash
git add tetris.js test-tetris.cjs
git commit -m "fix: expose Playwright hooks only with ?test=1"
```

---

### Task 13: Playwright acceptance + README + LLMWiki

**Files:**
- Modify: `test-tetris.cjs`
- Modify: `README.md`
- Create: `llmwiki/guideline-core-2026-08-08.md`
- Modify: `llmwiki/index.md`, `llmwiki/log.md`

- [ ] **Step 1: Add/adjust Playwright cases** for Next 5, soft-drop hold points path, settings persistence, focus trap, Escape closes settings, leaderboard wipe, `?test=1` gate, Marathon/Sprint/Versus/Circuit smoke.

- [ ] **Step 2: Run full suite**

Run: `npm test`  
Expected: all unit + Playwright tests PASS.

- [ ] **Step 3: README** — document Guideline controls, Settings, Next 5, T-Spin/PC, leaderboard reset, Pulse Amp “positive attack” wording, `?test=1` for automated tests.

- [ ] **Step 4: LLMWiki** delivery note + index/log links.

- [ ] **Step 5: Commit**

```bash
git add test-tetris.cjs README.md llmwiki
git commit -m "test: cover Guideline core upgrade and document release"
```

---

## Self-Review (plan vs spec)

| Spec requirement | Task |
| --- | --- |
| SRS wall kicks | 5, 9 |
| DAS/ARR + held soft drop | 7, 9 |
| Lock delay + reset cap | 6, 9 |
| Next 5 | 3, 9, 10 |
| T-Spin / PC / drop scores / B2B | 8, 9 |
| Settings rebind + timing + presets | 4, 11 |
| All modes | 9 (shared engine path) |
| Leaderboard reset | 4 |
| Campaign progress kept | 4 (no scenario key writes for wipe) |
| window API gate | 12 |
| Hazard clamp | 2 |
| Flash splice | 1 |
| Focus trap + Escape | 11 |
| README Pulse Amp | 13 |
| Unit + Playwright green | 13 |

No TBD placeholders. Naming locked: `tryRotateSrs`, `createPieceQueue`, `createInputController`, `createLockState`, `normalizeSettings`, `LEADERBOARD_GENERATION = 2`, preferences `version: 2`.

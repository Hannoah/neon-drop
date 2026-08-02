# Neon Circuit Scenario Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent five-stage Neon Circuit campaign, a safe initial-menu exit action, and stackable campaign upgrades while preserving all existing quick-play behavior.

**Architecture:** Put immutable campaign data and pure progress/rating calculations in one new `src/js/scenario.js` module. Keep runtime state, localStorage, screen transitions, and reuse of the existing board/AI loop in `tetris.js`; add only the campaign panels and responsive styling needed in `index.html`.

**Tech Stack:** Vanilla JavaScript ES modules, Canvas, Web Audio API, localStorage, Node built-in test runner, Playwright.

---

## File Map

- Create `src/js/scenario.js`: stage data, default progress, normalization, unlock, stars, and stacked upgrade effects.
- Create `test/unit/scenario.test.mjs`: isolated checks for all scenario rules.
- Modify `package.json`: include the scenario unit test in `test:unit`.
- Modify `index.html`: campaign-first menu, campaign map, briefing, reward, result, and exit fallback panels; scenario HUD and responsive styles.
- Modify `tetris.js`: scenario persistence, lifecycle, objectives, hazards, upgrades, and shared opponent/garbage predicates.
- Modify `src/js/renderer.js`: render the opponent from an `opponentActive` state instead of checking one mode string.
- Modify `test/unit/renderer.test.mjs`: cover the new opponent-active state contract.
- Modify `test-tetris.cjs`: browser regression tests for menu exit, campaign flow, persistence, hazards, rewards, AI stages, and layout.
- Modify `README.md`: document Neon Circuit and progress storage.
- Create `llmwiki/neon-circuit-scenario-2026-08-02.md`; modify `llmwiki/index.md` and `llmwiki/log.md`: record the delivered feature and verification.

### Task 1: Pure Scenario Rules

**Files:**
- Create: `src/js/scenario.js`
- Create: `test/unit/scenario.test.mjs`
- Modify: `package.json:7`

- [ ] **Step 1: Write the failing unit tests**

Create `test/unit/scenario.test.mjs` with focused assertions:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    SCENARIO_STAGES,
    createScenarioProgress,
    normalizeScenarioProgress,
    canPlayScenarioStage,
    starsForScenarioStage,
    scenarioUpgradeEffects,
} from '../../src/js/scenario.js';

test('defines the five Neon Circuit stages', () => {
    assert.equal(SCENARIO_STAGES.length, 5);
    assert.deepEqual(SCENARIO_STAGES.map(stage => stage.rival),
        ['BYTE', 'RUSH', 'GLITCH', 'MIRROR', 'OVERLORD']);
});

test('creates and normalizes safe scenario progress', () => {
    assert.deepEqual(createScenarioProgress(), {
        version: 1,
        unlockedStage: 1,
        results: {},
        upgrades: {pulse: 0, cryo: 0, firewall: 0},
        pendingRewardStage: null,
        completed: false,
    });
    assert.deepEqual(normalizeScenarioProgress({unlockedStage: 99, upgrades: {pulse: -2}}),
        createScenarioProgress());
});

test('only unlocked scenario stages can start', () => {
    const progress = {...createScenarioProgress(), unlockedStage: 3};
    assert.equal(canPlayScenarioStage(progress, 3), true);
    assert.equal(canPlayScenarioStage(progress, 4), false);
});

test('awards stars from each stage time thresholds', () => {
    assert.equal(starsForScenarioStage(SCENARIO_STAGES[0], 121000), 1);
    assert.equal(starsForScenarioStage(SCENARIO_STAGES[0], 120000), 2);
    assert.equal(starsForScenarioStage(SCENARIO_STAGES[0], 75000), 3);
});

test('stacks and caps scenario upgrade effects', () => {
    assert.deepEqual(scenarioUpgradeEffects({pulse: 2, cryo: 4, firewall: 3}), {
        scoreMultiplier: 1.4,
        outgoingGarbageBonus: 2,
        dropIntervalMultiplier: 1.3,
        firewallCharges: 3,
    });
});
```

Add `test/unit/scenario.test.mjs` to the explicit `test:unit` command in `package.json`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test:unit`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/js/scenario.js`.

- [ ] **Step 3: Implement the pure module**

Create `src/js/scenario.js`:

```js
export const SCENARIO_STAGES = Object.freeze([
    {id: 1, name: 'Boot Sequence', rival: 'BYTE', kind: 'lines', lineGoal: 8, dropStepMs: 100,
        timeLimitMs: null, hazardIntervalMs: null, opponentTurns: 0, starTimesMs: [120000, 75000]},
    {id: 2, name: 'Velocity Gate', rival: 'RUSH', kind: 'lines', lineGoal: 15, dropStepMs: 160,
        timeLimitMs: 150000, hazardIntervalMs: null, opponentTurns: 0, starTimesMs: [120000, 90000]},
    {id: 3, name: 'Interference Zone', rival: 'GLITCH', kind: 'lines', lineGoal: 18, dropStepMs: 120,
        timeLimitMs: null, hazardIntervalMs: 30000, opponentTurns: 0, starTimesMs: [180000, 120000]},
    {id: 4, name: 'Mirror Match', rival: 'MIRROR', kind: 'opponent', lineGoal: null, dropStepMs: 100,
        timeLimitMs: null, hazardIntervalMs: null, opponentTurns: 1, starTimesMs: [240000, 150000]},
    {id: 5, name: 'Crown Protocol', rival: 'OVERLORD', kind: 'opponent', lineGoal: null, dropStepMs: 100,
        timeLimitMs: null, hazardIntervalMs: 45000, opponentTurns: 2, starTimesMs: [300000, 210000]},
]);

export const SCENARIO_UPGRADES = Object.freeze([
    {id: 'pulse', name: 'Pulse Amp', description: '+20% score and +1 AI attack per stack'},
    {id: 'cryo', name: 'Cryo Field', description: '+10% drop interval per stack, max +30%'},
    {id: 'firewall', name: 'Firewall', description: 'Block one garbage application per stack'},
]);

export function createScenarioProgress() {
    return {
        version: 1,
        unlockedStage: 1,
        results: {},
        upgrades: {pulse: 0, cryo: 0, firewall: 0},
        pendingRewardStage: null,
        completed: false,
    };
}

export function normalizeScenarioProgress(value) {
    const clean = createScenarioProgress();
    if (!value || value.version !== 1 || !Number.isInteger(value.unlockedStage) ||
        value.unlockedStage < 1 || value.unlockedStage > SCENARIO_STAGES.length) return clean;
    clean.unlockedStage = value.unlockedStage;
    clean.completed = value.completed === true;
    clean.pendingRewardStage = Number.isInteger(value.pendingRewardStage) &&
        value.pendingRewardStage >= 1 && value.pendingRewardStage < SCENARIO_STAGES.length
        ? value.pendingRewardStage : null;
    clean.results = Object.fromEntries(Object.entries(value.results || {}).filter(([id, result]) =>
        Number(id) >= 1 && Number(id) <= SCENARIO_STAGES.length &&
        Number.isInteger(result?.stars) && result.stars >= 1 && result.stars <= 3 &&
        Number.isFinite(result?.bestTimeMs) && result.bestTimeMs >= 0));
    for (const id of Object.keys(clean.upgrades)) {
        const count = value.upgrades?.[id];
        clean.upgrades[id] = Number.isInteger(count) && count >= 0 && count <= 4 ? count : 0;
    }
    return clean;
}

export function canPlayScenarioStage(progress, stageId) {
    return Number.isInteger(stageId) && stageId >= 1 && stageId <= progress.unlockedStage;
}

export function starsForScenarioStage(stage, elapsedMs) {
    if (elapsedMs <= stage.starTimesMs[1]) return 3;
    if (elapsedMs <= stage.starTimesMs[0]) return 2;
    return 1;
}

export function scenarioUpgradeEffects(upgrades) {
    return {
        scoreMultiplier: 1 + (upgrades.pulse || 0) * 0.2,
        outgoingGarbageBonus: upgrades.pulse || 0,
        dropIntervalMultiplier: 1 + Math.min(3, upgrades.cryo || 0) * 0.1,
        firewallCharges: upgrades.firewall || 0,
    };
}
```

- [ ] **Step 4: Run the unit tests and verify GREEN**

Run: `npm run test:unit`

Expected: all unit tests pass, including five scenario tests.

- [ ] **Step 5: Commit**

```bash
git add package.json src/js/scenario.js test/unit/scenario.test.mjs
git commit -m "feat: add Neon Circuit rules"
```

### Task 2: Campaign-First Menu and Safe Exit

**Files:**
- Modify: `index.html:721-739`
- Modify: `tetris.js:43-80,589-720,868-879`
- Modify: `test-tetris.cjs:170-193,748-791`

- [ ] **Step 1: Add failing browser assertions**

Extend `testExitGame` and `testUsabilityUI`:

```js
assert.equal(await page.getByRole('button', {name: /Continue Neon Circuit/i}).count(), 1);
assert.equal(await page.getByRole('button', {name: 'Exit Game'}).count(), 1);

await page.evaluate(() => {
  window.confirm = () => true;
  window.close = () => {};
});
await page.getByRole('button', {name: 'Exit Game'}).click();
await page.waitForTimeout(10);
assert.equal(await page.locator('#exit-screen').isVisible(), true);
assert.equal(await page.evaluate(() => animationFrameId), null);
await page.getByRole('button', {name: 'Return to Menu'}).click();
assert.equal(await page.locator('#start-screen').isVisible(), true);
```

- [ ] **Step 2: Run the browser test and verify RED**

Run: `node test-tetris.cjs`

Expected: FAIL because Continue Neon Circuit, the menu Exit Game action, and `#exit-screen` do not exist.

- [ ] **Step 3: Add the menu and exit panel**

In `index.html`, make the campaign action primary, retain the three existing mode cards, move the existing leaderboard action to the footer, add `#menu-exit-btn`, and add:

```html
<button id="scenario-continue-btn" class="campaign-card" type="button">
  <span>CONTINUE CAMPAIGN</span><strong>NEON CIRCUIT</strong>
  <small id="scenario-continue-detail">STAGE 01 · BYTE</small>
</button>
<button id="menu-exit-btn" type="button" class="btn-exit">Exit Game</button>

<div id="exit-screen" class="modal" style="display:none;">
  <h2 id="exit-screen-title">SYSTEM OFFLINE</h2>
  <p>Neon Drop has ended. You may close this tab.</p>
  <button id="exit-return-btn" type="button">Return to Menu</button>
</div>
```

In `tetris.js`, cache the new buttons and implement:

```js
function exitApplication() {
    if (!confirm('Neon Drop을 종료하시겠습니까?')) return;
    cancelScheduledUpdate();
    stopBGM();
    isGameOver = true;
    window.close();
    setTimeout(() => {
        if (window.closed) return;
        startScreen.style.display = 'none';
        exitScreen.style.display = 'block';
        openModal('exit-screen-title', exitReturnBtn);
    }, 0);
}

menuExitBtn.addEventListener('click', exitApplication);
exitReturnBtn.addEventListener('click', showStartScreen);
```

Update `showStartScreen()` to hide `exitScreen`. Keep the in-game header Exit button bound to `quitGame()`. Add `exitApplication` to `exposed` and `animationFrameId` to `liveState` so the browser regression can verify shutdown without reaching into module scope.

- [ ] **Step 4: Run the browser test and verify GREEN**

Run: `node test-tetris.cjs`

Expected: all browser regression tests pass.

- [ ] **Step 5: Commit**

```bash
git add index.html tetris.js test-tetris.cjs
git commit -m "feat: add campaign menu and safe exit"
```

### Task 3: Scenario Persistence, Map, and Briefing

**Files:**
- Modify: `index.html:711-768`
- Modify: `tetris.js:1-115,155-215,589-681`
- Modify: `test-tetris.cjs:120-150,748-791`

- [ ] **Step 1: Write failing persistence and locked-stage tests**

Add `testScenarioMap`:

```js
async function testScenarioMap(browser, url) {
  const {page, pageErrors} = await openPage(browser, url);
  await page.getByRole('button', {name: /Continue Neon Circuit/i}).click();
  assert.equal(await page.locator('#scenario-map-screen').isVisible(), true);
  assert.equal(await page.locator('[data-scenario-stage]').count(), 5);
  assert.equal(await page.locator('[data-scenario-stage="2"]').isDisabled(), true);
  await page.evaluate(() => localStorage.setItem('neonDropScenario', JSON.stringify({
    version: 1, unlockedStage: 3, results: {'1': {stars: 2, bestTimeMs: 90000}},
    upgrades: {pulse: 1, cryo: 0, firewall: 0}, pendingRewardStage: null, completed: false,
  })));
  await page.reload();
  await page.getByRole('button', {name: /Continue Neon Circuit/i}).click();
  assert.equal(await page.locator('[data-scenario-stage="3"]').isDisabled(), false);
  assert.equal(await page.locator('[data-scenario-stage="4"]').isDisabled(), true);
  assert.equal(pageErrors.length, 0);
  await page.close();
}
```

Call it from the main test sequence.

- [ ] **Step 2: Run the browser test and verify RED**

Run: `node test-tetris.cjs`

Expected: FAIL because the scenario map does not exist.

- [ ] **Step 3: Add map/briefing markup and runtime state**

Import the scenario exports in `tetris.js`, add `SCENARIO_KEY = 'neonDropScenario'`, and maintain:

```js
let scenarioProgress = readScenarioProgress();
let activeScenarioStage = null;
let scenarioHazardTimer = 0;
let firewallCharges = 0;
let scenarioResolved = false;

function readScenarioProgress() {
    try {
        return normalizeScenarioProgress(JSON.parse(localStorage.getItem(SCENARIO_KEY)));
    } catch {
        return createScenarioProgress();
    }
}

function writeScenarioProgress() {
    try { localStorage.setItem(SCENARIO_KEY, JSON.stringify(scenarioProgress)); } catch {}
}
```

Add `#scenario-map-screen` with five stage buttons generated once from `SCENARIO_STAGES`, `#scenario-stage-detail`, Play, Back, and confirmed New Campaign actions. Add `#scenario-briefing-screen` with rival, objective, modifier, Start Stage, and Back buttons. `renderScenarioMap()` must set `disabled`, `aria-label`, stars, best time, and the selected-stage detail from normalized progress.

Continue opens the map focused on `unlockedStage`.

Add `SCENARIO_STAGES`, `createScenarioProgress`, `readScenarioProgress`, `renderScenarioMap`, and `startScenarioStage` to `exposed`. Add `scenarioProgress` and `activeScenarioStage` to `liveState`, using the same live getter/setter pattern as `gameMode`.

- [ ] **Step 4: Run the browser test and verify GREEN**

Run: `node test-tetris.cjs`

Expected: all browser regression tests pass, including locked-stage enforcement and reload persistence.

- [ ] **Step 5: Commit**

```bash
git add index.html tetris.js test-tetris.cjs
git commit -m "feat: add persistent campaign map"
```

### Task 4: Line Objectives, Timed Failure, and Hazards

**Files:**
- Modify: `index.html:625-710`
- Modify: `tetris.js:100-130,251-310,412-490,530-585,757-789`
- Modify: `test-tetris.cjs:450-620`

- [ ] **Step 1: Write failing line-stage lifecycle tests**

Add tests that start stage 1 through the UI, then drive exposed state:

```js
await page.evaluate(() => {
  player.lines = 7;
  activeScenarioStage = SCENARIO_STAGES[0];
  gameMode = 'scenario';
  scenarioResolved = false;
  completeScenarioLineProgress(1);
});
assert.equal(await page.locator('#scenario-result-screen').isVisible(), true);

const timeout = await page.evaluate(() => {
  activeScenarioStage = SCENARIO_STAGES[1];
  gameMode = 'scenario';
  elapsedTime = 150001;
  scenarioResolved = false;
  updateScenarioState(0);
  return document.querySelector('#scenario-result-title').textContent;
});
assert.equal(timeout, 'Time Up!');

const pausedHazard = await page.evaluate(() => {
  activeScenarioStage = SCENARIO_STAGES[2];
  scenarioHazardTimer = 1;
  isPaused = true;
  update(1000);
  return playerPendingGarbage;
});
assert.equal(pausedHazard, 0);
```

- [ ] **Step 2: Run the browser test and verify RED**

Run: `node test-tetris.cjs`

Expected: FAIL because scenario stage runtime functions are undefined.

- [ ] **Step 3: Implement the line-stage lifecycle**

Add an objective HUD element in `index.html`:

```html
<span id="scenario-objective" hidden>OBJECTIVE 0 / 0</span>
```

Add a minimal failure/result panel now so timed failure and retry are delivered with the lifecycle rather than temporarily using the leaderboard game-over UI:

```html
<div id="scenario-result-screen" class="modal" style="display:none;">
  <h2 id="scenario-result-title">STAGE RESULT</h2>
  <div id="scenario-result-stars" aria-label="Stage rating"></div>
  <p id="scenario-result-detail"></p>
  <button id="scenario-retry-btn" type="button">Retry Stage</button>
  <button id="scenario-result-map-btn" type="button">Campaign Map</button>
</div>
```

Add these runtime boundaries in `tetris.js`:

```js
function hasScenarioOpponent() {
    return gameMode === 'scenario' && activeScenarioStage?.kind === 'opponent';
}

function opponentPlayActive() {
    return gameMode === 'versus' || hasScenarioOpponent();
}

function playerGarbageActive() {
    return gameMode === 'versus' || (gameMode === 'scenario' && activeScenarioStage?.id >= 3);
}

function completeScenarioLineProgress(rowCount) {
    if (gameMode !== 'scenario' || activeScenarioStage?.kind !== 'lines' || scenarioResolved) return;
    if (player.lines >= activeScenarioStage.lineGoal) completeScenarioStage();
}

function updateScenarioState(deltaTime) {
    if (gameMode !== 'scenario' || !activeScenarioStage || scenarioResolved) return;
    if (activeScenarioStage.timeLimitMs && elapsedTime >= activeScenarioStage.timeLimitMs) {
        failScenarioStage('Time Up!');
        return;
    }
    if (!activeScenarioStage.hazardIntervalMs) return;
    scenarioHazardTimer -= deltaTime;
    if (scenarioHazardTimer <= 0) {
        queueGarbageForPlayer(1);
        scenarioHazardTimer += activeScenarioStage.hazardIntervalMs;
        lastEventMessage = 'INTERFERENCE +1';
    }
}
```

Call `completeScenarioLineProgress(rowCount)` after `scoreLines()` updates `player.lines`, and `updateScenarioState(deltaTime)` inside `update()` after elapsed time advances. Start each scenario stage with the stage's hazard interval and reset all transient scenario fields in `resetGameState()`.

Implement `failScenarioStage(title)` to set `scenarioResolved`/`isGameOver`, cancel the frame, stop transient input, show `#scenario-result-screen`, and preserve saved progress. Retry calls `startScenarioStage(activeScenarioStage.id)`; Campaign Map calls `showScenarioMap()`.

Apply Cryo after the normal level/stage interval calculation:

```js
const stepMs = gameMode === 'scenario' ? activeScenarioStage.dropStepMs : 100;
const baseDropInterval = Math.max(100, 1000 - (player.level - 1) * stepMs);
const effects = scenarioUpgradeEffects(scenarioProgress.upgrades);
dropInterval = Math.round(baseDropInterval * (gameMode === 'scenario' ? effects.dropIntervalMultiplier : 1));
```

Add `completeScenarioLineProgress`, `updateScenarioState`, `failScenarioStage`, `opponentPlayActive`, and `playerGarbageActive` to `exposed`. Add `scenarioHazardTimer` and `scenarioResolved` to `liveState`.

- [ ] **Step 4: Run targeted and full tests**

Run: `node test-tetris.cjs && npm run test:unit`

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add index.html tetris.js test-tetris.cjs
git commit -m "feat: add campaign objectives and hazards"
```

### Task 5: Scenario AI Reuse and Upgrade Effects

**Files:**
- Modify: `tetris.js:216-249,251-280,324-411,467-489,723-756,790-826`
- Modify: `src/js/renderer.js:108-119`
- Modify: `test/unit/renderer.test.mjs:35-50`
- Modify: `test-tetris.cjs:650-750`

- [ ] **Step 1: Write failing shared-path tests**

Update the renderer test state to use `opponentActive`, and add browser assertions:

```js
const scenarioBattle = await page.evaluate(() => {
  gameMode = 'scenario';
  activeScenarioStage = SCENARIO_STAGES[3];
  resetOpponentState();
  queueGarbageForOpponent(2);
  return {
    opponentReady: Boolean(opponent.matrix),
    queued: opponent.pendingGarbage,
    opponentActive: opponentPlayActive(),
    garbageActive: playerGarbageActive(),
  };
});
assert.deepEqual(scenarioBattle, {
  opponentReady: true, queued: 2, opponentActive: true, garbageActive: true,
});
```

Add upgrade checks by setting two Pulse stacks and one Firewall stack, then assert a positive attack gains 2 lines and the first incoming garbage application is blocked.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm run test:unit && node test-tetris.cjs`

Expected: FAIL because renderer still checks `gameMode === 'versus'` and scenario competitive paths reject the stage.

- [ ] **Step 3: Route all opponent and garbage paths through predicates**

Replace direct Versus mode guards in `emitMatchEvent`, `queueGarbageForOpponent`, `queueGarbageForPlayer`, `runOpponentTurn`, `resetOpponentState`, `endVersusMatch`, `playerReset`, and `playerHold` with `opponentPlayActive()` or `playerGarbageActive()` as appropriate.

Pass `opponentActive: opponentPlayActive()` to the renderer state and change `drawOpponent()` to:

```js
const {opponentActive, opponent} = getState();
if (!opponentActive || !opponent.matrix) return;
```

Apply upgrade effects only in scenario mode:

```js
const scenarioEffects = gameMode === 'scenario'
    ? scenarioUpgradeEffects(scenarioProgress.upgrades)
    : {scoreMultiplier: 1, outgoingGarbageBonus: 0};
player.score += Math.round(points * scenarioEffects.scoreMultiplier);
queueGarbageForOpponent(attack > 0 ? attack + scenarioEffects.outgoingGarbageBonus : 0);
```

Before applying positive pending garbage to the player, consume a Firewall charge and clear the pending batch. Run `activeScenarioStage.opponentTurns` AI turns after each player lock, stopping immediately if the match resolves.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm run test:unit && node test-tetris.cjs`

Expected: all tests pass; quick-play Versus assertions remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add tetris.js src/js/renderer.js test/unit/renderer.test.mjs test-tetris.cjs
git commit -m "feat: add scenario rivals and upgrades"
```

### Task 6: Results, Rewards, Retry, and Progress Completion

**Files:**
- Modify: `index.html:711-790`
- Modify: `tetris.js:589-720`
- Modify: `test-tetris.cjs:500-650`

- [ ] **Step 1: Write failing reward and retry tests**

Add `testScenarioRewards`:

```js
await page.evaluate(() => {
  scenarioProgress = createScenarioProgress();
  activeScenarioStage = SCENARIO_STAGES[0];
  elapsedTime = 70000;
  gameMode = 'scenario';
  scenarioResolved = false;
  completeScenarioStage();
});
assert.equal(await page.locator('#scenario-result-stars').textContent(), '★★★');
assert.equal(await page.evaluate(() => scenarioProgress.pendingRewardStage), 1);

await page.getByRole('button', {name: /Choose Upgrade/i}).click();
await page.getByRole('button', {name: /Pulse Amp/i}).click();
assert.deepEqual(await page.evaluate(() => ({
  unlocked: scenarioProgress.unlockedStage,
  pulse: scenarioProgress.upgrades.pulse,
  pending: scenarioProgress.pendingRewardStage,
})), {unlocked: 2, pulse: 1, pending: null});

await page.reload();
assert.equal(await page.evaluate(() => readScenarioProgress().upgrades.pulse), 1);
```

Add a loss assertion that Retry keeps upgrades and restarts the same stage with an empty board.

- [ ] **Step 2: Run the browser test and verify RED**

Run: `node test-tetris.cjs`

Expected: FAIL because result and reward screens do not exist.

- [ ] **Step 3: Add result/reward screens and atomic progression**

Extend `#scenario-result-screen` with time and a Choose Upgrade action, and add `#scenario-reward-screen` with three upgrade buttons.

Implement completion so persistence happens before the modal opens:

```js
function completeScenarioStage() {
    if (scenarioResolved || !activeScenarioStage) return;
    scenarioResolved = true;
    isGameOver = true;
    cancelScheduledUpdate();
    const stars = starsForScenarioStage(activeScenarioStage, elapsedTime);
    const previous = scenarioProgress.results[activeScenarioStage.id];
    scenarioProgress.results[activeScenarioStage.id] = {
        stars: Math.max(previous?.stars || 0, stars),
        bestTimeMs: Math.min(previous?.bestTimeMs ?? Infinity, elapsedTime),
    };
    scenarioProgress.unlockedStage = Math.max(
        scenarioProgress.unlockedStage,
        Math.min(5, activeScenarioStage.id + 1),
    );
    scenarioProgress.pendingRewardStage = activeScenarioStage.id < 5
        ? activeScenarioStage.id : null;
    scenarioProgress.completed ||= activeScenarioStage.id === 5;
    writeScenarioProgress();
    showScenarioResult(true, stars);
}
```

`chooseScenarioUpgrade(id)` validates `id`, requires a pending reward, increments exactly one stack, clears the pending reward, persists, and returns to the map. Retry calls the same `startScenarioStage(activeScenarioStage.id)` path as first play.

Update Continue Neon Circuit so a non-null `pendingRewardStage` opens the reward screen; otherwise it opens the map focused on `unlockedStage`.

Add `completeScenarioStage`, `chooseScenarioUpgrade`, and `showScenarioResult` to `exposed` for browser regression tests.

- [ ] **Step 4: Run the browser test and verify GREEN**

Run: `node test-tetris.cjs`

Expected: all browser tests pass, including refresh-safe reward selection and retry.

- [ ] **Step 5: Commit**

```bash
git add index.html tetris.js test-tetris.cjs
git commit -m "feat: add campaign results and rewards"
```

### Task 7: Responsive Polish, Documentation, and Acceptance Verification

**Files:**
- Modify: `index.html:356-622`
- Modify: `test-tetris.cjs:193-314`
- Modify: `README.md:13-24`
- Create: `llmwiki/neon-circuit-scenario-2026-08-02.md`
- Modify: `llmwiki/index.md`
- Modify: `llmwiki/log.md`

- [ ] **Step 1: Add failing layout assertions**

At 1280×720 assert the campaign map is fully visible with no document scroll and all five nodes share a row. At 390×844 with coarse-pointer emulation assert nodes stack, actions remain visible, and the modal scrolls internally rather than clipping the page.

```js
assert.equal(layout.noPageScroll, true);
assert.equal(layout.allNodesShareRow, true);
assert.ok(layout.mapBottom <= 720);
assert.equal(mobile.nodesStack, true);
assert.equal(mobile.exitVisible, true);
```

- [ ] **Step 2: Run the browser test and verify RED**

Run: `node test-tetris.cjs`

Expected: FAIL until campaign-specific desktop and mobile CSS is added.

- [ ] **Step 3: Add the minimum responsive CSS**

Use the existing Tactical Neon variables. Give the campaign map a five-column route on desktop, a single-column route inside a scrollable modal on narrow/coarse-pointer devices, visible focus outlines, `aria-current="step"` on the selected stage, and reduced-motion handling for node glow/meter transitions.

Keep the existing Arena HUD dimensions unchanged. Do not add image assets, fonts, dependencies, or a second stylesheet.

- [ ] **Step 4: Update user and LLMWiki documentation**

Add Neon Circuit, upgrade, progress-save, retry, and initial Exit behavior to `README.md`. Record stage rules, persistence key, tests, and final commit in the new LLMWiki page; link it from `llmwiki/index.md` and `llmwiki/log.md`.

- [ ] **Step 5: Run full automated verification**

Run:

```bash
npm test
git diff --check
```

Expected: all unit tests and browser regression tests pass; diff check emits no output.

- [ ] **Step 6: Capture real-browser acceptance screenshots**

Run `npm start`, then use the Playwright CLI at 1280×720 to capture:

- `output/playwright/neon-circuit-map.png`
- `output/playwright/neon-circuit-boss.png`

Verify `document.documentElement.scrollWidth === 1280`, `scrollHeight === 720`, no modal or board clipping, correct locked/current/completed stage states, and visible scenario objective text.

- [ ] **Step 7: Commit**

```bash
git add index.html test-tetris.cjs README.md llmwiki/index.md llmwiki/log.md llmwiki/neon-circuit-scenario-2026-08-02.md
git commit -m "docs: finish Neon Circuit campaign"
```

## Final Acceptance Checklist

- Initial menu contains Continue Neon Circuit and Exit Game.
- Browser close is attempted; refusal produces a usable exit screen.
- Five campaign stages implement the approved goals, timers, hazards, and AI turn counts.
- Progress, stars, best times, upgrades, pending rewards, and completion survive reload.
- Loss retries the same stage without deleting progress or upgrades.
- Pulse, Cryo, and Firewall stack exactly as specified.
- Scenario opponent and garbage behavior reuse shared paths; quick-play modes retain current behavior.
- Desktop 1280×720 and narrow/coarse-pointer layouts are usable without clipping.
- `npm test` passes and both acceptance screenshots have been visually inspected.

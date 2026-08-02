# Neon Drop Desktop Arena HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the clipped desktop play layout with a Tactical Neon Arena HUD that fits Versus AI and single-player modes inside 1280×720.

**Architecture:** Recompose the existing DOM into header, board, versus-status, player-rail, and match-footer grid areas while preserving every gameplay ID and Canvas. Add only two read-only player-garbage DOM bindings in `tetris.js`; all gameplay, renderer, scoring, AI, and storage code stays unchanged.

**Tech Stack:** Vanilla HTML/CSS, JavaScript ES modules, Canvas, Node test runner, Playwright

---

### Task 1: Add failing Arena HUD layout regressions

**Files:**
- Modify: `test-tetris.cjs:180-300`

- [ ] **Step 1: Replace desktop geometry assertions with Arena HUD assertions**

At a 1280×720 viewport, start Versus and collect this browser state:

```js
const layout = await page.evaluate(() => {
  const container = document.querySelector('#game-container').getBoundingClientRect();
  const ai = document.querySelector('#opponent-board').getBoundingClientRect();
  const player = document.querySelector('#tetris').getBoundingClientRect();
  return {
    areas: getComputedStyle(document.querySelector('#game-container')).gridTemplateAreas,
    containerTop: container.top,
    containerBottom: container.bottom,
    viewportHeight: innerHeight,
    noPageScroll: document.documentElement.scrollHeight <= innerHeight,
    sameRow: Math.abs(ai.top - player.top) < 4,
    sameSize: Math.abs(ai.width - player.width) < 4 && Math.abs(ai.height - player.height) < 4,
    aiLabel: document.querySelector('#opponent-panel .board-label').textContent.trim(),
    playerLabel: document.querySelector('#player-panel .board-label').textContent.trim(),
    versusVisible: getComputedStyle(document.querySelector('#versus-status')).display !== 'none',
  };
});
assert.ok(layout.areas.includes('opponent versus player rail'));
assert.ok(layout.containerTop >= 0 && layout.containerBottom <= layout.viewportHeight);
assert.equal(layout.noPageScroll, true);
assert.equal(layout.sameRow, true);
assert.equal(layout.sameSize, true);
assert.equal(layout.aiLabel, 'AI RIVAL');
assert.equal(layout.playerLabel, 'YOU');
assert.equal(layout.versusVisible, true);
```

- [ ] **Step 2: Add a single-player Arena HUD assertion**

At 1280×720, start Marathon and assert `#opponent-panel` and `#versus-status` are hidden, `#player-panel` and `#side-panel` share a row, and the complete container remains inside the viewport.

- [ ] **Step 3: Run browser tests and verify RED**

Run: `node test-tetris.cjs`

Expected: FAIL because `#player-panel`, `#versus-status`, board labels, and Arena HUD grid areas do not exist.

### Task 2: Build the Arena HUD markup and Tactical Neon layout

**Files:**
- Modify: `index.html:8-489`

- [ ] **Step 1: Recompose the play markup while preserving runtime IDs**

Use this grid-area structure inside `#game-container`:

```html
<header id="arena-header">
  <div class="brand-lockup"><strong>NEON DROP</strong><span>ARCADE SYSTEM</span></div>
  <div class="match-meta"><span id="mode"></span><span id="timer"></span></div>
  <nav class="header-actions" aria-label="Game options">
    <!-- Move the existing Leaderboard, Sound settings, Controls and rules disclosures here. -->
    <button class="btn-exit" id="exit-game-btn">Exit</button>
  </nav>
</header>
<div id="opponent-panel">
  <div class="board-label">AI RIVAL</div>
  <canvas id="opponent-board" width="240" height="400"></canvas>
</div>
<section id="versus-status" aria-label="Versus status">
  <strong>VS</strong>
  <div id="opponent-garbage"></div>
  <div class="garbage-meter"><span id="opponent-garbage-meter"></span></div>
  <div id="player-garbage"></div>
  <div class="garbage-meter"><span id="player-garbage-meter"></span></div>
</section>
<div id="player-panel">
  <div class="board-label">YOU</div>
  <canvas id="tetris" width="240" height="400"></canvas>
</div>
<aside id="side-panel"><!-- Existing Stats, Hold, and Next content only. --></aside>
<footer id="match-footer"><!-- Existing Combo, Lines, B2B, and event message nodes. --></footer>
```

- [ ] **Step 2: Replace desktop layout CSS with exact Arena HUD geometry**

```css
#game-container {
  display: grid;
  grid-template-columns: 248px 112px 248px 224px;
  grid-template-rows: 48px 428px 62px;
  grid-template-areas:
    "header header header header"
    "opponent versus player rail"
    "footer footer footer footer";
  gap: 10px 12px;
  width: 902px;
  max-height: calc(100vh - 24px);
  padding: 12px;
}
#arena-header { grid-area: header; }
#opponent-panel { grid-area: opponent; }
#versus-status { grid-area: versus; }
#player-panel { grid-area: player; }
#side-panel { grid-area: rail; }
#match-footer { grid-area: footer; }
#game-container:not(.versus-active) {
  grid-template-columns: 248px 224px;
  grid-template-areas: "header header" "player rail" "footer footer";
  width: 494px;
}
#game-container:not(.versus-active) #opponent-panel,
#game-container:not(.versus-active) #versus-status { display: none; }
```

Style Player cyan, AI magenta, garbage amber, surfaces deep navy, and restrict glow to board borders and active event text. Remove old desktop rules that stack the side panel beneath Versus boards.

- [ ] **Step 3: Preserve the current narrow-screen behavior**

Inside the existing `(max-width: 760px), (orientation: portrait), (pointer: coarse)` query, use two equal board columns for Versus and place the rail/footer below them. Keep Canvas width at `100%`, height `auto`, body scrolling enabled, touch controls visible, and single-player in one column.

- [ ] **Step 4: Run browser tests and verify markup/layout GREEN**

Run: `node test-tetris.cjs`

Expected: Arena HUD assertions pass; any stale legacy layout assertions are updated to the approved geometry without weakening gameplay or mobile checks.

### Task 3: Bind live garbage pressure to the HUD

**Files:**
- Modify: `tetris.js:65-75, 565-585`
- Test: `test-tetris.cjs`

- [ ] **Step 1: Add a failing live-status regression**

In Versus mode, set `opponent.pendingGarbage = 5` and `playerPendingGarbage = 3`, call `updateScore()`, then assert:

```js
assert.deepEqual(await page.evaluate(() => ({
  aiText: document.querySelector('#opponent-garbage').textContent,
  playerText: document.querySelector('#player-garbage').textContent,
  aiMeter: document.querySelector('#opponent-garbage-meter').style.width,
  playerMeter: document.querySelector('#player-garbage-meter').style.width,
})), {
  aiText: 'AI INCOMING 05',
  playerText: 'YOU INCOMING 03',
  aiMeter: '25%',
  playerMeter: '15%',
});
```

- [ ] **Step 2: Run browser tests and verify RED**

Run: `node test-tetris.cjs`

Expected: FAIL because Player garbage text and both meter widths are not bound.

- [ ] **Step 3: Implement the two read-only HUD bindings**

Cache `player-garbage`, `opponent-garbage-meter`, and `player-garbage-meter`. In `updateScore()` set padded text and width using `MAX_PENDING_GARBAGE`:

```js
opponentGarbageElement.innerText = `AI INCOMING ${String(opponent.pendingGarbage).padStart(2, '0')}`;
playerGarbageElement.innerText = `YOU INCOMING ${String(playerPendingGarbage).padStart(2, '0')}`;
opponentGarbageMeter.style.width = `${opponent.pendingGarbage / MAX_PENDING_GARBAGE * 100}%`;
playerGarbageMeter.style.width = `${playerPendingGarbage / MAX_PENDING_GARBAGE * 100}%`;
```

- [ ] **Step 4: Run the complete suite**

Run: `npm test`

Expected: all Node and Playwright tests pass with zero page errors.

### Task 4: Visual verification and staging

**Files:**
- Verify: `index.html`, `tetris.js`, `test-tetris.cjs`
- Capture: `output/playwright/versus-arena-hud.png` (ignored artifact)

- [ ] **Step 1: Capture the approved desktop state**

Launch Versus AI at 1280×720 and save `output/playwright/versus-arena-hud.png`.

- [ ] **Step 2: Inspect the screenshot**

Confirm both boards are fully visible and aligned, no HUD content is clipped, Player cyan/AI magenta identities are obvious, and Score/Hold/Next are readable without scrolling.

- [ ] **Step 3: Run final verification**

Run: `npm test` and `git diff --cached --check`

Expected: all tests pass and no whitespace errors are reported.

- [ ] **Step 4: Stage intended UI changes**

Run: `git add index.html tetris.js test-tetris.cjs docs/superpowers/plans/2026-08-01-desktop-arena-hud.md`

Expected: the UI implementation and its tests are staged; root `AGENT.md`, `.env`, `.superpowers/`, and `output/` remain excluded.

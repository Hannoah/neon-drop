# Neon Drop Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix keyboard mode start, modal accessibility, coarse-pointer controls, preference persistence, dead code, and Git tracking without changing gameplay or the Neon Drop name.

**Architecture:** Keep the existing single-page structure. Add small preference functions in `tetris.js`, use the platform `inert` attribute with existing overlays, and extend existing Node/Playwright regression tests instead of adding dependencies.

**Tech Stack:** Vanilla JavaScript ES modules, HTML/CSS, Node test runner, Playwright

---

### Task 1: Add failing regressions

**Files:**
- Modify: `test-tetris.cjs`
- Modify: `test/unit/package.test.mjs`

- [ ] **Step 1: Add a browser regression for focused mode-card Enter**

Focus the Sprint mode card, press Enter, and assert `gameMode === 'sprint'` and the modal closes.

- [ ] **Step 2: Add browser regressions for modal state and preferences**

Assert that the start overlay has dialog semantics, the game container is inert, initial focus is on Start Game, and mode/BGM/SFX values survive reload. Seed corrupt preference JSON and assert the page still loads.

- [ ] **Step 3: Add static markup regressions**

Read `index.html` and assert that the responsive media query contains `(pointer: coarse)` and that the overlay declares dialog semantics.

- [ ] **Step 4: Run tests and verify RED**

Run: `npm test`

Expected: failures for keyboard mode start, modal state, preference restoration, coarse-pointer CSS, and dialog markup.

### Task 2: Implement interaction and preference fixes

**Files:**
- Modify: `tetris.js`
- Modify: `index.html`

- [ ] **Step 1: Correct focused-card Enter handling**

Before calling `startGameBtn.click()`, call `selectGameMode(event.target.dataset.mode)` when `event.target` matches `[data-mode-card]`.

- [ ] **Step 2: Apply native modal state**

Declare `role="dialog"` and `aria-modal="true"` on the overlay. When opening a screen, set `gameContainer.inert` and `touchControls.inert`, update `aria-labelledby`, and focus that screen's primary action. Remove inert state when gameplay resumes.

- [ ] **Step 3: Persist three preferences**

Add `readPreferences()` and `writePreferences()` using one `neonDropPreferences` JSON object inside `try/catch`. Restore only `marathon`, `sprint`, or `versus` modes and boolean sound values. Save after mode or sound changes.

- [ ] **Step 4: Add coarse-pointer CSS**

Extend the existing responsive media query with `(pointer: coarse)`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test`

Expected: all unit and browser tests pass.

### Task 3: Remove dead code

**Files:**
- Modify: `src/js/constants.js`
- Modify: `src/js/renderer.js`
- Modify: `tetris.js`

- [ ] **Step 1: Delete unused APIs**

Delete `PIECE_NAMES`, `addGarbageLine`, the standalone renderer `screenShake`, and the unused returned renderer shake wrapper. Remove unused imports and test-global exposures made obsolete by those deletions.

- [ ] **Step 2: Run the complete suite**

Run: `npm test`

Expected: all tests pass with no page errors.

### Task 4: Verify and stage the project

**Files:**
- Stage: `.gitignore`, `README.md`, `index.html`, `package.json`, `package-lock.json`, `src/`, `test/`, `test-tetris.cjs`, `tetris.js`, `docs/`

- [ ] **Step 1: Inspect the final diff and status**

Run: `git diff --check` and `git status --short`

Expected: no whitespace errors; only intended project files are present.

- [ ] **Step 2: Run final verification**

Run: `npm test`

Expected: all unit and browser tests pass.

- [ ] **Step 3: Stage intended files without committing**

Run: `git add .gitignore README.md index.html package.json package-lock.json src test test-tetris.cjs tetris.js docs`

Expected: `git status --short` shows intended files in the index and no application files remain untracked.

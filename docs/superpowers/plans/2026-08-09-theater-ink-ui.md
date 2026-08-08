# Theater Ink UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Neon Drop start menu, in-game HUD, pause, and settings into Ink Contrast + Theater Focus without changing engine rules.

**Architecture:** Mostly `index.html` markup/CSS rewrite; minimal `tetris.js` selector/wiring updates; Playwright selector fixes. Keep all game IDs that tests rely on (`#start-game-btn`, `#tetris`, `#next`, `#hold`, settings IDs, scenario buttons).

**Tech Stack:** Vanilla HTML/CSS/JS, DM Sans via Google Fonts, existing Playwright suite.

**Spec:** `docs/superpowers/specs/2026-08-09-theater-ink-ui-design.md`

---

## File Map

| Path | Change |
| --- | --- |
| `index.html` | Tokens, fonts, Theater grid, start menu IA, header simplify, pause/settings Ink, motion |
| `tetris.js` | Only if DOM class/ID wiring breaks (header menus, campaign card helpers) |
| `test-tetris.cjs` | Update selectors for Circuit entry, removed header details, layout asserts |
| `test/unit/package.test.mjs` | Assert new font/token markers if present |
| `README.md` | Brief UI note |
| `llmwiki/` | Delivery note |

---

### Task 1: Design tokens + font + base chrome

**Files:** `index.html` (`<head>` styles, body)

- [ ] **Step 1:** Add DM Sans link + CSS variables (`--bg --panel --border --text --muted --accent`).
- [ ] **Step 2:** Restyle `body`, `#game-container`, `.modal`, buttons to Ink (no glow).
- [ ] **Step 3:** Visual check start modal still opens; commit `style: add Ink Contrast tokens and DM Sans`.

### Task 2: Start menu Theater composition

**Files:** `index.html` start-screen markup; `tetris.js` if campaign continue button text/structure changes

- [ ] **Step 1:** Restructure `#start-screen`: brand hero, tagline, board silhouette preview (can reuse static empty wells or live mini canvases if already present—prefer CSS silhouette to avoid new JS).
- [ ] **Step 2:** Primary `#start-game-btn` labeled Play; mode cards row; secondary Circuit (`#scenario-continue-btn` restyled) + Settings; tertiary Leaderboard + Exit.
- [ ] **Step 3:** Remove oversized campaign-card visual dominance (keep button id for tests).
- [ ] **Step 4:** Update any Playwright looking for `/CONTINUE CAMPAIGN/i` to Circuit-friendly name; commit `feat: rebuild start menu as Theater Ink`.

### Task 3: In-game Theater rails + header

**Files:** `index.html` arena layout

- [ ] **Step 1:** Grid: left rail (hold+next) · center board · right rail (score/meta). Solo width fits viewport; remove empty spacer column.
- [ ] **Step 2:** Simplify `#arena-header` to brand · mode/time · Pause control (Settings via pause). Remove Ranks/Sound/Help `<details>` OR hide and move BGM/SFX into Settings only (Settings already has audio—remove duplicate header sound menu).
- [ ] **Step 3:** Versus: opponent board left of player; keep pressure UI Ink-flat.
- [ ] **Step 4:** Mobile media query: stack rails under board; commit `feat: theater HUD rails and simplified header`.

### Task 4: Pause / Settings sheets + motion

**Files:** `index.html` CSS/HTML; tiny JS if pause button added to header

- [ ] **Step 1:** Pause actions vertical Ink stack; Settings sheet match tokens.
- [ ] **Step 2:** Add CSS motions (start enter, play transition hooks via class on `#modal-overlay` / `#game-container`); honor `prefers-reduced-motion`.
- [ ] **Step 3:** Wire header Pause to existing `togglePause` if new button; commit `feat: ink pause/settings sheets and motion`.

### Task 5: Tests + docs

**Files:** `test-tetris.cjs`, `test/unit/package.test.mjs`, `README.md`, `llmwiki/*`

- [ ] **Step 1:** Fix broken selectors; keep `?test=1` gate tests.
- [ ] **Step 2:** `npm test` green.
- [ ] **Step 3:** README + LLMWiki; commit `test: cover Theater Ink UI and document`.

## Self-review vs spec

| Spec item | Task |
| --- | --- |
| Ink tokens / DM Sans / no glow | 1 |
| Start IA / demote campaign card | 2 |
| Theater rails | 3 |
| Pause/Settings / motion | 4 |
| Engine unchanged + tests | 5 |

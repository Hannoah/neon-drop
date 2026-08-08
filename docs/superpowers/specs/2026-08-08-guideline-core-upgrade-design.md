# Guideline Core Upgrade Design (Wave A)

Date: 2026-08-08
Status: approved for planning

## Goal

Bring Neon Drop’s core feel and scoring up to Guideline-class expectations across every game mode, fix the defects from the 2026-08-08 project review, and add configurable controls/timing—without online multiplayer, new mode roster expansion (Ultra/Zen), replay, or cosmetics markets.

## Decisions

| Topic | Choice |
| --- | --- |
| Scope wave | A — Guideline core + review fixes |
| Scoring / judgments | All modes: Marathon, Sprint, Versus AI, Neon Circuit |
| Architecture | Extract pure engine modules; keep `tetris.js` as loop/UI orchestrator |
| Leaderboard | Reset existing `tetrisLeaderboard` scores |
| Campaign progress | Keep `neonDropScenario` unchanged by this migration |
| Settings depth | Key rebind + DAS/ARR/lock-delay sliders + Classic/Guideline presets |
| Soft drop | Hold-to-accelerate (not click-per-cell) |
| Next queue | Five pieces for the player |
| Existing Pivot | Replace with Guideline T-Spin Mini/Full detection and messaging |

## Player Experience

Players get modern piece handling (SRS, DAS/ARR, lock delay with resets, held soft drop), a five-piece next queue, T-Spin and Perfect Clear feedback, and a Settings screen for bindings and timing. Quick-play and Neon Circuit keep their existing mode framing; only the underlying feel and score rules change.

After upgrade, old high scores are cleared so the leaderboard reflects the new scoring generation.

## Architecture

New or extended modules under `src/js/`:

| Module | Responsibility |
| --- | --- |
| `srs.js` | SRS rotation and wall-kick tables for JLSTZ, I, and O |
| `input.js` | Pure DAS/ARR / soft-drop hold key state machine (no DOM) |
| `lock.js` | Lock delay, successful-move/rotate resets, reset cap |
| `queue.js` | 7-bag supplier exposing a Next-5 preview |
| `settings.js` | Preferences v2: bindings, timing, presets, migrate from v1 |
| `scoring.js` | Extend for T-Spin Mini/Full, Perfect Clear, soft/hard drop points, B2B on Tetris or T-Spin clear |
| `board.js` | Keep board utilities; route rotation through SRS |
| `renderer.js` | Draw Next 5; fix multi-line flash splice skip |
| `tetris.js` | rAF loop, modes, campaign UI, DOM wiring; delegate rules to modules |

### Review defect fixes (same wave)

1. Expose Playwright/`window` test API only when `?test=1` (or equivalent test bootstrap) is present.
2. Clamp scenario hazard timer so large `deltaTime` cannot flood garbage every frame.
3. Remove expired `flashingLines` without splice-during-`forEach` index skips.
4. Modal focus trap + Escape dismisses one modal layer; restore prior focus on close.
5. Align README Pulse Amp text with “+1 outgoing garbage on each positive attack.”
6. Do not commit secrets; `.env` remains gitignored. Token rotation is an operator action outside the repo.

## Input and Settings

### Actions

`moveLeft`, `moveRight`, `softDrop`, `hardDrop`, `rotateCW`, `rotateCCW`, `rotate180` (optional, unbound by default), `hold`, `pause`, `quit`.

### Presets

| Preset | Bindings summary |
| --- | --- |
| Classic (default) | ← → ↓ ↑ · Space hard · C hold · P/Esc pause · Q quit |
| Guideline | ← → ↓ · X/↑ CW · Z CCW · Space hard · C hold · P/Esc · Q |
| Custom | Any after rebind; selecting a preset overwrites bindings |

Rebind UX: click action → capture next `keydown`. Conflicting keys swap with the other action.

### Timing defaults and ranges

| Parameter | Default | Range | Notes |
| --- | --- | --- | --- |
| DAS | 167 ms | 50–400 | Delay before auto-repeat |
| ARR | 33 ms | 0–100 | `0` = infinite ARR (instant repeat) |
| Lock delay | 500 ms | 100–1000 | Starts on ground contact |
| Lock reset cap | 15 | fixed | Successful move/rotate resets until cap |
| Soft drop | 20× gravity | fixed in Wave A | Held while soft-drop action is down |

Opposite horizontal keys: most recently pressed direction wins. Touch soft-drop and left/right buttons use pointer down/up and the same DAS/ARR logic.

### Preferences persistence

`neonDropPreferences` becomes versioned:

```json
{
  "version": 2,
  "mode": "marathon",
  "bgm": true,
  "sfx": true,
  "preset": "classic",
  "bindings": {},
  "timing": { "das": 167, "arr": 33, "lockDelay": 500 }
}
```

v1 objects migrate by filling defaults. Corrupt JSON still falls back safely.

## Scoring and Judgments (all modes)

- **T-Spin**: last successful input was rotation; T piece; 3-corner rule. Mini vs Full follows kick/corner distinction used by common Guideline implementations.
- **Perfect Clear**: after a line clear, the board is empty → PC bonus and event message.
- **B2B**: continues across Tetris (4-line) or T-Spin clears with lines; broken by normal singles/doubles/triples without T-Spin.
- **Soft drop**: points per cell while soft-dropping.
- **Hard drop**: points per cell dropped, then immediate lock.
- Event copy uses `T-SPIN`, `T-SPIN MINI`, `T-SPIN SINGLE|DOUBLE|TRIPLE`, `TETRIS`, `PERFECT CLEAR`, `BACK-TO-BACK`, combo labels.
- Scenario upgrade Pulse Amp remains “score multiplier + outgoing garbage bonus only when `attack > 0`.”

Versus AI and scenario rivals do not need T-Spin-specialized AI in Wave A; they play with the existing heuristic on the updated board/rotation rules.

## UI / HUD

- Player Next rail shows five previews; Hold stays one slot with existing lock-after-hold rules.
- Opponent/AI keeps a single next piece.
- Settings opens from the start menu and from Pause, reusing the modal overlay; background click does not close; focus trap applies; Escape closes one layer.
- Desktop Arena HUD and mobile layouts keep the 2026-08-01 structure; only the Next rail grows.
- Visual language stays Neon Drop (no new card/gradient system).

## Migration

| Storage key | Wave A behavior |
| --- | --- |
| `neonDropPreferences` | Migrate to v2 with defaults |
| `tetrisLeaderboard` | Generation bump clears stored scores |
| `neonDropScenario` | Unchanged |

## Testing

### Unit

- SRS kicks for I / JLSTZ / O
- DAS entry, ARR, ARR=0, opposite-key priority
- Lock reset, cap, timeout lock
- T-Spin Mini/Full, PC, soft/hard drop, B2B
- Next-5 queue refill from 7-bag
- Settings v1→v2, preset apply, binding swap
- Hazard clamp and flash-line removal regressions

### Playwright

- Without `?test=1`, game internals are not on `window`
- With `?test=1`, existing test hooks remain available
- Next 5 visible; soft-drop hold; settings rebind and timing persist
- Focus trap and Escape layer dismiss
- Old leaderboard entries cleared on load
- Smoke: Marathon, Sprint, Versus, Neon Circuit still complete basic flows

## Rollout order

1. Review defect fixes
2. `queue` / `srs` / `lock` / `input` / `scoring` / `settings`
3. Wire into `tetris.js` update/input/lock paths
4. Settings UI + Next 5 HUD
5. Unit + Playwright green; README + LLMWiki

## Out of scope (later waves)

Online multiplayer, Ultra/Zen/custom board modes, replay save/playback, stats profile, AI T-Spin opener logic, cosmetics marketplace, rotate-180 gameplay balance beyond optional unbound action.

## Success criteria

1. All four modes use SRS, DAS/ARR, lock delay, held soft drop, Next 5, and Guideline-style T-Spin/PC scoring.
2. Settings can change bindings and DAS/ARR/lock delay; Classic/Guideline presets work; values persist across reload.
3. Review P1/P2 defects listed above are fixed and covered by tests.
4. Leaderboard starts empty for the new scoring generation; campaign saves still load.
5. `npm test` (unit + Playwright) passes.

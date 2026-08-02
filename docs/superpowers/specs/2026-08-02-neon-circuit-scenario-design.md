# Neon Circuit Scenario Mode Design

Date: 2026-08-02
Status: approved for planning

## Goal

Add a replayable five-stage campaign to Neon Drop, place a safe Exit Game action on the initial menu, and improve game feel without replacing the existing board, scoring, AI, renderer, or quick-play modes.

## Player Experience

The initial menu gives **Continue Neon Circuit** the strongest visual priority. Marathon, Sprint, and Versus AI remain available as smaller quick-play actions. Leaderboard and Exit Game are secondary actions.

The campaign loop is:

1. Open the campaign map.
2. Select an unlocked stage.
3. Read a short rival briefing.
4. Play the stage using the existing game engine.
5. Receive one to three stars based on completion time.
6. After stages 1–4, choose one of three upgrades.
7. Continue to the next unlocked stage or retry the current stage after a loss.

Closing and reopening the browser preserves unlocked stages, best results, and upgrades.

## Campaign

The campaign is named **Neon Circuit** and follows the player through a neon arena championship.

| Stage | Rival | Objective | Modifier | Star thresholds |
| --- | --- | --- | --- | --- |
| 1. Boot Sequence | BYTE | Clear 8 lines | Standard speed; teaches the campaign flow | 1 star on clear, 2 under 120s, 3 under 75s |
| 2. Velocity Gate | RUSH | Clear 15 lines before 150s | Falling speed increases more aggressively | 1 star on clear, 2 under 120s, 3 under 90s |
| 3. Interference Zone | GLITCH | Clear 18 lines | One garbage line is injected every 30s | 1 star on clear, 2 under 180s, 3 under 120s |
| 4. Mirror Match | MIRROR | Defeat the AI | Existing Versus rules; one AI turn per player lock | 1 star on win, 2 under 240s, 3 under 150s |
| 5. Crown Protocol | OVERLORD | Defeat the boss AI | Two AI turns per player lock and one periodic garbage line every 45s | 1 star on win, 2 under 300s, 3 under 210s |

Failure never erases progress or upgrades. Retry starts the current stage from a clean board.

## Upgrade Choice

Every cleared stage except the finale shows the same three clear choices. Upgrades stack, so the player may specialize across four rewards.

- **Pulse Amp:** +20% scenario score per stack and +1 outgoing garbage on each positive attack during scenario AI battles.
- **Cryo Field:** +10% effective drop interval per stack, capped at +30%.
- **Firewall:** blocks one incoming garbage application per stack at the start of each stage.

The selected upgrade is saved immediately. A refresh while the reward screen is open returns to the same pending reward instead of skipping it.

## UI

### Initial Menu

- Large Continue Neon Circuit card showing the pending reward when one exists, otherwise the next stage and campaign completion count.
- Three smaller quick-play cards: Marathon, Sprint, Versus AI.
- Leaderboard and Exit Game actions at the bottom.
- New Campaign is available inside the campaign map and requires confirmation because it resets scenario progress only.

### Campaign Map

- Five connected stage nodes in one horizontal championship route on desktop.
- Cleared nodes show stars; the current node is highlighted; future nodes are locked.
- Selecting an unlocked node displays its rival, objective, modifier, best time, and Play button.
- The layout stacks vertically on narrow/coarse-pointer devices.

### In-Game HUD

- The existing Arena HUD remains intact.
- Scenario stages add a compact objective line and progress value in the header.
- AI stages reuse both boards and the central pressure meters.
- Event text announces garbage interference, Firewall blocks, objective completion, and upgrade effects.

### Exit Game

Exit Game is present on the initial menu. After confirmation, it calls `window.close()`. If the browser refuses to close the tab, the modal becomes a terminal exit screen that says the game has ended and offers **Return to Menu**. It never loops or leaves a running animation/audio session behind.

## Architecture

Add one pure module, `src/js/scenario.js`, containing:

- immutable stage definitions;
- upgrade definitions;
- default and normalized progress creation;
- stage unlock checks;
- star calculation;
- upgrade effect calculation.

`tetris.js` remains the runtime coordinator. It owns the active scenario stage, objective progress, periodic modifier timers, reward state, localStorage calls, and DOM transitions. It delegates calculations to `scenario.js` and continues to use the existing board, scoring, AI, renderer, audio, and leaderboard modules.

Add two shared predicates instead of duplicating scenario branches at every call site:

- opponent play is active for quick-play Versus and scenario stages 4–5;
- player garbage is active for quick-play Versus and scenario stages 3–5.

AI turns, opponent rendering, competitive win/loss handling, garbage queueing, garbage application, and player top-out route through the appropriate predicate.

## Persistence

Use one localStorage key, `neonDropScenario`, with this logical state:

- version;
- highest unlocked stage;
- best star count and best elapsed time per stage;
- upgrade stack counts;
- pending reward stage, when applicable;
- campaign completion flag.

Parsing and normalization are defensive. Missing, malformed, out-of-range, or future-version values fall back to safe defaults without preventing the game from starting. Existing preferences and leaderboard keys are unchanged.

## State Transitions

- Starting a stage resets transient board state, stage timers, Firewall charges, and objective counters.
- Line-goal stages complete immediately after the scoring path records enough cleared lines.
- Stage 2 fails when 150 seconds elapse before its objective is met.
- AI stages complete only on an opponent top-out and fail on player top-out.
- On completion, the result is persisted before showing results.
- Stages 1–4 set a pending reward; selecting an upgrade clears it and unlocks normal map navigation.
- Stage 5 sets campaign completion and returns to the map after the result screen.

## Error and Edge Handling

- Locked stages cannot start through clicks, keyboard activation, or direct DOM selection.
- Duplicate completion cannot award multiple rewards.
- Pause time does not advance scenario timers or periodic hazards.
- Periodic garbage is applied only between pieces through the existing pending-garbage path.
- Firewall consumes charges only when positive garbage would actually be applied.
- Leaving a stage returns to the menu without changing its best result.
- Quick-play mode behavior and saved preference restoration remain unchanged.

## Testing

Add focused Node tests for scenario progress normalization, stage unlocking, star thresholds, and stacked upgrade effects.

Extend browser regression coverage for:

- Exit Game on the initial menu and the browser-close fallback screen;
- Continue card and campaign map accessibility;
- locked-stage enforcement;
- stage completion, star persistence, reward persistence, and current-stage retry;
- timed failure and periodic garbage pause behavior;
- scenario AI win/loss reuse of Versus paths;
- quick-play Marathon, Sprint, and Versus behavior remaining unchanged;
- desktop 1280×720 fit and narrow/coarse-pointer layout.

The full acceptance check remains `npm test` plus a 1280×720 browser screenshot of the campaign map and one scenario AI battle.

## Out of Scope

- Cloud accounts or cross-device saves;
- voice acting, cutscenes, downloadable content, or a general quest scripting engine;
- inventory management, currencies, shops, daily challenges, or online multiplayer;
- a second renderer or separate campaign game engine.

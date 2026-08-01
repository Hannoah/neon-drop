# Neon Drop Reliability Improvements

## Goal

Fix the reviewed keyboard, modal, touch-device, preference-persistence, and repository-tracking problems without changing the Neon Drop name or its game rules.

## Behavior

- Pressing Enter on a focused mode card selects that card's mode before starting the game.
- Menu overlays expose dialog semantics, move focus to their primary action, and make the game area inert while open.
- Touch controls appear on narrow, portrait, or coarse-pointer devices.
- The selected mode and BGM/SFX settings survive reloads through best-effort localStorage access. Invalid or unavailable storage never blocks play.
- Existing leaderboard data and storage keys remain compatible.

## Implementation

- Keep the current overlay structure and use native `inert`, ARIA dialog attributes, and focused primary controls; no modal dependency or custom focus-trap code.
- Store the three preferences in one small JSON object and validate each value when restoring it.
- Remove unused `PIECE_NAMES`, `addGarbageLine`, and duplicate renderer shake APIs.
- Add all intended application, documentation, and test files to Git staging after verification; do not create an implementation commit.

## Testing

- Add browser coverage for keyboard-starting the focused mode and persisted preferences.
- Add a lightweight markup regression check for coarse-pointer touch controls and dialog semantics.
- Run the complete `npm test` suite after implementation.

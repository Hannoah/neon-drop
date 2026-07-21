# Neon Drop Usability UI Design

## Goal

Make Neon Drop easier to start, play, and understand on desktop and mobile without changing its established game rules.

## Scope

- Make the start screen explain each mode and support an immediate keyboard start.
- Put live gameplay information and piece previews ahead of secondary controls.
- Replace zoom-dependent mobile layout with a readable vertical layout and touch controls.
- Keep settings, leaderboard, and detailed keyboard help available without competing with play space.
- Improve focus visibility, semantic labels, and live status announcements.
- Keep game exit and return-to-menu paths in-app, including the game-over screen.

## Information architecture

The play area has three priorities: the board, immediately actionable piece information (Hold and Next), and compact live stats. Secondary content is moved into collapsible sections: game help, sound settings, and the leaderboard. On wide screens these sections remain alongside the board; on narrow screens they follow the board in a single readable column.

The start screen presents mode cards with a title and concise description. Selecting a card updates the native mode selector so existing start logic remains the source of truth. The primary action has autofocus, and Enter starts the selected mode unless a form control is active.

## Mobile controls

When the viewport is narrow or coarse-pointer, a fixed-size touch-control group appears beneath the board: left, rotate, right, soft drop, hard drop, and hold. Controls call the same guarded game functions as keyboard input, preventing play actions while paused, at the menu, or after game over. Keyboard instructions remain available in the Help disclosure.

## Accessibility and state feedback

- Every interactive control has an accessible name and keyboard focus indicator.
- Mode selection is announced through the existing live event region.
- The score/event region remains a polite live region and uses text rather than color alone for key state.
- Modal dialogs receive dialog semantics, labels, and initial focus on opening.
- The game-over main-menu action uses the same in-app reset path as other exits.

## Error handling and invariants

- Touch controls are hidden outside an active game and disabled while no move is legal.
- Existing keyboard guards remain authoritative for paused and inactive games.
- UI preferences and selected mode use best-effort localStorage access; failed storage never blocks play.
- Responsive styles do not use CSS `zoom`, preserving browser text scaling and layout semantics.

## Testing

Playwright regression coverage will verify mode descriptions and selection, keyboard start, in-app menu return, touch-control visibility and guarded behavior, collapsible secondary panels, focusable controls, and mobile layouts without CSS zoom. The existing unit tests and browser tests must remain green.

## Success criteria

- A new player can identify each mode and start using keyboard or pointer.
- In-game board, Hold, Next, score, and status remain visible without scrolling on common desktop screens.
- Narrow screens show usable controls and readable, non-zoomed layout.
- Secondary content is discoverable but does not crowd the board.
- All interactive controls are keyboard-focusable and labeled.
- `npm test` passes with no browser page errors.

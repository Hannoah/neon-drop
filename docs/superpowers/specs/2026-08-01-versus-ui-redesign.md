# Neon Drop Desktop Arena HUD Design

## Goal

Redesign Neon Drop's desktop play screen so Versus AI and single-player modes fit completely within a 1280×720 viewport without scrolling or clipping.

## Visual Direction

Use an Arena HUD layout with a Tactical Neon palette:

- deep navy page and panel surfaces
- cyan Player identity and board border
- magenta AI identity and board border
- amber for garbage pressure and urgent match state
- restrained glow reserved for active boards and important events

## Desktop Layout

The play shell is at most 1180×680 and contains:

1. A 48px header with Neon Drop, current mode, match time, pause, settings, help, and exit actions.
2. A Versus arena row with AI board, central VS/garbage status, Player board, and a compact Player rail for Score, Hold, and Next.
3. A bottom status row for Combo, Lines, Back-to-back, and Incoming garbage.

Leaderboard, detailed controls, and sound settings no longer occupy permanent play-space cards. They remain available through compact header controls and existing modal/disclosure behavior.

Marathon and Sprint reuse the same shell, remove the AI and central Versus columns, and center the Player board beside the same information rail.

## Behavior and Accessibility

- Keep the existing Canvas sizes, gameplay rules, renderer, scoring, AI, and input functions unchanged.
- Use the existing `versus-active` mode class to switch layout; add presentation classes only when needed.
- Give both boards visible Player/AI labels.
- Keep garbage status available as text in addition to a visual meter.
- Preserve keyboard focus indicators, dialog behavior, touch controls, and reduced-motion behavior.
- At narrower desktop widths, scale the shell and gaps without hiding gameplay-critical information.

## Testing

- Update Playwright layout assertions for the new Arena HUD geometry.
- Verify 1280×720 and 1440×900 desktop viewports have no clipped boards or panels and no page scrolling.
- Verify AI and Player boards share a row with clear labels and equal visual size in Versus mode.
- Verify Marathon and Sprint center the single board and hide Versus-only status.
- Preserve existing mobile, gameplay, accessibility, and unit regressions.
- Capture a final Playwright screenshot for visual inspection.

## Non-goals

- No gameplay-rule, AI, score, audio, storage, or Canvas rendering changes.
- No new UI framework, icon package, font dependency, or build tooling.
- No speculative tournament, online multiplayer, animation, or theme system.

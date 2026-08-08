# Theater Ink UI Redesign

Date: 2026-08-09
Status: approved for planning

## Goal

Fully redesign Neon Drop’s start menu, in-game HUD, pause, and settings chrome into a single **Ink Contrast** visual language with a **Theater Focus** layout—board-centered, glow-free, clear button hierarchy—without changing Guideline engine behavior (SRS, DAS/ARR, lock, scoring, campaign rules).

## Decisions

| Topic | Choice |
| --- | --- |
| Scope | Full pass: start menu + in-game HUD + pause + settings styling |
| Visual direction | Ink Contrast (dark, no neon glow; mint accent only) |
| Layout | Theater Focus (board center; slim left Hold/Next; right score/meta) |
| Campaign entry | Demote giant Continue card; Circuit is a secondary action |
| Header chrome | Remove Ranks/Sound/Help details menus; absorb into Settings / Pause |
| Engine | No gameplay rule changes in this pass |

## Visual system

### Typography

- UI/display: **DM Sans** (Google Fonts). No Inter / Roboto / Arial / system-ui as the primary face.
- Use tabular figures for scores and timers.

### Color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0e1014` | Page / stage |
| `--panel` | `#161a22` | Panels, board well |
| `--border` | `#2a2f3a` | Hairlines, buttons |
| `--text` | `#f5f7fa` | Primary text |
| `--muted` | `#8b93a7` | Labels, secondary |
| `--accent` | `#5eead4` | Play CTA, board left edge, combo emphasis |

Forbidden in this pass: multi-layer glows, purple accents, gradient button stacks, `rounded-full` pill clusters, warm-cream + terracotta “editorial” restyle.

### Motion (respect `prefers-reduced-motion`)

1. Start: brand + board silhouette fade/slide-up (~200–280ms).
2. Play: menu fade out → board scale-in (instant if reduced motion).
3. Line clear: keep flash; soften screen shake.

## Start menu (first viewport)

Composition (one job):

1. **Neon Drop** as hero brand (not nav text).
2. One supporting line (e.g. “One board. Full focus.”).
3. Board silhouette as the dominant visual anchor (decorative; not a separate inset media card collage).
4. Primary CTA: **Play** (starts selected quick mode).
5. Mode toggles: Marathon / Sprint / Versus.
6. Secondary: **Circuit** · **Settings**.
7. Tertiary text actions: Leaderboard · Exit.

Remove the oversized “CONTINUE CAMPAIGN” hero card. Neon Circuit opens from **Circuit**.

## In-game Theater layout

Solo:

```
[ Hold ]     [     Board     ]     [ Score ]
[ Next×5]    [               ]     [ Level / Lines / Combo / B2B / Event ]
             header: brand · mode · time · pause
```

- Board is the absolute center.
- Left slim rail: Hold + Next 5 stack.
- Right slim rail: score and match meta (replace the dense bottom chip strip as the primary meta home; footer chips may shrink or fold into the right rail).
- Versus: AI board attaches left of the player board; Hold/Next shift further left. Pressure meters stay compact near VS, Ink-styled (no neon meters).

Touch controls: single row under the board; flat Ink buttons (no neon arcade pads).

## Pause & Settings

- Pause sheet: vertical stack — Resume · Settings · Quit to Menu. Dimmed board behind.
- Settings: same sheet language — Preset, Bindings, Timing, Audio, Back.
- Keep focus trap, `aria-modal`, Escape closes one layer, persist-on-change settings behavior.

## Implementation notes

- Prefer restructuring `index.html` markup + CSS (arena HUD styles + modal styles). Keep `tetris.js` wiring; update selectors only where DOM IDs/classes change.
- Preserve all game modes, localStorage keys, `?test=1` hooks, and campaign flows.
- Update Playwright selectors that assume old campaign-card prominence or header details menus.
- Document tokens and layout in README briefly.

## Success criteria

1. First viewport reads as one Theater composition: brand, one line, board anchor, Play, modes—no dashboard clutter.
2. In-game board is unmistakably central; Hold/Next left, stats right; no empty spacer column / broken Next-5 side-by-side.
3. Visual language is Ink Contrast (mint accent, no glow soup).
4. Settings/Pause/Circuit/Leaderboard remain reachable; engine tests still pass (`npm test`).

## Out of scope

New modes, online play, cosmetics marketplace, particle spectacle, engine retunes.

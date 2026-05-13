# CLAUDE.md

Working notes for any Claude session picking up this project.

## TL;DR

**Chiral Hammer** is a single-file HTML editor for building low-fidelity 3D maps for casual games. PS1-era aesthetic is the target. Accessibility and simplicity of tooling are treated as *part of the art* — Bennett Foddy's "be cheap to be generous" philo
The user is an indie game designer in early prototyping. They are not a hardcore 3D person. The tool's job is to make level authoring feel like one coherent thing instead of a pipeline.

## Hard constraints

Don't break these without checking first:

- **One HTML file.** No build chain, no `node_modules`, no bundler. User opens it in a browser, edits it in a text editor.
- **Three.js via ESM importmap from CDN.** Currently pinned to `0.160.0` via unpkg.
- **Vanilla JS.** No React, Vue, or any framework.
- **`localStorage` for persistence**, JSON for export/import.
- **Readable code over clever code.** No minification, no one-liners flexing. Comments explain *why*, not *what*. Big banner comments separate major systems.
- **90s HTML aesthetic.** System fonts, beveled borders, Windows 9x gray, web-safe colors. No rounded corners, shadows, gradients, or rgba transparency. The tool looks like it belongs in 1998 — same era as the PS1 maps it builds.
- **Hackable.** Someone with intermediate JS should be able to open the file, find the relevant section, and modify it without setup.

## Code conventions

- All state in one `state` object near the top of the script.
- Banner comments (`// ===== SECTION =====`) separate major systems: setup, state, rendering, 2D input, 3D input, UI, persistence, main loop.
- Module-level scratch Three.js objects prefixed with `_` (e.g. `_m4`, `_ndc`, `_hit`) — reused to avoid GC pressure in the render loop.
- Functions short and named for what they do.
- Internals exposed via `window.CHIRAL_HAMMER` for console hacking.

## File layout

```
chiral_hammer.html  — the entire editor (HTML + CSS + JS in one file)
DESIGN.md        — vision, geometry paradigm, roadmap
CLAUDE.md        — this file
```

## How to run / test

Open `chiral_hammer.html` directly in a modern browser. No server needed. State persists to `localStorage` under key `chiral_hammer:v0`. To wipe state during development: clear that key in DevTools, or hit the CLEAR button in the UI.

## What's done (v0)

- Top-down 2D cell painter (orthographic camera, paint/erase/pan/zoom)
- 3D free-fly camera (WASD + Q/E + shift, right-mouse hold to look)
- `Tab` toggles modes; `T` toggles the treasure box panel
- Treasure box panel (toggleable, scaffold with empty state — no save flow yet)
- JSON export/import
- Auto-save to localStorage
- Status bar (mode / cell count / cursor coords / save state)
- Help overlay shows current-mode controls

## What's deliberately NOT done yet

These are next milestones, not oversights. See DESIGN.md for the roadmap:

- **Cell corner heights** (v1) — v0 cells are flat plates only.
- **Texturing** (v2) — no textures, no library, no per-face UV.
- **Freeform quads** (v3) — for geometry the cell grid can't express.
- **Prefab save flow** (v4) — the treasure box exists but selection-and-save isn't wired up.
- **Scatter brush** (v5) — for exterior placement of trees / rocks / grass.
- **PS1 renderer effects** (v6) — affine warping, vertex jitter, low-res upscale. Deliberately deferred until authoring is solid.

## When making changes

- Test in-browser. There is no lint or build step to lean on.
- Don't introduce a build step "to make things cleaner." The build step IS the cost.
- If a feature is getting complex, that's a signal to redesign the workflow, not pile on code.
- Match the user's pace. They are still in planning + early prototyping. Don't over-engineer ahead of decisions they haven't made.

## When to push back

- A user request that would require adding a framework, build chain, or large dependency — flag the tradeoff before doing it.
- A feature that conflicts with PS1-era simplicity (PBR, fancy shadows, smooth subdivision) — conf
- Anything cascading or recursive (prefabs containing prefabs, nested editors) — the user explicitly chose to keep the mental model flat.

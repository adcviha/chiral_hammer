# CLAUDE.md

Working notes for any Claude session picking up this project.

## TL;DR

**Chiral Hammer** is a single-file HTML editor for building low-fidelity 3D maps for casual games. PS1-era aesthetic is the target. Accessibility and simplicity of tooling are treated as *part of the art* — Bennett Foddy's "be cheap to be generous" philosophy applied to level design.

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
- **`const` declarations before any code that uses them.** Module-level setup blocks must be ordered so no block references a `const` or `let` declared in a later block. This has caused two catastrophic crashes (selOutline before declaration, scene before renderer). The pattern: keep the declaration order as `scene → renderer → cameras → lights → objects → scratch vars`, and never inline a reference to something declared further down.
- **Tools are exclusive, not composable.** One tool active at a time via `state.activeTool` (`'paint' | 'fill' | 'wall' | 'select' | 'house'`). Number keys `1`–`5` switch tools. `Shift` hold temporarily switches to select; release returns to previous tool. No boolean mode flags — if a behavior needs to be exclusive, it's a tool.
- Module-level scratch Three.js objects prefixed with `_` (e.g. `_m4`, `_ndc`, `_hit`) — reused to avoid GC pressure in the render loop.
- Functions short and named for what they do.
- Internals exposed via `window.CHIRAL_HAMMER` for console hacking.

## File layout

```
chiral_hammer.html  — the entire editor (HTML + CSS + JS in one file)
DESIGN.md           — vision, geometry paradigm, roadmap
CLAUDE.md           — this file
index.html          — redirect for GitHub Pages root URL
```

## How to run / test

Open `chiral_hammer.html` directly in a modern browser. No server needed. State persists to `localStorage` under key `chiral_hammer:v0.8`. To wipe state during development: clear that key in DevTools, or hit the CLEAR button in the UI.

Live at: `https://adcviha.github.io/chiral_hammer/`

## What's done (v0.0 – v0.8)

- Top-down 2D cell painter (orthographic camera, LMB drag fill, RMB erase, Space/MMB pan, scroll zoom)
- 3D free-fly camera (WASD move, arrows look, Q/E up/down, Shift boost, RMB hold mouselook, scroll zoom-to-cursor)
- Flat seamless cell planes (PlaneGeometry, aligned to grid, sky-blue fog background)
- **Walls** — Alt+click edge to toggle vertical quads in 2D, selectable/deletable, persisted with save
- `Tab` toggles 2D/3D; `T` texture panel, `B` treasure box; `F` fill mode toggle, `G` wireframe toggle
- Drag selection: Shift+LMB free world-space rubber-band in 2D, screen-space projection in 3D
- Selected cells/walls get emissive tint; Delete key removes selection; click empty space to deselect
- T + B bottom panels with maximize (fullscreen) and minimize buttons
- JSON export/import (cells + walls)
- Auto-save to localStorage
- Status bar (mode / cell+wall count / cursor coords / save state)
- Help overlay shows current-mode controls
- Smooth-lerp mouselook with low sensitivity
- **Tool palette** — exclusive tools (Paint/Fill/Wall/Select/House) via `1`–`5` keys or toolbar buttons; Shift hold for temp-select

## What's next

See DESIGN.md for the full roadmap. Immediate next:

- **v0.81** — Bugfixes / polish as needed
- **v0.9** — Selection transform (move, rotate, scale selected cells/walls)
- **v1.0** — Extend/array on drag
- **v1.1** — Terrain brush (weighted push/pull with radius)
- **v1.2** — Slice tool + face splitting (doors/windows)
- **v2** — Texture pipeline (paste, assign, UV adjust, crush)

## Version incrementing

- **Feature milestones** bump the `.X` digit: v0.7 → v0.8 → v0.9 → v1.0.
- **Bug fixes / polish** bump a `.X1` digit: v0.7 → v0.71 → v0.72.
- The localStorage key is `chiral_hammer:v0.XX` and the exported JSON carries `version: 0.XX`.
- Git commits are tagged with the version in the message. Push to master auto-deploys to GitHub Pages.

## When making changes

- Test in-browser. There is no lint or build step to lean on.
- Don't introduce a build step "to make things cleaner." The build step IS the cost.
- If a feature is getting complex, that's a signal to redesign the workflow, not pile on code.
- Match the user's pace. They are still in planning + early prototyping. Don't over-engineer ahead of decisions they haven't made.
- One commit per version increment. Don't batch unrelated changes.

## When to push back

- A user request that would require adding a framework, build chain, or large dependency — flag the tradeoff before doing it.
- A feature that conflicts with PS1-era simplicity (PBR, fancy shadows, smooth subdivision) — conflicts with the aesthetic target.
- Anything cascading or recursive (prefabs containing prefabs, nested editors) — the user explicitly chose to keep the mental model flat.

## When to confirm before coding

- **The user describes a behavior change imprecisely** (vague language, contradictory signals, "I'm not sure how to describe this"). Pause, replay what you understood in your own words, and get explicit confirmation before touching any code. The user is an indie game designer, not a graphics engineer — they may lack precise terminology for what they want. Your job is to bridge that gap, not exploit the ambiguity to build the wrong thing.
- Examples of signals: "I'm not exactly sure how to describe that," "it's like... but also...," "I can't imagine exactly without trying," or when they describe a fix but also describe behavior that contradicts the fix.
- Once confirmed, implement exactly what was agreed. Don't add "while I was in there" changes.

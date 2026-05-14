# CLAUDE.md

Working notes for any Claude session picking up this project.

## TL;DR

**Chiral Hammer** is a single-file HTML editor for building low-fidelity 3D maps for casual games. PS1-era aesthetic is the target. Accessibility and simplicity of tooling are treated as *part of the art* — Bennett Foddy's "be cheap to be generous" philosophy applied to level design.

The user is an indie game designer in early prototyping. They are not a hardcore 3D person. The tool's job is to make level authoring feel like one coherent thing instead of a pipeline.

## Hard constraints

Don't break these without checking first:

- **One HTML file as the output.** The source is modular (see File Layout below), but the deployable artifact is a single `chiral_hammer.html`. A trivial shell script concatenates source files. No bundler, no `node_modules`.
- **Three.js via ESM importmap from CDN.** Currently pinned to `0.160.0` via unpkg.
- **Vanilla JS.** No React, Vue, or any framework. All JS files attach to a shared `window.Chiral` namespace via IIFE pattern.
- **`localStorage` for auto-save + scratch**, JSON files for real persistence. User owns their files — maps, treasure boxes, textures are all JSON files on disk.
- **Readable code over clever code.** No minification, no one-liners flexing. Comments explain *why*, not *what*. Banner comments separate major systems within files.
- **90s HTML aesthetic.** System fonts, beveled borders, Windows 9x gray, web-safe colors. No rounded corners, shadows, gradients, or rgba transparency. The tool looks like it belongs in 1998 — same era as the PS1 maps it builds.
- **Hackable.** Someone with intermediate JS should be able to open the source files, find the relevant section, and modify it without setup. Each source file is ~150 lines max; if a file passes 300 lines, split it.

## Code conventions

- All state lives in `Chiral.state` (one object, defined in `state.js`). Sub-objects group related properties: `state.cam`, `state.sel`, `state.ui`.
- **Each source file is one IIFE** that attaches to `window.Chiral`. Files are loaded via `<script>` tags in dependency order in `src/index.html`. No file references symbols from a file loaded after it.
- `const` declarations before any code that uses them, even within a file. This avoids the two catastrophic crashes we hit in the single-file era (selOutline before declaration, scene before renderer).
- **Tools are exclusive, not composable.** One tool active at a time via `state.activeTool`. Number keys `1`–`5` switch tools. `Shift` hold temporarily switches to select; release returns to previous tool. No boolean mode flags — if a behavior needs to be exclusive, it's a tool.
- Scratch Three.js objects reused where possible to avoid GC pressure in the render loop.
- Functions short and named for what they do. Banner comments (`// =====`) separate major sections within a file.
- Internals exposed via `window.CHIRAL_HAMMER` for console hacking.

## File layout

```
chiral_hammer/
├── chiral_hammer.html       # BUILT OUTPUT — single-file deployable
├── index.html               # GitHub Pages redirect (unchanged)
│
├── src/
│   ├── index.html           # Dev shell: style + script tags in dependency order
│   ├── style.css            # All 90s-aesthetic CSS
│   │
│   ├── state.js             # State object, constants, math helpers, undo/redo
│   ├── scene.js             # Three.js init, cell/wall meshes, highlights, materials, render
│   ├── camera.js            # 2D ortho + 3D perspective + mode switch + zoom/pan/fly
│   ├── input.js             # Mouse/keyboard normalization, key state
│   │
│   ├── tools/
│   │   ├── registry.js      # Tool switching, Shift-hold temp-select
│   │   ├── tile.js          # Single-click paint/erase
│   │   ├── fill.js          # Drag-rect fill
│   │   ├── wall.js          # Edge click/drag wall placement
│   │   ├── select.js        # Rubber-band, click-toggle, delete
│   │   └── house.js         # Fill + walls composed
│   │
│   ├── ui.js                # Palette, toolbar, statusbar, help, panels, control-panel
│   ├── persistence.js       # localStorage, JSON export/import, treasure box files
│   │
│   └── main.js              # Init order, event binding, animate loop, console API
│
├── SPEC.md                  # Source of truth: coords, data model, format specs
│
├── DESIGN.md                # Vision, geometry paradigm, roadmap
└── CLAUDE.md                # This file
```

**The split rule:** a file gets its own home when it passes 300 lines or when two unrelated parts of the code would reasonably be edited at the same time. Tools get individual files because each tool carries its own state machine. UI stays in one file because it's mostly DOM string builders. Start coarser, split on evidence — it's easier to split later than to re-merge.

**Build script** (`build.sh`): a ~15-line shell script that concatenates CSS into a `<style>` tag and JS files into a `<script>` tag inside a copy of the dev shell. Run before deploying. No Node required — pure `cat`.

## How to run / test

**Dev:** Open `src/index.html` in a modern browser. No server needed. State persists to `localStorage` under key `chiral_hammer:v0.X`. To wipe state during development: clear that key in DevTools, or hit the CLEAR button in the UI.

**Deploy:** Run `./build.sh` to produce `chiral_hammer.html` (the single-file output). Commit and push to master — auto-deploys to GitHub Pages.

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

See DESIGN.md for the full roadmap. Updated priorities based on harbor-scene requirements:

- **v0.10.0** — Modular file structure + undo/redo + control panel
- **v0.11.0** — Per-cell height offset (docks above water, simple elevation)
- **v0.12.0** — Texture import via clipboard paste + 64×64 crush (preserving alpha)
- **v0.13.0** — Per-face texture assignment + per-wall height in UI
- **v0.14.0** — Billboard quads (free-standing vertical quad, optional camera-face, transparent)
- **v0.15.0** — Export format v1 (collision, triggers, camera anchors)
- **v0.16.0** — Tool refactor (extract each tool to its own state machine)
- **v0.17.0** — Selection transform (move, rotate, scale) — unlocks roofs via "move selection up"
- **v1.0.0** — Treasure box (save selection, stamp copies)
- **v1.1.0** — Extend/array on drag
- **v1.2.0** — Terrain brush (weighted push/pull — replaces simple cell height)
- **v1.3.0** — Slice tool + face splitting (doors/windows)

## Version incrementing (SemVer)

We use **Major.Minor.Patch** as strings, not decimals. `0.9.10` comes after `0.9.9`.

- **Patch** (0.9.0 → 0.9.1): Bug fixes, polish, small tweaks. No new features.
- **Minor** (0.9.0 → 0.10.0): New feature, tool, or system. This is the only thing that moves the "feature number" forward.
- **Major** (0.9.0 → 1.0.0): Breaking change to the map format, data model, or core workflow.

**CRITICAL: DESIGN.md milestones are Minor targets.** When DESIGN.md says "v0.9 — Selection transform," that means the 0.9.x series delivers selection transform. Ship it as `0.9.0`. Bug fixes after that are `0.9.1`, `0.9.2`, etc. Do NOT bump the Minor digit for bug fixes — the previous v0.88→v0.89→v0.90→v0.91→v0.92 chain was wrong and broke the DESIGN.md mapping. Those should have been v0.8.1→v0.8.2→v0.8.3 (or v0.9.1→v0.9.2→v0.9.3 after v0.9.0 shipped).

**The DESIGN.md version number is the law.** If DESIGN.md says the next feature is v1.2, we do not ship v1.3 until DESIGN.md's v1.2 is done. Bug fixes add Patch digits, not Minor bumps.

The localStorage key is `chiral_hammer:vX.Y` and exported JSON carries `version: "X.Y.Z"`. Git commits are tagged with the version. Push to master auto-deploys to GitHub Pages.

## Working protocol (every task, every time)

Before writing any code, follow these four steps in order:

### 1. Translate the Vibe
The user describes behavior in plain English ("make the camera feel heavier"). Before touching code, translate this into technical terms ("add camera damping — increase the lerp factor so movement has more inertia") and state your approach in one sentence. If the description is ambiguous, ask the one clarifying question that matters most.

### 2. Version bump
State the new version number based on SemVer (see above). The version string goes in: the `<title>` tag, the localStorage key, and the export JSON `version` field.

### 3. The GO Gate
List every file you will modify or create. State the plan in 2-3 sentences. Then **stop and wait** for the user to say "GO" before writing any code. Do not output code, diffs, or implementations until you hear "GO."

### 4. No reinventing wheels
If a request can be handled by an existing Three.js method, browser API, or a function already in the codebase, say so and use it. Don't write custom math when the library already does it.

## When making changes

- **Always follow the Working Protocol** (Translate → Version → GO Gate → No Reinventing). Never skip the GO Gate.
- Test in-browser. There is no lint or build step to lean on.
- Don't introduce a build step "to make things cleaner." The build step IS the cost.
- If a feature is getting complex, that's a signal to redesign the workflow, not pile on code.
- Match the user's pace. They are still in early prototyping. Don't over-engineer ahead of decisions they haven't made.
- One commit per version increment. Don't batch unrelated changes.

## When to push back

- A user request that would require adding a framework, build chain, or large dependency — flag the tradeoff before doing it.
- A feature that conflicts with PS1-era simplicity (PBR, fancy shadows, smooth subdivision) — conflicts with the aesthetic target.
- Anything cascading or recursive (prefabs containing prefabs, nested editors) — the user explicitly chose to keep the mental model flat.

## When to confirm before coding

- **The user describes a behavior change imprecisely** (vague language, contradictory signals, "I'm not sure how to describe this"). Pause, replay what you understood in your own words, and get explicit confirmation before touching any code. The user is an indie game designer, not a graphics engineer — they may lack precise terminology for what they want. Your job is to bridge that gap, not exploit the ambiguity to build the wrong thing.
- Examples of signals: "I'm not exactly sure how to describe that," "it's like... but also...," "I can't imagine exactly without trying," or when they describe a fix but also describe behavior that contradicts the fix.
- Once confirmed, implement exactly what was agreed. Don't add "while I was in there" changes.

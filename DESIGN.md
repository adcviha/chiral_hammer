# Chiral Hammer — Design Document

> **Companion documents:** [SPEC.md](SPEC.md) defines the technical
> contract (coordinate system, data model, file formats). [CLAUDE.md](CLAUDE.md)
> holds working instructions for Claude. This document is the vision, workflow,
> and roadmap.

## Vision

A bespoke HTML tool for making **low-fidelity 3D maps** for casual games.
Not a Maya competitor. A small focused tool where the *entire* authoring
workflow — geometry, texturing, prefabs, scattering — feels like one coherent
thing instead of a pipeline you have to learn.

Guiding ethos: Bennett Foddy's **"be cheap to be generous"**. Tool simplicity
is part of the art. Constraints (low poly, low-res textures, no fancy lighting)
shape what gets made.

## Aesthetic targets

- Low polygon counts — flat-shaded or simple vertex-colored faces.
- Textures authored at any resolution (screenshots, photo grabs), then
  **crushed** to 64×64 (or 32×32, 128×128) with nearest-neighbor as a
  deliberate aesthetic step.
- No bilinear filtering, no mipmaps — textures read crisp and chunky.
- Simple ambient + directional lighting (tunable in the control panel).
  No PBR, no shadows, no lightmaps.
- The "PS1 look" comes from crunched textures + low-poly geometry — not
  from renderer tricks. Affine texture warping, vertex jitter, and 320×240
  upscaling are de-prioritized. The authoring workflow matters more than
  authentic PS1 hardware quirks.

## Intended workflow

1. **Draw floor plans in 2D top-down.** Paint cells onto a grid to define rooms, paths, plazas.
2. **Place walls on cell edges.** Walls are vertical quads rising perpendicular from the grid. Toggle per-edge. Adjust height per segment.
3. **Sculpt terrain with a weighted brush.** Push/pull grid corners up and down with a radius and falloff for natural hills, valleys, and ramps.
4. **Slice openings into walls.** Select a wall face, draw a rectangle to subdivide it — delete the cut faces for a door or window.
5. **Select and transform.** Shift+drag to select faces/cells. Move, rotate, scale selections. Extend/array on drag to stamp copies (build one floor, drag up 20).
6. **Texture faces.** Paste screenshots or drop images. Assign to selected faces. Scale/offset/rotate UVs. Crush to low-res when the look is right. Subdivide a face while preserving UVs, then nudge vertices to align geometry with texture detail.
7. **Save reusable pieces to the treasure box** as prefabs — trees, houses, wall segments.
8. **Place prefab instances** with per-instance rotation/scale/tint. Scatter brush for exteriors.
9. **Add a skybox.** An inverted cube faces-inward, each face individually selectable and texturable. Scale it huge for mountain backdrops.

## Geometry paradigm

The world is one unified system with complementary primitives.

### Cell grid (primary)
- A coarse 3D grid of cells on the ground plane. v0 uses 1×1; may tune to 2×2 or 4×4 once heights land and real scale is felt.
- Each cell is a flat quad on the ground plane. Flat by default.
- Cells always live on the grid — the 2D plan view is the authoring anchor.

### Walls (edge quads)
- A wall is a vertical quad rising perpendicular to a cell edge.
- Toggled per edge. Adjustable height per wall segment.
- Walls belong to cell edges, not cell interiors. This separates "room layout" (cells) from "vertical boundaries" (walls).
- Walls are selectable, texturable, and sliceable just like cell faces.

### Cell height (simple elevation)
- Each cell has an optional height offset (default 0). The cell quad sits at
  Y = cellHeight.
- A dock at height=1 above water at height=0 — no terrain brush needed.
- Walls on edges between cells of different heights sit on the lower cell
  and rise past the higher one, forming a retaining wall or step.
- This is a stepping stone. When terrain sculpting lands, per-cell height
  migrates to per-corner heights. The simple version unlocks verticality
  now without the complexity of the full terrain brush.

### Billboard quads
- A free-standing vertical quad, not attached to any cell edge.
- Place anywhere in 2D or 3D. Drag to size.
- Supports transparency via the alpha channel in crushed textures.
- Two modes: **upright billboard** (rotates around Y to face the camera,
  for trees and signs) and **full billboard** (faces camera on all axes,
  for particles and fire).
- Same selection, texturing, and transform rules as cells and walls.
- The primary use case: tree foliage. A screenshot of a tree, crushed to
  64×64 with alpha preserved, placed on a billboard quad — instant low-fi
  vegetation without modeling individual leaves.

### Terrain sculpting (weighted brush)
- A push/pull brush with radius and falloff raises or lowers cell corners.
- LMB to raise, RMB to lower. Center of brush = maximum effect, edges = gradual.
- Creates natural hills, valleys, ramps, and pits without clicking individual corners.
- 2D mode shows a height heatmap overlay so plan-view isn't blind to elevation.

### Slice tool (doors and windows)
- Select a wall face, activate slice tool, draw a rectangle on the face.
- The face is subdivided — the cut region becomes separate quads.
- Delete the cut faces to create an opening (door, window).
- Inset or offset the cut faces for window frames.
- Same tool works on cell faces (floor hatches, ceiling openings).

### Freeform quads (secondary, later)
- For everything cells and walls can't express: overhanging roofs, angled ramps, decorative geometry.
- Place anywhere in 3D, drag vertices to position.
- Same texturing and selection system as cells and walls.

### Skybox (world object)
- An inverted cube at origin, camera inside. All 6 faces individually selectable and texturable.
- Can select all faces at once for seamless panoramic assignment.
- Scale arbitrarily — huge for mountain backdrops, tight for indoor ceilings.
- Not part of the cell grid. A separate "world" layer.

### Why this paradigm
- The 2D plan view matches the floor-plan workflow designers already know (Doom Builder, SketchUp).
- Separating cells (floors) from walls (edges) from terrain (corner heights) means each tool does one thing well.
- Freeform quads are the escape hatch — used sparingly, not as the default.
- One texturing system, one prefab system, one selection model across all primitives.

## Selection + transform

### Selection
- **Shift+LMB drag** draws a rubber-band rectangle. In 2D mode it selects on the grid. In 3D mode it selects by screen-space projection.
- Click empty space to deselect.
- Selected faces/cells get an emissive tint highlight.

### Transform
- Once selected: **move, rotate, scale** the selection as a unit.
- Grid-snapped by default. Hold a modifier for free placement.
- Works across cell faces, wall quads, and freeform quads.

### Extend / array on drag
- Select faces, hold a modifier, drag in a direction.
- At each grid interval, a copy is stamped.
- Build one floor of a skyscraper, drag up to repeat 20 times.
- No clipboard, no dialog — just drag to repeat.

### Face splitting
- Select a textured face, subdivide it into smaller quads.
- **UVs are preserved across the split** — the texture stays aligned.
- Then nudge individual vertices to match geometry to texture detail.
- Essential for aligning wall geometry to a pasted screenshot of a building facade.

## Texture pipeline

The core loop: **screenshot → paste → assign → nudge → crush**.

### Import
- Paste from clipboard (Ctrl+V) or drop an image file.
- Any resolution accepted. The tool works at native res during authoring.
- Images land in the texture library panel (T key).

### Per-face assignment
- Select one or more faces → pick a texture from the library.
- Adjust UV scale, offset, and rotation per face or across the whole selection.
- Same texture on multiple faces? Adjust UVs per face to tile or align as needed.

### Crush (aesthetic pass)
- When the look is right, crush the texture to 64×64, 32×32, or 128×128 with nearest-neighbor sampling.
- This is a deliberate aesthetic step, not a technical limitation.
- The full-res source is preserved in the library; crush creates a copy.
- **Affine light flatten** — divide image by a heavily blurred version of itself, then renormalize. Kills baked directional sunlight in satellite imagery.
- **Palette quantize** to 16 or 32 colors. Optional dithering.

### Seamless tile helper
- Drag the seam line, preview tiling live, clone-stamp out visible joins.

### Shared library
- Textures are global, not per-prefab. One brick texture used in 50 prefabs and the ground = one image, not 51 copies.
- Edit a texture, every face using it updates instantly.

## Prefab system

### Save flow
- Select geometry (faces, walls, quads).
- Save to treasure box (B key), name it.
- The selection becomes an *instance* of the new prefab. Appears as a thumbnail.

### Instances
- Reference the source prefab.
- Per-instance: position, yaw rotation, uniform scale, optional color tint.
- Edit the source → all instances update.
- "Detach" makes an instance into raw editable geometry (one-off variant).

### Pivot
- Default: bottom-center of the bounding box. Trees sit on the ground, not float.
- User can nudge pivot post-save.

### No cascading
- Prefabs cannot contain other prefab references. A house contains raw geometry; a village is built by placing house instances by hand.
- Simpler mental model, easier to debug. Reconsider only if it becomes a real pain point.

## Scatter brush (later)

For exteriors. Pick a prefab (or a weighted set), drag the cursor, instances stamp along the path with randomization:

- Yaw rotation
- Uniform scale (range)
- Color tint
- Slight position jitter

Modes:
- **Single stamp** — click to place one.
- **Path scatter** — drag along a line, for fences and rows.
- **Area scatter** — drag with density slider, for grass and rocks.

## UI principles

- 90s HTML aesthetic. System fonts (MS Sans Serif). Classic Windows 9x gray (#c0c0c0). Beveled `outset`/`inset` borders. Navy (#000080) title bars. Yellow tooltip help. Web-safe colors. No rounded corners, no shadows, no gradients, no transparency effects.
- Status bar always visible — mode, cell count, cursor coords, save state. Classic Windows sunken-panel style.
- Help overlay top-left always shows current-mode controls. Classic tooltip style (yellow bg, black border).
- Single-key toggles: `Tab` for 2D/3D mode, `T` for texture library panel, `B` for treasure box / asset library.
- Panels appear at the bottom above the status bar. T and B panels sit side by side. Appear/disappear instantly (no transitions).
- **Tool palette** — horizontal toolbar of exclusive buttons. Only one tool active at a time. Pressed button shows `inset` border. Number keys `1`–`5` switch tools identically in 2D and 3D. Hold `Shift` for temporary select tool (release to go back). Tools: Paint, Fill, Wall, Select, House (fill + walls in one gesture).

## Roadmap

Version numbers use SemVer (Major.Minor.Patch). DESIGN.md lists Minor targets —
each entry ships as X.Y.0, with bug fixes bumping the Patch digit (X.Y.1, X.Y.2...).

### v0.7 — Polish fly controls + selection ✓
- Thicker rubber-band borders for both 2D and 3D selection
- 3D camera starts centered on the painted mesh
- Right-click hold (not toggle) for mouselook, lower sensitivity, smooth interpolation
- LMB drag-fill, wireframe toggle, sky-blue fog background
- T = texture panel (scaffold), B = treasure box

### v0.8 — Walls + Tool Palette ✓
- Toggle wall on a cell edge — vertical quad rising perpendicular
- Click near edge to place/remove walls; drag to wall a perimeter
- Adjustable height per wall segment
- Walls selectable and texturable like cell faces
- Orphan cleanup: removing last adjacent cell auto-deletes wall
- Tool palette — exclusive tools (Paint/Fill/Wall/Select/House) via `1`–`5` keys
- Shift hold for temporary select tool

### v0.9 — Bug fixes & polish for v0.8 ✓ (shipped as v0.9.0–v0.9.2)
- Universal LMB=place RMB=delete across all modes
- MMB mouselook in 3D
- Single-click wall placement uses setWall unconditionally
- Fix catastrophic crash: computeOrthogonalWalls body dropped during pen-wall edit
- Wall pen locks to starting grid line
- Real-time wall placement during drag
- Brighter 2D wall indicators

### v0.10 — Foundation: structure, undo, control panel
- Modular file structure (~12 source files, shell-concatenated output)
- Undo/redo via command pattern (max 100 depth)
- Control panel sidebar (V key): lighting, fog, camera, grid tunables
- `docs/spec.md` as technical source of truth

### v0.11 — Cell height
- Per-cell height offset (default 0). Cell quad sits at Y = cellHeight.
- Walls use the lower adjacent cell as base Y.
- Enables docks above water, raised platforms, split-level floors.

### v0.12 — Texture import & crush
- Clipboard paste (Ctrl+V) into texture library
- Drag-and-drop image files
- Crush to 64×64 (or 32×32, 128×128) via Canvas2D nearest-neighbor
- Alpha channel preserved through crush
- Texture library panel functional (T key)

### v0.13 — Per-face texture assignment
- Assign textures to cell faces, wall faces, and billboards
- Per-face UV scale, offset, rotation
- Default UV: full texture covering the face
- Per-wall height adjustable in the UI (not just global default)

### v0.14 — Billboard quads
- Free-standing vertical quad primitive
- Place anywhere, drag to size
- Upright (Y-only) and full billboard modes
- Transparent textures for tree foliage, decals, fences

### v0.15 — Export format v1
- Single `.map.json` with embedded textures (base64)
- Collision boxes (axis-aligned hints for game runtime)
- Trigger volumes with target map references
- Camera anchors (preset positions for game runtime)

### v0.16 — Tool refactor
- Extract each tool to its own state machine
- Clean event handler separation (onDown/onMove/onUp per tool)
- No new user-facing features — internal cleanup only

### v0.17 — Selection transform
- Move selected cells, walls, and billboards
- Uniform scale selection
- Grid-snapped by default, free with modifier
- "Move selection up" → roofs from floor cells

### v1.0 — Treasure box
- Save selection as named prefab → treasure box (B key)
- Stamp prefab instances into the map
- Per-instance position, yaw, scale, tint
- Treasure box export/import (`.treasure.json` files)

### v1.1 — Extend / array on drag
- Modifier+drag to stamp copies of selection at grid intervals
- Build repeating structures (floors, fences, columns) in one gesture

### v1.2 — Terrain brush
- Weighted push/pull brush with radius and falloff
- Replaces simple per-cell height with per-corner heights
- 2D height heatmap overlay
- Lighting responds to elevation changes

### v1.3 — Slice tool + face splitting
- Draw rectangle on a face to subdivide it
- Delete cut faces for doors/windows
- Split preserves UVs — nudge vertices after to match geometry to texture

### v2.0 — Freeform quads
- Drop a quad at the cursor in 3D mode
- Drag vertices to position
- Texture and select like cell faces

### v2.1 — Scatter brush
- Stamp / path / area modes
- Density and jitter sliders

### v2.2 — Skybox
- Inverted cube at origin, camera inside
- All 6 faces individually selectable and texturable
- Scale arbitrarily

### De-prioritized
- **PS1 renderer effects** (affine mapping, vertex jitter, 320×240 upscale,
  dithering) — the aesthetic comes from crunched textures + low poly, not
  from hardware-accurate quirks. Revisit only if the look isn't reading.

## Open questions

- **Cell size.** Currently 1×1. May tune to 2×2 or 4×4 once heights land and
  real scale is felt. Defer until harbor scene reveals practical needs.
- **Multi-floor support.** Handled initially by cell height + selection
  transform (raise a floor cell, clone it upward). Full multi-layer grid
  deferred.
- **Lighting model.** Sticking with Three.js standard (ambient + directional).
  Tunable via the control panel. Vertex-color lighting is not a priority.
- **Game runtime.** Separate HTML file that loads `.map.json` exports.
  Collision + trigger volumes + camera anchors are editor-authored hints
  for the runtime. The editor does not enforce physics.
- **Skybox.** Inverted cube confirmed. Start simple, reconsider only if it
  feels wrong in practice.

## Decisions made (moved from open questions)

- **PS1 renderer effects** (affine mapping, vertex jitter, 320×240 upscale,
  dithering) are de-prioritized. The target aesthetic is "crunched textures
  + low-poly geometry," not hardware-accurate PS1 simulation.
- **Textures embedded as base64** in the map JSON. A 64×64 PNG is ~3-8KB.
  At 200 textures that's under 2MB — self-contained and shareable.
- **Treasure box is per-map** with optional export/import of `.treasure.json`
  files. No global library unless the user builds one themselves.
- **File-based persistence.** localStorage is auto-save scratch only.
  The user owns `.map.json` and `.treasure.json` files on disk.
- **No server needed.** Works from `file://` for local use. Hosted on
  GitHub Pages for sharing.

## Non-goals

Things this tool deliberately won't do:

- High-fidelity PBR materials
- Sculpting / subdivision surfaces
- UV unwrapping (per-face assignment replaces this)
- Animation
- Lighting bakes more elaborate than vertex colors
- Real-time collaborative editing
- Cloud sync
- Mobile / touch (desktop only)

If a feature is starting to require any of the above, stop and reconsider whether the workflow needs to change instead.

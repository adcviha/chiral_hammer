# Chiral_Hammer — Design Document

## Vision

A bespoke HTML tool for making **PS1-era 3D maps** for casual games. Not a Maya competitor. A small focused tool where the *entire* authoring workflow — geometry, texturing, prefabs, scattering — feels like one coherent thing instead of a pipeline you have to learn.

Guiding ethos: Bennett Foddy's **"be cheap to be generous"**. Tool simplicity is part of the art. Constraints (low poly, low-res textures, no fancy lighting) shape what gets made.

## Aesthetic targets

Eventually:

- Low polygon counts
- 64×64 (or smaller) textures, nearest-neighbor sampled
- Affine (non-perspective-corrected) texture mapping — the wobbly warp that defined PS1
- Vertex snapping to integer pixel coordinates — the characteristic jitter
- No bilinear filtering, no mipmaps
- Simple vertex-color lighting or unlit
- Optional dithering and color quantization
- Render at ~320×240 and nearest-neighbor upscale

These are **renderer-side** effects, deferred until the **authoring** workflow is solid.

## Intended workflow

1. **Draw floor plans in 2D top-down.** Paint cells onto a grid to define rooms, paths, terraces, plazas.
2. **Flip to 3D for bespoke features.** Pull cell corners up/down for heights, slopes, hills. Drop in freeform quads for overhangs, roofs, ramps — anything the grid can't express.
3. **Texture faces.** Per-face or multi-select. Pick from the library, adjust UV offset/scale/rotation. Optionally subdivide a textured face to wobble individual vertices afterward.
4. **Save reusable pieces to the treasure box** as prefabs — trees, houses, wall segments, columns, props.
5. **Place prefab instances** through the world with per-instance rotation/scale/tint variation. Scatter brush for exteriors.

## Geometry paradigm

The world is one unified system, not two.

### Cell grid (primary)
- A coarse 3D grid of cells on the ground plane. v0 uses 1×1; may tune to 2×2 or 4×4 once heights land and real scale is felt.
- Each cell will have **four corner heights** (v1). Default 0 = flat floor.
- Pull a row of corners up → wall. Pull a strip → ceiling. Pull diagonally → slope. One primitive handles floors, walls, ceilings, hills, terraces.
- Interiors and exteriors share the same grid, so they connect cleanly.

### Freeform quads (secondary)
- For everything cells can't express: overhanging roofs, angled ramps, decorative geometry.
- Place anywhere in 3D, drag vertices to position.
- Same texturing and selection system as cell faces.

### Why this paradigm
- The 2D plan view matches the floor-plan workflow designers already know (Doom Builder, SketchUp).
- Cell grid is far more accessible than vertex/edge/face editing.
- Freeform quads are the escape hatch — used sparingly, not as the default.
- One texturing system, one prefab system, one selection model across both.

## Texture pipeline

User's intuition: screenshot textures from Google Maps or other public sources, crush them to 64×64, make them tile, assign per-face.

### In-tool texture prep
1. Drop image (or paste from clipboard).
2. Crop with aspect lock to power-of-2.
3. Resize to 64×64 (or 32×32, 128×128) with nearest-neighbor.
4. **Affine light flatten** — divide image by a heavily blurred version of itself, then renormalize. Kills the baked directional sunlight in satellite imagery.
5. **Palette quantize** to 16 or 32 colors. Optional dithering.
6. **Seamless tile helper** — drag the seam line, preview tiling live, clone-stamp out joins.
7. Save to texture library.

### Per-face assignment
- Click a face → pick texture → adjust UV offset/scale/rotation in 2D.
- Multi-select faces, assign to all at once.
- **Split face** preserves UVs across the split — texture a wall as one piece, then chop it into smaller quads to wobble individual vertices.

### Shared library
- Textures are global, not per-prefab. One brick texture used in 50 prefabs and the ground = one image, not 51 copies.
- Edit a texture, every face using it updates instantly. Maximum "cheap to be generous."

## Prefab system

### Save flow
- Select geometry (faces, quads, sub-meshes).
- Press a key, name it.
- The selection becomes an *instance* of the new prefab. The prefab appears in the treasure box as a thumbnail.

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
- Decided early: simpler mental model, easier to debug. Reconsider only if it becomes a real pain point.

## Scatter brush (later)

For exteriors. Pick a prefab (or a weighted set), drag the cursor, instances stamp along the path with randomized:

- Yaw rotation
- Uniform scale (range)
- Color tint
- Slight position jitter

Modes:
- **Single stamp** — click to place one.
- **Path scatter** — drag along a line, for fences and rows.
- **Area scatter** — drag with density slider, for grass and rocks.

## UI principles

- Dark dev-tool aesthetic. Monospace typography. Sharp amber + cyan accents.
- Status bar always visible — mode, cell count, cursor coords, save state.
- Help overlay top-left always shows current-mode controls.
- Single-key toggles for things you do constantly (`Tab` for mode, `T` for treasure box).
- Panels slide from the edge rather than float; they don't eat the canvas when closed.

## Roadmap

### v0 — DONE
Top-down cell painter, 3D free-fly preview, treasure box scaffold, persistence, JSON export/import.

### v1 — Heights
- Click a cell corner in 3D mode, drag up/down.
- 2D mode shows a height heatmap or contour overlay so plans aren't blind.
- Lighting that responds to new geometry.

### v2 — Texturing
- Texture library panel.
- In-tool import + 64×64 crush.
- Per-face texture assignment with UV controls.
- Seamless tile helper.
- Affine light flatten.

### v3 — Freeform quads
- Drop a quad at the cursor in 3D mode.
- Drag vertices to position.
- Texture and select like cell faces.

### v4 — Prefabs proper
- Selection system (box-select faces / quads / cells).
- Save selection as prefab → treasure box.
- Drag from treasure box to place instances.
- Per-instance transform + tint.

### v5 — Scatter brush
- Stamp / path / area modes.
- Density and jitter sliders.

### v6 — PS1 renderer
- Render to small framebuffer, nearest-neighbor upscale.
- Affine texture mapping in shader.
- Vertex snap to pixel coords for jitter.
- Optional dithering pass.

## Open questions

- **Cell size.** v0 uses 1×1. PS1-era interiors might want 2×2 or 4×4 so "rooms feel like rooms" instead of "every step is a cell." Decide once heights land.
- **Multi-floor support.** For a 2-story building, do you add a second cell layer or make it a prefab with internal cells? Probably the latter. TBD.
- **Outdoor terrain.** Cell grid + corner heights handles hills, but does it feel natural? Maybe a "noise pass" that randomizes corner heights within a region. Defer until v1 is tested.
- **Lighting model.** PS1 was mostly vertex-colored / unlit. Ship a "bake vertex lighting" pass, or stay flat-shaded? Decide when textures arrive.
- **Game-engine export.** When the user is ready to ship a game, what format do they want? Three.js JSON? glTF? Custom JSON with cell data + prefab refs? Probably the last, but defer.

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

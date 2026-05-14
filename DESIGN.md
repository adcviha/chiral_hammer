# Chiral Hammer — Design Document

## Vision

A bespoke HTML tool for making **PS1-era 3D maps** for casual games. Not a Maya competitor. A small focused tool where the *entire* authoring workflow — geometry, texturing, prefabs, scattering — feels like one coherent thing instead of a pipeline you have to learn.

Guiding ethos: Bennett Foddy's **"be cheap to be generous"**. Tool simplicity is part of the art. Constraints (low poly, low-res textures, no fancy lighting) shape what gets made.

## Aesthetic targets

Eventually:

- Low polygon counts
- Textures authored at any resolution, then **crushed** to 64×64 (or 32×32, 128×128) with nearest-neighbor as a deliberate aesthetic step
- Affine (non-perspective-corrected) texture mapping — the wobbly warp that defined PS1
- Vertex snapping to integer pixel coordinates — the characteristic jitter
- No bilinear filtering, no mipmaps
- Simple vertex-color lighting or unlit
- Optional dithering and color quantization
- Render at ~320×240 and nearest-neighbor upscale

These are **renderer-side** effects, deferred until the **authoring** workflow is solid.

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

### v0.7 — Polish fly controls + selection
- Thicker rubber-band borders for both 2D and 3D selection
- 3D camera starts centered on the painted mesh
- Right-click hold (not toggle) for mouselook, lower sensitivity, smooth interpolation
- LMB drag-fill, wireframe toggle, sky-blue fog background
- T = texture panel (scaffold), B = treasure box

### v0.8 — Walls + Tool Palette
- Toggle wall on a cell edge — vertical quad rising perpendicular
- Click near edge to place/remove walls; drag to wall a perimeter
- Adjustable height per wall segment
- Walls selectable and texturable like cell faces
- Orphan cleanup: removing last adjacent cell auto-deletes wall
- **Tool palette** — exclusive tools (Paint/Fill/Wall/Select/House) via `1`–`5` keys
- Shift hold for temporary select tool

### v0.9 — Selection transform
- Move selected cells/walls
- Uniform scale selected cells
- Grid-snapped by default, free with modifier

### v1.0 — Extend / array on drag
- Modifier+drag to stamp copies of selection at grid intervals
- Build repeating structures (floors, fences, columns) in one gesture

### v1.1 — Terrain brush
- Weighted push/pull brush with radius and falloff
- 2D height heatmap overlay
- Lighting responds to elevation changes

### v1.2 — Slice tool + face splitting
- Draw rectangle on a face to subdivide it
- Delete cut faces for doors/windows
- Split preserves UVs — nudge vertices after to match geometry to texture

### v2 — Texture pipeline
- Texture library panel (T key)
- Paste from clipboard, drop files — any resolution
- Per-face UV: scale, offset, rotate
- Crush to low-res as an aesthetic pass (nearest-neighbor)
- Affine light flatten, palette quantize
- Seamless tile helper
- Skybox (inverted cube, per-face texture assignment)

### v3 — Freeform quads
- Drop a quad at the cursor in 3D mode
- Drag vertices to position
- Texture and select like cell faces

### v4 — Prefabs proper
- Save selection as prefab → treasure box (B key)
- Drag from treasure box to place instances
- Per-instance transform + tint
- Detach to raw geometry

### v5 — Scatter brush
- Stamp / path / area modes
- Density and jitter sliders

### v6 — PS1 renderer
- Render to small framebuffer, nearest-neighbor upscale
- Affine texture mapping in shader
- Vertex snap to pixel coords for jitter
- Optional dithering pass

## Open questions

- **Cell size.** v0 uses 1×1. PS1-era interiors might want 2×2 or 4×4 so "rooms feel like rooms." Decide once walls land.
- **Multi-floor support.** For a 2-story building, likely a second cell layer or prefabs with internal cells. TBD.
- **Outdoor terrain.** Does the weighted terrain brush feel natural? Test when v1.1 lands.
- **Lighting model.** PS1 was mostly vertex-colored / unlit. Ship a "bake vertex lighting" pass, or stay flat-shaded? Decide when textures arrive.
- **Game-engine export.** Custom JSON with cell data + wall data + prefab refs? Probably. Defer.
- **Skybox vs sky dome.** Cube is simpler and matches the low-poly aesthetic. A dome might feel more natural for outdoor scenes. Start with cube, reconsider if it feels wrong.

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

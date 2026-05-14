# Chiral Hammer — Specification

This document is the technical source of truth. It defines *how* the system
works at the code level. For *what* we're building and *why*, see DESIGN.md.
For working instructions (protocol, conventions, constraints), see CLAUDE.md.

---

## Coordinate System

- **Y-up, right-handed.** X = east, Y = up, Z = north. This is Three.js default.
- **Ground plane:** Y = 0. The grid lies on the XZ plane.
- **Cell coordinates:** integer grid indices (gx, gz). A cell at (gx, gz)
  occupies world space from (gx, 0, gz) to (gx+1, 0, gz+1) before height
  offset. Its center is at (gx + 0.5, cellHeight, gz + 0.5).
- **Cell size:** 1 world unit = 1 cell width. The real-world meaning is
  deliberately abstract — the author decides the scale.
- **Cell height:** a per-cell Y offset (meters, default 0). The cell quad
  sits at Y = cellHeight. This is the simple precursor to per-vertex terrain
  heights. When terrain sculpting lands, per-cell height migrates to a
  per-corner height array.
- **Walls:** vertical quads rising from cell edges. A wall at edge (gx, gz, N)
  spans from (gx, cellMinY, gz) to (gx+1, cellMinY + height, gz). A wall at
  edge (gx, gz, E) spans from (gx+1, cellMinY, gz) to (gx+1, cellMinY + height,
  gz+1). The base Y of a wall is the minimum cellHeight of the two adjacent
  cells (if any), so walls sit on the lower cell. If neither adjacent cell
  exists, base Y = 0.
- **2D view camera:** Orthographic, looking down along -Y (direction 0,-1,0).
  Default frustumSize = 20. Pan translates camera in XZ. Zoom scales frustum
  around the cursor's world position.
- **3D view camera:** Perspective, default FOV 60°, near 0.1, far 200.
  Spherical coordinates: yaw (rotation around Y, 0 = +Z), pitch (elevation,
  0 = horizon). Camera position is the sphere origin; look-at is derived from
  yaw + pitch forward vector.

## Grid & Map Data Model

All map data uses `Map` with string keys. This is simple, JSON-serializable,
and fast enough for the scale we target (hundreds to low thousands of cells).

### Cells

```
Map<"gx,gz", { color: "#rrggbb", height: number }>
```

- `gx`, `gz` are integers. `color` is a CSS hex string. `height` defaults to 0.
- A cell exists in this Map if and only if it has been painted by the user.
  Unpainted grid cells have no entry.

### Walls

```
Map<"gx,gz,dir", { color: "#rrggbb", height: number }>
```

- `dir` is always `"N"` or `"E"` (canonical form).
- **Canonicalization rule:** S edges become N edges of the cell to the south.
  W edges become E edges of the cell to the west. Specifically:
  - Wall at (gx, gz, S) → stored as (gx, gz+1, N)
  - Wall at (gx, gz, W) → stored as (gx-1, gz, E)
- **Orphan rule:** a wall with no adjacent cell on either side is automatically
  deleted. Adjacency check: a wall at (gx, gz, N) requires a cell at (gx, gz)
  OR (gx, gz-1). A wall at (gx, gz, E) requires a cell at (gx, gz) OR
  (gx+1, gz).
- `height` is the wall's vertical extent above its base Y.

### Cell Height (simple elevation)

- Each cell carries a `height` property (default 0). The cell quad's Y position
  is set to this value.
- Walls on the cell's edges use the minimum height of the two adjacent cells
  as their base, so a wall between a dock cell (height=1) and a water cell
  (height=0) sits at Y=0 and rises to 1+wallHeight.
- This is intentionally simple. It gets replaced by per-corner heights when
  the terrain brush lands. The data migration path: per-cell `height` values
  get expanded to four corner heights per cell.

### Billboard Quads

```
Map<id, {
  id: string,
  position: { x, y, z },
  scale: { x, y },          // width, height in world units
  textureId: string | null,
  billboard: boolean,       // true = face camera each frame
  color: "#rrggbb",
}>
```

- A free-standing vertical quad. Not attached to any cell edge.
- `billboard: true` means the mesh calls `lookAt(camera.position)` each frame,
  constrained to Y-axis rotation only (a tree trunk billboard tilts with the
  camera? No — constrain to Y rotation so foliage doesn't lean).
  Actually: two modes — "full billboard" (faces camera on all axes, for
  particles/fire) and "upright billboard" (only Y rotation, for trees/signs).
  Default: upright.
- Supports alpha transparency via the assigned texture's alpha channel.
- Same selection, texturing, and transform system as cells and walls.

### Textures

```
Map<uuid, {
  id: string,              // UUID v4
  name: string,            // user-given label, e.g. "harbor wall"
  sourceBase64: string,    // original resolution PNG as data URL
  crushedBase64: string,   // crushed version (default 64×64) as data URL
  crushSize: number,       // 64, 32, or 128
}>
```

- Source is kept at full resolution. Crush is what gets rendered.
- Crush uses Canvas2D `drawImage()` with `imageSmoothingEnabled = false`
  (nearest-neighbor).
- Alpha channel is preserved through the crush step.
- Textures are stored inline in the map JSON. No external file references.

### Face Assignments

```
Map<faceKey, {
  textureId: string,
  uvScale: [u, v],
  uvOffset: [u, v],
  uvRotation: number,      // radians
}>
```

- `faceKey` examples: `"cell:0,0"`, `"wall:0,0,N"`, `"billboard:<id>"`.
- Default when no entry exists: textureId = null (use cell/wall color),
  uvScale = [1,1], uvOffset = [0,0], uvRotation = 0.
- UV transforms are applied via Three.js texture `.repeat`, `.offset`,
  `.rotation` properties.

### Selection

```
Set<cellKey>    selectedCells    // e.g. {"0,0", "1,2"}
Set<wallKey>    selectedWalls    // e.g. {"0,0,N", "1,2,E"}
Set<id>         selectedBillboards
```

- Selection is exclusive across primitive types in practice (you can select
  cells AND walls simultaneously, but the transform tool operates on the
  union).
- Selection is cleared by: clicking empty space, pressing Escape, switching
  modes, or loading a new map.
- Shift+click toggles an individual item without clearing the existing
  selection.
- Selected items get an emissive tint: `emissive = 0x444400` at intensity
  0.6 for cells, `0xaaaa00` at intensity 1.0 for walls.

## State Management

### State Object Shape

All mutable editor state lives in `Chiral.state`. Sub-objects group related
properties:

```
state = {
  // Mode & tool
  mode: '2d' | '3d',
  activeTool: 'tile' | 'fill' | 'wall' | 'select' | 'house',

  // Map data
  grid: Map,           // cells
  walls: Map,          // canonical wall keys
  textures: Map,       // texture library (future, scaffold now)
  faceAssignments: Map,// (future)
  billboards: Map,     // (future)

  // Selection
  selectedCells: Set,
  selectedWalls: Set,
  selectedBillboards: Set,  // (future)

  // Color
  activeColor: '#rrggbb',
  palette: string[],   // 12 web-safe colors

  // Camera
  cam: {
    // 2D
    panX: number, panZ: number, zoom: number,
    // 3D
    pos: {x,y,z}, yaw: number, pitch: number,
    targetYaw: number, targetPitch: number,
  },

  // Input (transient, not serialized)
  mouse: { x, y, worldX, worldZ, down, button },
  keys: {},            // held key codes

  // UI toggles
  ui: {
    tpOpen: boolean, tpMaximized: boolean,
    tbOpen: boolean, tbMaximized: boolean,
    helpCollapsed: boolean,
    wireframe: boolean,
    fogEnabled: boolean,
    controlPanelOpen: boolean,
  },

  // Visual settings (tuned via control panel, persisted separately)
  settings: {
    ambientIntensity: 1.5,
    dirIntensity: 2.0,
    dirAzimuth: 45,
    dirAltitude: 60,
    dirColor: '#ffffff',
    fogNear: 30, fogFar: 80,
    fogColor: '#4a6a7a',
    fov: 60,
    flySpeed: 5,
    lookSensitivity: 0.25,
    zoomSpeed: 0.05,
    gridSize: 200,
    gridOpacity: 1.0,
    gridColor: '#5a6a7a',
    pixelRatioCap: 2,
    clearColor: '#4a6a7a',
    defaultWallHeight: 1.0,
    defaultWallColor: '#8b7355',
  },

  // Persistence
  dirty: boolean,
  saveTimeout: number | null,

  // Undo/redo
  undoStack: [],       // Command[]
  redoStack: [],       // Command[]
  maxUndoDepth: 100,
}
```

### Undo/Redo

**Command pattern.** Every mutation that changes map data creates a Command
object:

```
{
  type: 'setCell' | 'removeCell' | 'setWall' | 'removeWall' | ...,
  execute(): void,     // apply the change
  undo(): void,        // reverse the change
  timestamp: number,
}
```

- Commands are pushed onto `undoStack`. Undo pops the top command, calls
  `.undo()`, and pushes it onto `redoStack`. Redo does the reverse.
- A new user action clears `redoStack` (standard behavior: you can't redo
  after making a new change).
- Max stack depth: 100. Oldest commands are dropped when the stack exceeds
  this limit.
- Stack is cleared on: new map load, import, CLEAR ALL.
- Commands are NOT serialized (they hold references to live objects). Only
  the current state is saved. Undo history is lost on page reload.

## Core Tech Stack

| Concern            | Choice                              | Why |
|--------------------|-------------------------------------|-----|
| 3D rendering       | Three.js r160 via ESM importmap     | Already working, stable API, zero build |
| Texture processing | Canvas2D (off-screen canvas)        | Built into browsers, fast for 64×64 |
| UI                 | Vanilla DOM + CSS                   | Matches 90s aesthetic, no framework overhead |
| Persistence        | localStorage (auto-save scratch) + JSON files (real saves) | Works offline, user owns their files |
| File format        | Single JSON with base64-embedded textures | Self-contained, one file, shareable |
| Undo/redo          | Command pattern, in-memory          | Zero dependencies, simple to implement |
| Dev structure      | Multiple `<script>` files in dependency order | Modular source, works via file:// |
| Deploy artifact    | Single HTML file (shell-concatenated)| Open directly, host anywhere |
| Namespace          | `window.Chiral`                      | One global, all modules attach to it |

## File Formats

### Map File (`.map.json`)

```json
{
  "version": "0.10.0",
  "metadata": {
    "name": "",
    "author": "",
    "created": "2026-05-14T00:00:00Z"
  },
  "cells": [
    { "key": "0,0", "color": "#8b7355", "height": 0 }
  ],
  "walls": [
    { "key": "0,0,N", "color": "#8b7355", "height": 1.0 }
  ],
  "textures": [
    {
      "id": "uuid",
      "name": "harbor wall",
      "sourceBase64": "data:image/png;base64,...",
      "crushedBase64": "data:image/png;base64,...",
      "crushSize": 64
    }
  ],
  "faceAssignments": [
    {
      "face": "cell:0,0",
      "textureId": "uuid",
      "uvScale": [1, 1],
      "uvOffset": [0, 0],
      "uvRotation": 0
    }
  ],
  "billboards": [
    {
      "id": "uuid",
      "position": { "x": 5, "y": 0, "z": 3 },
      "scale": { "x": 1, "y": 2 },
      "textureId": "uuid",
      "billboard": true,
      "color": "#ffffff"
    }
  ],
  "prefabs": [],
  "instances": [],
  "collision": [
    { "type": "box", "min": [0, 0, 0], "max": [1, 1, 1] }
  ],
  "triggers": [
    {
      "name": "exit_to_harbor",
      "type": "box",
      "min": [10, 0, 10],
      "max": [12, 2, 12],
      "target": "harbor.map.json"
    }
  ],
  "cameraAnchors": [
    {
      "name": "default",
      "position": [10, 5, 10],
      "lookAt": [0, 0, 0],
      "fov": 60
    }
  ]
}
```

- All sections except `cells` are optional. An empty map is `{"version":"...",
  "cells":[]}`.
- `textures` includes both source and crushed images. The runtime can decide
  which to use.
- `collision` and `triggers` are hints for the game runtime — the editor does
  not enforce physics. Collision boxes are axis-aligned.
- `cameraAnchors` define preset camera positions for the game runtime.

### Treasure Box File (`.treasure.json`)

```json
{
  "version": "0.10.0",
  "prefabs": [
    {
      "id": "uuid",
      "name": "pine tree",
      "cells": [...],
      "walls": [...],
      "billboards": [...],
      "textures": [...],
      "faceAssignments": [...],
      "pivot": { "x": 0, "y": 0, "z": 0 }
    }
  ]
}
```

- A prefab is a self-contained subset of a map: the cells, walls, billboards,
  and textures that make up one "thing."
- `pivot` is the placement anchor — where the cursor holds it when dragging
  from the treasure box. Default: bottom-center of bounding box.
- Treasure box files are separate from map files. You can load a treasure box
  into any map. The map file only stores *instances* (references to prefab
  IDs), not the prefab definitions themselves.

### Settings (localStorage only)

```json
{
  "ambientIntensity": 1.5,
  "dirIntensity": 2.0,
  ...
}
```

- Stored under `chiral_hammer:settings` in localStorage.
- Separate from map data so settings survive map loads.
- Not part of any export file — these are personal editor preferences.

---

## Version Compatibility

The version string in map files follows SemVer (Major.Minor.Patch). The editor
checks the Major version on import:

- **Same Major version:** safe to load. Minor/Patch differences are
  forward-compatible (newer fields are ignored by older editors; missing
  fields get defaults).
- **Different Major version:** warn the user. Attempt to load anyway
  (best-effort), but flag that data loss is possible.

The localStorage key is `chiral_hammer:vX.Y` — only Major and Minor, so
Patch bumps within the same feature set share the same auto-save slot.

---

## Rendering Order

1. Opaque scene (cells, walls, grid helper)
2. Transparent objects (billboards with alpha, if any) — renderOrder 1+
3. 2D overlay objects (cursor highlight, edge highlight, rubber-band rect,
   wall indicators) — renderOrder 997–999, depthTest disabled

This ensures the cursor highlight is always visible on top of the grid,
and transparent foliage renders after opaque geometry for correct blending.

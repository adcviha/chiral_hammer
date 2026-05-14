// ===== CHIRAL HAMMER v0.10.0 — STATE & DATA MODEL =====
(function() {
const C = window.Chiral = window.Chiral || {};

// ===== STATE =====

C.state = {
  mode: '2d',              // '2d' | '3d'
  grid: new Map(),          // "x,z" -> { color, height }
  palette: [
    '#8b7355', '#6b8b6b', '#7b7b7b', '#8b6b4a',
    '#5a7a5a', '#9b8b7b', '#687868', '#a08060',
    '#4a6a5a', '#7b6b5b', '#8b8b7b', '#6b5b4b'
  ],
  activeColor: '#8b7355',

  // 3D camera state
  camPos: { x: 10, y: 10, z: 10 },
  camYaw: -Math.PI / 4,
  camPitch: -0.5,
  targetYaw: -Math.PI / 4,
  targetPitch: -0.5,

  // Mouse / input state
  mouse: { x: 0, y: 0 },
  mouseWorld2D: { x: 0, y: 0, z: 0 },
  mouseDown: false,
  mouseButton: -1,
  middleDown: false,
  rightDown: false,
  keys: {},

  // selection
  selecting: false,
  selectStart: { x: 0, y: 0 },
  selectEnd: { x: 0, y: 0 },
  selectScreenStart: { x: 0, y: 0 },
  selectScreenEnd: { x: 0, y: 0 },
  selectedCells: new Set(),
  selectedWalls: new Set(),

  // walls
  walls: new Map(),          // "gx,gz,N|E" -> { color, height }
  wallHeight: 1.0,
  wallColor: '#8b7355',

  // UI state
  tpOpen: false,
  tbOpen: false,
  tpMaximized: false,
  tbMaximized: false,
  cpOpen: false,
  wireframe: false,

  // active tool
  activeTool: 'tile',

  // save flag
  dirty: false,
  saveTimeout: null,

  // undo/redo
  undoStack: [],
  redoStack: [],
  maxUndoDepth: 100,

  // visual settings (control panel)
  settings: {
    ambientIntensity: 1.5,
    dirIntensity: 2.0,
    dirAzimuth: 45,
    dirAltitude: 60,
    dirColor: '#ffffff',
    fogEnabled: true,
    fogNear: 30,
    fogFar: 80,
    fogColor: '#4a6a7a',
    fov: 60,
    flySpeed: 5,
    lookSensitivity: 0.25,
    zoomSpeed: 0.05,
    gridSize: 200,
    gridOpacity: 1.0,
    gridColor: '#8a9aaa',
    pixelRatioCap: 2,
    clearColor: '#4a6a7a',
    defaultWallHeight: 1.0,
    defaultWallColor: '#8b7355',
  },
};

// ===== GRID MATH HELPERS =====

C.gridKey = function(gx, gz) {
  return `${gx},${gz}`;
};

C.cellExists = function(gx, gz) {
  return C.state.grid.has(C.gridKey(gx, gz));
};

C.getCell = function(gx, gz) {
  return C.state.grid.get(C.gridKey(gx, gz));
};

// ===== WALL MATH HELPERS =====

C.wallKey = function(gx, gz, dir) {
  return `${gx},${gz},${dir}`;
};

C.parseWallKey = function(key) {
  const parts = key.split(',');
  return { gx: Number(parts[0]), gz: Number(parts[1]), dir: parts[2] };
};

C.canonicalWallKey = function(gx, gz, dir) {
  if (dir === 'S') return C.wallKey(gx, gz, 'N');
  if (dir === 'W') return C.wallKey(gx - 1, gz, 'E');
  return C.wallKey(gx, gz, dir);
};

C.edgeHasAdjacentCell = function(gx, gz, dir) {
  if (dir === 'N') return C.cellExists(gx, gz) || C.cellExists(gx, gz - 1);
  if (dir === 'E') return C.cellExists(gx, gz) || C.cellExists(gx + 1, gz);
  return false;
};

// ===== CELL DATA MUTATIONS =====

C.setCell = function(gx, gz, color) {
  const key = C.gridKey(gx, gz);
  const old = C.state.grid.get(key);
  C.state.grid.set(key, { color, height: 0 });
  C.addCellMesh(gx, gz, color);
  C.markDirty();
  C.pushUndo({
    type: 'setCell',
    gx, gz,
    oldColor: old ? old.color : null,
    newColor: color,
    undo: function() {
      if (this.oldColor) {
        C.state.grid.set(C.gridKey(this.gx, this.gz), { color: this.oldColor, height: 0 });
        C.addCellMesh(this.gx, this.gz, this.oldColor);
      } else {
        C.removeCellSilent(this.gx, this.gz);
      }
      C.markDirty();
    },
    redo: function() {
      C.state.grid.set(C.gridKey(this.gx, this.gz), { color: this.newColor, height: 0 });
      C.addCellMesh(this.gx, this.gz, this.newColor);
      C.markDirty();
    }
  });
};

C.setCellSilent = function(gx, gz, color) {
  const key = C.gridKey(gx, gz);
  C.state.grid.set(key, { color, height: 0 });
  C.addCellMesh(gx, gz, color);
};

C.removeCell = function(gx, gz) {
  const key = C.gridKey(gx, gz);
  const old = C.state.grid.get(key);
  if (!old) return;
  C.state.grid.delete(key);
  C.removeCellMesh(gx, gz);
  C.cleanOrphanWallsAround(gx, gz);
  C.markDirty();
  C.pushUndo({
    type: 'removeCell',
    gx, gz,
    oldColor: old.color,
    undo: function() {
      C.setCellSilent(this.gx, this.gz, this.oldColor);
      C.markDirty();
    },
    redo: function() {
      C.removeCellSilent(this.gx, this.gz);
      C.markDirty();
    }
  });
};

C.removeCellSilent = function(gx, gz) {
  const key = C.gridKey(gx, gz);
  C.state.grid.delete(key);
  C.removeCellMesh(gx, gz);
  C.cleanOrphanWallsAround(gx, gz);
};

C.clearAllCells = function() {
  for (const key of C.state.grid.keys()) {
    const [gx, gz] = key.split(',').map(Number);
    C.removeCellMesh(gx, gz);
  }
  C.state.grid.clear();
  for (const key of C.state.walls.keys()) {
    C.removeWallMeshByKey(key);
  }
  C.state.walls.clear();
  C.state.undoStack = [];
  C.state.redoStack = [];
  C.markDirty();
  C.persistence.saveState();
  C.ui.updateStatusBar();
};

// ===== WALL DATA MUTATIONS =====

C.setWall = function(gx, gz, dir, color, height) {
  const key = C.canonicalWallKey(gx, gz, dir);
  const parsed = C.parseWallKey(key);
  const old = C.state.walls.get(key);
  C.state.walls.set(key, { color, height });
  C.addWallMesh(parsed.gx, parsed.gz, parsed.dir, color, height);
  C.markDirty();
  C.pushUndo({
    type: 'setWall',
    gx: parsed.gx, gz: parsed.gz, dir: parsed.dir,
    oldColor: old ? old.color : null,
    oldHeight: old ? old.height : null,
    newColor: color, newHeight: height,
    undo: function() {
      if (this.oldColor) {
        C.setWallSilent(this.gx, this.gz, this.dir, this.oldColor, this.oldHeight);
      } else {
        C.removeWallSilent(this.gx, this.gz, this.dir);
      }
      C.markDirty();
    },
    redo: function() {
      C.setWallSilent(this.gx, this.gz, this.dir, this.newColor, this.newHeight);
      C.markDirty();
    }
  });
};

C.setWallSilent = function(gx, gz, dir, color, height) {
  const key = C.canonicalWallKey(gx, gz, dir);
  const parsed = C.parseWallKey(key);
  C.state.walls.set(key, { color, height });
  C.addWallMesh(parsed.gx, parsed.gz, parsed.dir, color, height);
};

C.removeWall = function(gx, gz, dir) {
  const key = C.canonicalWallKey(gx, gz, dir);
  const old = C.state.walls.get(key);
  if (!old) return;
  C.state.walls.delete(key);
  C.removeWallMeshByKey(key);
  C.markDirty();
  C.pushUndo({
    type: 'removeWall',
    gx, gz, dir,
    oldColor: old.color, oldHeight: old.height,
    undo: function() {
      C.setWallSilent(this.gx, this.gz, this.dir, this.oldColor, this.oldHeight);
      C.markDirty();
    },
    redo: function() {
      C.removeWallSilent(this.gx, this.gz, this.dir);
      C.markDirty();
    }
  });
};

C.removeWallSilent = function(gx, gz, dir) {
  const key = C.canonicalWallKey(gx, gz, dir);
  C.state.walls.delete(key);
  C.removeWallMeshByKey(key);
};

C.toggleWall = function(gx, gz, dir) {
  const key = C.canonicalWallKey(gx, gz, dir);
  if (C.state.walls.has(key)) {
    C.removeWall(gx, gz, dir);
  } else {
    const parsed = C.parseWallKey(key);
    if (C.edgeHasAdjacentCell(parsed.gx, parsed.gz, parsed.dir)) {
      C.setWall(gx, gz, dir, C.state.wallColor, C.state.wallHeight);
    }
  }
};

C.cleanOrphanWallsAround = function(gx, gz) {
  const edges = [
    { cgx: gx,     cgz: gz,     cdir: 'N' },
    { cgx: gx,     cgz: gz + 1, cdir: 'N' },
    { cgx: gx,     cgz: gz,     cdir: 'E' },
    { cgx: gx - 1, cgz: gz,     cdir: 'E' },
  ];
  for (const { cgx, cgz, cdir } of edges) {
    const key = C.wallKey(cgx, cgz, cdir);
    if (C.state.walls.has(key) && !C.edgeHasAdjacentCell(cgx, cgz, cdir)) {
      C.removeWallMeshByKey(key);
      C.state.walls.delete(key);
    }
  }
};

// ===== UNDO/REDO =====

C.pushUndo = function(cmd) {
  // Skip undo recording for silent operations (used during undo/redo playback)
  if (C._undoPlaying) return;
  C.state.undoStack.push(cmd);
  C.state.redoStack = [];
  if (C.state.undoStack.length > C.state.maxUndoDepth) {
    C.state.undoStack.shift();
  }
};

C.undo = function() {
  if (C.state.undoStack.length === 0) return;
  C._undoPlaying = true;
  const cmd = C.state.undoStack.pop();
  cmd.undo();
  C.state.redoStack.push(cmd);
  C._undoPlaying = false;
  C.ui.updateStatusBar();
};

C.redo = function() {
  if (C.state.redoStack.length === 0) return;
  C._undoPlaying = true;
  const cmd = C.state.redoStack.pop();
  cmd.redo();
  C.state.undoStack.push(cmd);
  C._undoPlaying = false;
  C.ui.updateStatusBar();
};

// ===== DIRTY TRACKING (called by mutations, defined here for dependency order) =====

C.markDirty = function() {
  C.state.dirty = true;
  C.ui.setSaveStatus('UNSAVED', '#ff0000');
};

})();

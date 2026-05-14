// ===== CHIRAL HAMMER v0.10.0 — TOOL: FILL =====
// Drag-rect fill. Atomic on mouseup. LMB fill, RMB erase.
(function() {
const C = window.Chiral;
const s = C.state;

C.tools = C.tools || {};

C.tools.fill = {
  onDown: function(event) {
    if (event.button === 0) {
      s._dragStart = C.input.getWorldFromMouse(event);
      // Also place the starting cell immediately
      if (s._dragStart) {
        const gx = Math.floor(s._dragStart.x);
        const gz = Math.floor(s._dragStart.z);
        const existing = C.getCell(gx, gz);
        if (!existing || existing.color !== s.activeColor) {
          C.setCell(gx, gz, s.activeColor);
          C.ui.updateStatusBar();
        }
      }
    } else if (event.button === 2) {
      s._dragStart = C.input.getWorldFromMouse(event);
      if (s.mode === '2d') {
        const grid = C.input.getGridFromMouse(event);
        if (grid && C.cellExists(grid.gx, grid.gz)) {
          C.removeCell(grid.gx, grid.gz);
          C.ui.updateStatusBar();
        }
      }
    }
  },

  onMove: function(event) {
    if (s.mode === '2d') {
      C.updateHighlight(event);
    } else {
      C.edgeHighlight.visible = false;
    }
    if (s.mouseDown && s.mouseButton === 0 && (event.buttons & 1) && s._dragStart) {
      const world = C.input.getWorldFromMouse(event);
      if (world) {
        C.showDragPreview(s._dragStart, world);
      }
    }
    if (s.mouseDown && s.mouseButton === 2 && (event.buttons & 2) && s._dragStart) {
      const world = C.input.getWorldFromMouse(event);
      if (world) {
        C.showDragPreview(s._dragStart, world);
      }
    }
  },

  onUp: function(event) {
    C.hideDragPreview();
    if (s._dragStart) {
      const world = C.input.getWorldFromMouse(event);
      if (world) {
        if (s.mouseButton === 0) {
          C.fillRect(s._dragStart, world);
        } else if (s.mouseButton === 2) {
          C.eraseRect(s._dragStart, world);
        }
      }
    }
  }
};

// ===== FILL RECT =====

C.fillRect = function(worldA, worldB) {
  const x1 = Math.min(worldA.x, worldB.x);
  const x2 = Math.max(worldA.x, worldB.x);
  const z1 = Math.min(worldA.z, worldB.z);
  const z2 = Math.max(worldA.z, worldB.z);
  const gx1 = Math.floor(x1);
  const gx2 = Math.floor(x2 - 0.001);
  const gz1 = Math.floor(z1);
  const gz2 = Math.floor(z2 - 0.001);
  // Defer undo — push one compound undo for the whole rect
  const oldCells = [];
  for (let gx = gx1; gx <= gx2; gx++) {
    for (let gz = gz1; gz <= gz2; gz++) {
      const existing = C.getCell(gx, gz);
      oldCells.push({ gx, gz, oldColor: existing ? existing.color : null });
      if (!existing || existing.color !== s.activeColor) {
        C.setCellSilent(gx, gz, s.activeColor);
      }
    }
  }
  C.markDirty();
  C.pushUndo({
    type: 'fillRect',
    oldCells: oldCells,
    newColor: s.activeColor,
    undo: function() {
      C._undoPlaying = true;
      for (const oc of this.oldCells) {
        if (oc.oldColor) {
          C.setCellSilent(oc.gx, oc.gz, oc.oldColor);
        } else {
          C.removeCellSilent(oc.gx, oc.gz);
        }
      }
      C._undoPlaying = false;
      C.markDirty();
    },
    redo: function() {
      C._undoPlaying = true;
      for (const oc of this.oldCells) {
        C.setCellSilent(oc.gx, oc.gz, this.newColor);
      }
      C._undoPlaying = false;
      C.markDirty();
    }
  });
  C.ui.updateStatusBar();
};

C.eraseRect = function(worldA, worldB) {
  const x1 = Math.min(worldA.x, worldB.x);
  const x2 = Math.max(worldA.x, worldB.x);
  const z1 = Math.min(worldA.z, worldB.z);
  const z2 = Math.max(worldA.z, worldB.z);
  const gx1 = Math.floor(x1);
  const gx2 = Math.floor(x2 - 0.001);
  const gz1 = Math.floor(z1);
  const gz2 = Math.floor(z2 - 0.001);
  const oldCells = [];
  for (let gx = gx1; gx <= gx2; gx++) {
    for (let gz = gz1; gz <= gz2; gz++) {
      if (C.cellExists(gx, gz)) {
        oldCells.push({ gx, gz, oldColor: C.getCell(gx, gz).color });
        C.removeCellSilent(gx, gz);
      }
    }
  }
  if (oldCells.length === 0) return;
  C.markDirty();
  C.pushUndo({
    type: 'eraseRect',
    oldCells: oldCells,
    undo: function() {
      C._undoPlaying = true;
      for (const oc of this.oldCells) {
        C.setCellSilent(oc.gx, oc.gz, oc.oldColor);
      }
      C._undoPlaying = false;
      C.markDirty();
    },
    redo: function() {
      C._undoPlaying = true;
      for (const oc of this.oldCells) {
        C.removeCellSilent(oc.gx, oc.gz);
      }
      C._undoPlaying = false;
      C.markDirty();
    }
  });
  C.ui.updateStatusBar();
};

})();

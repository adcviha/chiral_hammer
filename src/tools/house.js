// ===== CHIRAL HAMMER v0.10.0 — TOOL: HOUSE =====
// Composes fill + walls: drag to fill cells AND place wall perimeter. Atomic on mouseup.
(function() {
const C = window.Chiral;
const s = C.state;

C.tools = C.tools || {};

C.tools.house = {
  onDown: function(event) {
    if (event.button === 0) {
      s._dragStart = C.input.getWorldFromMouse(event);
    } else if (event.button === 2) {
      s._dragStart = C.input.getWorldFromMouse(event);
      const grid = C.input.getGridFromMouse(event);
      if (grid && C.cellExists(grid.gx, grid.gz)) {
        C.removeCell(grid.gx, grid.gz);
        C.ui.updateStatusBar();
      }
    }
  },

  onMove: function(event) {
    if (s.mode === '2d') C.updateHighlight(event);
    else C.edgeHighlight.visible = false;

    if (s.mouseDown && (event.buttons & 1) && s._dragStart) {
      const world = C.input.getWorldFromMouse(event);
      if (world) C.showDragPreview(s._dragStart, world);
    }
    if (s.mouseDown && s.mouseButton === 2 && (event.buttons & 2) && s._dragStart) {
      const world = C.input.getWorldFromMouse(event);
      if (world) C.showDragPreview(s._dragStart, world);
    }
  },

  onUp: function(event) {
    C.hideDragPreview();
    if (s._dragStart && s.mouseButton === 0) {
      const world = C.input.getWorldFromMouse(event);
      if (world) {
        C.fillRect(s._dragStart, world);
        C.wallRect(s._dragStart, world);
      }
    }
    if (s._dragStart && s.mouseButton === 2) {
      const world = C.input.getWorldFromMouse(event);
      if (world) C.eraseRect(s._dragStart, world);
    }
  }
};

// ===== WALL RECT (perimeter walls on a rectangular region) =====

C.wallRect = function(worldA, worldB) {
  const x1 = Math.min(worldA.x, worldB.x);
  const x2 = Math.max(worldA.x, worldB.x);
  const z1 = Math.min(worldA.z, worldB.z);
  const z2 = Math.max(worldA.z, worldB.z);
  const gx1 = Math.floor(x1);
  const gx2 = Math.floor(x2 - 0.001);
  const gz1 = Math.floor(z1);
  const gz2 = Math.floor(z2 - 0.001);

  const newWalls = [];
  for (let gx = gx1; gx <= gx2; gx++) {
    newWalls.push({ gx, gz: gz2 + 1, dir: 'N' });
    newWalls.push({ gx, gz: gz1, dir: 'N' });
  }
  for (let gz = gz1; gz <= gz2; gz++) {
    newWalls.push({ gx: gx1 - 1, gz, dir: 'E' });
    newWalls.push({ gx: gx2, gz, dir: 'E' });
  }

  for (const w of newWalls) {
    C.setWallSilent(w.gx, w.gz, w.dir, s.wallColor, s.wallHeight);
  }
  C.markDirty();
  C.ui.updateStatusBar();
};

})();

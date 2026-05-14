// ===== CHIRAL HAMMER v0.10.0 — TOOL: TILE =====
// Single-click paint (LMB) / erase (RMB). Universal across 2D and 3D.
(function() {
const C = window.Chiral;
const s = C.state;

C.tools = C.tools || {};

C.tools.tile = {
  onDown: function(event) {
    if (event.button === 0) {
      // LMB — place cell
      if (s.mode === '2d') {
        const grid = C.input.getGridFromMouse(event);
        if (grid) {
          const existing = C.getCell(grid.gx, grid.gz);
          if (!existing || existing.color !== s.activeColor) {
            C.setCell(grid.gx, grid.gz, s.activeColor);
            C.ui.updateStatusBar();
          }
        }
      } else {
        const world = C.input.getWorldFromMouse(event);
        if (world) {
          const gx = Math.floor(world.x);
          const gz = Math.floor(world.z);
          const existing = C.getCell(gx, gz);
          if (!existing || existing.color !== s.activeColor) {
            C.setCell(gx, gz, s.activeColor);
            C.ui.updateStatusBar();
          }
        }
      }
    } else if (event.button === 2) {
      // RMB — erase cell
      const grid = C.input.getGridFromMouse(event);
      if (grid && C.cellExists(grid.gx, grid.gz)) {
        C.removeCell(grid.gx, grid.gz);
        C.ui.updateStatusBar();
      }
    }
  },

  onMove: function(event) {
    if (s.mode === '2d') {
      C.updateHighlight(event);
    }
    if (s.mouseDown && s.mouseButton === 0 && (event.buttons & 1)) {
      if (s.mode === '2d') {
        const grid = C.input.getGridFromMouse(event);
        if (grid) {
          const existing = C.getCell(grid.gx, grid.gz);
          if (!existing || existing.color !== s.activeColor) {
            C.setCell(grid.gx, grid.gz, s.activeColor);
            C.ui.updateStatusBar();
          }
        }
      } else {
        const world = C.input.getWorldFromMouse(event);
        if (world) {
          const gx = Math.floor(world.x);
          const gz = Math.floor(world.z);
          const existing = C.getCell(gx, gz);
          if (!existing || existing.color !== s.activeColor) {
            C.setCell(gx, gz, s.activeColor);
            C.ui.updateStatusBar();
          }
        }
      }
    }
    if (s.mouseDown && s.mouseButton === 2 && (event.buttons & 2)) {
      const grid = C.input.getGridFromMouse(event);
      if (grid && C.cellExists(grid.gx, grid.gz)) {
        C.removeCell(grid.gx, grid.gz);
        C.ui.updateStatusBar();
      }
    }
  },

  onUp: function(event) {
    // no commit needed — tile is atomic per-cell
  }
};

})();

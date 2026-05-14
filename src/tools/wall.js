// ===== CHIRAL HAMMER v0.10.0 — TOOL: WALL =====
// Click edge to toggle. Drag to pen a line along the locked grid direction.
(function() {
const C = window.Chiral;
const s = C.state;

C.tools = C.tools || {};

C.tools.wall = {
  onDown: function(event) {
    if (event.button === 0) {
      s._dragStart = C.input.getWorldFromMouse(event);
      s._dragWallKeys = new Set();
      const edge = C.getNearestEdge(event);
      if (edge) {
        s._dragEdgeDir = edge.dir;
        s._dragEdgeGX = edge.gx;
        s._dragEdgeGZ = edge.gz;
      }
    } else if (event.button === 2) {
      // RMB — delete wall on nearest edge
      s._dragStart = C.input.getWorldFromMouse(event);
      const edge = C.getNearestEdge(event);
      if (edge) {
        s._dragEdgeDir = edge.dir;
        s._dragEdgeGX = edge.gx;
        s._dragEdgeGZ = edge.gz;
        const key = C.canonicalWallKey(edge.gx, edge.gz, edge.dir);
        if (s.walls.has(key)) {
          C.removeWall(edge.gx, edge.gz, edge.dir);
          C.ui.updateStatusBar();
        }
      }
    }
  },

  onMove: function(event) {
    if (s.mode === '2d') C.updateHighlight(event);
    else C.updateEdgeHighlight(event);

    // LMB drag — real-time wall placement along locked direction
    if (s.mouseDown && s.mouseButton === 0 && (event.buttons & 1) && s._dragStart && s._dragEdgeDir) {
      const world = C.input.getWorldFromMouse(event);
      if (world) {
        // Clear previous drag walls
        for (const key of s._dragWallKeys) {
          C.scene.removeWallMeshByKey(key);
          s.walls.delete(key);
        }
        s._dragWallKeys.clear();
        const walls = C.computePenWalls(s._dragEdgeGX, s._dragEdgeGZ, s._dragEdgeDir, world);
        for (const w of walls) {
          C.setWallSilent(w.gx, w.gz, w.dir, s.wallColor, s.wallHeight);
          s._dragWallKeys.add(C.canonicalWallKey(w.gx, w.gz, w.dir));
        }
        C.ui.updateStatusBar();
      }
    }

    // RMB drag — real-time wall deletion
    if (s.mouseDown && s.mouseButton === 2 && (event.buttons & 2) && s._dragStart && s._dragEdgeDir) {
      const world = C.input.getWorldFromMouse(event);
      if (world) {
        const walls = C.computePenWalls(s._dragEdgeGX, s._dragEdgeGZ, s._dragEdgeDir, world);
        for (const w of walls) {
          const key = C.canonicalWallKey(w.gx, w.gz, w.dir);
          if (s.walls.has(key)) C.removeWall(w.gx, w.gz, w.dir);
        }
        C.ui.updateStatusBar();
      }
    }
  },

  onUp: function(event) {
    // Small click (no significant drag) = toggle single edge
    if (s._dragStart && s.mouseButton === 0) {
      const world = C.input.getWorldFromMouse(event);
      if (world) {
        const dx = world.x - s._dragStart.x;
        const dz = world.z - s._dragStart.z;
        if (Math.abs(dx) < 0.3 && Math.abs(dz) < 0.3) {
          const edge = C.getNearestEdge(event);
          if (edge) {
            C.setWall(edge.gx, edge.gz, edge.dir, s.wallColor, s.wallHeight);
            C.ui.updateStatusBar();
          }
        }
      }
    }
    s._dragWallKeys = null;
    s._dragEdgeDir = null;
    s._dragEdgeGX = null;
    s._dragEdgeGZ = null;
  }
};

// ===== PEN WALL COMPUTATION =====

C.computePenWalls = function(startGX, startGZ, dir, worldEnd) {
  const walls = [];
  if (dir === 'N') {
    const gxEnd = Math.floor(worldEnd.x);
    const gxMin = Math.min(startGX, gxEnd);
    const gxMax = Math.max(startGX, gxEnd);
    for (let gx = gxMin; gx < gxMax; gx++) {
      walls.push({ gx, gz: startGZ, dir: 'N' });
    }
  } else {
    const gzEnd = Math.floor(worldEnd.z);
    const gzMin = Math.min(startGZ, gzEnd);
    const gzMax = Math.max(startGZ, gzEnd);
    for (let gz = gzMin; gz < gzMax; gz++) {
      walls.push({ gx: startGX, gz, dir: 'E' });
    }
  }
  return walls;
};

// ===== ORTHOGONAL WALL PATH =====

C.computeOrthogonalWalls = function(worldA, worldB) {
  const walls = [];
  const gx1 = Math.floor(worldA.x);
  const gz1 = Math.floor(worldA.z);
  const gx2 = Math.floor(worldB.x);
  const gz2 = Math.floor(worldB.z);

  if (gx2 !== gx1) {
    const gxMin = Math.min(gx1, gx2);
    const gxMax = Math.max(gx1, gx2);
    for (let gx = gxMin; gx < gxMax; gx++) {
      walls.push({ gx, gz: gz1, dir: 'N' });
    }
  }
  if (gz2 !== gz1) {
    const gzMin = Math.min(gz1, gz2);
    const gzMax = Math.max(gz1, gz2);
    for (let gz = gzMin; gz < gzMax; gz++) {
      walls.push({ gx: gx2 - 1, gz, dir: 'E' });
    }
  }
  return walls;
};

})();

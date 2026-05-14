// ===== CHIRAL HAMMER v0.10.0 — TOOL: SELECT =====
// Rubber-band drag, Shift+click toggle, click-to-empty deselect, Delete.
(function() {
const C = window.Chiral;
const s = C.state;

C.tools = C.tools || {};

C.tools.select = {
  onDown: function(event) {
    if (event.button === 0) {
      if (s.mode === '2d') {
        const world = C.input.getWorldFromMouse(event);
        if (world) {
          s.selecting = true;
          s.selectStart.x = world.x;
          s.selectStart.y = world.z;
          s.selectEnd.x = world.x;
          s.selectEnd.y = world.z;
          C.updateSelRect();
          C.selRect.visible = true;
          C.selOutline.visible = true;
        }
      } else {
        s.selecting = true;
        s.selectScreenStart.x = event.clientX;
        s.selectScreenStart.y = event.clientY;
        s.selectScreenEnd.x = event.clientX;
        s.selectScreenEnd.y = event.clientY;
        const sb = document.getElementById('sel-box');
        if (sb) {
          sb.style.display = 'block';
          sb.style.left = event.clientX + 'px';
          sb.style.top = event.clientY + 'px';
          sb.style.width = '0px';
          sb.style.height = '0px';
        }
      }
    } else if (event.button === 2) {
      // RMB — delete under cursor (2D or 3D)
      if (s.mode === '2d') {
        s._dragStart = C.input.getWorldFromMouse(event);
        const grid = C.input.getGridFromMouse(event);
        if (grid && C.cellExists(grid.gx, grid.gz)) {
          C.removeCell(grid.gx, grid.gz);
          C.ui.updateStatusBar();
        } else {
          const edge = C.getNearestEdge(event);
          if (edge) {
            const key = C.canonicalWallKey(edge.gx, edge.gz, edge.dir);
            if (s.walls.has(key)) {
              C.removeWall(edge.gx, edge.gz, edge.dir);
              C.ui.updateStatusBar();
            }
          }
        }
      } else {
        C.deleteAtMouse3D(event);
      }
    }
  },

  onMove: function(event) {
    if (s.mode === '2d') {
      C.updateHighlight(event);
      if (s.selecting) {
        const world = C.input.getWorldFromMouse(event);
        if (world) {
          s.selectEnd.x = world.x;
          s.selectEnd.y = world.z;
          C.updateSelRect();
        }
        return;
      }
    } else {
      C.edgeHighlight.visible = false;
      if (s.selecting) {
        s.selectScreenEnd.x = event.clientX;
        s.selectScreenEnd.y = event.clientY;
        const x1 = Math.min(s.selectScreenStart.x, s.selectScreenEnd.x);
        const y1 = Math.min(s.selectScreenStart.y, s.selectScreenEnd.y);
        const x2 = Math.max(s.selectScreenStart.x, s.selectScreenEnd.x);
        const y2 = Math.max(s.selectScreenStart.y, s.selectScreenEnd.y);
        const sb = document.getElementById('sel-box');
        if (sb) {
          sb.style.left = x1 + 'px';
          sb.style.top = y1 + 'px';
          sb.style.width = (x2 - x1) + 'px';
          sb.style.height = (y2 - y1) + 'px';
        }
      }
    }

    // RMB drag erase (2D only)
    if (s.mode === '2d' && s.mouseDown && s.mouseButton === 2 && (event.buttons & 2) && s._dragStart) {
      const world = C.input.getWorldFromMouse(event);
      if (world) C.eraseRect(s._dragStart, world);
    }
  },

  onUp: function(event) {
    if (s.selecting) {
      if (s.mode === '3d') {
        const dx = Math.abs(s.selectScreenEnd.x - s.selectScreenStart.x);
        const dy = Math.abs(s.selectScreenEnd.y - s.selectScreenStart.y);
        if (dx < 3 && dy < 3) {
          C.toggleSelectAtMouse3D(event);
        } else {
          C.commitSelection3D();
        }
        const sb = document.getElementById('sel-box');
        if (sb) sb.style.display = 'none';
      } else {
        const dx = Math.abs(s.selectEnd.x - s.selectStart.x);
        const dy = Math.abs(s.selectEnd.y - s.selectStart.y);
        if (dx < 0.2 && dy < 0.2) {
          C.toggleSelectAtMouse2D(event);
        } else {
          C.commitSelection();
        }
        C.selRect.visible = false;
        C.selOutline.visible = false;
      }
      s.selecting = false;
    }
  }
};

// ===== SELECTION COMMIT =====

C.commitSelection = function() {
  const x1 = Math.min(s.selectStart.x, s.selectEnd.x);
  const x2 = Math.max(s.selectStart.x, s.selectEnd.x);
  const z1 = Math.min(s.selectStart.y, s.selectEnd.y);
  const z2 = Math.max(s.selectStart.y, s.selectEnd.y);

  for (const key of s.selectedCells) C.updateCellSelectionVisual(key, false);
  s.selectedCells.clear();

  const gx1 = Math.floor(x1);
  const gx2 = Math.floor(x2 - 0.001);
  const gz1 = Math.floor(z1);
  const gz2 = Math.floor(z2 - 0.001);
  for (let gx = gx1; gx <= gx2; gx++) {
    for (let gz = gz1; gz <= gz2; gz++) {
      const key = C.gridKey(gx, gz);
      if (s.grid.has(key)) {
        s.selectedCells.add(key);
        C.updateCellSelectionVisual(key, true);
      }
    }
  }

  for (const [key, wall] of s.walls) {
    const { gx, gz, dir } = C.parseWallKey(key);
    const mx = dir === 'N' ? gx + 0.5 : gx + 1;
    const mz = dir === 'N' ? gz : gz + 0.5;
    if (mx >= x1 && mx <= x2 && mz >= z1 && mz <= z2) {
      s.selectedWalls.add(key);
      C.updateWallSelectionVisual(key, true);
    }
  }
};

C.commitSelection3D = function() {
  const x1 = Math.min(s.selectScreenStart.x, s.selectScreenEnd.x);
  const y1 = Math.min(s.selectScreenStart.y, s.selectScreenEnd.y);
  const x2 = Math.max(s.selectScreenStart.x, s.selectScreenEnd.x);
  const y2 = Math.max(s.selectScreenStart.y, s.selectScreenEnd.y);
  if (x2 - x1 < 3 && y2 - y1 < 3) return;

  for (const key of s.selectedCells) C.updateCellSelectionVisual(key, false);
  s.selectedCells.clear();

  for (const [key, mesh] of C.cellMeshes) {
    const wp = mesh.position.clone().project(C.camera3D);
    if (wp.z > 1) continue;
    const sx = (wp.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-wp.y * 0.5 + 0.5) * window.innerHeight;
    if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
      s.selectedCells.add(key);
      C.updateCellSelectionVisual(key, true);
    }
  }

  for (const [key, mesh] of C.wallMeshes) {
    const wp = mesh.position.clone().project(C.camera3D);
    if (wp.z > 1) continue;
    const sx = (wp.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-wp.y * 0.5 + 0.5) * window.innerHeight;
    if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
      s.selectedWalls.add(key);
      C.updateWallSelectionVisual(key, true);
    }
  }
};

C.clearSelection = function() {
  for (const key of s.selectedCells) C.updateCellSelectionVisual(key, false);
  s.selectedCells.clear();
  for (const key of s.selectedWalls) C.updateWallSelectionVisual(key, false);
  s.selectedWalls.clear();
};

C.toggleSelectAtMouse2D = function(event) {
  const grid = C.input.getGridFromMouse(event);
  if (grid && C.cellExists(grid.gx, grid.gz)) {
    const key = C.gridKey(grid.gx, grid.gz);
    if (s.selectedCells.has(key)) {
      s.selectedCells.delete(key);
      C.updateCellSelectionVisual(key, false);
    } else {
      s.selectedCells.add(key);
      C.updateCellSelectionVisual(key, true);
    }
    return;
  }
  const edge = C.getNearestEdge(event);
  if (edge) {
    const key = C.canonicalWallKey(edge.gx, edge.gz, edge.dir);
    if (s.walls.has(key)) {
      if (s.selectedWalls.has(key)) {
        s.selectedWalls.delete(key);
        C.updateWallSelectionVisual(key, false);
      } else {
        s.selectedWalls.add(key);
        C.updateWallSelectionVisual(key, true);
      }
      return;
    }
  }
  C.clearSelection();
};

C.toggleSelectAtMouse3D = function(event) {
  C._ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  C._ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  C._raycaster.setFromCamera(C._ndc, C.camera3D);

  const cellHits = C._raycaster.intersectObjects(Array.from(C.cellMeshes.values()));
  if (cellHits.length > 0) {
    const key = cellHits[0].object.name.replace('cell-', '');
    if (s.grid.has(key)) {
      if (s.selectedCells.has(key)) {
        s.selectedCells.delete(key);
        C.updateCellSelectionVisual(key, false);
      } else {
        s.selectedCells.add(key);
        C.updateCellSelectionVisual(key, true);
      }
      return;
    }
  }

  const wallHits = C._raycaster.intersectObjects(Array.from(C.wallMeshes.values()));
  if (wallHits.length > 0) {
    const key = wallHits[0].object.name.replace('wall-', '');
    if (s.walls.has(key)) {
      if (s.selectedWalls.has(key)) {
        s.selectedWalls.delete(key);
        C.updateWallSelectionVisual(key, false);
      } else {
        s.selectedWalls.add(key);
        C.updateWallSelectionVisual(key, true);
      }
      return;
    }
  }

  C.clearSelection();
};

C.deleteAtMouse3D = function(event) {
  C._ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  C._ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  C._raycaster.setFromCamera(C._ndc, C.camera3D);

  const cellHits = C._raycaster.intersectObjects(Array.from(C.cellMeshes.values()));
  if (cellHits.length > 0) {
    const key = cellHits[0].object.name.replace('cell-', '');
    const [gx, gz] = key.split(',').map(Number);
    C.removeCell(gx, gz);
    C.ui.updateStatusBar();
    return true;
  }

  const wallHits = C._raycaster.intersectObjects(Array.from(C.wallMeshes.values()));
  if (wallHits.length > 0) {
    const key = wallHits[0].object.name.replace('wall-', '');
    if (s.walls.has(key)) {
      const [gx, gz, dir] = key.split(',');
      C.removeWall(parseInt(gx), parseInt(gz), dir);
      C.ui.updateStatusBar();
      return true;
    }
  }
  return false;
};

C.deleteSelectedCells = function() {
  for (const key of s.selectedCells) {
    const [gx, gz] = key.split(',').map(Number);
    C.removeCell(gx, gz);
  }
  s.selectedCells.clear();
  for (const key of s.selectedWalls) {
    C.scene.removeWallMeshByKey(key);
    s.walls.delete(key);
  }
  s.selectedWalls.clear();
  C.ui.updateStatusBar();
};

})();

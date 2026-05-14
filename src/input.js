// ===== CHIRAL HAMMER v0.10.0 — INPUT NORMALIZATION =====
(function() {
const C = window.Chiral;
const s = C.state;

// ===== WORLD / GRID FROM MOUSE =====

C.input = {};

C.input.getWorldFromMouse = function(event) {
  C._ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  C._ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  C._raycaster.setFromCamera(C._ndc, C.activeCamera);
  const target = new THREE.Vector3();
  const denom = C._raycaster.ray.direction.y;
  if (Math.abs(denom) < 0.0001) return null;
  const t = -C._raycaster.ray.origin.y / denom;
  if (t < 0) return null;
  target.copy(C._raycaster.ray.origin).addScaledVector(C._raycaster.ray.direction, t);
  return target;
};

C.input.getGridFromMouse = function(event) {
  C._ndc.x = (event.clientX / window.innerWidth) * 2 - 1;
  C._ndc.y = -(event.clientY / window.innerHeight) * 2 + 1;
  C._raycaster.setFromCamera(C._ndc, C.activeCamera);

  const target = new THREE.Vector3();
  const rayOrigin = C._raycaster.ray.origin;
  const rayDir = C._raycaster.ray.direction;
  const denom = rayDir.y;
  if (Math.abs(denom) < 0.0001) return null;
  const t = -rayOrigin.y / denom;
  if (t < 0) return null;
  target.copy(rayOrigin).addScaledVector(rayDir, t);

  const gx = Math.floor(target.x);
  const gz = Math.floor(target.z);
  return { gx, gz, worldX: target.x, worldZ: target.z };
};

// ===== NEAREST EDGE (wall tool) =====

C.getNearestEdge = function(event) {
  const grid = C.input.getGridFromMouse(event);
  if (!grid) return null;
  const { gx, gz, worldX, worldZ } = grid;
  const fx = worldX - gx;
  const fz = worldZ - gz;
  const distN = fz;
  const distS = 1 - fz;
  const distW = fx;
  const distE = 1 - fx;
  const threshold = 0.15;
  const minDist = Math.min(distN, distS, distW, distE);
  if (minDist > threshold) return null;
  let cgx, cgz, cdir;
  if (minDist === distN)      { cgx = gx;     cgz = gz;     cdir = 'N'; }
  else if (minDist === distS) { cgx = gx;     cgz = gz + 1; cdir = 'N'; }
  else if (minDist === distW) { cgx = gx - 1; cgz = gz;     cdir = 'E'; }
  else                        { cgx = gx;     cgz = gz;     cdir = 'E'; }
  return { gx: cgx, gz: cgz, dir: cdir, key: C.wallKey(cgx, cgz, cdir) };
};

// ===== EFFECTIVE TOOL =====

C.effectiveTool = function() {
  if (s.keys['ShiftLeft'] || s.keys['ShiftRight']) return 'select';
  return s.activeTool;
};

// ===== KEY HANDLERS =====

C.input.onKeyDown = function(event) {
  s.keys[event.code] = true;

  if (event.code === 'Tab') {
    event.preventDefault();
    C.setMode(s.mode === '2d' ? '3d' : '2d');
    return;
  }
  if (event.code === 'KeyT') { C.ui.toggleTexturePanel(); return; }
  if (event.code === 'KeyG') { C.toggleWireframe(); return; }
  if (event.code === 'KeyH') { C.ui.toggleFog(); return; }
  if (event.code === 'KeyV') { C.ui.toggleControlPanel(); return; }

  if (event.code === 'Backspace' || event.code === 'Delete') {
    event.preventDefault();
    C.deleteSelectedCells();
    return;
  }
  if (event.code === 'KeyB') { C.ui.toggleTreasureBox(); return; }

  if (event.code === 'Escape') {
    if (s.tpOpen) { C.ui.toggleTexturePanel(); return; }
    if (s.tbOpen) { C.ui.toggleTreasureBox(); return; }
    if (s.cpOpen) { C.ui.toggleControlPanel(); return; }
  }

  // Undo/Redo
  if (event.code === 'KeyZ' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (event.shiftKey) C.redo();
    else C.undo();
    return;
  }

  // Tool shortcuts
  if (event.code === 'Digit1') { C.setActiveTool('tile'); return; }
  if (event.code === 'Digit2') { C.setActiveTool('fill'); return; }
  if (event.code === 'Digit3') { C.setActiveTool('wall'); return; }
  if (event.code === 'Digit4') { C.setActiveTool('select'); return; }
  if (event.code === 'Digit5') { C.setActiveTool('house'); return; }

  // Shift for temp-select
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    C.ui.updateHelp();
    C.ui.updateStatusBar();
  }
};

C.input.onKeyUp = function(event) {
  s.keys[event.code] = false;
  if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
    C.ui.updateHelp();
    C.ui.updateStatusBar();
  }
};

// ===== TOOL ACTIVE SETTER =====

C.setActiveTool = function(tool) {
  s.activeTool = tool;
  const buttons = document.querySelectorAll('#tool-palette .tpl-btn');
  buttons.forEach(function(btn) {
    if (btn.classList) {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    }
  });
  C.ui.updateHelp();
  C.ui.updateStatusBar();
};

})();

// ===== CHIRAL HAMMER v0.10.0 — MAIN =====
// Init order, event binding, animate loop, console API.
(function() {
const C = window.Chiral;
const s = C.state;

// ===== EVENT HANDLERS =====

function onMouseDown(event) {
  if (event.target !== C.renderer.domElement) return;

  s.mouseDown = true;
  s.mouseButton = event.button;

  if (s.mode === '2d') {
    if (event.button === 0 && s.keys['Space']) {
      // Space+LMB pan — handled in onMouseMove
      return;
    }
    if (event.button === 1) {
      s.middleDown = true;
      event.preventDefault();
      return;
    }
  }

  if (s.mode === '3d') {
    if (event.button === 1) {
      s.rightDown = true;
      s.mouse.x = 0;
      s.mouse.y = 0;
      return;
    }
  }

  var tool = C.effectiveTool();
  var toolObj = C.tools[tool];
  if (toolObj && toolObj.onDown) {
    toolObj.onDown(event);
  }
}

function onMouseMove(event) {
  s.mouse.x = event.movementX || 0;
  s.mouse.y = event.movementY || 0;

  if (s.mode === '2d') {
    // Pan via middle mouse or space+LMB
    if (s.middleDown || (s.keys['Space'] && s.mouseDown)) {
      C.pan2D(event.movementX, event.movementY);
      return;
    }
  }

  var tool = C.effectiveTool();
  var toolObj = C.tools[tool];
  if (toolObj && toolObj.onMove) {
    toolObj.onMove(event);
  }
}

function onMouseUp(event) {
  var tool = C.effectiveTool();
  var toolObj = C.tools[tool];
  if (toolObj && toolObj.onUp) {
    toolObj.onUp(event);
  }

  s._dragStart = null;
  s.mouseDown = false;
  s.mouseButton = -1;
  s.middleDown = false;
  s.rightDown = false;

  if (s.dirty) {
    C.persistence.scheduleSave();
  }
}

function onWheel(event) {
  if (s.mode === '2d') {
    C.zoom2D(event.deltaY, event.clientX, event.clientY);
  } else if (s.mode === '3d') {
    C.zoom3D(event.deltaY, event.clientX, event.clientY);
  }
}

function onContextMenu(event) {
  event.preventDefault();
}

function onResize() {
  C.renderer.setSize(window.innerWidth, window.innerHeight);
  if (s.mode === '2d') {
    C.update2DCameraAspect();
  } else {
    C.camera3D.aspect = window.innerWidth / window.innerHeight;
    C.camera3D.updateProjectionMatrix();
  }
}

// ===== MAIN LOOP =====

function animate() {
  requestAnimationFrame(animate);

  var delta = C.clock.getDelta();
  var dt = Math.min(delta, 0.1);

  C.update3DCamera(dt);
  C.render();

  if (s.mode === '3d') {
    var sb = document.getElementById('sb-cursor');
    if (sb) sb.textContent =
      s.camPos.x.toFixed(1) + ', ' + s.camPos.y.toFixed(1) + ', ' + s.camPos.z.toFixed(1);
  }
}

// ===== INIT =====

function init() {
  // Load settings before building scene
  C.ui.loadSettings();
  C.applyAllSettings();

  // Set up renderer in DOM
  var container = document.getElementById('canvas-container');
  if (container) container.appendChild(C.renderer.domElement);

  // Event listeners
  C.renderer.domElement.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', C.input.onKeyDown);
  window.addEventListener('keyup', C.input.onKeyUp);
  window.addEventListener('resize', onResize);

  // Export/Import/Clear buttons
  var btnExport = document.getElementById('btn-export');
  if (btnExport) btnExport.addEventListener('click', C.persistence.exportJSON);
  var btnImport = document.getElementById('btn-import-file');
  var importInput = document.getElementById('import-input');
  if (btnImport && importInput) btnImport.addEventListener('click', function() { importInput.click(); });
  var btnClear = document.getElementById('btn-clear');
  if (btnClear) btnClear.addEventListener('click', function() {
    if (s.grid.size === 0 || confirm('Clear all cells?')) {
      C.clearAllCells();
      C.ui.updateStatusBar();
    }
  });

  // Texture panel max/min
  var btnTpMax = document.getElementById('btn-tp-max');
  var tp = document.getElementById('texture-panel');
  if (btnTpMax) btnTpMax.addEventListener('click', function() {
    s.tpMaximized = !s.tpMaximized;
    if (tp) { if (s.tpMaximized) tp.classList.add('maximized'); else tp.classList.remove('maximized'); }
  });
  var btnTpMin = document.getElementById('btn-tp-min');
  if (btnTpMin) btnTpMin.addEventListener('click', function() {
    s.tpOpen = false;
    if (tp) { tp.classList.remove('open', 'maximized'); }
    s.tpMaximized = false;
  });

  // Treasure box max/min
  var btnTbMax = document.getElementById('btn-tb-max');
  var tb = document.getElementById('treasure-box');
  if (btnTbMax) btnTbMax.addEventListener('click', function() {
    s.tbMaximized = !s.tbMaximized;
    if (tb) { if (s.tbMaximized) tb.classList.add('maximized'); else tb.classList.remove('maximized'); }
  });
  var btnTbMin = document.getElementById('btn-tb-min');
  if (btnTbMin) btnTbMin.addEventListener('click', function() {
    s.tbOpen = false;
    if (tb) { tb.classList.remove('open', 'maximized'); }
    s.tbMaximized = false;
  });

  // File import
  if (importInput) importInput.addEventListener('change', function(e) {
    if (e.target.files[0]) {
      C.persistence.importJSON(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Tool palette buttons
  var toolBtns = document.querySelectorAll('#tool-palette .tpl-btn');
  toolBtns.forEach(function(btn) {
    btn.addEventListener('click', function() { C.setActiveTool(btn.dataset.tool); });
  });

  // Help minimize
  var btnHelpMin = document.getElementById('btn-help-min');
  if (btnHelpMin) btnHelpMin.addEventListener('click', C.ui.toggleHelp);

  // Build UI
  C.ui.buildPalette();
  C.ui.buildControlPanel();
  C.ui.updateHelp();
  C.ui.updateStatusBar();

  // Load saved map
  C.persistence.loadState();
  C.ui.updateStatusBar();

  // Focus renderer for keyboard input
  C.renderer.domElement.focus();

  // Start loop
  animate();
}

// ===== CONSOLE API =====

window.CHIRAL_HAMMER = {
  get state() { return s; },
  get scene() { return C.scene3D; },
  get renderer() { return C.renderer; },
  get cellMeshes() { return C.cellMeshes; },
  get cellGroup() { return C.cellGroup; },
  get wallMeshes() { return C.wallMeshes; },
  get wallGroup() { return C.wallGroup; },
  get wall2DMeshes() { return C.wall2DMeshes; },
  get wall2DGroup() { return C.wall2DGroup; },
  get camera() { return C.activeCamera; },
  setCell: C.setCell,
  removeCell: C.removeCell,
  clearAllCells: C.clearAllCells,
  clearSelection: C.clearSelection,
  commitSelection3D: C.commitSelection3D,
  toggleTexturePanel: C.ui.toggleTexturePanel,
  toggleTreasureBox: C.ui.toggleTreasureBox,
  toggleWireframe: C.toggleWireframe,
  toggleFog: C.ui.toggleFog,
  deleteSelectedCells: C.deleteSelectedCells,
  setWall: C.setWall,
  removeWall: C.removeWall,
  toggleWall: C.toggleWall,
  wallRect: C.wallRect,
  computeOrthogonalWalls: C.computeOrthogonalWalls,
  computePenWalls: C.computePenWalls,
  toggleSelectAtMouse2D: C.toggleSelectAtMouse2D,
  toggleSelectAtMouse3D: C.toggleSelectAtMouse3D,
  deleteAtMouse3D: C.deleteAtMouse3D,
  saveState: C.persistence.saveState,
  loadState: C.persistence.loadState,
  exportJSON: C.persistence.exportJSON,
  importJSON: C.persistence.importJSON,
  setMode: C.setMode,
  setActiveTool: C.setActiveTool,
  effectiveTool: C.effectiveTool,
  undo: C.undo,
  redo: C.redo,
};

// Go
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();

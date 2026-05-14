// ===== CHIRAL HAMMER v0.10.0 — UI =====
// Palette, toolbar, statusbar, help, panels, control panel.
(function() {
const C = window.Chiral;
const s = C.state;

C.ui = {};

// ===== PALETTE =====

C.ui.buildPalette = function() {
  const el = document.getElementById('palette');
  if (!el) return;
  el.innerHTML = '';
  s.palette.forEach(function(color) {
    const swatch = document.createElement('div');
    swatch.className = 'swatch' + (color === s.activeColor ? ' active' : '');
    swatch.style.background = color;
    swatch.title = color;
    swatch.addEventListener('click', function() {
      s.activeColor = color;
      C.ui.buildPalette();
    });
    el.appendChild(swatch);
  });
};

// ===== STATUS BAR =====

C.ui.setSaveStatus = function(text, color) {
  const sb = document.getElementById('sb-save');
  if (sb) { sb.textContent = text; sb.style.color = color; }
};

C.ui.updateStatusBar = function() {
  const tool = C.effectiveTool();
  const prefix = s.mode === '2d' ? '2D' : '3D';
  const shiftActive = s.keys['ShiftLeft'] || s.keys['ShiftRight'];
  const sbMode = document.getElementById('sb-mode');
  if (sbMode) {
    sbMode.textContent = shiftActive ? prefix + ' SELECT' : prefix + ' ' + tool.toUpperCase();
  }
  const sbCells = document.getElementById('sb-cells');
  if (sbCells) {
    sbCells.textContent = s.grid.size + (s.walls.size ? ' +' + s.walls.size + 'w' : '');
  }
};

// ===== HELP OVERLAY =====

C.ui.updateHelp = function() {
  const tool = C.effectiveTool();
  const toolLabel = tool.toUpperCase();
  const shiftActive = s.keys['ShiftLeft'] || s.keys['ShiftRight'];

  const toolActions = {
    tile:   { lmb: 'tile cell', rmb: 'erase cell' },
    fill:   { lmb: 'drag fill rect', rmb: 'drag erase rect' },
    wall:   { lmb: 'click edge / drag pen line', rmb: 'delete wall' },
    select: { lmb: 'drag rubber-band select', rmb: 'delete cell / wall' },
    house:  { lmb: 'drag fill + walls', rmb: 'erase cell' },
  };
  const act = toolActions[tool];

  const helpMode = document.getElementById('help-mode');
  const helpKeys = document.getElementById('help-keys');

  if (s.mode === '2d') {
    if (helpMode) helpMode.textContent = shiftActive ? '2D — SELECT (Shift)' : '2D — ' + toolLabel;
    if (helpKeys) helpKeys.innerHTML =
      '<span class="key">LMB</span> <span class="dim">' + act.lmb + '</span><br>' +
      '<span class="key">RMB</span> <span class="dim">' + act.rmb + '</span><br>' +
      '<span class="key">Shift hold</span> <span class="dim">SELECT</span><br>' +
      '<span class="key">Space+LMB</span> <span class="dim">pan</span> / <span class="key">MMB</span> <span class="dim">pan</span><br>' +
      '<span class="key">Scroll</span> <span class="dim">zoom</span><br>' +
      '<span class="key">1</span><span class="dim">Tile</span> <span class="key">2</span><span class="dim">Fill</span> <span class="key">3</span><span class="dim">Wall</span> <span class="key">4</span><span class="dim">Select</span> <span class="key">5</span><span class="dim">House</span><br>' +
      '<span class="key">G</span> <span class="dim">wire</span> <span class="key">H</span> <span class="dim">fog</span> <span class="key">V</span> <span class="dim">tuning</span> <span class="key">Del</span> <span class="dim">delete</span><br>' +
      '<span class="key">Ctrl+Z</span> <span class="dim">undo</span> <span class="key">Tab</span> <span class="dim">3D</span> <span class="key">T</span> <span class="dim">textures</span> <span class="key">B</span> <span class="dim">treasure</span>';
  } else {
    if (helpMode) helpMode.textContent = shiftActive ? '3D — SELECT (Shift)' : '3D — ' + toolLabel;
    if (helpKeys) helpKeys.innerHTML =
      '<span class="key">WASD</span> <span class="dim">move</span> <span class="key">Q/E</span> <span class="dim">up/down</span><br>' +
      '<span class="key">Arrows</span> <span class="dim">look</span> <span class="key">MMB</span> <span class="dim">mouselook</span><br>' +
      '<span class="key">Scroll</span> <span class="dim">zoom to cursor</span> <span class="key">Shift</span> <span class="dim">boost</span><br>' +
      '<span class="key">LMB</span> <span class="dim">' + act.lmb + '</span><br>' +
      '<span class="key">RMB</span> <span class="dim">' + act.rmb + '</span><br>' +
      '<span class="key">Shift hold</span> <span class="dim">SELECT</span><br>' +
      '<span class="key">1</span><span class="dim">Tile</span> <span class="key">2</span><span class="dim">Fill</span> <span class="key">3</span><span class="dim">Wall</span> <span class="key">4</span><span class="dim">Select</span> <span class="key">5</span><span class="dim">House</span><br>' +
      '<span class="key">G</span> <span class="dim">wire</span> <span class="key">H</span> <span class="dim">fog</span> <span class="key">V</span> <span class="dim">tuning</span> <span class="key">Del</span> <span class="dim">delete</span><br>' +
      '<span class="key">Ctrl+Z</span> <span class="dim">undo</span> <span class="key">Tab</span> <span class="dim">2D</span> <span class="key">T</span> <span class="dim">textures</span> <span class="key">B</span> <span class="dim">treasure</span>';
  }
};

// ===== PANEL TOGGLES =====

C.ui.toggleTexturePanel = function() {
  s.tpOpen = !s.tpOpen;
  const tp = document.getElementById('texture-panel');
  if (tp) { if (s.tpOpen) tp.classList.add('open'); else tp.classList.remove('open'); }
};

C.ui.toggleTreasureBox = function() {
  s.tbOpen = !s.tbOpen;
  const tb = document.getElementById('treasure-box');
  if (tb) { if (s.tbOpen) tb.classList.add('open'); else tb.classList.remove('open'); }
};

C.ui.toggleFog = function() {
  s.settings.fogEnabled = !s.settings.fogEnabled;
  C.applyFog();
  C.ui.updateHelp();
};

C.ui.toggleHelp = function() {
  const overlay = document.getElementById('help-overlay');
  if (overlay) overlay.classList.toggle('collapsed');
};

C.ui.toggleControlPanel = function() {
  s.cpOpen = !s.cpOpen;
  const cp = document.getElementById('control-panel');
  if (cp) { if (s.cpOpen) cp.classList.add('open'); else cp.classList.remove('open'); }
};

// ===== CONTROL PANEL =====

C.ui.buildControlPanel = function() {
  const cp = document.getElementById('control-panel');
  if (!cp) return;

  var html = '';
  html += '<div class="cp-header"><span class="cp-title">CONTROL PANEL</span></div>';

  // Sections: Lighting, Fog, Camera, Grid, Display, Defaults
  var sections = [
    {
      title: 'Lighting',
      controls: [
        { key: 'ambientIntensity', label: 'Ambient', min: 0, max: 3, step: 0.1 },
        { key: 'dirIntensity', label: 'Direct', min: 0, max: 5, step: 0.1 },
        { key: 'dirAzimuth', label: 'Azimuth', min: 0, max: 360, step: 1 },
        { key: 'dirAltitude', label: 'Altitude', min: 0, max: 90, step: 1 },
        { key: 'dirColor', label: 'Color', color: true },
      ]
    },
    {
      title: 'Fog',
      controls: [
        { key: 'fogEnabled', label: 'On', checkbox: true },
        { key: 'fogNear', label: 'Near', min: 1, max: 100, step: 1 },
        { key: 'fogFar', label: 'Far', min: 10, max: 200, step: 5 },
        { key: 'fogColor', label: 'Color', color: true },
      ]
    },
    {
      title: 'Camera',
      controls: [
        { key: 'fov', label: 'FOV', min: 30, max: 120, step: 1 },
        { key: 'flySpeed', label: 'Speed', min: 1, max: 30, step: 1 },
        { key: 'lookSensitivity', label: 'Look sens', min: 0.05, max: 1.0, step: 0.05 },
        { key: 'zoomSpeed', label: 'Zoom spd', min: 0.01, max: 0.2, step: 0.01 },
      ]
    },
    {
      title: 'Grid',
      controls: [
        { key: 'gridColor', label: 'Color', color: true },
        { key: 'gridOpacity', label: 'Opacity', min: 0.1, max: 1.0, step: 0.05 },
      ]
    },
    {
      title: 'Display',
      controls: [
        { key: 'pixelRatioCap', label: 'PxRatio', min: 1, max: 3, step: 1 },
        { key: 'clearColor', label: 'BG Color', color: true },
      ]
    },
    {
      title: 'Defaults',
      controls: [
        { key: 'defaultWallHeight', label: 'Wall H', min: 0.5, max: 5, step: 0.25 },
        { key: 'defaultWallColor', label: 'W Color', color: true },
      ]
    },
  ];

  sections.forEach(function(sec) {
    html += '<div class="cp-section">';
    html += '<div class="cp-section-header">' + sec.title + '</div>';
    sec.controls.forEach(function(ctrl) {
      var val = s.settings[ctrl.key];
      if (ctrl.checkbox) {
        html += '<div class="cp-row">';
        html += '<label>' + ctrl.label + '</label>';
        html += '<input type="checkbox" data-key="' + ctrl.key + '"' + (val ? ' checked' : '') + '>';
        html += '</div>';
      } else if (ctrl.color) {
        html += '<div class="cp-row">';
        html += '<label>' + ctrl.label + '</label>';
        html += '<input type="color" data-key="' + ctrl.key + '" value="' + val + '">';
        html += '</div>';
      } else {
        html += '<div class="cp-row">';
        html += '<label>' + ctrl.label + '</label>';
        html += '<input type="range" data-key="' + ctrl.key + '" min="' + ctrl.min + '" max="' + ctrl.max + '" step="' + ctrl.step + '" value="' + val + '">';
        html += '<span class="cp-val">' + val + '</span>';
        html += '</div>';
      }
    });
    html += '</div>';
  });

  html += '<button class="cp-reset" id="cp-reset">Reset Defaults</button>';
  cp.innerHTML = html;

  // Wire events
  cp.querySelectorAll('input[type="range"]').forEach(function(input) {
    input.addEventListener('input', function() {
      var key = this.dataset.key;
      var val = parseFloat(this.value);
      s.settings[key] = val;
      var row = this.parentElement;
      var valSpan = row.querySelector('.cp-val');
      if (valSpan) valSpan.textContent = val;
      C.applyAllSettings();
      C.ui.saveSettings();
    });
  });

  cp.querySelectorAll('input[type="color"]').forEach(function(input) {
    input.addEventListener('input', function() {
      var key = this.dataset.key;
      s.settings[key] = this.value;
      C.applyAllSettings();
      C.ui.saveSettings();
    });
  });

  cp.querySelectorAll('input[type="checkbox"]').forEach(function(input) {
    input.addEventListener('change', function() {
      var key = this.dataset.key;
      s.settings[key] = this.checked;
      C.applyAllSettings();
      C.ui.saveSettings();
    });
  });

  var resetBtn = cp.querySelector('#cp-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      C.ui.resetSettings();
    });
  }
};

C.ui.saveSettings = function() {
  try {
    localStorage.setItem('chiral_hammer:settings', JSON.stringify(s.settings));
  } catch(e) {}
};

C.ui.loadSettings = function() {
  try {
    var raw = localStorage.getItem('chiral_hammer:settings');
    if (raw) {
      var loaded = JSON.parse(raw);
      for (var k in loaded) {
        if (s.settings.hasOwnProperty(k)) s.settings[k] = loaded[k];
      }
    }
  } catch(e) {}
};

C.ui.resetSettings = function() {
  var defaults = {
    ambientIntensity: 1.5, dirIntensity: 2.0, dirAzimuth: 45, dirAltitude: 60,
    dirColor: '#ffffff', fogEnabled: true, fogNear: 30, fogFar: 80,
    fogColor: '#4a6a7a', fov: 60, flySpeed: 5, lookSensitivity: 0.25,
    zoomSpeed: 0.05, gridSize: 200, gridOpacity: 1.0, gridColor: '#8a9aaa',
    pixelRatioCap: 2, clearColor: '#4a6a7a', defaultWallHeight: 1.0,
    defaultWallColor: '#8b7355',
  };
  for (var k in defaults) s.settings[k] = defaults[k];
  C.ui.buildControlPanel();
  C.applyAllSettings();
  C.ui.saveSettings();
};

})();

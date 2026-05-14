// ===== CHIRAL HAMMER v0.10.0 — PERSISTENCE =====
// localStorage auto-save, JSON export/import.
(function() {
const C = window.Chiral;
const s = C.state;

var STORAGE_KEY = 'chiral_hammer:v0.10';

C.persistence = {};

// ===== AUTO-SAVE =====

C.persistence.scheduleSave = function() {
  if (s.saveTimeout) clearTimeout(s.saveTimeout);
  s.saveTimeout = setTimeout(C.persistence.saveState, 500);
};

C.persistence.saveState = function() {
  var data = {
    version: '0.10.0',
    cells: [],
    walls: []
  };
  s.grid.forEach(function(val, key) {
    data.cells.push({ key: key, color: val.color });
  });
  s.walls.forEach(function(val, key) {
    data.walls.push({ key: key, color: val.color, height: val.height });
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    s.dirty = false;
    C.ui.setSaveStatus('SAVED', '#008000');
  } catch(e) {
    C.ui.setSaveStatus('SAVE ERR', '#ff0000');
    console.warn('Failed to save:', e);
  }
};

C.persistence.loadState = function() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    var data = JSON.parse(raw);
    if (data.cells && Array.isArray(data.cells)) {
      for (var i = 0; i < data.cells.length; i++) {
        var cell = data.cells[i];
        var parts = cell.key.split(',');
        var gx = Number(parts[0]);
        var gz = Number(parts[1]);
        C.setCellSilent(gx, gz, cell.color);
      }
      C.ui.setSaveStatus('LOADED', '#008000');
    }
    if (data.walls && Array.isArray(data.walls)) {
      for (var j = 0; j < data.walls.length; j++) {
        var wall = data.walls[j];
        var w = C.parseWallKey(wall.key);
        C.setWallSilent(w.gx, w.gz, w.dir, wall.color, wall.height || s.wallHeight);
      }
    }
  } catch(e) {
    console.warn('Failed to load:', e);
  }
};

// ===== EXPORT =====

C.persistence.exportJSON = function() {
  var data = {
    version: '0.10.0',
    cells: [],
    walls: []
  };
  s.grid.forEach(function(val, key) {
    data.cells.push({ key: key, color: val.color });
  });
  s.walls.forEach(function(val, key) {
    data.walls.push({ key: key, color: val.color, height: val.height });
  });
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'chiral_hammer-map.json';
  a.click();
  URL.revokeObjectURL(url);
};

C.persistence.importJSON = function(file) {
  var reader = new FileReader();
  reader.onload = function() {
    try {
      var data = JSON.parse(reader.result);
      if (!data.cells || !Array.isArray(data.cells)) {
        alert('Invalid map file: missing cells array.');
        return;
      }
      C.clearAllCells();
      for (var i = 0; i < data.cells.length; i++) {
        var cell = data.cells[i];
        var parts = cell.key.split(',');
        var gx = Number(parts[0]);
        var gz = Number(parts[1]);
        C.setCellSilent(gx, gz, cell.color);
      }
      if (data.walls && Array.isArray(data.walls)) {
        for (var j = 0; j < data.walls.length; j++) {
          var wall = data.walls[j];
          var w = C.parseWallKey(wall.key);
          C.setWallSilent(w.gx, w.gz, w.dir, wall.color, wall.height || s.wallHeight);
        }
      }
      s.dirty = false;
      C.persistence.saveState();
      C.ui.updateStatusBar();
    } catch(e) {
      alert('Failed to parse map file: ' + e.message);
    }
  };
  reader.readAsText(file);
};

})();

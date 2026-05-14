// ===== CHIRAL HAMMER v0.10.0 — SCENE SETUP & RENDERING =====
(function() {
const C = window.Chiral;
const s = C.state;

// ===== THREE.JS SETUP =====

C.scene3D = new THREE.Scene();
C.scene3D.fog = new THREE.Fog(0x4a6a7a, 30, 80);

C.renderer = new THREE.WebGLRenderer({ antialias: true });
C.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
C.renderer.setClearColor(0x4a6a7a);

// ===== CAMERAS =====

const frustumSize = 20;
const aspect = window.innerWidth / window.innerHeight;
C.camera2D = new THREE.OrthographicCamera(
  frustumSize * aspect / -2, frustumSize * aspect / 2,
  frustumSize / 2, frustumSize / -2,
  -50, 50
);
C.camera2D.position.set(0, 20, 0);
C.camera2D.lookAt(0, 0, 0);

C.camera3D = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
C.camera3D.position.set(s.camPos.x, s.camPos.y, s.camPos.z);
C.camera3D.lookAt(0, 0, 0);

C.activeCamera = C.camera2D;

// ===== LIGHTS =====

C.ambientLight = new THREE.AmbientLight(0x404040, s.settings.ambientIntensity);
C.scene3D.add(C.ambientLight);
C.dirLight = new THREE.DirectionalLight(0xffffff, s.settings.dirIntensity);
C.dirLight.position.set(10, 20, 5);
C.scene3D.add(C.dirLight);

// ===== GRID =====

C.gridHelper = new THREE.GridHelper(200, 200, 0x5a6a7a, 0x4a5a6a);
C.gridHelper.position.y = 0.001;
C.scene3D.add(C.gridHelper);

// ===== CELL GROUP =====

C.cellGroup = new THREE.Group();
C.cellGroup.name = 'cells';
C.scene3D.add(C.cellGroup);

// ===== WALL GROUP =====

C.wallGroup = new THREE.Group();
C.wallGroup.name = 'walls';
C.scene3D.add(C.wallGroup);

// ===== SHARED GEOMETRIES =====

C._wallGeo = new THREE.PlaneGeometry(1, 1);
C._cellGeo = new THREE.PlaneGeometry(1, 1);
C._cellGeo.rotateX(-Math.PI / 2);

// ===== WALL INDICATORS (2D) =====

C.wall2DGroup = new THREE.Group();
C.wall2DGroup.name = 'walls2d';
C.wall2DGroup.renderOrder = 997;
C.scene3D.add(C.wall2DGroup);
C._wall2DGeo = new THREE.PlaneGeometry(1, 0.08);

// ===== HIGHLIGHT QUAD =====

C._highlightGeo = new THREE.PlaneGeometry(1, 1);
C._highlightMat = new THREE.MeshBasicMaterial({
  color: 0xffff00, transparent: true, opacity: 0.5,
  side: THREE.DoubleSide, depthTest: false
});
C.highlightQuad = new THREE.Mesh(C._highlightGeo, C._highlightMat);
C.highlightQuad.rotation.x = -Math.PI / 2;
C.highlightQuad.position.y = 0.01;
C.highlightQuad.visible = true;
C.highlightQuad.renderOrder = 999;
C.scene3D.add(C.highlightQuad);

// ===== EDGE HIGHLIGHT (wall tool) =====

C._edgeHighlightGeo = new THREE.PlaneGeometry(1, 0.08);
C._edgeHighlightMat = new THREE.MeshBasicMaterial({
  color: 0xff8800, transparent: true, opacity: 0.55,
  side: THREE.DoubleSide, depthTest: false
});
C.edgeHighlight = new THREE.Mesh(C._edgeHighlightGeo, C._edgeHighlightMat);
C.edgeHighlight.position.y = 0.015;
C.edgeHighlight.visible = false;
C.edgeHighlight.renderOrder = 998;
C.scene3D.add(C.edgeHighlight);

// ===== RUBBER-BAND RECT (2D selection) =====

C._selRectGeo = new THREE.PlaneGeometry(1, 1);
C._selRectMat = new THREE.MeshBasicMaterial({
  color: 0x00ffff, transparent: true, opacity: 0.35,
  side: THREE.DoubleSide, depthTest: false
});
C.selRect = new THREE.Mesh(C._selRectGeo, C._selRectMat);
C.selRect.rotation.x = -Math.PI / 2;
C.selRect.position.y = 0.02;
C.selRect.visible = false;
C.selRect.renderOrder = 998;
C.scene3D.add(C.selRect);

C._selOutlineGeo = new THREE.EdgesGeometry(C._selRectGeo);
C._selOutlineMat = new THREE.LineBasicMaterial({ color: 0x008888, depthTest: false });
C.selOutline = new THREE.LineSegments(C._selOutlineGeo, C._selOutlineMat);
C.selOutline.rotation.x = -Math.PI / 2;
C.selOutline.position.y = 0.021;
C.selOutline.visible = false;
C.selOutline.renderOrder = 997;
C.scene3D.add(C.selOutline);

// ===== SCRATCH OBJECTS =====

C._raycaster = new THREE.Raycaster();
C._m4 = new THREE.Matrix4();
C._ndc = new THREE.Vector3();
C._hit = new THREE.Vector3();
C._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
C._intersection = new THREE.Vector3();
C._v3 = new THREE.Vector3();

// ===== MESH CACHES =====

C.cellMeshes = new Map();   // "x,z" -> THREE.Mesh
C.wallMeshes = new Map();   // key -> THREE.Mesh
C.wall2DMeshes = new Map(); // key -> indicator Mesh

// ===== CELL MESHES =====

C.addCellMesh = function(gx, gz, color) {
  const key = C.gridKey(gx, gz);
  if (C.cellMeshes.has(key)) {
    C.removeCellMesh(gx, gz);
  }
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide });
  if (s.wireframe) mat.wireframe = true;
  const mesh = new THREE.Mesh(C._cellGeo, mat);
  mesh.position.set(gx + 0.5, 0.002, gz + 0.5);
  mesh.name = 'cell-' + key;
  C.cellGroup.add(mesh);
  C.cellMeshes.set(key, mesh);
};

C.removeCellMesh = function(gx, gz) {
  const key = C.gridKey(gx, gz);
  const mesh = C.cellMeshes.get(key);
  if (mesh) {
    C.cellGroup.remove(mesh);
    mesh.material.dispose();
    C.cellMeshes.delete(key);
  }
};

C.updateCellColor = function(gx, gz, color) {
  const key = C.gridKey(gx, gz);
  const mesh = C.cellMeshes.get(key);
  if (mesh) mesh.material.color.set(color);
};

C.updateCellSelectionVisual = function(key, selected) {
  const mesh = C.cellMeshes.get(key);
  if (!mesh) return;
  if (selected) {
    mesh.material.emissive = new THREE.Color(0x444400);
    mesh.material.emissiveIntensity = 0.6;
  } else {
    mesh.material.emissive = new THREE.Color(0x000000);
    mesh.material.emissiveIntensity = 0;
  }
};

// ===== WALL MESHES =====

C.addWallMesh = function(gx, gz, dir, color, height) {
  const key = C.wallKey(gx, gz, dir);
  if (C.wallMeshes.has(key)) {
    C.wallGroup.remove(C.wallMeshes.get(key));
    C.wallMeshes.get(key).material.dispose();
  }
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide });
  if (s.wireframe) mat.wireframe = true;
  const mesh = new THREE.Mesh(C._wallGeo, mat);
  if (dir === 'N') {
    mesh.position.set(gx + 0.5, height / 2, gz);
    mesh.scale.set(1, height, 1);
  } else {
    mesh.position.set(gx + 1, height / 2, gz + 0.5);
    mesh.rotation.y = -Math.PI / 2;
    mesh.scale.set(1, height, 1);
  }
  mesh.name = 'wall-' + key;
  C.wallGroup.add(mesh);
  C.wallMeshes.set(key, mesh);

  // 2D indicator strip
  if (C.wall2DMeshes.has(key)) {
    C.wall2DGroup.remove(C.wall2DMeshes.get(key));
    C.wall2DMeshes.get(key).material.dispose();
  }
  const indMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide, depthTest: false });
  const indMesh = new THREE.Mesh(C._wall2DGeo, indMat);
  indMesh.rotation.x = -Math.PI / 2;
  indMesh.renderOrder = 997;
  if (dir === 'N') {
    indMesh.position.set(gx + 0.5, 0.015, gz);
  } else {
    indMesh.position.set(gx + 1, 0.015, gz + 0.5);
    indMesh.rotation.z = -Math.PI / 2;
  }
  indMesh.name = 'wall2d-' + key;
  C.wall2DGroup.add(indMesh);
  C.wall2DMeshes.set(key, indMesh);
};

C.removeWallMeshByKey = function(key) {
  const mesh = C.wallMeshes.get(key);
  if (mesh) {
    C.wallGroup.remove(mesh);
    mesh.material.dispose();
    C.wallMeshes.delete(key);
  }
  const indMesh = C.wall2DMeshes.get(key);
  if (indMesh) {
    C.wall2DGroup.remove(indMesh);
    indMesh.material.dispose();
    C.wall2DMeshes.delete(key);
  }
};

C.updateWallSelectionVisual = function(key, selected) {
  const mesh = C.wallMeshes.get(key);
  if (!mesh) return;
  if (selected) {
    mesh.material.emissive = new THREE.Color(0xaaaa00);
    mesh.material.emissiveIntensity = 1.0;
  } else {
    mesh.material.emissive = new THREE.Color(0x000000);
    mesh.material.emissiveIntensity = 0;
  }
};

// ===== HIGHLIGHT UPDATES =====

C.updateHighlight = function(event) {
  if (s.mode !== '2d') {
    C.highlightQuad.visible = false;
    C.edgeHighlight.visible = false;
    return;
  }
  const tool = C.effectiveTool();
  if (tool === 'wall') {
    C.highlightQuad.visible = false;
    C.updateEdgeHighlight(event);
    return;
  }
  C.edgeHighlight.visible = false;
  const grid = C.input.getGridFromMouse(event);
  if (!grid) {
    C.highlightQuad.visible = false;
    return;
  }
  C.highlightQuad.position.set(grid.gx + 0.5, 0.01, grid.gz + 0.5);
  C.highlightQuad.visible = true;
  const sb = document.getElementById('sb-cursor');
  if (sb) sb.textContent = `${grid.gx}, ${grid.gz}`;
  s.mouseWorld2D.x = grid.worldX;
  s.mouseWorld2D.y = 0;
  s.mouseWorld2D.z = grid.worldZ;
};

C.updateEdgeHighlight = function(event) {
  const edge = C.getNearestEdge(event);
  if (!edge) {
    C.edgeHighlight.visible = false;
    return;
  }
  const { gx, gz, dir } = edge;
  if (dir === 'N') {
    C.edgeHighlight.position.set(gx + 0.5, 0.015, gz);
    C.edgeHighlight.rotation.set(-Math.PI / 2, 0, 0);
  } else {
    C.edgeHighlight.position.set(gx + 1, 0.015, gz + 0.5);
    C.edgeHighlight.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  }
  C.edgeHighlight.visible = true;
};

// ===== RUBBER-BAND =====

C.updateSelRect = function() {
  const x1 = Math.min(s.selectStart.x, s.selectEnd.x);
  const x2 = Math.max(s.selectStart.x, s.selectEnd.x);
  const z1 = Math.min(s.selectStart.y, s.selectEnd.y);
  const z2 = Math.max(s.selectStart.y, s.selectEnd.y);
  const w = Math.max(x2 - x1, 0.1);
  const h = Math.max(z2 - z1, 0.1);
  C.selRect.scale.set(w, h, 1);
  C.selRect.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2);
  C.selOutline.scale.set(w, h, 1);
  C.selOutline.position.set((x1 + x2) / 2, 0.021, (z1 + z2) / 2);
};

C.showDragPreview = function(worldA, worldB) {
  C._selRectMat.color.set(0xff8800);
  C._selOutlineMat.color.set(0x885500);
  C.selRect.visible = true;
  C.selOutline.visible = true;
  s.selectStart.x = worldA.x;
  s.selectStart.y = worldA.z;
  s.selectEnd.x = worldB.x;
  s.selectEnd.y = worldB.z;
  C.updateSelRect();
};

C.hideDragPreview = function() {
  C.selRect.visible = false;
  C.selOutline.visible = false;
  C._selRectMat.color.set(0x00ffff);
  C._selOutlineMat.color.set(0x008888);
};

// ===== SCENE APPLY =====

C.applyLighting = function() {
  const st = s.settings;
  C.ambientLight.intensity = st.ambientIntensity;
  C.dirLight.intensity = st.dirIntensity;
  C.dirLight.color.set(st.dirColor);
  const az = THREE.MathUtils.degToRad(st.dirAzimuth);
  const alt = THREE.MathUtils.degToRad(st.dirAltitude);
  const dist = 22;
  C.dirLight.position.set(
    Math.sin(az) * Math.cos(alt) * dist,
    Math.sin(alt) * dist,
    Math.cos(az) * Math.cos(alt) * dist
  );
};

C.applyFog = function() {
  const st = s.settings;
  if (st.fogEnabled) {
    if (!C.scene3D.fog) {
      C.scene3D.fog = new THREE.Fog(st.fogColor, st.fogNear, st.fogFar);
    } else {
      C.scene3D.fog.color.set(st.fogColor);
      C.scene3D.fog.near = st.fogNear;
      C.scene3D.fog.far = st.fogFar;
    }
  } else {
    C.scene3D.fog = null;
  }
};

C.applyGrid = function() {
  const st = s.settings;
  C.gridHelper.material.color.set(st.gridColor);
  C.gridHelper.material.opacity = st.gridOpacity;
  C.gridHelper.material.transparent = true;
};

C.applyClearColor = function() {
  C.renderer.setClearColor(s.settings.clearColor);
};

C.applyAllSettings = function() {
  C.applyLighting();
  C.applyFog();
  C.applyGrid();
  C.applyClearColor();
  C.renderer.setPixelRatio(Math.min(window.devicePixelRatio, s.settings.pixelRatioCap));
  if (s.mode === '3d') {
    C.camera3D.fov = s.settings.fov;
    C.camera3D.updateProjectionMatrix();
  }
};

// ===== WIREFRAME TOGGLE =====

C.toggleWireframe = function() {
  s.wireframe = !s.wireframe;
  for (const [key, mesh] of C.cellMeshes) {
    mesh.material.wireframe = s.wireframe;
    if (s.wireframe) {
      mesh.material.color.set('#222222');
    } else {
      const cell = s.grid.get(key);
      if (cell) mesh.material.color.set(cell.color);
    }
  }
  for (const mesh of C.wallMeshes.values()) {
    mesh.material.wireframe = s.wireframe;
  }
};

// ===== RENDER =====

C.clock = new THREE.Clock();

C.render = function() {
  C.renderer.render(C.scene3D, C.activeCamera);
};

})();

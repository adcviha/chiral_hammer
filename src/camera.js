// ===== CHIRAL HAMMER v0.10.0 — CAMERA =====
(function() {
const C = window.Chiral;
const s = C.state;

// ===== 2D CAMERA =====

const FRUSTUM_SIZE = 20;

C.update2DCameraAspect = function() {
  const a = window.innerWidth / window.innerHeight;
  const fs = FRUSTUM_SIZE;
  C.camera2D.left = fs * a / -2;
  C.camera2D.right = fs * a / 2;
  C.camera2D.top = fs / 2;
  C.camera2D.bottom = fs / -2;
  C.camera2D.updateProjectionMatrix();
};

// ===== 2D PAN & ZOOM =====

C.pan2D = function(dx, dy) {
  if (s.mode !== '2d') return;
  const sc = FRUSTUM_SIZE / (C.camera2D.zoom * window.innerHeight);
  C.camera2D.position.x -= dx * sc;
  C.camera2D.position.z -= dy * sc;
};

C.zoom2D = function(delta, cursorX, cursorY) {
  if (s.mode !== '2d') return;
  const oldZoom = C.camera2D.zoom;
  const newZoom = Math.max(0.25, Math.min(8, oldZoom * (1 + delta * 0.001)));
  C.camera2D.zoom = newZoom;
  const ndcX = (cursorX / window.innerWidth) * 2 - 1;
  const ndcY = -(cursorY / window.innerHeight) * 2 + 1;
  const worldBefore = C._v3.set(ndcX / oldZoom, 0, ndcY / oldZoom)
    .add(C.camera2D.position);
  const worldAfter = C._v3.set(ndcX / newZoom, 0, ndcY / newZoom)
    .add(C.camera2D.position);
  C.camera2D.position.add(worldBefore.sub(worldAfter));
  C.camera2D.updateProjectionMatrix();
};

// ===== 3D CAMERA =====

C.update3DCamera = function(deltaSec) {
  if (s.mode !== '3d') return;

  const st = s.settings;
  const speed = s.keys['ShiftLeft'] || s.keys['ShiftRight'] ? st.flySpeed * 3 : st.flySpeed;
  const moveSpeed = speed * deltaSec;
  const lookSensitivity = st.lookSensitivity;

  // Accumulate mouse delta while RMB held
  if (s.rightDown) {
    s.targetYaw -= s.mouse.x * lookSensitivity * deltaSec;
    s.targetPitch -= s.mouse.y * lookSensitivity * deltaSec;
    s.targetPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, s.targetPitch));
    s.mouse.x = 0;
    s.mouse.y = 0;
  }

  // Smooth lerp
  const lerpRate = 5;
  const t = 1 - Math.exp(-lerpRate * deltaSec);
  s.camYaw += (s.targetYaw - s.camYaw) * t;
  s.camPitch += (s.targetPitch - s.camPitch) * t;

  const forward = new THREE.Vector3(
    Math.sin(s.camYaw) * Math.cos(s.camPitch),
    Math.sin(s.camPitch),
    Math.cos(s.camYaw) * Math.cos(s.camPitch)
  ).normalize();

  const right = new THREE.Vector3(
    Math.sin(s.camYaw + Math.PI / 2),
    0,
    Math.cos(s.camYaw + Math.PI / 2)
  ).normalize();

  if (s.keys['KeyW']) s.camPos.x += forward.x * moveSpeed;
  if (s.keys['KeyW']) s.camPos.y += forward.y * moveSpeed;
  if (s.keys['KeyW']) s.camPos.z += forward.z * moveSpeed;
  if (s.keys['KeyS']) s.camPos.x -= forward.x * moveSpeed;
  if (s.keys['KeyS']) s.camPos.y -= forward.y * moveSpeed;
  if (s.keys['KeyS']) s.camPos.z -= forward.z * moveSpeed;
  if (s.keys['KeyA']) s.camPos.x += right.x * moveSpeed;
  if (s.keys['KeyA']) s.camPos.z += right.z * moveSpeed;
  if (s.keys['KeyD']) s.camPos.x -= right.x * moveSpeed;
  if (s.keys['KeyD']) s.camPos.z -= right.z * moveSpeed;
  if (s.keys['KeyQ']) s.camPos.y -= moveSpeed;
  if (s.keys['KeyE']) s.camPos.y += moveSpeed;

  // Arrow keys look
  const arrowLook = 2 * deltaSec;
  if (s.keys['ArrowLeft'])  s.targetYaw += arrowLook;
  if (s.keys['ArrowRight']) s.targetYaw -= arrowLook;
  if (s.keys['ArrowUp'])    s.targetPitch += arrowLook;
  if (s.keys['ArrowDown'])  s.targetPitch -= arrowLook;
  s.targetPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, s.targetPitch));

  const lookTarget = new THREE.Vector3(
    s.camPos.x + Math.sin(s.camYaw) * Math.cos(s.camPitch),
    s.camPos.y + Math.sin(s.camPitch),
    s.camPos.z + Math.cos(s.camYaw) * Math.cos(s.camPitch)
  );

  C.camera3D.position.set(s.camPos.x, s.camPos.y, s.camPos.z);
  C.camera3D.lookAt(lookTarget);

  const sb = document.getElementById('sb-cursor');
  if (sb) sb.textContent =
    `${s.camPos.x.toFixed(1)}, ${s.camPos.y.toFixed(1)}, ${s.camPos.z.toFixed(1)}`;
};

// ===== MODE SWITCHING =====

C.getCellBounds = function() {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  if (C.cellMeshes.size === 0) return null;
  for (const mesh of C.cellMeshes.values()) {
    const p = mesh.position;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  return { cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, span: Math.max(maxX - minX, maxZ - minZ, 2) };
};

C.setMode = function(mode) {
  s.mode = mode;
  C.activeCamera = mode === '2d' ? C.camera2D : C.camera3D;

  if (mode === '2d') {
    C.highlightQuad.visible = true;
    C.wall2DGroup.visible = true;
    const sb = document.getElementById('sb-cursor');
    if (sb) sb.textContent = '—';
  } else {
    C.highlightQuad.visible = false;
    C.wall2DGroup.visible = false;

    const bounds = C.getCellBounds();
    if (bounds) {
      const dist = Math.max(bounds.span * 1.2, 6);
      const h = dist * 0.6;
      s.camPos.x = bounds.cx + dist;
      s.camPos.y = h;
      s.camPos.z = bounds.cz + dist;
      const dir = new THREE.Vector3(bounds.cx, 0, bounds.cz)
        .sub(new THREE.Vector3(s.camPos.x, 0, s.camPos.z)).normalize();
      s.camYaw = Math.atan2(dir.x, dir.z);
      s.camPitch = -0.3;
      s.targetYaw = s.camYaw;
      s.targetPitch = s.camPitch;
    }
    C.camera3D.position.set(s.camPos.x, s.camPos.y, s.camPos.z);
  }

  C.ui.updateHelp();
  C.ui.updateStatusBar();

  C.renderer.setSize(window.innerWidth, window.innerHeight);
  if (mode === '2d') {
    C.update2DCameraAspect();
  } else {
    C.camera3D.aspect = window.innerWidth / window.innerHeight;
    C.camera3D.fov = s.settings.fov;
    C.camera3D.updateProjectionMatrix();
  }
};

// ===== 3D ZOOM (scroll) =====

C.zoom3D = function(deltaY, clientX, clientY) {
  C._ndc.x = (clientX / window.innerWidth) * 2 - 1;
  C._ndc.y = -(clientY / window.innerHeight) * 2 + 1;
  C._raycaster.setFromCamera(C._ndc, C.camera3D);
  const hit = new THREE.Vector3();
  const didHit = C._raycaster.ray.intersectPlane(C._plane, hit);
  const dolly = -deltaY * s.settings.zoomSpeed;
  if (didHit) {
    const dir = new THREE.Vector3().subVectors(hit,
      new THREE.Vector3(s.camPos.x, s.camPos.y, s.camPos.z)).normalize();
    s.camPos.x += dir.x * dolly;
    s.camPos.y += dir.y * dolly;
    s.camPos.z += dir.z * dolly;
  } else {
    const fwd = new THREE.Vector3(
      Math.sin(s.camYaw) * Math.cos(s.camPitch),
      Math.sin(s.camPitch),
      Math.cos(s.camYaw) * Math.cos(s.camPitch)
    ).normalize();
    s.camPos.x += fwd.x * dolly;
    s.camPos.y += fwd.y * dolly;
    s.camPos.z += fwd.z * dolly;
  }
};

})();

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Geo JSON → Three.js scene ──────────────────────────────────────────────

function buildScene(json, textureUrl) {
  if (!json) return null;

  let texW = 16, texH = 16;
  let roots = [];

  if (json['minecraft:geometry']) {
    const geo = Array.isArray(json['minecraft:geometry']) ? json['minecraft:geometry'][0] : json['minecraft:geometry'];
    if (geo?.description) {
      texW = geo.description.texture_width || 16;
      texH = geo.description.texture_height || 16;
    }

    const boneMap = new Map();
    const parentMap = new Map();

    for (const b of (geo?.bones || [])) {
      const name = b.name || 'root';
      const pivot = b.pivot || [0, 0, 0];
      const rot = b.rotation || [0, 0, 0];
      const cubes = (b.cubes || []).map(c => parseCube(c, texW, texH));

      boneMap.set(name, { name, pivot, rotation: rot, cubes, children: [] });
      if (b.parent) parentMap.set(name, b.parent);
    }

    for (const [name, bone] of boneMap) {
      const parentName = parentMap.get(name);
      if (parentName && boneMap.has(parentName)) {
        boneMap.get(parentName).children.push(bone);
      } else {
        roots.push(bone);
      }
    }
  } else if (json.elements) {
    const cubes = json.elements.map(el => ({
      origin: el.from,
      size: [el.to[0] - el.from[0], el.to[1] - el.from[1], el.to[2] - el.from[2]],
      inflate: 0, pivot: null, rotation: null,
      faceUVs: parseJavaFaces(el.faces, texW, texH),
    }));
    roots = [{ name: 'root', pivot: [0,0,0], rotation: [0,0,0], cubes, children: [] }];
  }

  if (roots.length === 0) return null;

  const group = new THREE.Group();

  // Load texture
  let material = makeDefaultMaterial();
  if (textureUrl) {
    const tex = new THREE.TextureLoader().load(textureUrl, () => {
      // Re-render happens via animation loop
    });
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    material = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
    });
  }

  for (const root of roots) {
    group.add(buildBone(root, material, texW, texH));
  }

  return { group, material };
}

function parseCube(c, texW, texH) {
  const size = c.size || [0, 0, 0];
  const origin = c.origin || [0, 0, 0];
  const inflate = c.inflate || 0;
  const cubePivot = c.pivot || null;
  const cubeRot = c.rotation || null;

  let faceUVs = null;
  if (c.uv != null) {
    if (Array.isArray(c.uv) && c.uv.length === 2) {
      const [u, v] = c.uv;
      const [sx, sy, sz] = size;
      faceUVs = {
        east:  { uv: [u,             v + sz], uv_size: [sz, sy] },
        north: { uv: [u + sz,        v + sz], uv_size: [sx, sy] },
        west:  { uv: [u + sz + sx,   v + sz], uv_size: [sz, sy] },
        south: { uv: [u + sz*2 + sx, v + sz], uv_size: [sx, sy] },
        up:    { uv: [u + sz,        v],      uv_size: [sx, sz] },
        down:  { uv: [u + sz + sx,   v],      uv_size: [sx, sz] },
      };
    } else if (typeof c.uv === 'object') {
      faceUVs = {};
      const defaultSizes = {
        south: [size[0], size[1]], north: [size[0], size[1]],
        west: [size[2], size[1]], east: [size[2], size[1]],
        up: [size[0], size[2]], down: [size[0], size[2]],
      };
      for (const face of ['south','north','west','east','up','down']) {
        if (c.uv[face]) {
          faceUVs[face] = {
            uv: c.uv[face].uv.slice(),
            uv_size: c.uv[face].uv_size ? c.uv[face].uv_size.slice() : defaultSizes[face],
          };
        }
      }
    }
  }

  return { origin, size, inflate, pivot: cubePivot, rotation: cubeRot, faceUVs };
}

function parseJavaFaces(faces, texW, texH) {
  if (!faces) return null;
  const result = {};
  for (const [name, f] of Object.entries(faces)) {
    if (f.uv) {
      result[name] = {
        uv: [f.uv[0], f.uv[1]],
        uv_size: [f.uv[2] - f.uv[0], f.uv[3] - f.uv[1]],
      };
    }
  }
  return result;
}

function makeDefaultMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0x64A0DC,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
}

// ─── Build bone hierarchy as Three.js Object3D tree ─────────────────────────
// Matches GeoItemRenderer.renderBone exactly:
//   translate(pivot) → mulPose(eulerToQuat(-rx, -ry, rz)) → translate(-pivot)

function buildBone(bone, material, texW, texH) {
  const group = new THREE.Group();
  const [px, py, pz] = bone.pivot;
  const [rx, ry, rz] = bone.rotation;

  // Bedrock bone transform: translate to pivot, rotate, translate back
  // Three.js Group.position sets the translation before rotation.
  // We replicate PoseStack behavior:
  //   T(pivot) * R * T(-pivot)
  // = position at pivot, rotation applied, children offset by -pivot
  //
  // In Three.js: set position = pivot, set rotation, then offset all
  // children by -pivot. But it's cleaner to use a nested group:
  //   outer: translate(pivot)
  //   inner: rotate, then translate(-pivot) via child positions

  if (rx !== 0 || ry !== 0 || rz !== 0) {
    group.position.set(px, py, pz);
    // JOML rotationZYX(rz, ry, rx) with eulerToQuat(-rx, -ry, rz)
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler(
      -rx * Math.PI / 180,
      -ry * Math.PI / 180,
       rz * Math.PI / 180,
      'ZYX'
    );
    q.setFromEuler(euler);
    group.quaternion.copy(q);

    // Inner group offsets by -pivot so cubes stay in world coords
    const inner = new THREE.Group();
    inner.position.set(-px, -py, -pz);

    for (const cube of bone.cubes) {
      inner.add(buildCubeMesh(cube, material, texW, texH));
    }
    for (const child of bone.children) {
      inner.add(buildBone(child, material, texW, texH));
    }
    group.add(inner);
  } else {
    for (const cube of bone.cubes) {
      group.add(buildCubeMesh(cube, material, texW, texH));
    }
    for (const child of bone.children) {
      group.add(buildBone(child, material, texW, texH));
    }
  }

  return group;
}

// ─── Build a single cube as a Three.js mesh ─────────────────────────────────
// Face vertices and UV mapping match GeoItemRenderer.renderCube / quad() exactly.

function buildCubeMesh(cube, material, texW, texH) {
  const [ox, oy, oz] = cube.origin;
  const [sx, sy, sz] = cube.size;
  const inf = cube.inflate;

  let x0 = ox - inf, y0 = oy - inf, z0 = oz - inf;
  let x1 = ox + sx + inf, y1 = oy + sy + inf, z1 = oz + sz + inf;

  // Nudge coplanar faces apart to prevent z-fighting on zero-width axes
  // (matches GeoItemRenderer.renderCube)
  const eps = 0.005;
  if (sx === 0) { x0 -= eps; x1 += eps; }
  if (sy === 0) { y0 -= eps; y1 += eps; }
  if (sz === 0) { z0 -= eps; z1 += eps; }

  // 8 corner vertices
  const positions = [
    x0, y0, z0,  // 0
    x1, y0, z0,  // 1
    x1, y1, z0,  // 2
    x0, y1, z0,  // 3
    x0, y0, z1,  // 4
    x1, y0, z1,  // 5
    x1, y1, z1,  // 6
    x0, y1, z1,  // 7
  ];

  // Each face: 4 vertices from GeoItemRenderer.renderCube, forming 2 triangles.
  // quad() emits v0,v1,v2,v3 with UV: v0→(u0,v1), v1→(u1,v1), v2→(u1,v0), v3→(u0,v0)
  const faceData = [
    // south (+Z): (x0,y0,z1)=4, (x1,y0,z1)=5, (x1,y1,z1)=6, (x0,y1,z1)=7
    { name: 'south', corners: [4, 5, 6, 7] },
    // north (-Z): (x1,y0,z0)=1, (x0,y0,z0)=0, (x0,y1,z0)=3, (x1,y1,z0)=2
    { name: 'north', corners: [1, 0, 3, 2] },
    // west (-X): (x0,y0,z0)=0, (x0,y0,z1)=4, (x0,y1,z1)=7, (x0,y1,z0)=3
    { name: 'west', corners: [0, 4, 7, 3] },
    // east (+X): (x1,y0,z1)=5, (x1,y0,z0)=1, (x1,y1,z0)=2, (x1,y1,z1)=6
    { name: 'east', corners: [5, 1, 2, 6] },
    // up (+Y): (x0,y1,z0)=3, (x1,y1,z0)=2, (x1,y1,z1)=6, (x0,y1,z1)=7
    { name: 'up', corners: [3, 2, 6, 7] },
    // down (-Y): (x0,y0,z1)=4, (x1,y0,z1)=5, (x1,y0,z0)=1, (x0,y0,z0)=0
    { name: 'down', corners: [4, 5, 1, 0] },
  ];

  const verts = [];
  const uvs = [];
  const indices = [];
  let vi = 0;

  for (const face of faceData) {
    const [c0, c1, c2, c3] = face.corners;
    // Push 4 vertices for this face
    for (const ci of [c0, c1, c2, c3]) {
      verts.push(positions[ci*3], positions[ci*3+1], positions[ci*3+2]);
    }

    // UV from faceUVs
    const fuv = cube.faceUVs?.[face.name];
    if (fuv) {
      const u0 = fuv.uv[0] / texW;
      const v0 = fuv.uv[1] / texH;
      const u1 = (fuv.uv[0] + fuv.uv_size[0]) / texW;
      const v1 = (fuv.uv[1] + fuv.uv_size[1]) / texH;
      // quad() maps: v0→(u0,v1), v1→(u1,v1), v2→(u1,v0), v3→(u0,v0)
      // Three.js UV is top-left=(0,1), bottom-left=(0,0), so we need to flip V:
      // texture v0 in geo = top of UV region → Three.js V = 1 - v0
      // texture v1 in geo = bottom of UV region → Three.js V = 1 - v1
      const tv0 = 1 - v0; // top in Three.js
      const tv1 = 1 - v1; // bottom in Three.js
      uvs.push(
        u0, tv1,  // v0 → geo(u0, v1) → three(u0, 1-v1)
        u1, tv1,  // v1 → geo(u1, v1) → three(u1, 1-v1)
        u1, tv0,  // v2 → geo(u1, v0) → three(u1, 1-v0)
        u0, tv0,  // v3 → geo(u0, v0) → three(u0, 1-v0)
      );
    } else {
      uvs.push(0,0, 1,0, 1,1, 0,1);
    }

    // Two triangles: v0,v1,v2 and v0,v2,v3
    indices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
    vi += 4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);

  // Per-cube rotation: same pattern as bone
  if (cube.rotation) {
    const [crx, cry, crz] = cube.rotation;
    if (crx !== 0 || cry !== 0 || crz !== 0) {
      const cp = cube.pivot || [0, 0, 0];
      const wrapper = new THREE.Group();
      wrapper.position.set(cp[0], cp[1], cp[2]);
      const q = new THREE.Quaternion();
      q.setFromEuler(new THREE.Euler(
        -crx * Math.PI / 180,
        -cry * Math.PI / 180,
         crz * Math.PI / 180,
        'ZYX'
      ));
      wrapper.quaternion.copy(q);
      const inner = new THREE.Group();
      inner.position.set(-cp[0], -cp[1], -cp[2]);
      inner.add(mesh);
      wrapper.add(inner);
      return wrapper;
    }
  }

  return mesh;
}

// ─── React component ─────────────────────────────────────────────────────────

export default function ModelPreview3D({ modelJson, containerW, containerH, textureUrl }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);

  // Init Three.js scene once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 1));

    // XZ ground plane grid — rotates with the model
    const gridGroup = new THREE.Group();
    const wireMat = new THREE.LineBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.25 });
    const wireSize = 16;
    for (let i = -wireSize; i <= wireSize; i += 2) {
      const xz1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i, 0, -wireSize), new THREE.Vector3(i, 0, wireSize)]);
      const xz2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-wireSize, 0, i), new THREE.Vector3(wireSize, 0, i)]);
      gridGroup.add(new THREE.Line(xz1, wireMat));
      gridGroup.add(new THREE.Line(xz2, wireMat));
    }
    const axesMat = (color) => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    for (const [dir, color] of [[[wireSize,0,0], 0xff4444], [[0,wireSize,0], 0x44ff44], [[0,0,wireSize], 0x4488ff]]) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(...dir)]);
      gridGroup.add(new THREE.Line(g, axesMat(color)));
    }
    scene.add(gridGroup);

    stateRef.current = {
      renderer, scene, camera, gridGroup,
      modelGroup: null, material: null,
      camRY: -0.5, camRX: 0.35, zoom: 1,
      panX: 0, panY: 0,
      dragButton: -1, lastX: 0, lastY: 0,
      animId: null,
    };

    const render = () => {
      const s = stateRef.current;
      if (!s) return;
      s.renderer.render(s.scene, s.camera);
    };

    // Mouse controls: left-click = orbit, right-click = pan
    const onDown = (e) => {
      const s = stateRef.current;
      s.dragButton = e.button;
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      e.preventDefault();
    };
    const onMove = (e) => {
      const s = stateRef.current;
      if (s.dragButton < 0) return;
      const dx = e.clientX - s.lastX;
      const dy = e.clientY - s.lastY;
      s.lastX = e.clientX;
      s.lastY = e.clientY;

      if (s.dragButton === 2 || s.dragButton === 1) {
        // Right-click or middle-click: pan
        const panScale = (2 * (14 / s.zoom)) / (s.renderer.domElement.width / s.renderer.getPixelRatio());
        s.panX -= dx * panScale;
        s.panY += dy * panScale;
      } else {
        // Left-click: orbit (drag down = look up, drag up = look down)
        s.camRY += dx * 0.01;
        s.camRX = Math.max(-1.4, Math.min(1.4, s.camRX + dy * 0.01));
      }
      updateCameraTransform(s);
      render();
    };
    const onUp = () => { stateRef.current.dragButton = -1; };
    const onWheel = (e) => {
      e.preventDefault();
      const s = stateRef.current;
      s.zoom = Math.max(0.2, Math.min(5, s.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
      updateCameraTransform(s);
      render();
    };
    const onContext = (e) => e.preventDefault();

    renderer.domElement.addEventListener('mousedown', onDown);
    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('mouseup', onUp);
    renderer.domElement.addEventListener('mouseleave', onUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('contextmenu', onContext);
    renderer.domElement.style.cursor = 'grab';

    return () => {
      renderer.domElement.removeEventListener('mousedown', onDown);
      renderer.domElement.removeEventListener('mousemove', onMove);
      renderer.domElement.removeEventListener('mouseup', onUp);
      renderer.domElement.removeEventListener('mouseleave', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('contextmenu', onContext);
      if (stateRef.current?.animId) cancelAnimationFrame(stateRef.current.animId);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      stateRef.current = null;
    };
  }, []);

  // Resize
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !containerW || !containerH) return;
    const size = Math.floor(Math.min(containerW, containerH));
    if (size < 10) return;
    s.renderer.setSize(size, size);
    updateCameraTransform(s);
    s.renderer.render(s.scene, s.camera);
  }, [containerW, containerH]);

  // Rebuild model when JSON or texture changes
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;

    // Remove old model
    if (s.modelGroup) {
      s.scene.remove(s.modelGroup);
      disposeGroup(s.modelGroup);
      s.modelGroup = null;
    }
    if (s.material) {
      s.material.dispose();
      s.material = null;
    }

    const result = buildScene(modelJson, textureUrl);
    if (result) {
      s.modelGroup = result.group;
      s.material = result.material;
      s.scene.add(result.group);
    }

    updateCameraTransform(s);
    s.renderer.render(s.scene, s.camera);
  }, [modelJson, textureUrl]);

  return <div ref={mountRef} onContextMenu={e => e.preventDefault()} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />;
}

function updateCameraTransform(s) {
  const size = s.renderer.domElement.width / s.renderer.getPixelRatio();
  if (size <= 0) return;

  const halfSize = 14 / s.zoom;
  s.camera.left = -halfSize + s.panX;
  s.camera.right = halfSize + s.panX;
  s.camera.top = halfSize + s.panY;
  s.camera.bottom = -halfSize + s.panY;
  s.camera.updateProjectionMatrix();

  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.camRY);
  const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), s.camRX);
  const q = new THREE.Quaternion().multiplyQuaternions(qx, qy);
  if (s.modelGroup) s.modelGroup.quaternion.copy(q);
  if (s.gridGroup) s.gridGroup.quaternion.copy(q);
}

function disposeGroup(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });
}

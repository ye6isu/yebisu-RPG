import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './ThreeDViewport.css';

const DEFAULT_CAMERA_POSITION = [3.6, 2.8, 4.8];
const DEFAULT_CAMERA_TARGET = [0, 0.75, 0];

function clearObjectGroup(group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
    else child.material?.dispose();
  }
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ThreeDViewport({ className = '', ariaLabel = '3D viewport', objects = [] }) {
  const hostRef = useRef(null);
  const resetViewRef = useRef(() => {});
  const objectGroupRef = useRef(null);
  const renderRef = useRef(() => {});
  const viewRef = useRef({
    position: [...DEFAULT_CAMERA_POSITION],
    target: [...DEFAULT_CAMERA_TARGET],
  });
  const previewPlanes = objects
    .filter(object => object.type === 'plane')
    .map(object => ({
      id: object.id,
      name: object.name,
      position: object.position,
      rotation: object.rotation,
      scale: object.scale,
      opacity: object.opacity,
      billboard: object.billboard,
      fullBright: object.fullBright,
      texture: object.texture,
    }));
  const previewPlaneSignature = JSON.stringify(previewPlanes);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101113);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
    camera.position.fromArray(viewRef.current.position);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.target.fromArray(viewRef.current.target);
    controls.update();

    const render = () => {
      camera.position.toArray(viewRef.current.position);
      controls.target.toArray(viewRef.current.target);
      objectGroupRef.current?.children.forEach(child => {
        if (!child.userData.billboard) return;
        child.quaternion.copy(camera.quaternion);
        child.rotateZ(THREE.MathUtils.degToRad(child.userData.rotationZ));
      });
      renderer.render(scene, camera);
    };
    renderRef.current = render;
    controls.addEventListener('change', render);

    const objectGroup = new THREE.Group();
    scene.add(objectGroup);
    objectGroupRef.current = objectGroup;

    resetViewRef.current = () => {
      camera.position.fromArray(DEFAULT_CAMERA_POSITION);
      controls.target.fromArray(DEFAULT_CAMERA_TARGET);
      controls.update();
      render();
    };

    const resources = [];
    const gridColor = 0x45484e;
    const gridSize = 12;
    const gridDivisions = 12;
    const gridHalfSize = gridSize / 2;
    const gridStep = gridSize / gridDivisions;
    const gridPoints = [];
    for (let index = 0; index <= gridDivisions; index += 1) {
      const coordinate = -gridHalfSize + (index * gridStep);
      if (Math.abs(coordinate) < Number.EPSILON) continue;
      gridPoints.push(
        new THREE.Vector3(-gridHalfSize, 0, coordinate),
        new THREE.Vector3(gridHalfSize, 0, coordinate),
        new THREE.Vector3(coordinate, 0, -gridHalfSize),
        new THREE.Vector3(coordinate, 0, gridHalfSize),
      );
    }
    const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x26282c });
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    const centerGridGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-gridHalfSize, 0, 0),
      new THREE.Vector3(gridHalfSize, 0, 0),
      new THREE.Vector3(0, 0, -gridHalfSize),
      new THREE.Vector3(0, 0, gridHalfSize),
    ]);
    const centerGridMaterial = new THREE.LineBasicMaterial({ color: gridColor });
    const centerGrid = new THREE.LineSegments(centerGridGeometry, centerGridMaterial);
    scene.add(grid, centerGrid);
    resources.push(gridGeometry, gridMaterial, centerGridGeometry, centerGridMaterial);

    const frontMarkerGeometry = new THREE.PlaneGeometry(0.16, 0.16);
    frontMarkerGeometry.rotateZ(Math.PI / 4);
    frontMarkerGeometry.rotateX(-Math.PI / 2);
    const frontMarkerMaterial = new THREE.MeshBasicMaterial({
      color: gridColor,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const frontMarker = new THREE.Mesh(frontMarkerGeometry, frontMarkerMaterial);
    frontMarker.position.set(0, 0, 6);
    frontMarker.renderOrder = 2;
    scene.add(frontMarker);
    resources.push(frontMarkerGeometry, frontMarkerMaterial);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      observer.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      resetViewRef.current = () => {};
      renderRef.current = () => {};
      clearObjectGroup(objectGroup);
      objectGroupRef.current = null;
      for (const resource of resources) {
        if (Array.isArray(resource)) {
          resource.forEach(item => item.dispose());
        } else {
          resource.dispose();
        }
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    const group = objectGroupRef.current;
    if (!group) return;
    clearObjectGroup(group);
    previewPlanes.forEach((object, index) => {
      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: 0x7f8794,
        transparent: true,
        opacity: THREE.MathUtils.clamp(numeric(object.opacity, 1), 0, 1),
        side: THREE.DoubleSide,
      });
      const plane = new THREE.Mesh(geometry, material);
      plane.name = object.name;
      plane.position.set(
        numeric(object.position?.x),
        numeric(object.position?.y, 1),
        numeric(object.position?.z) + (index * 0.01),
      );
      plane.rotation.set(
        THREE.MathUtils.degToRad(numeric(object.rotation?.x)),
        THREE.MathUtils.degToRad(numeric(object.rotation?.y)),
        THREE.MathUtils.degToRad(numeric(object.rotation?.z)),
      );
      plane.scale.set(
        numeric(object.scale?.x, 1),
        numeric(object.scale?.y, 1),
        numeric(object.scale?.z, 1),
      );
      plane.userData.billboard = Boolean(object.billboard);
      plane.userData.rotationZ = numeric(object.rotation?.z);
      group.add(plane);
    });
    renderRef.current();
  }, [previewPlaneSignature]);

  return (
    <div
      ref={hostRef}
      className={`three-d-viewport ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="ycs-button icon three-d-viewport-reset"
        onClick={() => resetViewRef.current()}
        title="Reset View"
        aria-label="Reset View"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4.6 8.2A8 8 0 1 1 4 14" />
          <path d="M4.6 8.2V3.8M4.6 8.2H9" />
        </svg>
      </button>
    </div>
  );
}

export default ThreeDViewport;

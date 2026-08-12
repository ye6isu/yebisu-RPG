import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { propertyValueAtTick } from './VfxKeyframes';
import './ThreeDViewport.css';

const DEFAULT_CAMERA_POSITION = [3.6, 2.8, 4.8];
const DEFAULT_CAMERA_TARGET = [0, 0.75, 0];

function clearObjectGroup(group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => {
      material?.map?.dispose?.();
      material?.dispose?.();
    });
  }
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function ThreeDViewport({
  className = '',
  ariaLabel = '3D viewport',
  objects = [],
  selectedId = null,
  textureUrls = {},
  previewTick = 0,
}) {
  const hostRef = useRef(null);
  const resetViewRef = useRef(() => {});
  const objectGroupRef = useRef(null);
  const renderRef = useRef(() => {});
  const previewTickRef = useRef(previewTick);
  previewTickRef.current = previewTick;
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
      pivot: object.pivot,
      baseRotation: object.baseRotation,
      positionKeyframes: object.positionKeyframes,
      positionXKeyframes: object.positionXKeyframes,
      positionYKeyframes: object.positionYKeyframes,
      positionZKeyframes: object.positionZKeyframes,
      separatePositionDimensions: object.separatePositionDimensions,
      rotation: object.rotation,
      rotationKeyframes: object.rotationKeyframes,
      rotationXKeyframes: object.rotationXKeyframes,
      rotationYKeyframes: object.rotationYKeyframes,
      rotationZKeyframes: object.rotationZKeyframes,
      separateRotationDimensions: object.separateRotationDimensions,
      scale: object.scale,
      scaleKeyframes: object.scaleKeyframes,
      scaleXKeyframes: object.scaleXKeyframes,
      scaleYKeyframes: object.scaleYKeyframes,
      scaleZKeyframes: object.scaleZKeyframes,
      separateScaleDimensions: object.separateScaleDimensions,
      width: object.width,
      height: object.height,
      color: object.color,
      opacity: object.opacity,
      opacityKeyframes: object.opacityKeyframes,
      billboard: object.billboard,
      fullBright: object.fullBright,
      texture: object.texture,
      rows: object.rows,
      ticksPerFrame: object.ticksPerFrame,
      textureLoop: object.textureLoop,
      start: object.start,
      end: object.end,
    }));
  const previewPlaneSignature = JSON.stringify(previewPlanes);
  const textureUrlSignature = JSON.stringify(textureUrls);

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
    const previewPositionOffset = new THREE.Vector3();
    const previewRotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    const previewRotationQuaternion = new THREE.Quaternion();

    const render = () => {
      camera.position.toArray(viewRef.current.position);
      controls.target.toArray(viewRef.current.target);
      objectGroupRef.current?.children.forEach(child => {
        const { previewObject, texture, outline, pivotMarker } = child.userData;
        if (!previewObject) return;
        const active = previewTickRef.current >= numeric(previewObject.start, 0)
          && previewTickRef.current <= numeric(previewObject.end, Number.POSITIVE_INFINITY);
        child.visible = active;
        if (outline) outline.visible = active;
        if (pivotMarker) pivotMarker.visible = active;
        if (!active) return;
        const position = propertyValueAtTick(previewObject, 'position', previewTickRef.current);
        const rotation = propertyValueAtTick(previewObject, 'rotation', previewTickRef.current);
        const scale = propertyValueAtTick(previewObject, 'scale', previewTickRef.current);
        const opacity = propertyValueAtTick(previewObject, 'opacity', previewTickRef.current);
        const pivotX = numeric(previewObject.pivot?.x);
        const pivotY = numeric(previewObject.pivot?.y);
        const pivotZ = numeric(previewObject.pivot?.z);
        previewRotationEuler.set(
          THREE.MathUtils.degToRad(numeric(previewObject.baseRotation?.x) + rotation.x),
          THREE.MathUtils.degToRad(numeric(previewObject.baseRotation?.y) + rotation.y),
          THREE.MathUtils.degToRad(numeric(previewObject.baseRotation?.z) + rotation.z),
          'YXZ',
        );
        previewRotationQuaternion.setFromEuler(previewRotationEuler);
        previewPositionOffset.set(
          -pivotX * scale.x,
          -pivotY * scale.y,
          -pivotZ * scale.z,
        );
        child.scale.set(scale.x, scale.y, scale.z);
        child.material.opacity = opacity;
        if (previewObject.billboard) {
          child.quaternion.copy(camera.quaternion).multiply(previewRotationQuaternion);
        } else {
          child.quaternion.copy(previewRotationQuaternion);
        }
        previewPositionOffset.applyQuaternion(child.quaternion);
        child.position.set(
          position.x + pivotX + previewPositionOffset.x,
          position.y + pivotY + previewPositionOffset.y,
          position.z + pivotZ + previewPositionOffset.z,
        );
        pivotMarker?.position.set(
          position.x + pivotX,
          position.y + pivotY,
          position.z + pivotZ,
        );
        if (texture) {
          const rows = Math.max(1, Math.floor(numeric(previewObject.rows, 1)));
          const ticksPerFrame = Math.max(1, Math.floor(numeric(previewObject.ticksPerFrame, 2)));
          const rawFrame = Math.max(0, Math.floor(
            (previewTickRef.current - numeric(previewObject.start, 0)) / ticksPerFrame,
          ));
          const frame = previewObject.textureLoop
            ? rawFrame % rows
            : Math.min(rawFrame, rows - 1);
          texture.repeat.set(1, 1 / rows);
          texture.offset.set(0, 1 - ((frame + 1) / rows));
        }
        outline?.update();
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

    let animationFrame = 0;
    const animate = () => {
      render();
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
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
    const loader = new THREE.TextureLoader();
    previewPlanes.forEach(object => {
      const geometry = new THREE.PlaneGeometry(
        Math.max(0.001, numeric(object.width, 1)),
        Math.max(0.001, numeric(object.height, 1)),
      );
      const textureUrl = textureUrls[object.texture];
      const texture = textureUrl ? loader.load(textureUrl) : null;
      if (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      }
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        color: new THREE.Color(object.color || '#ffffff'),
        transparent: true,
        opacity: THREE.MathUtils.clamp(numeric(object.opacity, 1), 0, 1),
        side: THREE.DoubleSide,
        depthWrite: false,
        wireframe: !texture,
      });
      const plane = new THREE.Mesh(geometry, material);
      plane.name = object.name;
      plane.rotation.order = 'YXZ';
      plane.position.set(
        numeric(object.position?.x) + numeric(object.pivot?.x),
        numeric(object.position?.y) + numeric(object.pivot?.y),
        numeric(object.position?.z) + numeric(object.pivot?.z),
      );
      plane.rotation.set(
        THREE.MathUtils.degToRad(numeric(object.baseRotation?.x) + numeric(object.rotation?.x)),
        THREE.MathUtils.degToRad(numeric(object.baseRotation?.y) + numeric(object.rotation?.y)),
        THREE.MathUtils.degToRad(numeric(object.baseRotation?.z) + numeric(object.rotation?.z)),
      );
      plane.scale.set(
        numeric(object.scale?.x, 1),
        numeric(object.scale?.y, 1),
        numeric(object.scale?.z, 1),
      );
      plane.userData.previewObject = object;
      plane.userData.texture = texture;
      plane.userData.outline = null;
      plane.userData.pivotMarker = null;
      group.add(plane);

      if (object.id === selectedId) {
        const outline = new THREE.BoxHelper(plane, 0x4fa3ff);
        plane.userData.outline = outline;
        group.add(outline);
        const pivotMarker = new THREE.AxesHelper(0.35);
        const pivotMaterials = Array.isArray(pivotMarker.material)
          ? pivotMarker.material
          : [pivotMarker.material];
        pivotMaterials.forEach(pivotMaterial => {
          pivotMaterial.depthTest = false;
          pivotMaterial.depthWrite = false;
          pivotMaterial.transparent = true;
          pivotMaterial.opacity = 0.95;
        });
        pivotMarker.renderOrder = 4;
        pivotMarker.userData.isPivotMarker = true;
        plane.userData.pivotMarker = pivotMarker;
        group.add(pivotMarker);
      }
    });
    renderRef.current();
  }, [previewPlaneSignature, selectedId, textureUrlSignature]);

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

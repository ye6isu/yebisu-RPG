import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
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

function cleanTransformNumber(value) {
  const rounded = Math.round(value * 1000000) / 1000000;
  return Math.abs(rounded) < 0.000001 ? 0 : rounded;
}

function ThreeDViewport({
  className = '',
  ariaLabel = '3D viewport',
  objects = [],
  selectedId = null,
  textureUrls = {},
  previewTick = 0,
  onTransformStart = () => {},
  onTransformChange = () => {},
}) {
  const [transformMode, setTransformMode] = useState('translate');
  const hostRef = useRef(null);
  const resetViewRef = useRef(() => {});
  const objectGroupRef = useRef(null);
  const transformControlsRef = useRef(null);
  const transformDragRef = useRef(null);
  const renderRef = useRef(() => {});
  const onTransformStartRef = useRef(onTransformStart);
  const onTransformChangeRef = useRef(onTransformChange);
  onTransformStartRef.current = onTransformStart;
  onTransformChangeRef.current = onTransformChange;
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
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode('translate');
    transformControls.setSpace('world');
    transformControls.size = 0.85;
    scene.add(transformControls.getHelper());
    transformControlsRef.current = transformControls;

    const handleTransformDragging = event => {
      controls.enabled = !event.value;
    };
    const handleTransformStart = event => {
      const object = transformControls.object;
      const previewObject = object?.userData?.previewObject;
      if (!object || !previewObject) return;
      onTransformStartRef.current();
      transformDragRef.current = {
        mode: event.mode,
        object,
        startPosition: object.position.clone(),
        authoredPosition: propertyValueAtTick(previewObject, 'position', previewTickRef.current),
      };
    };
    const handleTransformEnd = event => {
      const drag = transformDragRef.current;
      transformDragRef.current = null;
      if (!drag || drag.object !== transformControls.object) return;
      const object = drag.object;
      const previewObject = object.userData.previewObject;
      if (!previewObject) return;

      if (event.mode === 'translate') {
        const delta = object.position.clone().sub(drag.startPosition);
        onTransformChangeRef.current(previewObject.id, 'position', {
          x: cleanTransformNumber(drag.authoredPosition.x + delta.x),
          y: cleanTransformNumber(drag.authoredPosition.y + delta.y),
          z: cleanTransformNumber(drag.authoredPosition.z + delta.z),
        });
      } else if (event.mode === 'rotate') {
        const authoredQuaternion = object.quaternion.clone();
        if (previewObject.billboard) {
          authoredQuaternion.premultiply(camera.quaternion.clone().invert());
        }
        const authoredRotation = new THREE.Euler().setFromQuaternion(authoredQuaternion, 'YXZ');
        onTransformChangeRef.current(previewObject.id, 'rotation', {
          x: cleanTransformNumber(THREE.MathUtils.radToDeg(authoredRotation.x)),
          y: cleanTransformNumber(THREE.MathUtils.radToDeg(authoredRotation.y)),
          z: cleanTransformNumber(THREE.MathUtils.radToDeg(authoredRotation.z)),
        });
      } else if (event.mode === 'scale') {
        onTransformChangeRef.current(previewObject.id, 'scale', {
          x: cleanTransformNumber(object.scale.x),
          y: cleanTransformNumber(object.scale.y),
          z: cleanTransformNumber(object.scale.z),
        });
      }
    };
    transformControls.addEventListener('dragging-changed', handleTransformDragging);
    transformControls.addEventListener('mouseDown', handleTransformStart);
    transformControls.addEventListener('mouseUp', handleTransformEnd);
    const previewPivotOffset = new THREE.Vector3();
    const previewPositionOffset = new THREE.Vector3();
    const previewRotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    const previewRotationQuaternion = new THREE.Quaternion();

    const render = () => {
      camera.position.toArray(viewRef.current.position);
      controls.target.toArray(viewRef.current.target);
      let selectedObjectActive = false;
      objectGroupRef.current?.children.forEach(child => {
        const { previewObject, texture, outline, pivotMarker } = child.userData;
        if (!previewObject) return;
        const active = previewTickRef.current >= numeric(previewObject.start, 0)
          && previewTickRef.current <= numeric(previewObject.end, Number.POSITIVE_INFINITY);
        child.visible = active;
        if (outline) outline.visible = active;
        if (pivotMarker) pivotMarker.visible = active;
        if (transformControls.object === child) selectedObjectActive = active;
        if (!active) return;
        const position = propertyValueAtTick(previewObject, 'position', previewTickRef.current);
        const rotation = propertyValueAtTick(previewObject, 'rotation', previewTickRef.current);
        const scale = propertyValueAtTick(previewObject, 'scale', previewTickRef.current);
        const opacity = propertyValueAtTick(previewObject, 'opacity', previewTickRef.current);
        const pivotX = numeric(previewObject.pivot?.x);
        const pivotY = numeric(previewObject.pivot?.y);
        const pivotZ = numeric(previewObject.pivot?.z);
        previewRotationEuler.set(
          THREE.MathUtils.degToRad(rotation.x),
          THREE.MathUtils.degToRad(rotation.y),
          THREE.MathUtils.degToRad(rotation.z),
          'YXZ',
        );
        previewRotationQuaternion.setFromEuler(previewRotationEuler);
        const transforming = transformControls.dragging && transformControls.object === child;
        child.material.opacity = opacity;
        if (!transforming) {
          child.scale.set(scale.x, scale.y, scale.z);
          if (previewObject.billboard) {
            child.quaternion.copy(camera.quaternion).multiply(previewRotationQuaternion);
            previewPivotOffset.set(pivotX, pivotY, pivotZ).applyQuaternion(camera.quaternion);
          } else {
            child.quaternion.copy(previewRotationQuaternion);
            previewPivotOffset.set(pivotX, pivotY, pivotZ);
          }
          previewPositionOffset.set(-pivotX, -pivotY, -pivotZ).applyQuaternion(child.quaternion);
          child.position.set(
            position.x + previewPivotOffset.x + previewPositionOffset.x,
            position.y + previewPivotOffset.y + previewPositionOffset.y,
            position.z + previewPivotOffset.z + previewPositionOffset.z,
          );
        } else if (previewObject.billboard) {
          previewPivotOffset.set(pivotX, pivotY, pivotZ).applyQuaternion(camera.quaternion);
        } else {
          previewPivotOffset.set(pivotX, pivotY, pivotZ);
        }
        pivotMarker?.position.set(
          position.x + previewPivotOffset.x,
          position.y + previewPivotOffset.y,
          position.z + previewPivotOffset.z,
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
      transformControls.getHelper().visible = Boolean(transformControls.object && selectedObjectActive);
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
      transformControls.removeEventListener('dragging-changed', handleTransformDragging);
      transformControls.removeEventListener('mouseDown', handleTransformStart);
      transformControls.removeEventListener('mouseUp', handleTransformEnd);
      transformControls.detach();
      scene.remove(transformControls.getHelper());
      transformControls.dispose();
      transformControlsRef.current = null;
      transformDragRef.current = null;
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
    const controls = transformControlsRef.current;
    if (!controls) return;
    controls.setMode(transformMode);
    controls.setSpace(transformMode === 'translate' ? 'world' : 'local');
    renderRef.current();
  }, [transformMode]);

  useEffect(() => {
    const group = objectGroupRef.current;
    if (!group) return;
    transformControlsRef.current?.detach();
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
        numeric(object.position?.x),
        numeric(object.position?.y),
        numeric(object.position?.z),
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
        transformControlsRef.current?.attach(plane);
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
      <div className="three-d-viewport-transform-tools" role="toolbar" aria-label="Object transform mode">
        <button
          type="button"
          className={`ycs-button icon three-d-viewport-transform-button ${transformMode === 'translate' ? 'active' : ''}`}
          onClick={() => setTransformMode('translate')}
          title="Move"
          aria-label="Move"
          aria-pressed={transformMode === 'translate'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v18M3 12h18" />
            <path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
          </svg>
        </button>
        <button
          type="button"
          className={`ycs-button icon three-d-viewport-transform-button ${transformMode === 'rotate' ? 'active' : ''}`}
          onClick={() => setTransformMode('rotate')}
          title="Rotate"
          aria-label="Rotate"
          aria-pressed={transformMode === 'rotate'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.5 8.5A8 8 0 1 0 20 15" />
            <path d="M19.5 8.5V4.5M19.5 8.5h-4" />
          </svg>
        </button>
        <button
          type="button"
          className={`ycs-button icon three-d-viewport-transform-button ${transformMode === 'scale' ? 'active' : ''}`}
          onClick={() => setTransformMode('scale')}
          title="Scale"
          aria-label="Scale"
          aria-pressed={transformMode === 'scale'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" />
            <path d="M4 8l5 5M20 8l-5 5M4 16l5-5M20 16l-5-5" />
          </svg>
        </button>
      </div>
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

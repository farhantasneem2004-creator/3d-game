import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  MARKER_DEFINITIONS,
  MarkerId,
  MarkerPositions,
  RiggingSystem,
} from '../game/RiggingSystem';

export interface RiggingEditorCanvasProps {
  modelGroup: THREE.Group | null;
  currentMarkers: MarkerPositions;
  onChangeMarkers: (markers: MarkerPositions) => void;
  selectedMarkerId: MarkerId | null;
  onSelectMarker: (id: MarkerId | null) => void;
  useSymmetry: boolean;
  showMarkers?: boolean;
  showBones?: boolean;
  ghostMode?: boolean;
  cameraPreset?: 'front' | 'side' | 'back' | 'perspective';
}

// Bone connection graph pairs for rendering skeletal lines between markers
const BONE_CONNECTIONS: Array<[MarkerId, MarkerId]> = [
  ['pelvis', 'spine'],
  ['spine', 'chest'],
  ['chest', 'neck'],
  ['neck', 'chin'],
  ['chin', 'head'],

  // Left arm
  ['chest', 'leftShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['leftWrist', 'leftHand'],

  // Right arm
  ['chest', 'rightShoulder'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['rightWrist', 'rightHand'],

  // Left leg
  ['pelvis', 'leftHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['leftAnkle', 'leftFoot'],

  // Right leg
  ['pelvis', 'rightHip'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
  ['rightAnkle', 'rightFoot'],
];

export const RiggingEditorCanvas: React.FC<RiggingEditorCanvasProps> = ({
  modelGroup,
  currentMarkers,
  onChangeMarkers,
  selectedMarkerId,
  onSelectMarker,
  useSymmetry,
  showMarkers = true,
  showBones = true,
  ghostMode = false,
  cameraPreset = 'perspective',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to keep across re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const characterHolderRef = useRef<THREE.Group | null>(null);
  const markerMeshesMapRef = useRef<Map<MarkerId, THREE.Mesh>>(new Map());
  const boneLinesMeshRef = useRef<THREE.LineSegments | null>(null);

  // Dragging state
  const draggingIdRef = useRef<MarkerId | null>(null);
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Interactive tooltip state
  const [hoveredMarker, setHoveredMarker] = useState<MarkerId | null>(null);

  // 1. Initialize Three.js viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate 900
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.1, 2.6);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.9, 0);
    controls.minDistance = 0.5;
    controls.maxDistance = 6.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go too far below ground
    controlsRef.current = controls;

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.9);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);

    // Ground platform & grid
    const grid = new THREE.GridHelper(3, 20, 0x38bdf8, 0x334155);
    grid.position.y = 0;
    scene.add(grid);

    // Character Holder
    const charHolder = new THREE.Group();
    charHolder.name = 'CharacterPreviewHolder';
    scene.add(charHolder);
    characterHolderRef.current = charHolder;

    // Markers & Bones group
    const markersGroup = new THREE.Group();
    markersGroup.name = 'RiggingMarkersGroup';
    scene.add(markersGroup);

    // Create marker meshes
    const sphereGeo = new THREE.SphereGeometry(0.038, 20, 20);
    const markerMeshes = new Map<MarkerId, THREE.Mesh>();

    for (const def of MARKER_DEFINITIONS) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(def.color),
        roughness: 0.3,
        metalness: 0.2,
        emissive: new THREE.Color(def.color),
        emissiveIntensity: 0.25,
      });

      const sphere = new THREE.Mesh(sphereGeo, mat);
      sphere.name = `Marker_${def.id}`;
      sphere.userData = { markerId: def.id };

      // Add a subtle white rim ring
      const ringGeo = new THREE.RingGeometry(0.045, 0.052, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'SelectionRing';
      ring.visible = false;
      sphere.add(ring);

      sphere.position.copy(currentMarkers[def.id] || new THREE.Vector3(def.defaultPos.x, def.defaultPos.y, def.defaultPos.z));
      markersGroup.add(sphere);
      markerMeshes.set(def.id, sphere);
    }
    markerMeshesMapRef.current = markerMeshes;

    // Create bone connection lines
    const lineGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(BONE_CONNECTIONS.length * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    });
    const boneLines = new THREE.LineSegments(lineGeo, lineMat);
    boneLines.renderOrder = 999;
    scene.add(boneLines);
    boneLinesMeshRef.current = boneLines;

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Make selection rings always face camera
      if (cameraRef.current) {
        markerMeshes.forEach((mesh) => {
          const ring = mesh.getObjectByName('SelectionRing');
          if (ring && ring.visible) {
            ring.quaternion.copy(cameraRef.current!.quaternion);
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize observer for seamless fullscreen and container dimension updates
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 450;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Camera preset switcher
  const applyCameraPreset = useCallback(
    (preset: 'front' | 'side' | 'back' | 'perspective') => {
      if (!cameraRef.current || !controlsRef.current) return;
      const cam = cameraRef.current;
      const ctrl = controlsRef.current;

      ctrl.target.set(0, 0.9, 0);

      switch (preset) {
        case 'front':
          cam.position.set(0, 0.9, 2.5);
          break;
        case 'side':
          cam.position.set(2.5, 0.9, 0);
          break;
        case 'back':
          cam.position.set(0, 0.9, -2.5);
          break;
        case 'perspective':
        default:
          cam.position.set(1.4, 1.4, 2.2);
          break;
      }
      ctrl.update();
    },
    []
  );

  useEffect(() => {
    applyCameraPreset(cameraPreset);
  }, [cameraPreset, applyCameraPreset]);

  // 3. Update character model in the preview holder
  useEffect(() => {
    const holder = characterHolderRef.current;
    if (!holder) return;

    // Clear existing preview children
    while (holder.children.length > 0) {
      holder.remove(holder.children[0]);
    }

    if (modelGroup) {
      // Clone model so changes inside modal don't corrupt in-game character
      const clone = modelGroup.clone(true);

      // Adjust materials for ghost / transparent or high-visibility preview
      clone.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              const stdMat = m as THREE.MeshStandardMaterial;
              stdMat.transparent = ghostMode;
              stdMat.opacity = ghostMode ? 0.45 : 1.0;
              stdMat.depthWrite = !ghostMode;
            });
          }
        }
      });

      holder.add(clone);
    }
  }, [modelGroup, ghostMode]);

  // 4. Update marker sphere positions and bone lines
  useEffect(() => {
    const meshes = markerMeshesMapRef.current;
    const boneLines = boneLinesMeshRef.current;

    // Update marker sphere positions
    for (const def of MARKER_DEFINITIONS) {
      const mesh = meshes.get(def.id);
      const pos = currentMarkers[def.id];
      if (mesh && pos) {
        mesh.position.copy(pos);
        mesh.visible = showMarkers;

        // Highlight selected marker
        const isSelected = selectedMarkerId === def.id;
        const ring = mesh.getObjectByName('SelectionRing') as THREE.Mesh;
        if (ring) {
          ring.visible = isSelected;
        }

        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (isSelected) {
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = 0.7;
          mesh.scale.setScalar(1.25);
        } else {
          mat.emissive.setStyle(def.color);
          mat.emissiveIntensity = 0.25;
          mesh.scale.setScalar(1.0);
        }
      }
    }

    // Update bone line coordinates
    if (boneLines && showBones) {
      boneLines.visible = true;
      const attr = boneLines.geometry.attributes.position as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;

      let idx = 0;
      for (const [startId, endId] of BONE_CONNECTIONS) {
        const p1 = currentMarkers[startId];
        const p2 = currentMarkers[endId];
        if (p1 && p2) {
          arr[idx++] = p1.x;
          arr[idx++] = p1.y;
          arr[idx++] = p1.z;
          arr[idx++] = p2.x;
          arr[idx++] = p2.y;
          arr[idx++] = p2.z;
        } else {
          idx += 6;
        }
      }
      attr.needsUpdate = true;
    } else if (boneLines) {
      boneLines.visible = false;
    }
  }, [currentMarkers, selectedMarkerId, showMarkers, showBones]);

  // 5. Pointer and touch drag interaction
  const getPointerPos = (e: React.PointerEvent | PointerEvent) => {
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const { x, y } = getPointerPos(e);
    mouseRef.current.set(x, y);

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const markerMeshes = Array.from(markerMeshesMapRef.current.values()).filter((m) => m.visible);
    const intersects = raycasterRef.current.intersectObjects(markerMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const markerId = hit.object.userData.markerId as MarkerId;
      if (!markerId) return;

      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      draggingIdRef.current = markerId;
      onSelectMarker(markerId);

      // Disable camera orbiting while dragging
      controlsRef.current.enabled = false;

      // Create a drag plane passing through the marker and facing the camera
      const cameraDir = new THREE.Vector3();
      cameraRef.current.getWorldDirection(cameraDir).negate();
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, hit.object.position);

      // Calculate intersection on plane & offset
      const planeIntersect = new THREE.Vector3();
      raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, planeIntersect);
      dragOffsetRef.current.copy(hit.object.position).sub(planeIntersect);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = getPointerPos(e);
    mouseRef.current.set(x, y);

    if (draggingIdRef.current && cameraRef.current) {
      // Actively dragging a marker
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const planeIntersect = new THREE.Vector3();
      if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, planeIntersect)) {
        const newPos = planeIntersect.add(dragOffsetRef.current);

        // Bound marker within reasonable workspace
        newPos.y = Math.max(0.0, Math.min(2.4, newPos.y));
        newPos.x = Math.max(-1.2, Math.min(1.2, newPos.x));
        newPos.z = Math.max(-1.2, Math.min(1.2, newPos.z));

        // Create updated copy of markers
        const updated: MarkerPositions = {} as MarkerPositions;
        for (const k in currentMarkers) {
          const key = k as MarkerId;
          updated[key] = currentMarkers[key].clone();
        }

        RiggingSystem.applySymmetry(updated, draggingIdRef.current, newPos, useSymmetry);
        onChangeMarkers(updated);
      }
    } else if (cameraRef.current) {
      // Hover feedback
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const markerMeshes = Array.from(markerMeshesMapRef.current.values()).filter((m) => m.visible);
      const intersects = raycasterRef.current.intersectObjects(markerMeshes, false);
      if (intersects.length > 0) {
        const id = intersects[0].object.userData.markerId as MarkerId;
        setHoveredMarker(id);
      } else {
        setHoveredMarker(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingIdRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore if already released
      }
      draggingIdRef.current = null;
    }
    if (controlsRef.current) {
      controlsRef.current.enabled = true;
    }
  };

  const activeDef = selectedMarkerId
    ? MARKER_DEFINITIONS.find((m) => m.id === selectedMarkerId)
    : null;

  return (
    <div className="relative w-full h-full min-h-[380px] bg-slate-950 rounded-2xl overflow-hidden select-none border border-slate-800 shadow-inner">
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full cursor-${hoveredMarker ? 'grab' : 'default'} ${
          draggingIdRef.current ? 'cursor-grabbing' : ''
        }`}
      />

      {/* Floating Active Joint HUD Indicator */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5 z-10">
        {activeDef ? (
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-500/50 shadow-lg flex items-center gap-2">
            <div
              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/50"
              style={{ backgroundColor: activeDef.color }}
            />
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{activeDef.label}</span>
                {useSymmetry && activeDef.pairedId && (
                  <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded font-semibold">
                    Mirrored
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                X: {currentMarkers[activeDef.id]?.x.toFixed(2)} | Y:{' '}
                {currentMarkers[activeDef.id]?.y.toFixed(2)} | Z:{' '}
                {currentMarkers[activeDef.id]?.z.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-700/60 text-[11px] text-slate-300">
            Click or drag any joint marker on the character
          </div>
        )}
      </div>

      {/* Camera Preset Quick Bar */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-xl z-10">
        <button
          type="button"
          onClick={() => applyCameraPreset('front')}
          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
        >
          Front
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('side')}
          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
        >
          Side
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('back')}
          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => applyCameraPreset('perspective')}
          className="px-2 py-1 text-[11px] font-bold rounded-lg bg-sky-600/30 border border-sky-500/40 hover:bg-sky-600 text-sky-200 hover:text-white transition-colors cursor-pointer"
        >
          3D Angle
        </button>
      </div>

      {/* Navigation Hint */}
      <div className="absolute bottom-3 left-3 text-[10px] text-slate-400 pointer-events-none bg-slate-900/70 px-2 py-0.5 rounded backdrop-blur-sm">
        Left-click + drag: Move joint &bull; Right-click / scroll: Orbit &amp; Zoom
      </div>
    </div>
  );
};

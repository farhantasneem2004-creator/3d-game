import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AutoRigger } from '../game/AutoRigger';
import { RiggingSystem, MarkerPositions } from '../game/RiggingSystem';
import { WeaponSystem, WEAPON_REGISTRY, WeaponId, WEAPON_ORDER } from '../game/Weapons';
import {
  WeaponAttachmentConfig,
  applySocketTransform,
} from '../game/WeaponAttachment';

export interface WeaponAttachmentCanvasProps {
  modelGroup: THREE.Group | null;
  currentMarkers?: MarkerPositions;
  attachmentConfig: WeaponAttachmentConfig;
  activeWeaponId: WeaponId;
  cameraPreset: 'front' | 'side' | 'back' | 'free';
  testPose: 'aim' | 'carry' | 'reload' | 'walk';
  showSocketGizmo?: boolean;
}

export const WeaponAttachmentCanvas: React.FC<WeaponAttachmentCanvasProps> = ({
  modelGroup,
  currentMarkers,
  attachmentConfig,
  activeWeaponId,
  cameraPreset,
  testPose,
  showSocketGizmo = true,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const characterRootRef = useRef<THREE.Group | null>(null);
  const riggedCharRef = useRef<any>(null);
  const weaponSystemRef = useRef<WeaponSystem | null>(null);
  const socketNodeRef = useRef<THREE.Group | null>(null);
  const socketGizmoRef = useRef<THREE.AxesHelper | null>(null);

  const animTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  // 1. Initialize Scene & Viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d); // Deep cyber dark
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 50);
    camera.position.set(0.65, 1.25, 1.25);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0.28, 1.05, 0.15); // Focused around character's right hand
    controls.minDistance = 0.2;
    controls.maxDistance = 6.0;
    controlsRef.current = controls;

    // Studio Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xdbeafe, 1.3);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.1);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xa855f7, 0.8, 8);
    fillLight.position.set(0.2, 1.0, 0.6);
    scene.add(fillLight);

    // Subtle Ground Grid
    const grid = new THREE.GridHelper(8, 32, 0x00f0ff, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Animation Loop
    let lastTime = performance.now();
    const renderLoop = () => {
      animFrameRef.current = requestAnimationFrame(renderLoop);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      animTimeRef.current += dt;

      // Animate rigged character based on selected pose
      if (riggedCharRef.current) {
        const isAim = testPose === 'aim';
        const isCarry = testPose === 'carry';
        const isReload = testPose === 'reload';
        const isWalk = testPose === 'walk';

        AutoRigger.animateRig(riggedCharRef.current, animTimeRef.current, {
          isMoving: isWalk,
          isRunning: false,
          isGrounded: true,
          isAttacking: false,
          isAiming: isAim,
          isShooting: false,
          isReloading: isReload,
          aimPitch: 0,
          speed: isWalk ? 3.0 : 0,
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };
    renderLoop();

    // Resize Observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // 2. Build or Rebuild Character Hierarchy with Weapon Attachment
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up existing character root if any
    if (characterRootRef.current) {
      scene.remove(characterRootRef.current);
      characterRootRef.current = null;
      riggedCharRef.current = null;
      socketNodeRef.current = null;
    }

    const charRoot = new THREE.Group();
    charRoot.name = 'AttachmentPreviewCharacter';
    scene.add(charRoot);
    characterRootRef.current = charRoot;

    // Clone or use source model
    let characterModel: THREE.Group;
    if (modelGroup) {
      characterModel = modelGroup.clone(true);
    } else {
      // Default placeholder mannequin
      characterModel = new THREE.Group();
    }

    const markers = currentMarkers || RiggingSystem.getInitialMarkers();

    try {
      const rig = AutoRigger.rigHumanoid(characterModel, markers);
      riggedCharRef.current = rig;
      charRoot.add(rig.rigGroup);

      // Weapon System
      const ws = new WeaponSystem();
      weaponSystemRef.current = ws;

      // Create socket on right hand bone
      const rightHand = rig.bones.rightHand;
      const socket = new THREE.Group();
      socket.name = 'PreviewWeaponSocket';
      applySocketTransform(socket, attachmentConfig);
      rightHand.add(socket);
      socketNodeRef.current = socket;

      // Socket Visual Gizmo
      const gizmo = new THREE.AxesHelper(0.12);
      gizmo.name = 'SocketAxesHelper';
      gizmo.visible = showSocketGizmo;
      socket.add(gizmo);
      socketGizmoRef.current = gizmo;

      // Attach weapon
      socket.add(ws.weaponContainer);

      // Set active weapon
      const idx = WEAPON_ORDER.indexOf(activeWeaponId);
      if (idx !== -1) {
        ws.switchWeapon(idx);
      }
    } catch (err) {
      console.warn('Failed to construct attachment preview character:', err);
    }
  }, [modelGroup, currentMarkers]);

  // 3. Update Socket Transform Live as attachmentConfig changes
  useEffect(() => {
    if (socketNodeRef.current) {
      applySocketTransform(socketNodeRef.current, attachmentConfig);
    }
  }, [attachmentConfig]);

  // 4. Update Active Weapon
  useEffect(() => {
    if (weaponSystemRef.current) {
      const idx = WEAPON_ORDER.indexOf(activeWeaponId);
      if (idx !== -1) {
        weaponSystemRef.current.switchWeapon(idx);
      }
    }
  }, [activeWeaponId]);

  // 5. Update Gizmo Visibility
  useEffect(() => {
    if (socketGizmoRef.current) {
      socketGizmoRef.current.visible = showSocketGizmo;
    }
  }, [showSocketGizmo]);

  // 6. Handle Camera Presets
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    // Focus around right hand
    const target = new THREE.Vector3(0.28, 1.05, 0.15);
    controls.target.copy(target);

    switch (cameraPreset) {
      case 'front':
        // Front view looking into chest & right hand
        camera.position.set(0.28, 1.05, 0.95);
        break;
      case 'side':
        // Right side profile view inspecting barrel alignment
        camera.position.set(1.15, 1.05, 0.15);
        break;
      case 'back':
        // Over-the-shoulder view looking forward with gun sightline
        camera.position.set(0.18, 1.25, -0.65);
        break;
      case 'free':
      default:
        camera.position.set(0.65, 1.25, 0.95);
        break;
    }
    controls.update();
  }, [cameraPreset]);

  return (
    <div className="relative w-full h-full min-h-[350px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-700/80">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Viewport Overlay Info */}
      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 pointer-events-none text-xs flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="font-bold text-slate-200">
          Socket Preview: <span className="text-cyan-300 capitalize">{activeWeaponId}</span>
        </span>
        <span className="text-[10px] text-slate-400">({cameraPreset} view)</span>
      </div>

      {/* Orbit Hint */}
      <div className="absolute bottom-2.5 right-3 bg-slate-900/70 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 pointer-events-none">
        Drag to Rotate • Scroll to Zoom • Right-click to Pan
      </div>
    </div>
  );
};

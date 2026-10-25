import * as THREE from 'three';

export interface FlyingVehicle {
  mesh: THREE.Group;
  speed: number;
  minZ: number;
  maxZ: number;
  direction: number;
}

export class CyberpunkCity {
  public group: THREE.Group;
  private flyingVehicles: FlyingVehicle[] = [];
  private beaconLights: THREE.Mesh[] = [];
  private holoBillboards: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CyberpunkCityEnvironment';

    this.buildSkyline();
    this.buildFlyingTraffic();
    this.buildHolographicBillboards();
  }

  /**
   * Builds dense cyberpunk skyscrapers at safe distances from the gameplay platform track
   */
  private buildSkyline() {
    // Shared materials for performance
    const darkBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1d,
      roughness: 0.6,
      metalness: 0.8,
    });

    const obsidianBuildingMat = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.4,
      metalness: 0.9,
    });

    const neonCyanMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.5,
    });

    const neonMagentaMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 0.9,
      roughness: 0.2,
      metalness: 0.5,
    });

    const neonPurpleMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.5,
    });

    const neonYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xfacc15,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.5,
    });

    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Create a procedural window pattern texture for skyscraper facades
    const windowCanvas = document.createElement('canvas');
    windowCanvas.width = 128;
    windowCanvas.height = 256;
    const ctx = windowCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, 128, 256);
      // Draw grid of lit and unlit windows
      for (let y = 8; y < 250; y += 16) {
        for (let x = 6; x < 122; x += 12) {
          const rand = Math.random();
          if (rand > 0.45) {
            ctx.fillStyle = rand > 0.85 ? '#00f0ff' : (rand > 0.7 ? '#ff007f' : '#fef08a');
            ctx.fillRect(x, y, 7, 10);
          }
        }
      }
    }
    const windowTex = new THREE.CanvasTexture(windowCanvas);
    windowTex.wrapS = THREE.RepeatWrapping;
    windowTex.wrapT = THREE.RepeatWrapping;

    const facadeMat = new THREE.MeshStandardMaterial({
      color: 0x090d1a,
      emissive: 0x1e3a5f,
      emissiveIntensity: 0.35,
      roughness: 0.5,
      metalness: 0.8,
      map: windowTex,
    });

    // Skyscraper cluster layout specs
    // Distanced left & right from player track (X in [-65, -15] and [15, 65], Z in [-25, 130])
    const buildingsConfig: Array<{
      x: number;
      z: number;
      w: number;
      d: number;
      h: number;
      accent: 'cyan' | 'magenta' | 'purple' | 'yellow';
    }> = [
      // Left Skyline Cluster (Near & Mid)
      { x: -22, z: -10, w: 10, d: 10, h: 48, accent: 'cyan' },
      { x: -35, z: 5, w: 14, d: 12, h: 65, accent: 'magenta' },
      { x: -20, z: 20, w: 8, d: 9, h: 42, accent: 'cyan' },
      { x: -32, z: 35, w: 12, d: 12, h: 58, accent: 'purple' },
      { x: -24, z: 55, w: 9, d: 11, h: 50, accent: 'cyan' },
      { x: -38, z: 75, w: 16, d: 14, h: 72, accent: 'magenta' },
      { x: -22, z: 95, w: 11, d: 10, h: 54, accent: 'yellow' },
      { x: -34, z: 115, w: 14, d: 13, h: 62, accent: 'cyan' },

      // Right Skyline Cluster (Near & Mid)
      { x: 22, z: -12, w: 11, d: 11, h: 52, accent: 'magenta' },
      { x: 36, z: 8, w: 13, d: 12, h: 68, accent: 'cyan' },
      { x: 21, z: 24, w: 9, d: 8, h: 44, accent: 'purple' },
      { x: 34, z: 40, w: 12, d: 14, h: 60, accent: 'yellow' },
      { x: 23, z: 60, w: 10, d: 9, h: 46, accent: 'magenta' },
      { x: 37, z: 80, w: 15, d: 13, h: 74, accent: 'cyan' },
      { x: 21, z: 100, w: 9, d: 11, h: 52, accent: 'purple' },
      { x: 35, z: 120, w: 14, d: 12, h: 66, accent: 'cyan' },

      // Distant Mega-Structures (Deep Background Horizon)
      { x: -55, z: 20, w: 22, d: 20, h: 95, accent: 'cyan' },
      { x: -60, z: 70, w: 26, d: 24, h: 110, accent: 'purple' },
      { x: 55, z: 25, w: 24, d: 22, h: 98, accent: 'magenta' },
      { x: 62, z: 75, w: 28, d: 25, h: 115, accent: 'cyan' },
      { x: 0, z: 150, w: 32, d: 24, h: 120, accent: 'magenta' },
      { x: -28, z: 155, w: 20, d: 18, h: 88, accent: 'cyan' },
      { x: 28, z: 155, w: 20, d: 18, h: 92, accent: 'purple' },
    ];

    for (const b of buildingsConfig) {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, b.h / 2 - 15, b.z); // Root grounded below platform view

      // Main tower body
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const bMesh = new THREE.Mesh(geo, facadeMat);
      bMesh.castShadow = false;
      bMesh.receiveShadow = true;
      bGroup.add(bMesh);

      // Accent material
      let accentMat = neonCyanMat;
      if (b.accent === 'magenta') accentMat = neonMagentaMat;
      else if (b.accent === 'purple') accentMat = neonPurpleMat;
      else if (b.accent === 'yellow') accentMat = neonYellowMat;

      // Vertical neon corner accent stripes
      const edgeGeo = new THREE.BoxGeometry(0.2, b.h, 0.2);
      const edgeOffsets = [
        [-b.w / 2, -b.d / 2],
        [b.w / 2, -b.d / 2],
        [-b.w / 2, b.d / 2],
        [b.w / 2, b.d / 2],
      ];
      for (const [ox, oz] of edgeOffsets) {
        const edge = new THREE.Mesh(edgeGeo, accentMat);
        edge.position.set(ox, 0, oz);
        bGroup.add(edge);
      }

      // Rooftop rooftop antenna / spire with blinking warning beacon
      const spireH = 6 + Math.random() * 8;
      const spireGeo = new THREE.CylinderGeometry(0.1, 0.4, spireH, 6);
      const spire = new THREE.Mesh(spireGeo, darkBuildingMat);
      spire.position.set(0, b.h / 2 + spireH / 2, 0);
      bGroup.add(spire);

      // Glowing beacon orb at tip of spire
      const beaconGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: b.accent === 'cyan' ? 0x00f0ff : 0xff0055,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, b.h / 2 + spireH, 0);
      bGroup.add(beacon);
      this.beaconLights.push(beacon);

      // Horizontal neon accent belt around tower midpoint
      const beltGeo = new THREE.BoxGeometry(b.w + 0.25, 0.35, b.d + 0.25);
      const belt = new THREE.Mesh(beltGeo, accentMat);
      belt.position.set(0, (Math.random() - 0.2) * (b.h * 0.3), 0);
      bGroup.add(belt);

      this.group.add(bGroup);
    }

    // Distant cyber grid horizon floor (far below the platforms)
    const gridHelper = new THREE.GridHelper(260, 52, 0x00f0ff, 0x1e1b4b);
    gridHelper.position.set(0, -14, 50);
    this.group.add(gridHelper);
  }

  /**
   * Holographic neon billboards floating high above the skyline
   */
  private buildHolographicBillboards() {
    const signs = [
      { text: 'NEO-TOKYO // 2099', x: -16, y: 22, z: 12, rotY: 0.35, color: '#00f0ff' },
      { text: 'NEXUS CYBERNETICS', x: 18, y: 26, z: 32, rotY: -0.4, color: '#ff007f' },
      { text: 'QUANTUM AI CORE', x: -18, y: 28, z: 62, rotY: 0.45, color: '#a855f7' },
      { text: 'SYNTH-CORP // GO BEYOND', x: 19, y: 30, z: 92, rotY: -0.3, color: '#facc15' },
    ];

    signs.forEach((s) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(10, 15, 30, 0.9)';
        ctx.fillRect(0, 0, 512, 128);

        // Neon border
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 6;
        ctx.strokeRect(6, 6, 500, 116);

        // Neon Glow Text
        ctx.font = 'bold 34px monospace';
        ctx.fillStyle = s.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 18;
        ctx.fillText(s.text, 256, 64);
      }

      const tex = new THREE.CanvasTexture(canvas);
      const signMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      });

      const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.3), signMat);
      signMesh.position.set(s.x, s.y, s.z);
      signMesh.rotation.y = s.rotY;

      // Outer neon frame
      const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(s.color) });
      const frameGeo = new THREE.BoxGeometry(9.2, 2.5, 0.15);
      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.set(s.x, s.y, s.z - 0.1);
      frame.rotation.y = s.rotY;

      this.group.add(frame);
      this.group.add(signMesh);
      this.holoBillboards.push(signMesh);
    });
  }

  /**
   * Distant flying vehicles cruising on high-altitude sky traffic corridors
   */
  private buildFlyingTraffic() {
    const lanes = [
      { y: 18, x: -14, minZ: -30, maxZ: 140, speed: 18, dir: 1, color: 0x00f0ff },
      { y: 24, x: -28, minZ: -30, maxZ: 140, speed: 24, dir: -1, color: 0xff0055 },
      { y: 22, x: 15, minZ: -30, maxZ: 140, speed: 19, dir: -1, color: 0xff007f },
      { y: 30, x: 28, minZ: -30, maxZ: 140, speed: 26, dir: 1, color: 0x00f0ff },
    ];

    for (let laneIdx = 0; laneIdx < lanes.length; laneIdx++) {
      const lane = lanes[laneIdx];
      // 3 vehicles per lane spaced along Z
      for (let i = 0; i < 3; i++) {
        const vehicleGroup = new THREE.Group();
        const initialZ = lane.minZ + ((lane.maxZ - lane.minZ) / 3) * i + Math.random() * 8;
        vehicleGroup.position.set(lane.x, lane.y, initialZ);

        // Sleek aerodynamic hover vehicle pod
        const bodyGeo = new THREE.BoxGeometry(1.2, 0.5, 3.2);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: 0x0b1120,
          roughness: 0.3,
          metalness: 0.9,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        vehicleGroup.add(body);

        // Headlight (Cyan / Yellow)
        const headGeo = new THREE.SphereGeometry(0.2, 6, 6);
        const headMat = new THREE.MeshBasicMaterial({ color: lane.color });
        const headlightL = new THREE.Mesh(headGeo, headMat);
        headlightL.position.set(-0.4, 0, lane.dir > 0 ? 1.6 : -1.6);
        const headlightR = new THREE.Mesh(headGeo, headMat);
        headlightR.position.set(0.4, 0, lane.dir > 0 ? 1.6 : -1.6);
        vehicleGroup.add(headlightL);
        vehicleGroup.add(headlightR);

        // Taillight trails (Red / Magenta)
        const tailGeo = new THREE.SphereGeometry(0.18, 6, 6);
        const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const tailL = new THREE.Mesh(tailGeo, tailMat);
        tailL.position.set(-0.4, 0, lane.dir > 0 ? -1.6 : 1.6);
        const tailR = new THREE.Mesh(tailGeo, tailMat);
        tailR.position.set(0.4, 0, lane.dir > 0 ? -1.6 : 1.6);
        vehicleGroup.add(tailL);
        vehicleGroup.add(tailR);

        // Subtle vehicle under-glow
        const underGlow = new THREE.PointLight(lane.color, 0.6, 6);
        underGlow.position.set(0, -0.4, 0);
        vehicleGroup.add(underGlow);

        this.group.add(vehicleGroup);
        this.flyingVehicles.push({
          mesh: vehicleGroup,
          speed: lane.speed + (Math.random() - 0.5) * 3,
          minZ: lane.minZ,
          maxZ: lane.maxZ,
          direction: lane.dir,
        });
      }
    }
  }

  /**
   * Update animated city elements: sky traffic and pulsing neon beacons
   */
  public update(dt: number, time: number) {
    // 1. Move sky traffic along designated aerial corridors
    for (const v of this.flyingVehicles) {
      v.mesh.position.z += v.speed * v.direction * dt;

      // Wrap around corridor bounds
      if (v.direction > 0 && v.mesh.position.z > v.maxZ) {
        v.mesh.position.z = v.minZ;
      } else if (v.direction < 0 && v.mesh.position.z < v.minZ) {
        v.mesh.position.z = v.maxZ;
      }

      // Gentle vertical hover sway
      v.mesh.position.y += Math.sin(time * 3.0 + v.mesh.position.z) * 0.008;
    }

    // 2. Pulse beacon warning lights on building spires
    const blink = Math.sin(time * 5.0) > 0.3;
    for (const b of this.beaconLights) {
      b.visible = blink;
    }

    // 3. Subtle floating flicker on holographic billboards
    for (const sign of this.holoBillboards) {
      const mat = sign.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.85 + Math.sin(time * 8.0) * 0.08;
    }
  }
}

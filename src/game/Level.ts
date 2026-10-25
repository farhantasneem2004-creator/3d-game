import * as THREE from 'three';

export interface PlatformData {
  mesh: THREE.Mesh;
  bbox: THREE.Box3;
  topY: number;
  width: number;
  height: number;
  depth: number;
  isHazard?: boolean;
  isMoving?: boolean;
  moveAxis?: 'x' | 'y' | 'z';
  moveDistance?: number;
  moveSpeed?: number;
  initialPos?: THREE.Vector3;
  currentVelocity?: THREE.Vector3;
}

export interface CoinData {
  group: THREE.Group;
  initialY: number;
  collected: boolean;
  radius: number;
}

export interface CheckpointData {
  id: number;
  position: THREE.Vector3;
  pylonMesh: THREE.Mesh;
  crystalMesh: THREE.Mesh;
  beamMesh: THREE.Mesh;
  light: THREE.PointLight;
  activated: boolean;
}

export interface EnemyData {
  group: THREE.Group;
  droneMesh: THREE.Mesh;
  eyeMesh: THREE.Mesh;
  initialX: number;
  initialY: number;
  minX: number;
  maxX: number;
  speed: number;
  direction: number;
  alive: boolean;
  radius: number;
  health: number;
  maxHealth: number;
  hitReactionTimer: number;
  deathAnimTimer: number;
  isTargetDummy?: boolean;
  takeDamage?: (dmg: number) => boolean;
}

export class Level {
  public group: THREE.Group;
  public platforms: PlatformData[] = [];
  public coins: CoinData[] = [];
  public checkpoints: CheckpointData[] = [];
  public enemies: EnemyData[] = [];
  public finishPortal: {
    group: THREE.Group;
    crystal: THREE.Mesh;
    position: THREE.Vector3;
    triggerRadius: number;
    light: THREE.PointLight;
  } | null = null;

  public startPosition = new THREE.Vector3(0, 0.6, 0);

  // Mild graded cyberpunk platform materials (Matte satin, no harsh specular glare)
  private slatePlatformMat: THREE.MeshStandardMaterial;
  private obsidianPlatformMat: THREE.MeshStandardMaterial;
  private carbonPlatformMat: THREE.MeshStandardMaterial;
  private hazardPlatformMat: THREE.MeshStandardMaterial;
  private movingPlatformMat: THREE.MeshStandardMaterial;
  private coinMat: THREE.MeshStandardMaterial;
  private goldTrimMat: THREE.MeshStandardMaterial;
  private neonCyanTrimMat: THREE.MeshStandardMaterial;
  private neonMagentaTrimMat: THREE.MeshStandardMaterial;
  private neonPurpleTrimMat: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();

    // Mild graded dark cyberpunk materials: deep slate-indigo with soft diffuse response
    this.slatePlatformMat = new THREE.MeshStandardMaterial({
      color: 0x18172b, // Mild graded indigo-slate
      roughness: 0.85,  // Matte satin prevents white specular washouts
      metalness: 0.12,
    });

    this.obsidianPlatformMat = new THREE.MeshStandardMaterial({
      color: 0x131322, // Deep twilight obsidian
      roughness: 0.82,
      metalness: 0.15,
    });

    this.carbonPlatformMat = new THREE.MeshStandardMaterial({
      color: 0x1c1a32, // Soft carbon-violet composite
      roughness: 0.88,
      metalness: 0.1,
    });

    this.hazardPlatformMat = new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      emissive: 0xdc2626,
      emissiveIntensity: 0.45,
      roughness: 0.75,
      metalness: 0.2,
    });

    this.movingPlatformMat = new THREE.MeshStandardMaterial({
      color: 0x0f233a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.78,
      metalness: 0.2,
    });

    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.9,
    });

    this.goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.neonCyanTrimMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.neonMagentaTrimMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.neonPurpleTrimMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0xa855f7,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.5,
    });

    this.buildLevel();
  }

  /**
   * Calculates the exact ground platform surface height at coordinates (x, z)
   */
  public getGroundHeightAt(x: number, z: number, charRadius = 0.4): { groundY: number; platform: PlatformData | null } {
    let highest = -Infinity;
    let hit: PlatformData | null = null;
    for (const p of this.platforms) {
      const b = p.bbox;
      const minX = b.min.x - charRadius * 0.6;
      const maxX = b.max.x + charRadius * 0.6;
      const minZ = b.min.z - charRadius * 0.6;
      const maxZ = b.max.z + charRadius * 0.6;
      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
        if (p.topY > highest) {
          highest = p.topY;
          hit = p;
        }
      }
    }
    return { groundY: highest, platform: hit };
  }

  private addPlatform(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    type: 'grass' | 'stone' | 'wood' | 'hazard' | 'moving' = 'grass',
    movingConfig?: { axis: 'x' | 'y' | 'z'; dist: number; speed: number }
  ): PlatformData {
    const geo = new THREE.BoxGeometry(w, h, d);
    let mat = this.slatePlatformMat;
    let trimMat = this.neonCyanTrimMat;

    if (type === 'stone') {
      mat = this.obsidianPlatformMat;
      trimMat = this.neonCyanTrimMat;
    } else if (type === 'wood') {
      mat = this.carbonPlatformMat;
      trimMat = this.neonPurpleTrimMat;
    } else if (type === 'hazard') {
      mat = this.hazardPlatformMat;
      trimMat = this.hazardPlatformMat;
    } else if (type === 'moving') {
      mat = this.movingPlatformMat;
      trimMat = this.goldTrimMat;
    }

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Glowing platform perimeter trim on vertical sides (recessed below top surface to guarantee 0% Z-fighting)
    const trimGeo = new THREE.BoxGeometry(w + 0.04, 0.04, d + 0.04);
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(0, h / 2 - 0.05, 0); // 5cm below top surface
    mesh.add(trim);

    this.group.add(mesh);

    const topY = y + h / 2;
    const bbox = new THREE.Box3(
      new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
      new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2)
    );

    const pData: PlatformData = {
      mesh,
      bbox,
      topY,
      width: w,
      height: h,
      depth: d,
      isHazard: type === 'hazard',
      isMoving: type === 'moving',
      moveAxis: movingConfig?.axis,
      moveDistance: movingConfig?.dist,
      moveSpeed: movingConfig?.speed,
      initialPos: new THREE.Vector3(x, y, z),
      currentVelocity: new THREE.Vector3(),
    };

    this.platforms.push(pData);
    return pData;
  }

  private addCoin(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Coin geometry: stylized faceted thick coin
    const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12);
    coinGeo.rotateX(Math.PI / 2);
    const coinMesh = new THREE.Mesh(coinGeo, this.coinMat);
    coinMesh.castShadow = true;
    group.add(coinMesh);

    // Subtle star emblem in center
    const starGeo = new THREE.OctahedronGeometry(0.18);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(starGeo, starMat);
    group.add(star);

    this.group.add(group);
    this.coins.push({
      group,
      initialY: y,
      collected: false,
      radius: 0.7,
    });
  }

  private addCheckpoint(id: number, x: number, y: number, z: number) {
    // Pylon base
    const pylonGeo = new THREE.CylinderGeometry(0.4, 0.55, 1.2, 8);
    const pylonMesh = new THREE.Mesh(pylonGeo, this.obsidianPlatformMat);
    pylonMesh.position.set(x, y + 0.6, z);
    pylonMesh.castShadow = true;

    // Glowing energy crystal atop pylon
    const crystalGeo = new THREE.OctahedronGeometry(0.35);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // dormant amber
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    });
    const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    crystalMesh.position.set(0, 1.1, 0);
    pylonMesh.add(crystalMesh);

    // Light beam (invisible until activated)
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.4, 6.0, 12);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 3.8, 0);
    pylonMesh.add(beamMesh);

    // Point light
    const light = new THREE.PointLight(0xf59e0b, 1.2, 5);
    light.position.set(0, 1.3, 0);
    pylonMesh.add(light);

    this.group.add(pylonMesh);

    this.checkpoints.push({
      id,
      position: new THREE.Vector3(x, y + 0.2, z),
      pylonMesh,
      crystalMesh,
      beamMesh,
      light,
      activated: false,
    });
  }

  public addEnemy(x: number, y: number, z: number, patrolDistance = 3.5, isTargetDummy = false): EnemyData {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Patrol Drone body (robotic floating spike droid)
    const bodyGeo = new THREE.SphereGeometry(0.45, 12, 10);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isTargetDummy ? 0x64748b : 0x334155,
      roughness: 0.45,
      metalness: 0.6,
    });
    const droneMesh = new THREE.Mesh(bodyGeo, bodyMat);
    droneMesh.castShadow = true;
    group.add(droneMesh);

    // Armor spikes / target fins
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const spikeGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
      const spikeMat = new THREE.MeshStandardMaterial({
        color: isTargetDummy ? 0xf59e0b : 0xef4444,
        metalness: 0.7,
      });
      const spike = new THREE.Mesh(spikeGeo, spikeMat);
      spike.position.set(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42);
      spike.rotation.z = -Math.PI / 2;
      spike.rotation.y = angle;
      group.add(spike);
    }

    // Glowing sensor eye
    const eyeGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: isTargetDummy ? 0xf59e0b : 0xff0044,
      emissive: isTargetDummy ? 0xf59e0b : 0xff0044,
      emissiveIntensity: 0.9,
    });
    const eyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
    eyeMesh.position.set(0, 0, 0.42);
    group.add(eyeMesh);

    this.group.add(group);

    const enemy: EnemyData = {
      group,
      droneMesh,
      eyeMesh,
      initialX: x,
      initialY: y,
      minX: x - patrolDistance,
      maxX: x + patrolDistance,
      speed: patrolDistance > 0.5 ? 1.8 : 0,
      direction: 1,
      alive: true,
      radius: 0.65,
      health: isTargetDummy ? 40 : 50,
      maxHealth: isTargetDummy ? 40 : 50,
      hitReactionTimer: 0,
      deathAnimTimer: 0,
      isTargetDummy,
    };

    enemy.takeDamage = (amount: number) => {
      if (!enemy.alive) return false;
      enemy.health -= amount;
      enemy.hitReactionTimer = 0.2;
      (droneMesh.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
      if (enemy.health <= 0) {
        enemy.alive = false;
        enemy.deathAnimTimer = 0.45;
        return true;
      }
      return false;
    };

    this.enemies.push(enemy);
    return enemy;
  }

  private buildLevel() {
    // ------------------------------------------------------------------
    // ZONE 1: Starting Haven & Shooting Range Test
    // ------------------------------------------------------------------
    // Start Platform (Safe, wide)
    this.addPlatform(0, 0, 0, 8, 1.2, 8, 'grass');
    // Start Checkpoint (Default active)
    this.addCheckpoint(0, 0, 0.6, -2.5);

    // Initial Stepping Stones forward
    this.addPlatform(0, 0.4, 7, 3.5, 1.0, 3.5, 'stone');
    this.addCoin(0, 1.6, 7);

    // Target Dummies on pedestals for initial weapon testing!
    this.addEnemy(3.5, 2.0, 7, 0, true); // Target dummy 1

    this.addPlatform(3.5, 0.8, 11, 3.0, 1.0, 3.0, 'grass');
    this.addCoin(3.5, 2.0, 11);

    this.addPlatform(-3.5, 1.2, 15, 3.2, 1.0, 3.2, 'grass');
    this.addCoin(-3.5, 2.4, 15);
    this.addEnemy(-3.5, 2.4, 15, 0, true); // Target dummy 2

    // ------------------------------------------------------------------
    // ZONE 2: First Moving Platform & Bridge
    // ------------------------------------------------------------------
    // Horizontally oscillating elevator platform across gap
    this.addPlatform(0, 1.5, 20.5, 3.0, 0.6, 3.0, 'moving', {
      axis: 'x',
      dist: 3.5,
      speed: 1.6,
    });
    this.addCoin(0, 2.5, 20.5);

    // Landing Platform with Enemy Patrol 1
    this.addPlatform(0, 2.0, 26, 9, 1.0, 5, 'stone');
    this.addCoin(-2.5, 3.2, 26);
    this.addCoin(2.5, 3.2, 26);
    this.addEnemy(0, 3.0, 26, 2.8);

    // Checkpoint 1 (Midpoint 1)
    this.addCheckpoint(1, 3.2, 2.5, 26);

    // ------------------------------------------------------------------
    // ZONE 3: Hazard Gauntlet & Vertical Lift
    // ------------------------------------------------------------------
    // Spikes / Hazard platform in the middle of gap
    this.addPlatform(0, 2.0, 32, 2.5, 0.5, 2.5, 'hazard');

    // Stepping stones around the hazard
    this.addPlatform(-4.0, 2.5, 33, 3.0, 1.0, 3.0, 'wood');
    this.addCoin(-4.0, 3.7, 33);

    this.addPlatform(4.0, 2.5, 33, 3.0, 1.0, 3.0, 'wood');
    this.addCoin(4.0, 3.7, 33);

    // Vertically moving platform
    this.addPlatform(0, 3.0, 39, 3.2, 0.6, 3.2, 'moving', {
      axis: 'y',
      dist: 2.5,
      speed: 1.4,
    });
    this.addCoin(0, 5.0, 39);

    // Upper plateau with second checkpoint & enemy
    this.addPlatform(0, 5.5, 47, 8, 1.2, 7, 'grass');
    this.addCheckpoint(2, 0, 6.1, 44.5);
    this.addCoin(-2.2, 6.8, 47);
    this.addCoin(2.2, 6.8, 47);
    this.addEnemy(0, 6.8, 48.5, 2.5);

    // ------------------------------------------------------------------
    // ZONE 4: Moving Sky Run & Final Approach
    // ------------------------------------------------------------------
    // Synchronized Moving Platform along Z
    this.addPlatform(0, 6.0, 55, 3.0, 0.6, 3.0, 'moving', {
      axis: 'z',
      dist: 3.0,
      speed: 1.8,
    });
    this.addCoin(0, 7.2, 55);

    // Final Floating Islands
    this.addPlatform(-4.5, 6.8, 62, 3.2, 0.8, 3.2, 'stone');
    this.addCoin(-4.5, 8.0, 62);

    this.addPlatform(4.5, 7.4, 66, 3.2, 0.8, 3.2, 'stone');
    this.addCoin(4.5, 8.6, 66);

    // Final Hazard Challenge
    this.addPlatform(0, 7.8, 70, 2.2, 0.5, 2.2, 'hazard');

    // ------------------------------------------------------------------
    // ZONE 5: Finish Platform & Victory Portal
    // ------------------------------------------------------------------
    this.addPlatform(0, 8.0, 77, 9, 1.4, 9, 'grass');

    // Build Grand Finish Portal Arch
    this.buildFinishPortal(0, 8.7, 79);
  }

  private buildFinishPortal(x: number, y: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Arch Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.4, 0.5, 4.2, 10);
    const leftPillar = new THREE.Mesh(pillarGeo, this.goldTrimMat);
    leftPillar.position.set(-2.2, 2.1, 0);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, this.goldTrimMat);
    rightPillar.position.set(2.2, 2.1, 0);
    rightPillar.castShadow = true;
    group.add(rightPillar);

    // Arch Crossbar
    const archGeo = new THREE.BoxGeometry(5.2, 0.6, 0.8);
    const archMesh = new THREE.Mesh(archGeo, this.goldTrimMat);
    archMesh.position.set(0, 4.3, 0);
    group.add(archMesh);

    // Swirling Energy Crystal Portal
    const crystalGeo = new THREE.OctahedronGeometry(1.0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.1,
      metalness: 0.9,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 2.3, 0);
    group.add(crystal);

    // Victory Portal Point Light
    const light = new THREE.PointLight(0x38bdf8, 2.5, 10);
    light.position.set(0, 2.3, 0);
    group.add(light);

    this.group.add(group);

    this.finishPortal = {
      group,
      crystal,
      position: new THREE.Vector3(x, y, z),
      triggerRadius: 2.2,
      light,
    };
  }

  /**
   * Activate a checkpoint
   */
  public activateCheckpoint(id: number): boolean {
    const cp = this.checkpoints.find((c) => c.id === id);
    if (!cp || cp.activated) return false;

    cp.activated = true;
    // Turn crystal into vibrant neon emerald
    const crystalMat = cp.crystalMesh.material as THREE.MeshStandardMaterial;
    crystalMat.color.setHex(0x10b981);
    crystalMat.emissive.setHex(0x059669);
    crystalMat.emissiveIntensity = 0.9;

    // Show light beam
    const beamMat = cp.beamMesh.material as THREE.MeshBasicMaterial;
    beamMat.opacity = 0.55;

    cp.light.color.setHex(0x10b981);
    cp.light.intensity = 2.0;

    return true;
  }

  /**
   * Level update loop:
   * Moves moving platforms, spins coins, animates enemies & portal crystals
   */
  public update(dt: number, totalTime: number) {
    // 1. Moving Platforms
    for (const p of this.platforms) {
      if (p.isMoving && p.initialPos && p.moveDistance && p.moveSpeed && p.moveAxis) {
        const offset = Math.sin(totalTime * p.moveSpeed) * p.moveDistance;
        const prevPos = p.mesh.position.clone();

        if (p.moveAxis === 'x') {
          p.mesh.position.x = p.initialPos.x + offset;
        } else if (p.moveAxis === 'y') {
          p.mesh.position.y = p.initialPos.y + offset;
        } else if (p.moveAxis === 'z') {
          p.mesh.position.z = p.initialPos.z + offset;
        }

        // Compute current platform velocity to carry the player
        if (dt > 0.0001) {
          const rawVel = p.mesh.position.clone().sub(prevPos).divideScalar(dt);
          // Clamp velocity to avoid frame stall physics spikes
          rawVel.clampLength(0, 12);
          p.currentVelocity = rawVel;
        }
        // Update cached bounding box and exact top surface
        p.topY = p.mesh.position.y + p.height / 2;
        p.bbox.min.set(p.mesh.position.x - p.width / 2, p.mesh.position.y - p.height / 2, p.mesh.position.z - p.depth / 2);
        p.bbox.max.set(p.mesh.position.x + p.width / 2, p.mesh.position.y + p.height / 2, p.mesh.position.z + p.depth / 2);
      }
    }

    // 2. Spinning Coins
    for (const c of this.coins) {
      if (!c.collected) {
        c.group.rotation.y += 3.2 * dt;
        c.group.position.y = c.initialY + Math.sin(totalTime * 4.0) * 0.12;
      }
    }

    // 3. Patrolling Enemies & Target Dummies
    for (const e of this.enemies) {
      // Hit reaction flash decay
      if (e.hitReactionTimer > 0) {
        e.hitReactionTimer -= dt;
        if (e.hitReactionTimer <= 0) {
          (e.droneMesh.material as THREE.MeshStandardMaterial).color.setHex(e.isTargetDummy ? 0x64748b : 0x334155);
        }
      }

      if (!e.alive) {
        if (e.deathAnimTimer > 0) {
          e.deathAnimTimer -= dt;
          e.group.scale.multiplyScalar(Math.max(0, 1 - dt * 5));
          e.group.rotation.y += 12 * dt;
          if (e.deathAnimTimer <= 0) {
            e.group.visible = false;
          }
        }
        continue;
      }

      // Patrol movement (if not stationary target dummy)
      if (e.speed > 0.01) {
        e.group.position.x += e.direction * e.speed * dt;
        if (e.group.position.x >= e.maxX) {
          e.group.position.x = e.maxX;
          e.direction = -1;
        } else if (e.group.position.x <= e.minX) {
          e.group.position.x = e.minX;
          e.direction = 1;
        }
      }

      // Hover bobbing
      e.group.position.y = e.initialY + Math.sin(totalTime * 3.5 + e.initialX) * 0.15;
      e.group.rotation.y = e.direction > 0 ? Math.PI / 2 : -Math.PI / 2;
    }

    // 4. Finish Portal Crystal Animation
    if (this.finishPortal) {
      this.finishPortal.crystal.rotation.x += 1.5 * dt;
      this.finishPortal.crystal.rotation.y += 2.0 * dt;
      this.finishPortal.light.intensity = 2.2 + Math.sin(totalTime * 5.0) * 0.8;
    }
  }

  /**
   * Reset level objects for game restart
   */
  public reset() {
    for (const c of this.coins) {
      c.collected = false;
      c.group.visible = true;
    }
    for (const e of this.enemies) {
      e.alive = true;
      e.group.visible = true;
      e.group.scale.set(1, 1, 1);
      e.group.position.x = e.initialX;
      e.direction = 1;
      e.deathAnimTimer = 0;
    }
    for (const cp of this.checkpoints) {
      if (cp.id !== 0) {
        cp.activated = false;
        const crystalMat = cp.crystalMesh.material as THREE.MeshStandardMaterial;
        crystalMat.color.setHex(0xf59e0b);
        crystalMat.emissive.setHex(0xd97706);
        const beamMat = cp.beamMesh.material as THREE.MeshBasicMaterial;
        beamMat.opacity = 0;
        cp.light.color.setHex(0xf59e0b);
        cp.light.intensity = 1.2;
      }
    }
  }
}

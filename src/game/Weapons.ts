import * as THREE from 'three';
import { sound } from './SoundEffects';

export type WeaponId = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper';

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  category: string;
  damage: number;
  fireRate: number; // Seconds per shot
  isAutomatic: boolean;
  magSize: number;
  maxReserveAmmo: number;
  reloadDuration: number;
  effectiveRange: number;
  spread: number; // In radians
  pellets: number; // 1 for standard, 6 for shotgun
  recoilStrength: number;
  tracerColor: number;
  muzzleOffset: THREE.Vector3; // Relative to weapon grip
}

export const WEAPON_REGISTRY: Record<WeaponId, WeaponConfig> = {
  pistol: {
    id: 'pistol',
    name: 'Combat Pistol',
    category: 'Handgun',
    damage: 25,
    fireRate: 0.28,
    isAutomatic: false,
    magSize: 12,
    maxReserveAmmo: 72,
    reloadDuration: 1.1,
    effectiveRange: 45,
    spread: 0.012,
    pellets: 1,
    recoilStrength: 0.035,
    tracerColor: 0x38bdf8, // Cyan
    muzzleOffset: new THREE.Vector3(0, 0.08, -0.32),
  },
  smg: {
    id: 'smg',
    name: 'Micro SMG',
    category: 'Submachine Gun',
    damage: 18,
    fireRate: 0.09, // 660 RPM
    isAutomatic: true,
    magSize: 30,
    maxReserveAmmo: 180,
    reloadDuration: 1.3,
    effectiveRange: 38,
    spread: 0.035,
    pellets: 1,
    recoilStrength: 0.02,
    tracerColor: 0xa855f7, // Purple
    muzzleOffset: new THREE.Vector3(0, 0.07, -0.42),
  },
  rifle: {
    id: 'rifle',
    name: 'Carbine Rifle',
    category: 'Assault Rifle',
    damage: 34,
    fireRate: 0.12, // 500 RPM
    isAutomatic: true,
    magSize: 30,
    maxReserveAmmo: 150,
    reloadDuration: 1.5,
    effectiveRange: 65,
    spread: 0.015,
    pellets: 1,
    recoilStrength: 0.03,
    tracerColor: 0x00f0ff, // High-energy cyan
    muzzleOffset: new THREE.Vector3(0, 0.08, -0.65),
  },
  shotgun: {
    id: 'shotgun',
    name: 'Pump Shotgun',
    category: 'Shotgun',
    damage: 16, // per pellet x 6 = 96 point-blank
    fireRate: 0.75,
    isAutomatic: false,
    magSize: 8,
    maxReserveAmmo: 40,
    reloadDuration: 1.8,
    effectiveRange: 24,
    spread: 0.075,
    pellets: 6,
    recoilStrength: 0.09,
    tracerColor: 0xf59e0b, // Amber
    muzzleOffset: new THREE.Vector3(0, 0.06, -0.62),
  },
  sniper: {
    id: 'sniper',
    name: 'Heavy Sniper',
    category: 'Marksman Rifle',
    damage: 120, // 1-shot kill
    fireRate: 1.15,
    isAutomatic: false,
    magSize: 5,
    maxReserveAmmo: 25,
    reloadDuration: 2.0,
    effectiveRange: 120,
    spread: 0.002, // Ultra pinpoint
    pellets: 1,
    recoilStrength: 0.12,
    tracerColor: 0x10b981, // Emerald green
    muzzleOffset: new THREE.Vector3(0, 0.09, -0.85),
  },
};

export const WEAPON_ORDER: WeaponId[] = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper'];

export interface BulletTracer {
  mesh: THREE.Line;
  startTime: number;
  duration: number;
  active: boolean;
}

export class WeaponSystem {
  public activeIndex: number = 0;
  public activeWeapon: WeaponConfig;
  public ammoInMag: Record<WeaponId, number>;
  public reserveAmmo: Record<WeaponId, number>;

  // Cooldowns and states
  public isReloading: boolean = false;
  public reloadProgress: number = 0; // 0 to 1
  private reloadTimer: number = 0;
  private fireTimer: number = 0;
  private recoilPitch: number = 0;

  // Visual Weapon Meshes
  public weaponContainer: THREE.Group;
  private weaponMeshes: Map<WeaponId, THREE.Group> = new Map();

  // Muzzle flash effects
  private muzzleFlashGroup: THREE.Group;
  private muzzleLight: THREE.PointLight;
  private muzzleFlashTimer: number = 0;

  // Tracers Pool
  private tracerPool: BulletTracer[] = [];
  private tracerGroup: THREE.Group;

  constructor() {
    this.activeWeapon = WEAPON_REGISTRY[WEAPON_ORDER[0]];

    // Initialize ammo pools
    this.ammoInMag = {
      pistol: WEAPON_REGISTRY.pistol.magSize,
      smg: WEAPON_REGISTRY.smg.magSize,
      rifle: WEAPON_REGISTRY.rifle.magSize,
      shotgun: WEAPON_REGISTRY.shotgun.magSize,
      sniper: WEAPON_REGISTRY.sniper.magSize,
    };
    this.reserveAmmo = {
      pistol: WEAPON_REGISTRY.pistol.maxReserveAmmo,
      smg: WEAPON_REGISTRY.smg.maxReserveAmmo,
      rifle: WEAPON_REGISTRY.rifle.maxReserveAmmo,
      shotgun: WEAPON_REGISTRY.shotgun.maxReserveAmmo,
      sniper: WEAPON_REGISTRY.sniper.maxReserveAmmo,
    };

    // Container for active weapon attached to character's hand
    this.weaponContainer = new THREE.Group();
    this.weaponContainer.name = 'EquippedWeaponSocket';

    // Build procedural 3D weapon models
    this.buildWeaponMeshes();

    // Muzzle Flash
    this.muzzleFlashGroup = new THREE.Group();
    this.muzzleFlashGroup.visible = false;
    const flashGeo = new THREE.OctahedronGeometry(0.12);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const flashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashGroup.add(flashMesh);

    this.muzzleLight = new THREE.PointLight(0x38bdf8, 3.5, 7);
    this.muzzleFlashGroup.add(this.muzzleLight);
    this.weaponContainer.add(this.muzzleFlashGroup);

    // Tracer group
    this.tracerGroup = new THREE.Group();
    this.tracerGroup.name = 'BulletTracersPool';
    this.initTracerPool();

    // Set initial weapon visible
    this.updateActiveWeaponMesh();
  }

  /**
   * Initializes high-performance line tracer pool
   */
  private initTracerPool() {
    for (let i = 0; i < 24; i++) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 2,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geom, mat);
      line.visible = false;
      this.tracerGroup.add(line);
      this.tracerPool.push({
        mesh: line,
        startTime: 0,
        duration: 0.08,
        active: false,
      });
    }
  }

  public getTracerGroup(): THREE.Group {
    return this.tracerGroup;
  }

  /**
   * Builds procedural 3D weapon meshes with realistic proportions and sci-fi aesthetic
   */
  private buildWeaponMeshes() {
    // Shared materials
    const gunDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.35,
    });
    const gunAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.25,
    });
    const carbonGripMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.3,
      roughness: 0.7,
    });

    // 1. COMBAT PISTOL
    const pistol = new THREE.Group();
    pistol.name = 'Mesh_pistol';
    // Grip
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.05), carbonGripMat);
    pGrip.position.set(0, -0.05, 0.02);
    pGrip.rotation.x = -0.25;
    pistol.add(pGrip);
    // Slide / Barrel
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.22), gunDarkMat);
    pSlide.position.set(0, 0.04, -0.06);
    pistol.add(pSlide);
    // Top Rail / Sights
    const pSights = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.2), gunAlloyMat);
    pSights.position.set(0, 0.075, -0.06);
    pistol.add(pSights);
    // Cyan energy core strip
    const pCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.015, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    pCore.position.set(0, 0.04, -0.06);
    pistol.add(pCore);
    this.weaponMeshes.set('pistol', pistol);
    this.weaponContainer.add(pistol);

    // 2. MICRO SMG
    const smg = new THREE.Group();
    smg.name = 'Mesh_smg';
    // Receiver
    const sBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.3), gunDarkMat);
    sBody.position.set(0, 0.03, -0.08);
    smg.add(sBody);
    // Grip
    const sGrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.13, 0.05), carbonGripMat);
    sGrip.position.set(0, -0.06, 0.02);
    sGrip.rotation.x = -0.22;
    smg.add(sGrip);
    // Extended Magazine
    const sMag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.05), gunAlloyMat);
    sMag.position.set(0, -0.1, -0.04);
    sMag.rotation.x = 0.15;
    smg.add(sMag);
    // Shrouded Barrel & Muzzle
    const sBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), gunAlloyMat);
    sBarrel.rotation.x = Math.PI / 2;
    sBarrel.position.set(0, 0.03, -0.28);
    smg.add(sBarrel);
    // Neon purple accent
    const sAccent = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.02, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    sAccent.position.set(0.032, 0.04, -0.08);
    smg.add(sAccent);
    this.weaponMeshes.set('smg', smg);
    this.weaponContainer.add(smg);

    // 3. CARBINE ASSAULT RIFLE
    const rifle = new THREE.Group();
    rifle.name = 'Mesh_rifle';
    // Receiver
    const rBody = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.08, 0.42), gunDarkMat);
    rBody.position.set(0, 0.04, -0.12);
    rifle.add(rBody);
    // Grip
    const rGrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.14, 0.052), carbonGripMat);
    rGrip.position.set(0, -0.06, 0.04);
    rGrip.rotation.x = -0.28;
    rifle.add(rGrip);
    // Tactical Stock
    const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.22), carbonGripMat);
    rStock.position.set(0, 0.01, 0.18);
    rifle.add(rStock);
    // Curved Magazine
    const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.065), gunAlloyMat);
    rMag.position.set(0, -0.11, -0.08);
    rMag.rotation.x = -0.2;
    rifle.add(rMag);
    // Long Tactical Handguard & Barrel
    const rHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.065, 0.32), gunAlloyMat);
    rHandguard.position.set(0, 0.04, -0.38);
    rifle.add(rHandguard);
    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 8), gunDarkMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.04, -0.58);
    rifle.add(rBarrel);
    // Scope / Holographic sight
    const rScope = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.12), gunAlloyMat);
    rScope.position.set(0, 0.1, -0.12);
    rifle.add(rScope);
    // Glowing Cyan Core line
    const rCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.012, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    rCore.position.set(0.035, 0.04, -0.2);
    rifle.add(rCore);
    this.weaponMeshes.set('rifle', rifle);
    this.weaponContainer.add(rifle);

    // 4. PUMP SHOTGUN
    const shotgun = new THREE.Group();
    shotgun.name = 'Mesh_shotgun';
    // Receiver
    const sgBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.085, 0.38), gunDarkMat);
    sgBody.position.set(0, 0.04, -0.1);
    shotgun.add(sgBody);
    // Pistol Grip & Stock
    const sgGrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.12, 0.24), carbonGripMat);
    sgGrip.position.set(0, -0.03, 0.12);
    shotgun.add(sgGrip);
    // Dual Heavy Barrels (Top barrel + Mag Tube)
    const sgBarrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.42, 8), gunAlloyMat);
    sgBarrel1.rotation.x = Math.PI / 2;
    sgBarrel1.position.set(0, 0.055, -0.42);
    shotgun.add(sgBarrel1);
    const sgBarrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 8), gunDarkMat);
    sgBarrel2.rotation.x = Math.PI / 2;
    sgBarrel2.position.set(0, 0.015, -0.4);
    shotgun.add(sgBarrel2);
    // Ribbed Pump Forend
    const sgPump = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.065, 0.16), carbonGripMat);
    sgPump.position.set(0, 0.015, -0.34);
    shotgun.add(sgPump);
    this.weaponMeshes.set('shotgun', shotgun);
    this.weaponContainer.add(shotgun);

    // 5. HEAVY SNIPER
    const sniper = new THREE.Group();
    sniper.name = 'Mesh_sniper';
    // Chassis
    const snBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.52), gunDarkMat);
    snBody.position.set(0, 0.04, -0.15);
    sniper.add(snBody);
    // Grip & Skeleton Stock
    const snGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.05), carbonGripMat);
    snGrip.position.set(0, -0.06, 0.04);
    snGrip.rotation.x = -0.25;
    sniper.add(snGrip);
    const snStock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.28), gunAlloyMat);
    snStock.position.set(0, 0.02, 0.24);
    sniper.add(snStock);
    // Long Fluted Precision Barrel with Muzzle Brake
    const snBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.58, 8), gunAlloyMat);
    snBarrel.rotation.x = Math.PI / 2;
    snBarrel.position.set(0, 0.05, -0.62);
    sniper.add(snBarrel);
    const snBrake = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.09), gunDarkMat);
    snBrake.position.set(0, 0.05, -0.92);
    sniper.add(snBrake);
    // High-magnification Scope
    const snScopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 8), gunDarkMat);
    snScopeTube.rotation.x = Math.PI / 2;
    snScopeTube.position.set(0, 0.13, -0.16);
    sniper.add(snScopeTube);
    // Scope Lenses
    const snLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.022, 8),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    snLens.position.set(0, 0.13, -0.28);
    sniper.add(snLens);
    this.weaponMeshes.set('sniper', sniper);
    this.weaponContainer.add(sniper);
  }

  /**
   * Updates mesh visibility based on active weapon
   */
  private updateActiveWeaponMesh() {
    this.weaponMeshes.forEach((mesh, id) => {
      mesh.visible = id === this.activeWeapon.id;
    });
    // Reposition muzzle flash to match active weapon muzzle offset
    this.muzzleFlashGroup.position.copy(this.activeWeapon.muzzleOffset);
    this.muzzleLight.color.setHex(this.activeWeapon.tracerColor);
  }

  /**
   * Cycle to next/prev weapon
   */
  public switchWeapon(direction: 'next' | 'prev' | number) {
    if (this.isReloading) {
      // Cancel reload on switch
      this.isReloading = false;
      this.reloadTimer = 0;
    }

    if (typeof direction === 'number') {
      this.activeIndex = THREE.MathUtils.clamp(direction, 0, WEAPON_ORDER.length - 1);
    } else if (direction === 'next') {
      this.activeIndex = (this.activeIndex + 1) % WEAPON_ORDER.length;
    } else {
      this.activeIndex = (this.activeIndex - 1 + WEAPON_ORDER.length) % WEAPON_ORDER.length;
    }

    this.activeWeapon = WEAPON_REGISTRY[WEAPON_ORDER[this.activeIndex]];
    this.updateActiveWeaponMesh();
    sound.playWeaponSwitch();
  }

  /**
   * Triggers reloading of the current weapon
   */
  public reload(): boolean {
    if (this.isReloading) return false;
    const current = this.activeWeapon;
    const currentMag = this.ammoInMag[current.id];
    const reserve = this.reserveAmmo[current.id];

    // Already full or no reserve
    if (currentMag >= current.magSize || reserve <= 0) return false;

    this.isReloading = true;
    this.reloadTimer = current.reloadDuration;
    sound.playReload();
    return true;
  }

  /**
   * Can the weapon fire right now?
   */
  public canFire(): boolean {
    return !this.isReloading && this.fireTimer <= 0 && this.ammoInMag[this.activeWeapon.id] > 0;
  }

  /**
   * Fires the equipped weapon along the aim ray towards the target
   */
  public fire(
    rayOrigin: THREE.Vector3,
    aimDirection: THREE.Vector3,
    scene: THREE.Scene,
    obstacles: THREE.Object3D[],
    enemies: Array<{
      alive: boolean;
      group: THREE.Group;
      radius: number;
      health: number;
      takeDamage?: (dmg: number) => boolean;
    }>,
    onHitCallback: (hitPoint: THREE.Vector3, isEnemy: boolean, enemyObj?: any, damageDealt?: number) => void
  ): boolean {
    const current = this.activeWeapon;

    // Check ammo
    if (this.ammoInMag[current.id] <= 0) {
      sound.playEmptyClip();
      this.reload();
      return false;
    }

    if (this.fireTimer > 0 || this.isReloading) {
      return false;
    }

    // Deduct ammo & set cooldown
    this.ammoInMag[current.id] -= 1;
    this.fireTimer = current.fireRate;

    // Play weapon specific gunshot sound
    switch (current.id) {
      case 'pistol': sound.playPistol(); break;
      case 'smg': sound.playSMG(); break;
      case 'rifle': sound.playRifle(); break;
      case 'shotgun': sound.playShotgun(); break;
      case 'sniper': sound.playSniper(); break;
    }

    // Trigger visual muzzle flash
    this.muzzleFlashGroup.visible = true;
    this.muzzleFlashTimer = 0.05;
    this.recoilPitch = current.recoilStrength;

    // Calculate world muzzle position
    this.weaponContainer.updateMatrixWorld(true);
    const muzzleWorldPos = new THREE.Vector3();
    this.muzzleFlashGroup.getWorldPosition(muzzleWorldPos);

    // Fire pellets (1 for bullet, 6 for shotgun)
    for (let p = 0; p < current.pellets; p++) {
      // Calculate spread jitter
      const spreadX = (Math.random() - 0.5) * current.spread;
      const spreadY = (Math.random() - 0.5) * current.spread;
      const spreadZ = (Math.random() - 0.5) * current.spread;

      const pelletDir = aimDirection.clone().add(new THREE.Vector3(spreadX, spreadY, spreadZ)).normalize();

      // Hitscan Raycast from camera/aim origin into scene
      const raycaster = new THREE.Raycaster(rayOrigin, pelletDir, 0.5, current.effectiveRange);

      // Check obstacle hits
      const obstacleHits = raycaster.intersectObjects(obstacles, false);
      let closestHitDist = current.effectiveRange;
      let hitPoint = rayOrigin.clone().addScaledVector(pelletDir, current.effectiveRange);
      let hitAnEnemy = false;
      let targetEnemy: any = null;

      if (obstacleHits.length > 0) {
        closestHitDist = obstacleHits[0].distance;
        hitPoint.copy(obstacleHits[0].point);
      }

      // Check enemy hits within line of sight
      for (const e of enemies) {
        if (!e.alive) continue;
        const ePos = e.group.position;
        // Test ray against enemy bounding sphere
        const ray = raycaster.ray;
        const targetSphere = new THREE.Sphere(ePos, e.radius);
        const intersectPoint = new THREE.Vector3();

        if (ray.intersectSphere(targetSphere, intersectPoint)) {
          const distToEnemy = rayOrigin.distanceTo(intersectPoint);
          if (distToEnemy < closestHitDist) {
            closestHitDist = distToEnemy;
            hitPoint.copy(intersectPoint);
            hitAnEnemy = true;
            targetEnemy = e;
          }
        }
      }

      // Spawn visual bullet tracer beam from muzzle to hit point
      this.spawnTracer(muzzleWorldPos, hitPoint, current.tracerColor);

      // Trigger hit callback
      if (hitAnEnemy && targetEnemy) {
        sound.playHitMarker();
        const dmg = current.damage;
        if (targetEnemy.takeDamage) {
          targetEnemy.takeDamage(dmg);
        } else {
          targetEnemy.health = (targetEnemy.health || 50) - dmg;
          if (targetEnemy.health <= 0) targetEnemy.alive = false;
        }
        onHitCallback(hitPoint, true, targetEnemy, dmg);
      } else if (obstacleHits.length > 0) {
        onHitCallback(hitPoint, false);
      }
    }

    return true;
  }

  /**
   * Spawns a glowing high-speed tracer beam from muzzle to target
   */
  private spawnTracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const tracer = this.tracerPool.find((t) => !t.active);
    if (!tracer) return;

    tracer.active = true;
    tracer.startTime = performance.now() / 1000;
    tracer.mesh.visible = true;

    const posAttr = tracer.mesh.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.setXYZ(0, from.x, from.y, from.z);
    posAttr.setXYZ(1, to.x, to.y, to.z);
    posAttr.needsUpdate = true;

    (tracer.mesh.material as THREE.LineBasicMaterial).color.setHex(color);
  }

  /**
   * Ticks weapon reload, fire cooldown, tracers and muzzle flash
   */
  public update(dt: number) {
    // Fire cooldown
    if (this.fireTimer > 0) {
      this.fireTimer -= dt;
    }

    // Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashGroup.visible = false;
      }
    }

    // Recoil recovery
    if (this.recoilPitch > 0) {
      this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 15.0, dt);
    }

    // Reload logic
    if (this.isReloading) {
      this.reloadTimer -= dt;
      const totalTime = this.activeWeapon.reloadDuration;
      this.reloadProgress = 1.0 - Math.max(0, this.reloadTimer / totalTime);

      if (this.reloadTimer <= 0) {
        // Complete reload
        this.isReloading = false;
        const current = this.activeWeapon;
        const needed = current.magSize - this.ammoInMag[current.id];
        const toLoad = Math.min(needed, this.reserveAmmo[current.id]);
        this.ammoInMag[current.id] += toLoad;
        this.reserveAmmo[current.id] -= toLoad;
      }
    }

    // Update active tracers
    const now = performance.now() / 1000;
    for (const tracer of this.tracerPool) {
      if (tracer.active) {
        if (now - tracer.startTime > tracer.duration) {
          tracer.active = false;
          tracer.mesh.visible = false;
        }
      }
    }
  }

  public getRecoilKick(): number {
    return this.recoilPitch;
  }
}

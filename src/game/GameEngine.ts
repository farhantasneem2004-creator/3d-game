import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { CharacterController, ModelStats } from './CharacterLoader.ts';
import { ThirdPersonCamera } from './ThirdPersonCamera.ts';
import { Level, PlatformData } from './Level.ts';
import { ParticleSystem } from './Particles.ts';
import { sound } from './SoundEffects.ts';
import { assetStorage } from './AssetStorage.ts';
import { RiggingSystem, MarkerPositions } from './RiggingSystem.ts';
import { CyberpunkCity } from './CyberpunkCity.ts';
import { WeaponSystem, WeaponId } from './Weapons.ts';

export interface GameHUDState {
  health: number;
  maxHealth: number;
  coins: number;
  totalCoins: number;
  score: number;
  activeCheckpoint: number;
  isPaused: boolean;
  isGameOver: boolean;
  isVictory: boolean;
  timeElapsed: number;
  loading: boolean;
  loadingPercent: number;
  loadingMessage: string;
  errorMessage: string | null;
  characterStats: ModelStats | null;
  // GTA Third-Person Gun State
  weaponId: WeaponId;
  weaponName: string;
  weaponCategory: string;
  ammoInMag: number;
  reserveAmmo: number;
  magSize: number;
  isReloading: boolean;
  isAiming: boolean;
  hitMarkerTimer: number;
}

export interface PlayerInput {
  joystickX: number; // -1 to 1
  joystickY: number; // -1 to 1 (negative = forward)
  jumpPressed: boolean;
  runPressed: boolean;
  attackPressed: boolean;
  aimPressed: boolean;
  firePressed: boolean;
  reloadPressed: boolean;
}

/**
 * Creates dark atmospheric purple-to-black gradient texture for cyberpunk sky
 */
function createPurpleBlackSkyGradient(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#1c0738'); // Atmospheric dark violet at zenith
  grad.addColorStop(0.35, '#120424'); // Deep purple haze
  grad.addColorStop(0.7, '#070212'); // Dark indigo-black horizon
  grad.addColorStop(1.0, '#020006'); // Pitch black bottom
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraCtrl: ThirdPersonCamera;
  private level: Level;
  private cyberpunkCity: CyberpunkCity;
  private character: CharacterController;
  public weaponSystem: WeaponSystem;
  private particles: ParticleSystem;

  // Lighting & Environment
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private charFillLight: THREE.PointLight;
  private charRimLight: THREE.PointLight;

  // Game Loop
  private animFrameId: number = 0;
  private isDestroyed: boolean = false;
  private clock: THREE.Clock;

  // Physics & Player State (Authoritative single controller)
  public playerPosition = new THREE.Vector3(0, 0.6, 0);
  public playerVelocity = new THREE.Vector3(0, 0, 0);
  private playerFacingAngle: number = 0;
  private isGrounded: boolean = true;
  private currentPlatform: PlatformData | null = null;
  private respawnPoint = new THREE.Vector3(0, 1.2, 0);

  // Single-trigger edge detection for jump and fire
  private jumpEdgeProcessed: boolean = false;
  private fireEdgeProcessed: boolean = false;

  // Combat & Timers
  private isAttacking: boolean = false;
  private attackTimer: number = 0;
  private invulnerabilityTimer: number = 0;
  private isRespawning: boolean = false;
  private hitMarkerTimer: number = 0;

  // Input State
  public input: PlayerInput = {
    joystickX: 0,
    joystickY: 0,
    jumpPressed: false,
    runPressed: false,
    attackPressed: false,
    aimPressed: false,
    firePressed: false,
    reloadPressed: false,
  };

  // Keyboard Tracking
  private keysPressed: Record<string, boolean> = {};

  // Pointer lock state for desktop GTA-style mouse look
  public isPointerLocked: boolean = false;

  // HUD & Game State
  public hudState: GameHUDState = {
    health: 3,
    maxHealth: 3,
    coins: 0,
    totalCoins: 10,
    score: 0,
    activeCheckpoint: 0,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    timeElapsed: 0,
    loading: true,
    loadingPercent: 0,
    loadingMessage: 'Initializing Three.js engine...',
    errorMessage: null,
    characterStats: null,
    weaponId: 'pistol',
    weaponName: 'Combat Pistol',
    weaponCategory: 'Handgun',
    ammoInMag: 12,
    reserveAmmo: 72,
    magSize: 12,
    isReloading: false,
    isAiming: false,
    hitMarkerTimer: 0,
  };

  public onHUDStateChange?: (state: GameHUDState) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene & Atmosphere: Dark Purple-to-Black Gradient Sky with atmospheric haze
    this.scene = new THREE.Scene();
    this.scene.background = createPurpleBlackSkyGradient();
    this.scene.fog = new THREE.FogExp2(0x0c0418, 0.010); // Deep purple city haze

    // 2. Camera with over-the-shoulder GTA aiming capability
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.cameraCtrl = new ThirdPersonCamera(60, aspect);

    // 3. Renderer with Software GL detection
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Reflection Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting: Balanced Cyberpunk Moonlight & Soft Fill illumination (no duplicate shadow clashing)
    this.hemiLight = new THREE.HemisphereLight(0x3b2d6a, 0x110722, 0.7); // Purple sky & deep dark ground bounce
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xd8dcfa, 0.95);
    this.dirLight.position.set(20, 35, 20);
    this.dirLight.castShadow = !isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 120;
    const d = 25;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.normalBias = 0.015;
    this.scene.add(this.dirLight);

    // Soft character point lights for cyber highlights
    this.charFillLight = new THREE.PointLight(0x00f0ff, 1.2, 14); // Cyber cyan fill
    this.scene.add(this.charFillLight);

    this.charRimLight = new THREE.PointLight(0xff007f, 1.0, 12); // Cyber magenta rim
    this.scene.add(this.charRimLight);

    // 6. Cyberpunk Environment, Level, Character, Weapons, Particles
    this.cyberpunkCity = new CyberpunkCity();
    this.scene.add(this.cyberpunkCity.group);

    this.level = new Level();
    this.scene.add(this.level.group);
    this.hudState.totalCoins = this.level.coins.length;

    this.character = new CharacterController();
    this.scene.add(this.character.root);

    // Initialize GTA-style Weapon System & attach to character
    this.weaponSystem = new WeaponSystem();
    this.scene.add(this.weaponSystem.getTracerGroup());
    this.character.attachWeapon(this.weaponSystem.weaponContainer);

    this.particles = new ParticleSystem();
    this.scene.add(this.particles.group);

    // Setup initial player position precisely on ground surface
    this.playerPosition.copy(this.level.startPosition);
    this.respawnPoint.copy(this.level.startPosition);
    this.alignCharacterFeetToGround();

    // Bind event listeners
    this.setupKeyboardListeners();
    window.addEventListener('resize', this.onResize);

    // Start loading character model and game loop
    this.loadCharacterModel();
    this.startLoop();
  }

  /**
   * Loads character model - auto-restoring from IndexedDB if saved, or default bundled model
   */
  public async loadCharacterModel() {
    this.hudState.loading = true;
    this.hudState.errorMessage = null;
    this.emitHUD();

    try {
      // 1. Check if user previously saved a custom character in IndexedDB!
      const saved = await assetStorage.loadCharacter();
      if (saved) {
        this.hudState.loadingPercent = 50;
        this.hudState.loadingMessage = `Restoring saved character: ${saved.fileName}...`;
        this.emitHUD();

        const mtlLoader = new MTLLoader();
        const materials = mtlLoader.parse(saved.mtlText, '');
        materials.preload();

        const textureLoader = new THREE.TextureLoader();
        const customTex = textureLoader.load(saved.jpgBase64);
        customTex.colorSpace = THREE.SRGBColorSpace;

        for (const key in materials.materials) {
          const m = materials.materials[key] as THREE.MeshStandardMaterial;
          m.map = customTex;
          m.color.setHex(0xffffff);
          m.roughness = 0.65;
          m.metalness = 0.1;
          m.side = THREE.DoubleSide;
          m.needsUpdate = true;
        }

        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        const customObj = objLoader.parse(saved.objText);

        this.character.applyLoadedObject(customObj, `Saved: ${saved.fileName}`, true);
        this.alignCharacterFeetToGround();
        this.hudState.characterStats = this.character.stats;
        this.hudState.loading = false;
        this.emitHUD();
        return;
      }

      // 2. Otherwise load default bundled character model
      const stats = await this.character.loadModel(
        '/assets/game/models/',
        '3DModel.mtl',
        '3DModel.obj',
        (pct, msg) => {
          this.hudState.loadingPercent = pct;
          this.hudState.loadingMessage = msg;
          this.emitHUD();
        }
      );

      this.alignCharacterFeetToGround();
      this.hudState.characterStats = stats;
      this.hudState.loading = false;
      this.emitHUD();
    } catch (err: unknown) {
      console.error('Character load error:', err);
      this.hudState.loading = false;
      this.hudState.errorMessage = (err as Error).message || 'Failed to load 3D character asset files.';
      this.emitHUD();
    }
  }

  /**
   * Reload character from user supplied files and save permanently in IndexedDB
   */
  public async loadCustomModelFromFiles(objFile: File, mtlFile: File, jpgFile: File) {
    this.hudState.loading = true;
    this.hudState.loadingMessage = 'Saving & auto-rigging custom character...';
    this.hudState.loadingPercent = 30;
    this.hudState.errorMessage = null;
    this.emitHUD();

    try {
      const mtlText = await mtlFile.text();
      const objText = await objFile.text();
      const jpgUrl = URL.createObjectURL(jpgFile);

      // Permanently save in IndexedDB so it auto-loads on future visits!
      await assetStorage.saveCharacter(objText, mtlText, jpgFile, objFile.name);

      const mtlLoader = new MTLLoader();
      const materials = mtlLoader.parse(mtlText, '');
      materials.preload();

      // Ensure texture map uses blob url and is auto-set to lights
      const textureLoader = new THREE.TextureLoader();
      const customTex = textureLoader.load(jpgUrl);
      customTex.colorSpace = THREE.SRGBColorSpace;

      for (const key in materials.materials) {
        const m = materials.materials[key] as THREE.MeshStandardMaterial;
        m.map = customTex;
        m.color.setHex(0xffffff);
        m.roughness = 0.65;
        m.metalness = 0.1;
        m.side = THREE.DoubleSide;
        m.needsUpdate = true;
      }

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      const customObj = objLoader.parse(objText);

      this.character.applyLoadedObject(customObj, `Saved: ${objFile.name}`, true);
      this.alignCharacterFeetToGround();
      this.hudState.characterStats = this.character.stats;
      this.hudState.loading = false;
      this.emitHUD();
    } catch (err: unknown) {
      console.error('Failed to load custom files:', err);
      this.hudState.loading = false;
      this.hudState.errorMessage = 'Error loading custom files: ' + (err as Error).message;
      this.emitHUD();
    }
  }

  /**
   * Clears saved custom character from IndexedDB and restores default model
   */
  public async resetToDefaultCharacter() {
    await assetStorage.clearSavedCharacter();
    await this.loadCharacterModel();
  }

  public setSkeletonVisibility(visible: boolean) {
    this.character.setSkeletonVisibility(visible);
  }

  public setTestAnimation(anim: string | null) {
    this.character.setTestAnimation(anim);
  }

  public getCharacterController(): CharacterController {
    return this.character;
  }

  public alignCharacterFeetToGround() {
    const { groundY, platform } = this.level.getGroundHeightAt(
      this.playerPosition.x,
      this.playerPosition.z,
      this.character.radius
    );
    if (groundY > -Infinity) {
      this.playerPosition.y = groundY;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
      this.currentPlatform = platform;
      this.character.setPosition(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);

      const diag = this.character.getFootDiagnostics();
      console.log(`[Ground Alignment] Root Y: ${diag.rootY.toFixed(3)}, Platform Top: ${groundY.toFixed(3)}, Lowest Foot Y: ${diag.lowestWorldY.toFixed(3)}, Weapon Socket: ${diag.weaponBone}`);
    }
  }

  public applyCustomMarkers(markers: MarkerPositions) {
    const success = this.character.applyCustomMarkers(markers);
    if (success) {
      this.alignCharacterFeetToGround();
      this.hudState.characterStats = this.character.stats;
      this.emitHUD();
    }
  }

  public exportRiggedGLB() {
    if (this.character.riggedCharacter?.rigGroup) {
      RiggingSystem.exportToGLB(this.character.riggedCharacter.rigGroup, 'MyCharacter_Rigged.glb');
    }
  }

  public switchWeapon(direction: 'next' | 'prev' | number) {
    this.weaponSystem.switchWeapon(direction);
    this.updateHUDWeaponState();
  }

  public reloadWeapon() {
    this.weaponSystem.reload();
    this.updateHUDWeaponState();
  }

  public setAiming(aiming: boolean) {
    this.input.aimPressed = aiming;
  }

  public setFiring(firing: boolean) {
    this.input.firePressed = firing;
    if (!firing) {
      this.fireEdgeProcessed = false;
    }
  }

  public updateHUDWeaponState() {
    const w = this.weaponSystem.activeWeapon;
    this.hudState.weaponId = w.id;
    this.hudState.weaponName = w.name;
    this.hudState.weaponCategory = w.category;
    this.hudState.ammoInMag = this.weaponSystem.ammoInMag[w.id];
    this.hudState.reserveAmmo = this.weaponSystem.reserveAmmo[w.id];
    this.hudState.magSize = w.magSize;
    this.hudState.isReloading = this.weaponSystem.isReloading;
    this.hudState.isAiming = this.cameraCtrl.isAiming;
    this.hudState.hitMarkerTimer = this.hitMarkerTimer;
    this.emitHUD();
  }

  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Prevent game character movement when user is typing inside modal input fields
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      this.keysPressed[e.code] = true;
      if (e.key) {
        this.keysPressed[e.key] = true;
        this.keysPressed[e.key.toLowerCase()] = true;
        this.keysPressed[e.key.toUpperCase()] = true;
      }

      // Weapon hotkeys (1-5, Q, E, R)
      if (e.code === 'Digit1') this.switchWeapon(0);
      else if (e.code === 'Digit2') this.switchWeapon(1);
      else if (e.code === 'Digit3') this.switchWeapon(2);
      else if (e.code === 'Digit4') this.switchWeapon(3);
      else if (e.code === 'Digit5') this.switchWeapon(4);
      else if (e.code === 'KeyQ' || e.key === 'q') this.switchWeapon('prev');
      else if (e.code === 'KeyE' || e.key === 'e') this.switchWeapon('next');
      else if (e.code === 'KeyR' || e.key === 'r') this.reloadWeapon();

      // Pause toggle
      if (e.code === 'KeyP' || e.code === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (document.pointerLockElement) {
          document.exitPointerLock?.();
        }
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
      if (e.key) {
        this.keysPressed[e.key] = false;
        this.keysPressed[e.key.toLowerCase()] = false;
        this.keysPressed[e.key.toUpperCase()] = false;
      }
      if (e.code === 'Space') {
        this.jumpEdgeProcessed = false;
      }
    });

    // Mouse aiming & shooting
    this.container.addEventListener('mousedown', (e) => {
      if (this.hudState.isPaused || this.hudState.isGameOver || this.hudState.isVictory) return;
      if (e.button === 2) {
        // Right click: Aim down sights
        e.preventDefault();
        this.input.aimPressed = true;
      } else if (e.button === 0) {
        // Left click: Fire weapon
        this.input.firePressed = true;
      }
    });

    this.container.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.input.aimPressed = false;
      } else if (e.button === 0) {
        this.input.firePressed = false;
        this.fireEdgeProcessed = false;
      }
    });

    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // Prevent browser context menu on right click aim
    });

    // Pointer lock for immersive desktop GTA mouse look
    this.container.addEventListener('click', (e) => {
      if (e.button === 0 && !document.pointerLockElement && !this.hudState.isPaused) {
        this.container.requestPointerLock?.();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.container;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked && !this.hudState.isPaused) {
        this.cameraCtrl.handleDrag(e.movementX, e.movementY);
      }
    });

    // Mouse wheel weapon switching
    this.container.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > 20) {
        this.switchWeapon(e.deltaY > 0 ? 'next' : 'prev');
      }
    }, { passive: true });

    // Clear stuck keys on window blur
    window.addEventListener('blur', () => {
      this.keysPressed = {};
      this.input.joystickX = 0;
      this.input.joystickY = 0;
      this.input.runPressed = false;
      this.input.jumpPressed = false;
      this.input.attackPressed = false;
      this.input.aimPressed = false;
      this.input.firePressed = false;
      this.jumpEdgeProcessed = false;
      this.fireEdgeProcessed = false;
    });
  }

  public handleCameraDrag(dx: number, dy: number) {
    this.cameraCtrl.handleDrag(dx, dy);
  }

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight || 1;
    this.cameraCtrl.updateAspect(w / h);
    this.renderer.setSize(w, h);
  };

  /**
   * Main game tick
   */
  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      const rawDelta = this.clock.getDelta();
      const dt = Math.min(0.04, rawDelta); // Clamped timestep avoids stall physics spikes

      if (!this.hudState.isPaused && !this.hudState.isGameOver && !this.hudState.isVictory && !this.hudState.loading) {
        this.updateGame(dt);
      }

      this.particles.update(dt);
      this.renderer.render(this.scene, this.cameraCtrl.camera);

      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private updateGame(dt: number) {
    this.hudState.timeElapsed += dt;

    // 1. Update Weapon Cooldowns, Reloading, Tracers, and Recoil
    this.weaponSystem.update(dt);

    // Hit marker fade
    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer -= dt;
    }

    // 2. Gather & Synthesize Inputs
    let inputForward = -this.input.joystickY;
    let inputRight = this.input.joystickX;

    const keyUp = this.keysPressed['KeyW'] || this.keysPressed['ArrowUp'] || this.keysPressed['w'] || this.keysPressed['W'];
    const keyDown = this.keysPressed['KeyS'] || this.keysPressed['ArrowDown'] || this.keysPressed['s'] || this.keysPressed['S'];
    const keyRight = this.keysPressed['KeyD'] || this.keysPressed['ArrowRight'] || this.keysPressed['d'] || this.keysPressed['D'];
    const keyLeft = this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft'] || this.keysPressed['a'] || this.keysPressed['A'];

    if (keyUp) inputForward += 1;
    if (keyDown) inputForward -= 1;
    if (keyRight) inputRight += 1;
    if (keyLeft) inputRight -= 1;

    // Normalize diagonal input
    const inputLen = Math.hypot(inputForward, inputRight);
    if (inputLen > 1) {
      inputForward /= inputLen;
      inputRight /= inputLen;
    }

    const isRunning = (this.input.runPressed || this.keysPressed['ShiftLeft'] || this.keysPressed['ShiftRight'] || this.keysPressed['Shift']) && !this.input.aimPressed;
    const isAiming = this.input.aimPressed || !!this.keysPressed['KeyF'] || !!this.keysPressed['f'];
    this.cameraCtrl.setAiming(isAiming);

    // 3. GTA-STYLE SHOOTING SYSTEM
    const isFiring = this.input.firePressed || !!this.keysPressed['KeyJ'] || !!this.keysPressed['j'] || !!this.keysPressed['Enter'];
    const activeW = this.weaponSystem.activeWeapon;

    if (isFiring) {
      const canShoot = activeW.isAutomatic || !this.fireEdgeProcessed;
      if (canShoot && this.weaponSystem.canFire()) {
        if (!activeW.isAutomatic) {
          this.fireEdgeProcessed = true;
        }

        // Raycast from camera center reticle into the 3D world
        const rayOrigin = this.cameraCtrl.camera.position.clone();
        const aimDir = new THREE.Vector3();
        this.cameraCtrl.camera.getWorldDirection(aimDir);

        const obstacleMeshes = this.level.platforms.map((p) => p.mesh);

        this.weaponSystem.fire(
          rayOrigin,
          aimDir,
          this.scene,
          obstacleMeshes,
          this.level.enemies,
          (hitPos, hitEnemy, enemyObj, dmg) => {
            if (hitEnemy && enemyObj) {
              this.hitMarkerTimer = 0.16;
              this.particles.emitDamageSparks(hitPos);
              if (!enemyObj.alive) {
                // Robot destroyed!
                this.hudState.score += 200;
                sound.playEnemyDefeat();
                this.particles.emitVictoryFireworks(hitPos);
              }
            } else {
              // Hit obstacle / platform
              this.particles.emitDust(hitPos, 4);
            }
          }
        );

        // Apply weapon recoil to camera pitch
        this.cameraCtrl.pitch -= activeW.recoilStrength * 0.25;
      }
    } else {
      this.fireEdgeProcessed = false;
    }

    // 4. Movement Physics Relative to Camera
    const { forward: camFwd, right: camRight } = this.cameraCtrl.getHorizontalVectors();

    let worldMoveX = camFwd.x * inputForward + camRight.x * inputRight;
    let worldMoveZ = camFwd.z * inputForward + camRight.z * inputRight;

    const moveLen = Math.hypot(worldMoveX, worldMoveZ);
    if (moveLen > 1.0) {
      worldMoveX /= moveLen;
      worldMoveZ /= moveLen;
    }

    const isMoving = moveLen > 0.08;
    // Lower speed while aiming for tactical strafing
    const baseSpeed = isAiming ? 3.8 : (isRunning ? 8.2 : 5.0);
    const accel = this.isGrounded ? 34.0 : 16.0;

    if (isMoving) {
      const targetVelX = worldMoveX * baseSpeed;
      const targetVelZ = worldMoveZ * baseSpeed;

      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, targetVelX, accel, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, targetVelZ, accel, dt);

      // Facing Angle:
      // If AIMING: Character strictly turns towards camera look direction (GTA V strafing!)
      // If NOT aiming: Character smoothly turns towards movement direction
      if (isAiming) {
        this.playerFacingAngle = this.cameraCtrl.yaw;
      } else {
        const targetAngle = Math.atan2(worldMoveX, worldMoveZ);
        const angleDiff = THREE.MathUtils.euclideanModulo(targetAngle - this.playerFacingAngle + Math.PI, Math.PI * 2) - Math.PI;
        this.playerFacingAngle += angleDiff * Math.min(1.0, dt * 14.0);
      }
    } else {
      // Friction / deceleration
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, 0, accel * 1.4, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, 0, accel * 1.4, dt);

      if (isAiming) {
        this.playerFacingAngle = this.cameraCtrl.yaw;
      }
    }

    // 5. Jump & Gravity (Single-trigger impulse prevents continuous bounce on hold)
    const jumpRequest = this.input.jumpPressed || !!this.keysPressed['Space'] || !!this.keysPressed[' '];
    const gravity = -25.0;

    if (jumpRequest && this.isGrounded && !this.jumpEdgeProcessed) {
      this.jumpEdgeProcessed = true;
      this.playerVelocity.y = 10.5;
      this.isGrounded = false;
      this.currentPlatform = null;
      sound.playJump();
      this.particles.emitDust(this.playerPosition, 8);
    } else if (!jumpRequest) {
      this.jumpEdgeProcessed = false;
    }

    if (!this.isGrounded) {
      this.playerVelocity.y += gravity * dt;
      if (this.playerVelocity.y < -22) this.playerVelocity.y = -22; // Terminal velocity
    }

    // 6. Apply Velocity to Position
    this.playerPosition.x += this.playerVelocity.x * dt;
    this.playerPosition.z += this.playerVelocity.z * dt;

    // Moving Platform velocity carry
    if (this.isGrounded && this.currentPlatform?.isMoving && this.currentPlatform.currentVelocity) {
      this.playerPosition.x += this.currentPlatform.currentVelocity.x * dt;
      this.playerPosition.y += this.currentPlatform.currentVelocity.y * dt;
      this.playerPosition.z += this.currentPlatform.currentVelocity.z * dt;
    }

    this.playerPosition.y += this.playerVelocity.y * dt;

    // 7. Authoritative Ground & Platform Collision Resolution
    this.resolvePlatformCollisions();

    // 8. Update Environment, Level & Collectibles
    this.cyberpunkCity.update(dt, this.hudState.timeElapsed);
    this.level.update(dt, this.hudState.timeElapsed);
    this.checkCoinCollections();
    this.checkCheckpointReach();
    this.checkEnemyCollisions();
    this.checkFinishPortal();

    // 9. Void Fall Check (Only respawn if fallen far below platforms)
    if (this.playerPosition.y < -12.0 && !this.isRespawning) {
      this.handlePlayerFall();
    }

    // 10. Update Character Transforms & Animation
    this.character.setPosition(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);
    this.character.setRotationY(this.playerFacingAngle);
    this.character.updateAnimation(
      dt,
      {
        isMoving,
        isRunning,
        isGrounded: this.isGrounded,
        isAttacking: this.isAttacking,
        attackTimer: this.attackTimer,
        verticalVelocity: this.playerVelocity.y,
        isVictory: this.hudState.isVictory,
        isAiming,
        isShooting: isFiring,
        isReloading: this.weaponSystem.isReloading,
        aimPitch: this.cameraCtrl.pitch,
      },
      this.playerVelocity,
      this.isGrounded
    );

    // 11. Update Camera & Scene Lighting
    const obstacleMeshes = this.level.platforms.map((p) => p.mesh);
    this.cameraCtrl.update(dt, this.playerPosition, this.playerFacingAngle, isMoving, obstacleMeshes);

    this.dirLight.position.set(this.playerPosition.x + 20, this.playerPosition.y + 35, this.playerPosition.z + 20);
    this.dirLight.target.position.copy(this.playerPosition);
    this.dirLight.target.updateMatrixWorld();

    this.charFillLight.position.set(this.playerPosition.x, this.playerPosition.y + 2.0, this.playerPosition.z - 2.5);
    this.charRimLight.position.set(this.playerPosition.x, this.playerPosition.y + 2.5, this.playerPosition.z + 2.8);

    // Invulnerability decay
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }

    // Update HUD state once per frame
    this.updateHUDWeaponState();
  }

  /**
   * Continuous swept collision resolution against platform boxes
   */
  private resolvePlatformCollisions() {
    let groundedThisFrame = false;
    let highestGroundY = -Infinity;
    let hitPlatform: PlatformData | null = null;

    const charRadius = this.character.radius;
    const charFeetY = this.playerPosition.y;

    for (const plat of this.level.platforms) {
      const box = plat.bbox;

      // Check horizontal footprint
      const minX = box.min.x - charRadius * 0.6;
      const maxX = box.max.x + charRadius * 0.6;
      const minZ = box.min.z - charRadius * 0.6;
      const maxZ = box.max.z + charRadius * 0.6;

      if (this.playerPosition.x >= minX && this.playerPosition.x <= maxX &&
          this.playerPosition.z >= minZ && this.playerPosition.z <= maxZ) {

        const platTop = plat.topY;

        // Continuous ground detection: feet close to or resting on platform surface while moving down/stationary
        if (charFeetY >= platTop - 0.55 && charFeetY <= platTop + 0.35 && this.playerVelocity.y <= 0.05) {
          if (platTop > highestGroundY) {
            highestGroundY = platTop;
            groundedThisFrame = true;
            hitPlatform = plat;
          }
        }
      }
    }

    if (groundedThisFrame && hitPlatform) {
      // Just landed
      if (!this.isGrounded) {
        sound.playFootstep();
        this.character.triggerLandingSquash();
        this.particles.emitDust(this.playerPosition, 5);
      }

      this.playerPosition.y = highestGroundY;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
      this.currentPlatform = hitPlatform;

      // Hazard platform damage
      if (hitPlatform.isHazard && this.invulnerabilityTimer <= 0) {
        this.takeDamage(1);
        this.playerVelocity.y = 8.5;
        this.isGrounded = false;
      }
    } else {
      this.isGrounded = false;
      this.currentPlatform = null;
    }
  }

  /**
   * Coin collection checking
   */
  private checkCoinCollections() {
    for (const coin of this.level.coins) {
      if (!coin.collected) {
        const coinPos = coin.group.position;
        const dist = this.playerPosition.distanceTo(coinPos);
        if (dist < coin.radius + this.character.radius) {
          coin.collected = true;
          coin.group.visible = false;
          sound.playCoin();
          this.particles.emitCoinSparkles(coinPos, 14);

          this.hudState.coins += 1;
          this.hudState.score += 100;
          this.emitHUD();
        }
      }
    }
  }

  /**
   * Checkpoint checking
   */
  private checkCheckpointReach() {
    for (const cp of this.level.checkpoints) {
      const dist = this.playerPosition.distanceTo(cp.position);
      if (dist < 2.5 && !cp.activated) {
        const activated = this.level.activateCheckpoint(cp.id);
        if (activated) {
          this.respawnPoint.copy(cp.position);
          this.respawnPoint.y += 0.8;
          sound.playCheckpoint();
          this.particles.emitCheckpointActivation(cp.position);

          this.hudState.activeCheckpoint = cp.id;
          this.hudState.score += 250;
          this.emitHUD();
        }
      }
    }
  }

  /**
   * Combat hits on enemies during attack
   */
  private checkAttackHits(forwardDir: THREE.Vector3) {
    const attackRange = 2.4;
    for (const e of this.level.enemies) {
      if (!e.alive) continue;
      const enemyPos = e.group.position;
      const dist = this.playerPosition.distanceTo(enemyPos);

      if (dist < attackRange) {
        // Defeat enemy
        e.alive = false;
        e.deathAnimTimer = 0.35;
        sound.playEnemyDefeat();
        this.particles.emitDamageSparks(enemyPos);
        this.hudState.score += 300;
        this.emitHUD();
      }
    }
  }

  /**
   * Patrol enemy collisions with player
   */
  private checkEnemyCollisions() {
    for (const e of this.level.enemies) {
      if (!e.alive) continue;
      const enemyPos = e.group.position;
      const dist = this.playerPosition.distanceTo(enemyPos);

      if (dist < e.radius + this.character.radius) {
        // Check if player is stomping from above
        if (this.playerVelocity.y < -1.0 && this.playerPosition.y > enemyPos.y + 0.3) {
          e.alive = false;
          e.deathAnimTimer = 0.35;
          this.playerVelocity.y = 9.0; // Stomp bounce
          sound.playEnemyDefeat();
          this.particles.emitDamageSparks(enemyPos);
          this.hudState.score += 300;
          this.emitHUD();
        } else if (this.invulnerabilityTimer <= 0) {
          // Player takes damage
          this.takeDamage(1);
          // Knockback
          const knockbackDir = this.playerPosition.clone().sub(enemyPos).normalize();
          this.playerVelocity.x = knockbackDir.x * 6.0;
          this.playerVelocity.z = knockbackDir.z * 6.0;
          this.playerVelocity.y = 5.0;
        }
      }
    }
  }

  /**
   * Finish portal trigger
   */
  private checkFinishPortal() {
    if (!this.level.finishPortal || this.hudState.isVictory) return;
    const portalPos = this.level.finishPortal.position;
    const dist = this.playerPosition.distanceTo(portalPos);

    if (dist < this.level.finishPortal.triggerRadius) {
      this.hudState.isVictory = true;
      sound.playVictory();
      this.particles.emitVictoryFireworks(portalPos);
      this.emitHUD();
    }
  }

  /**
   * Player damage handling
   */
  public takeDamage(amount: number) {
    if (this.invulnerabilityTimer > 0 || this.hudState.isGameOver || this.hudState.isVictory) return;

    this.hudState.health = Math.max(0, this.hudState.health - amount);
    this.invulnerabilityTimer = 1.2; // 1.2s invulnerability
    sound.playHurt();
    this.character.triggerHitReaction();
    this.particles.emitDamageSparks(this.playerPosition);

    if (this.hudState.health <= 0) {
      this.hudState.isGameOver = true;
    }
    this.emitHUD();
  }

  /**
   * Void fall respawn
   */
  private handlePlayerFall() {
    this.isRespawning = true;
    this.takeDamage(1);

    setTimeout(() => {
      if (this.hudState.health > 0) {
        this.respawnAtCheckpoint();
      }
      this.isRespawning = false;
    }, 450);
  }

  /**
   * Respawn at active checkpoint
   */
  public respawnAtCheckpoint() {
    this.playerPosition.copy(this.respawnPoint);
    this.playerVelocity.set(0, 0, 0);
    this.alignCharacterFeetToGround();
    this.cameraCtrl.reset(0);
    this.hudState.isGameOver = false;
    this.emitHUD();
  }

  /**
   * Restart entire level from beginning
   */
  public restartLevel() {
    this.level.reset();
    this.particles.clear();
    this.playerPosition.copy(this.level.startPosition);
    this.respawnPoint.copy(this.level.startPosition);
    this.playerVelocity.set(0, 0, 0);
    this.alignCharacterFeetToGround();
    this.cameraCtrl.reset(0);

    this.hudState.health = this.hudState.maxHealth;
    this.hudState.coins = 0;
    this.hudState.score = 0;
    this.hudState.activeCheckpoint = 0;
    this.hudState.isGameOver = false;
    this.hudState.isVictory = false;
    this.hudState.isPaused = false;
    this.hudState.timeElapsed = 0;
    this.emitHUD();
  }

  public togglePause() {
    this.hudState.isPaused = !this.hudState.isPaused;
    this.emitHUD();
  }

  private emitHUD() {
    if (this.onHUDStateChange) {
      this.onHUDStateChange({ ...this.hudState });
    }
  }

  public destroy() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}

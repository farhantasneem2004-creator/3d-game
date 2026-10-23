import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { CharacterController, ModelStats } from './CharacterLoader.ts';
import { ThirdPersonCamera } from './ThirdPersonCamera.ts';
import { Level, PlatformData } from './Level.ts';
import { ParticleSystem } from './Particles.ts';
import { sound } from './SoundEffects.ts';

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
}

export interface PlayerInput {
  joystickX: number; // -1 to 1
  joystickY: number; // -1 to 1 (up is positive or negative depending on standard, we'll treat -1 as up or standard dy)
  jumpPressed: boolean;
  runPressed: boolean;
  attackPressed: boolean;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private cameraCtrl: ThirdPersonCamera;
  private level: Level;
  private character: CharacterController;
  private particles: ParticleSystem;

  // Lighting & Environment
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  // Game Loop
  private animFrameId: number = 0;
  private isDestroyed: boolean = false;
  private clock: THREE.Clock;

  // Physics & Player State
  public playerPosition = new THREE.Vector3(0, 1.2, 0);
  public playerVelocity = new THREE.Vector3(0, 0, 0);
  private playerFacingAngle: number = 0;
  private isGrounded: boolean = true;
  private currentPlatform: PlatformData | null = null;
  private respawnPoint = new THREE.Vector3(0, 1.2, 0);

  // Combat & Timers
  private isAttacking: boolean = false;
  private attackTimer: number = 0;
  private invulnerabilityTimer: number = 0;
  private isRespawning: boolean = false;

  // Input State
  public input: PlayerInput = {
    joystickX: 0,
    joystickY: 0,
    jumpPressed: false,
    runPressed: false,
    attackPressed: false,
  };

  // Keyboard Tracking
  private keysPressed: Record<string, boolean> = {};

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
  };

  public onHUDStateChange?: (state: GameHUDState) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7dd3fc); // Sky blue
    this.scene.fog = new THREE.FogExp2(0x7dd3fc, 0.015);

    // 2. Camera
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
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Studio Reflection Environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting
    this.hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x38bdf8, 0.75);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.4);
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
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    // 6. Level, Character, Particles
    this.level = new Level();
    this.scene.add(this.level.group);
    this.hudState.totalCoins = this.level.coins.length;

    this.character = new CharacterController();
    this.scene.add(this.character.root);

    this.particles = new ParticleSystem();
    this.scene.add(this.particles.group);

    // Setup initial player position
    this.playerPosition.copy(this.level.startPosition);
    this.respawnPoint.copy(this.level.startPosition);
    this.character.setPosition(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);

    // Bind event listeners
    this.setupKeyboardListeners();
    window.addEventListener('resize', this.onResize);

    // Start loading character model and game loop
    this.loadCharacterModel();
    this.startLoop();
  }

  /**
   * Loads character model 3DModel.obj + 3DModel.mtl + 3DModel.jpg
   */
  public async loadCharacterModel() {
    this.hudState.loading = true;
    this.hudState.errorMessage = null;
    this.emitHUD();

    try {
      const stats = await this.character.loadModel(
        '/models/',
        '3DModel.mtl',
        '3DModel.obj',
        (pct, msg) => {
          this.hudState.loadingPercent = pct;
          this.hudState.loadingMessage = msg;
          this.emitHUD();
        }
      );

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
   * Reload character from user supplied files (e.g. from File Picker)
   */
  public async loadCustomModelFromFiles(objFile: File, mtlFile: File, jpgFile: File) {
    this.hudState.loading = true;
    this.hudState.loadingMessage = 'Loading custom character files...';
    this.hudState.loadingPercent = 20;
    this.hudState.errorMessage = null;
    this.emitHUD();

    try {
      const mtlText = await mtlFile.text();
      const objText = await objFile.text();
      const jpgUrl = URL.createObjectURL(jpgFile);

      const mtlLoader = new MTLLoader();
      const materials = mtlLoader.parse(mtlText, '');
      materials.preload();

      // Ensure texture map uses blob url
      const textureLoader = new THREE.TextureLoader();
      const customTex = textureLoader.load(jpgUrl);
      customTex.colorSpace = THREE.SRGBColorSpace;

      for (const key in materials.materials) {
        const m = materials.materials[key] as THREE.MeshStandardMaterial;
        m.map = customTex;
        m.needsUpdate = true;
      }

      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      const customObj = objLoader.parse(objText);

      this.character.applyLoadedObject(customObj, `Custom: ${objFile.name}`);
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

  public setSkeletonVisibility(visible: boolean) {
    this.character.setSkeletonVisibility(visible);
  }

  public setTestAnimation(anim: string | null) {
    this.character.setTestAnimation(anim);
  }

  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.code] = false;
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
      const dt = Math.min(0.045, rawDelta);

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

    // 1. Gather & Synthesize Inputs (Virtual Touch + Keyboard)
    let moveX = this.input.joystickX;
    let moveZ = -this.input.joystickY; // Joysticks push up -> negative Z in camera space

    // Keyboard controls overlay
    if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) moveX -= 1;
    if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) moveX += 1;
    if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) moveZ -= 1;
    if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) moveZ += 1;

    // Clamp input vector length
    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 1) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    const isRunning = this.input.runPressed || this.keysPressed['ShiftLeft'] || this.keysPressed['ShiftRight'];
    const jumpRequest = this.input.jumpPressed || this.keysPressed['Space'];
    const attackRequest = this.input.attackPressed || this.keysPressed['KeyJ'] || this.keysPressed['Enter'];

    // 2. Attack Handling
    if (attackRequest && !this.isAttacking) {
      this.isAttacking = true;
      this.attackTimer = 0.35; // 350ms duration
      sound.playAttack();

      // Emit attack slash arc
      const forwardDir = new THREE.Vector3(Math.sin(this.playerFacingAngle), 0, Math.cos(this.playerFacingAngle));
      this.particles.emitAttackSlash(this.playerPosition, forwardDir);

      // Check combat hits on nearby enemies
      this.checkAttackHits(forwardDir);
    }

    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }

    // 3. Movement Physics relative to Camera
    const camYaw = this.cameraCtrl.yaw;
    const worldMoveX = moveX * Math.cos(camYaw) - moveZ * Math.sin(camYaw);
    const worldMoveZ = moveX * Math.sin(camYaw) + moveZ * Math.cos(camYaw);
    const isMoving = Math.hypot(worldMoveX, worldMoveZ) > 0.08;

    const baseSpeed = isRunning ? 8.2 : 5.0;
    const accel = this.isGrounded ? 35.0 : 15.0;

    if (isMoving) {
      const targetVelX = worldMoveX * baseSpeed;
      const targetVelZ = worldMoveZ * baseSpeed;

      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, targetVelX, accel, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, targetVelZ, accel, dt);

      // Turn character to face movement direction
      const targetAngle = Math.atan2(worldMoveX, worldMoveZ);
      const angleDiff = THREE.MathUtils.euclideanModulo(targetAngle - this.playerFacingAngle + Math.PI, Math.PI * 2) - Math.PI;
      this.playerFacingAngle += angleDiff * Math.min(1.0, dt * 16.0);
    } else {
      // Friction / deceleration
      this.playerVelocity.x = THREE.MathUtils.damp(this.playerVelocity.x, 0, accel * 1.2, dt);
      this.playerVelocity.z = THREE.MathUtils.damp(this.playerVelocity.z, 0, accel * 1.2, dt);
    }

    // 4. Jump & Gravity
    const gravity = -24.0;
    if (jumpRequest && this.isGrounded) {
      this.playerVelocity.y = 10.5;
      this.isGrounded = false;
      this.currentPlatform = null;
      sound.playJump();
      this.particles.emitDust(this.playerPosition, 8);
    } else if (!this.isGrounded) {
      this.playerVelocity.y += gravity * dt;
      if (this.playerVelocity.y < -25) this.playerVelocity.y = -25;
    }

    // 5. Apply Horizontal Velocity
    this.playerPosition.x += this.playerVelocity.x * dt;
    this.playerPosition.z += this.playerVelocity.z * dt;

    // Apply Moving Platform Velocity if standing on one
    if (this.isGrounded && this.currentPlatform?.isMoving && this.currentPlatform.currentVelocity) {
      this.playerPosition.x += this.currentPlatform.currentVelocity.x * dt;
      this.playerPosition.y += this.currentPlatform.currentVelocity.y * dt;
      this.playerPosition.z += this.currentPlatform.currentVelocity.z * dt;
    }

    // Apply Vertical Velocity
    this.playerPosition.y += this.playerVelocity.y * dt;

    // 6. Platform Collision & Grounding
    this.resolvePlatformCollisions();

    // 7. Update Level & Collectibles
    this.level.update(dt, this.hudState.timeElapsed);
    this.checkCoinCollections();
    this.checkCheckpointReach();
    this.checkEnemyCollisions();
    this.checkFinishPortal();

    // 8. Fall Detection / Void Check
    if (this.playerPosition.y < -8.0 && !this.isRespawning) {
      this.handlePlayerFall();
    }

    // 9. Update Character Transforms & Animation
    this.character.setPosition(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);
    this.character.setRotationY(this.playerFacingAngle);
    this.character.updateAnimation(dt, {
      isMoving,
      isRunning,
      isGrounded: this.isGrounded,
      isAttacking: this.isAttacking,
      attackTimer: this.attackTimer,
      verticalVelocity: this.playerVelocity.y,
      isVictory: this.hudState.isVictory,
    });

    // 10. Update Camera & Shadows
    const obstacleMeshes = this.level.platforms.map((p) => p.mesh);
    this.cameraCtrl.update(dt, this.playerPosition, this.playerFacingAngle, isMoving, obstacleMeshes);
    this.dirLight.position.set(this.playerPosition.x + 20, this.playerPosition.y + 35, this.playerPosition.z + 20);
    this.dirLight.target.position.copy(this.playerPosition);
    this.dirLight.target.updateMatrixWorld();

    // Invulnerability decay
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= dt;
    }
  }

  /**
   * Collision resolution against platform boxes
   */
  private resolvePlatformCollisions() {
    let groundedThisFrame = false;
    let highestGroundY = -Infinity;
    let hitPlatform: PlatformData | null = null;

    const charRadius = this.character.radius;
    const charFeetY = this.playerPosition.y;

    for (const plat of this.level.platforms) {
      const box = plat.bbox;

      // Check if character's horizontal footprint overlaps platform
      const minX = box.min.x - charRadius * 0.7;
      const maxX = box.max.x + charRadius * 0.7;
      const minZ = box.min.z - charRadius * 0.7;
      const maxZ = box.max.z + charRadius * 0.7;

      if (this.playerPosition.x >= minX && this.playerPosition.x <= maxX &&
          this.playerPosition.z >= minZ && this.playerPosition.z <= maxZ) {

        const platTop = box.max.y;

        // Ground detection: character feet close to or penetrating top surface while moving down
        if (charFeetY >= platTop - 0.45 && charFeetY <= platTop + 0.35 && this.playerVelocity.y <= 0.05) {
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
        // Bounce player upward away from hazard
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
    this.isGrounded = true;
    this.character.setPosition(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);
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
    this.isGrounded = true;
    this.character.setPosition(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);
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

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { AutoRigger, RiggedCharacter } from './AutoRigger.ts';
import { CharacterAnimator, AnimationStateName } from './CharacterAnimator.ts';
import { RiggingSystem, MarkerPositions } from './RiggingSystem.ts';

export interface ModelStats {
  vertexCount: number;
  triangleCount: number;
  boundingBoxSize: THREE.Vector3;
  normalizedHeight: number;
  source: string;
  isRigged: boolean;
  boneCount: number;
  isSavedCustom?: boolean;
}

export interface CharacterAnimationState {
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
  isAttacking: boolean;
  attackTimer: number;
  verticalVelocity: number;
  isVictory?: boolean;
  isAiming?: boolean;
  isShooting?: boolean;
  isReloading?: boolean;
  aimPitch?: number;
}

export class CharacterController {
  public root: THREE.Group;
  public modelContainer: THREE.Group; // Contains normalized model for anims
  public modelMesh: THREE.Group | null = null;
  public riggedCharacter: RiggedCharacter | null = null;
  public animator: CharacterAnimator | null = null;
  public stats: ModelStats | null = null;
  public attachedWeaponGroup: THREE.Group | null = null;

  // Collision and size adaptation
  public height: number = 1.8;
  public radius: number = 0.45;
  public footOffset: number = 0;

  // Normalized model cache & custom markers for Mixamo-style interactive re-rigging
  public normalizedModel: THREE.Group | null = null;
  public currentMarkers: import('./RiggingSystem.ts').MarkerPositions | null = null;

  // Animation & Rig state
  public useAutoRig: boolean = true;
  public showSkeleton: boolean = false;
  public testAnimation: string | null = null;
  private animTime: number = 0;
  private landingSquash: number = 0;
  private hitReactionTimer: number = 0;
  private flashMaterials: Array<{ material: THREE.Material; originalColor?: THREE.Color }> = [];

  constructor() {
    this.root = new THREE.Group();
    this.modelContainer = new THREE.Group();
    this.root.add(this.modelContainer);
  }

  /**
   * Attaches weapon container to character's right hand bone or hand anchor socket
   */
  public attachWeapon(weaponGroup: THREE.Group) {
    this.attachedWeaponGroup = weaponGroup;
    this.rebindWeaponSocket();
  }

  public rebindWeaponSocket() {
    if (!this.attachedWeaponGroup) return;
    if (this.attachedWeaponGroup.parent) {
      this.attachedWeaponGroup.parent.remove(this.attachedWeaponGroup);
    }
    if (this.riggedCharacter?.bones?.rightHand) {
      let socket = this.riggedCharacter.bones.rightHand.getObjectByName('WeaponSocketNode') as THREE.Group;
      if (!socket) {
        socket = new THREE.Group();
        socket.name = 'WeaponSocketNode';
        // Calibrated hand socket transform: grips weapon naturally in palm, barrel pointing forward
        socket.position.set(0.01, -0.05, 0.03);
        socket.rotation.set(-Math.PI / 2, 0, 0);
        this.riggedCharacter.bones.rightHand.add(socket);
      }
      socket.add(this.attachedWeaponGroup);
      this.attachedWeaponGroup.position.set(0, 0, 0);
      this.attachedWeaponGroup.rotation.set(0, 0, 0);
      this.attachedWeaponGroup.scale.set(1, 1, 1);
    } else {
      this.modelContainer.add(this.attachedWeaponGroup);
      this.attachedWeaponGroup.position.set(0.32, 0.95, 0.2);
      this.attachedWeaponGroup.rotation.set(0, 0, 0);
      this.attachedWeaponGroup.scale.set(1, 1, 1);
    }
  }

  /**
   * Loads character using Three.js MTLLoader and OBJLoader
   * Ensures materials are loaded first before geometry, and JPG texture is resolved.
   */
  public async loadModel(
    basePath: string = '/assets/game/models/',
    mtlFileName: string = '3DModel.mtl',
    objFileName: string = '3DModel.obj',
    onProgress?: (percent: number, message: string) => void
  ): Promise<ModelStats> {
    onProgress?.(10, 'Initializing Material Loader...');

    return new Promise<ModelStats>((resolve, reject) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.setPath(basePath);

      mtlLoader.load(
        mtlFileName,
        (materials) => {
          onProgress?.(35, 'Materials loaded. Preloading textures...');
          materials.preload();

          // Auto-adjust character materials to lights (vibrant, double-sided, proper roughness)
          for (const matKey in materials.materials) {
            const mat = materials.materials[matKey] as THREE.MeshStandardMaterial;
            mat.roughness = 0.65;
            mat.metalness = 0.1;
            mat.side = THREE.DoubleSide;
            if (mat.map) {
              mat.color.setHex(0xffffff);
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.map.anisotropy = 4;
              mat.map.needsUpdate = true;
            }
          }

          onProgress?.(55, 'Loading 3D OBJ geometry...');
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath(basePath);

          objLoader.load(
            objFileName,
            (obj) => {
              onProgress?.(80, 'Normalizing geometry & generating auto-rig skeleton...');
              this.applyLoadedObject(obj, `${basePath}${objFileName}`);
              onProgress?.(100, 'Character ready with generated rig!');
              if (this.stats) resolve(this.stats);
            },
            (xhr) => {
              if (xhr.lengthComputable && xhr.total > 0) {
                const percent = Math.round(55 + (xhr.loaded / xhr.total) * 25);
                onProgress?.(percent, `Loading OBJ geometry (${Math.round(xhr.loaded / 1024)} KB)...`);
              }
            },
            (error) => {
              console.error('Failed to load OBJ geometry:', error);
              reject(new Error(`Failed to load OBJ geometry: ${error}`));
            }
          );
        },
        (xhr) => {
          if (xhr.lengthComputable && xhr.total > 0) {
            const percent = Math.round(10 + (xhr.loaded / xhr.total) * 25);
            onProgress?.(percent, `Loading MTL materials...`);
          }
        },
        (error) => {
          console.error('Failed to load MTL file:', error);
          reject(new Error(`Failed to load MTL file: ${error}`));
        }
      );
    });
  }

  /**
   * Process, normalize, and generate generic humanoid rig for the loaded OBJ model
   */
  public applyLoadedObject(obj: THREE.Group, sourceLabel: string, isSavedCustom: boolean = false) {
    // Clear previous model if any
    while (this.modelContainer.children.length > 0) {
      this.modelContainer.remove(this.modelContainer.children[0]);
    }
    this.flashMaterials = [];

    // Count vertices and faces & enable shadow casting
    let vertexCount = 0;
    let triangleCount = 0;

    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (mesh.geometry) {
          const pos = mesh.geometry.attributes.position;
          if (pos) vertexCount += pos.count;
          if (mesh.geometry.index) {
            triangleCount += mesh.geometry.index.count / 3;
          } else if (pos) {
            triangleCount += pos.count / 3;
          }
        }

        // Store materials for damage flashing
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => this.flashMaterials.push({ material: m }));
        } else if (mesh.material) {
          this.flashMaterials.push({ material: mesh.material });
        }
      }
    });

    // 1. Fold any nested local matrices into child geometries
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.updateMatrix();
        mesh.geometry.applyMatrix4(mesh.matrix);
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        mesh.updateMatrix();
      }
    });
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.updateMatrixWorld(true);

    // 2. Compute composite bounding box of the raw model
    const bbox = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const rawMinY = bbox.min.y;
    const rawHeight = size.y > 0.0001 ? size.y : 1.8;

    // 3. Bake target scale (~1.8) and center/grounding directly into all vertex attributes
    // This guarantees feet touch y = 0.0, top of head is at y = 1.8, and model is centered on X/Z
    const targetHeight = 1.8;
    const scaleFactor = targetHeight / rawHeight;

    const normMat = new THREE.Matrix4();
    normMat.makeTranslation(-center.x * scaleFactor, -rawMinY * scaleFactor, -center.z * scaleFactor);
    const scaleMat = new THREE.Matrix4().makeScale(scaleFactor, scaleFactor, scaleFactor);
    normMat.multiply(scaleMat);

    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry.applyMatrix4(normMat);
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
      }
    });

    obj.updateMatrixWorld(true);
    let normalizedBbox = new THREE.Box3().setFromObject(obj);
    const actualMinY = normalizedBbox.min.y;

    // Strict Ground Plane Calibration: eliminate any sub-millimeter float/gap
    if (Math.abs(actualMinY) > 0.0001) {
      const groundFixMat = new THREE.Matrix4().makeTranslation(0, -actualMinY, 0);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.applyMatrix4(groundFixMat);
          mesh.geometry.computeVertexNormals();
          mesh.geometry.computeBoundingBox();
          mesh.geometry.computeBoundingSphere();
        }
      });
      obj.updateMatrixWorld(true);
      normalizedBbox = new THREE.Box3().setFromObject(obj);
    }

    const normalizedSize = new THREE.Vector3();
    normalizedBbox.getSize(normalizedSize);

    // Cache normalized model and initialize default anatomical markers
    this.normalizedModel = obj;
    this.currentMarkers = RiggingSystem.getInitialMarkers(normalizedSize);

    // 4. Generate Humanoid Generic Rig & Skinning Weights aligned to normalized geometry
    try {
      const rig = AutoRigger.rigHumanoid(obj, this.currentMarkers);
      this.riggedCharacter = rig;
      rig.skeletonHelper.visible = this.showSkeleton;
      
      // Add the rigged character hierarchy to the container
      this.modelContainer.add(rig.rigGroup);

      // 5. Initialize AnimationMixer on modelContainer with idle, walk, jump, punch clips
      this.animator = new CharacterAnimator(this.modelContainer);
      this.modelMesh = rig.rigGroup;
    } catch (rigError) {
      console.warn('Auto-rigger notice, falling back to procedural transforms:', rigError);
      this.riggedCharacter = null;
      this.animator = null;
      this.modelMesh = obj;
      this.modelContainer.add(obj);
    }

    // Dynamic collision parameters adapted to normalized model size
    this.height = targetHeight;
    this.radius = Math.max(0.35, Math.min(0.65, (normalizedSize.x + normalizedSize.z) / 4));
    this.footOffset = 0;

    // Rebind weapon to right hand socket if weapon exists
    this.rebindWeaponSocket();

    this.stats = {
      vertexCount,
      triangleCount: Math.round(triangleCount),
      boundingBoxSize: normalizedSize,
      normalizedHeight: targetHeight,
      source: sourceLabel,
      isRigged: !!this.riggedCharacter,
      boneCount: this.riggedCharacter ? this.riggedCharacter.skeleton.bones.length : 0,
      isSavedCustom,
    };
  }

  /**
   * Applies user-adjusted marker positions to re-rig and re-skin the character model in real time
   */
  public getCharacterWorldBounds(): THREE.Box3 {
    this.root.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(this.root);
  }

  /**
   * Applies user-adjusted marker positions to re-rig and re-skin the character model safely
   * Retains the previous working character until the new rig is validated.
   */
  public applyCustomMarkers(markers: MarkerPositions): boolean {
    if (!this.normalizedModel) return false;
    this.currentMarkers = markers;

    try {
      // 1. Generate and validate new rig first before touching active scene
      const rig = AutoRigger.rigHumanoid(this.normalizedModel, markers);
      if (!rig || !rig.rigGroup || !rig.skeleton || rig.skeleton.bones.length === 0) {
        throw new Error('Generated humanoid rig structure is invalid');
      }

      // 2. Safe swap: only clear previous character once new rig is confirmed valid
      while (this.modelContainer.children.length > 0) {
        this.modelContainer.remove(this.modelContainer.children[0]);
      }

      this.riggedCharacter = rig;
      rig.skeletonHelper.visible = this.showSkeleton;
      this.modelContainer.add(rig.rigGroup);

      this.animator = new CharacterAnimator(this.modelContainer);
      this.modelMesh = rig.rigGroup;

      // Rebind weapon socket to newly generated skeleton
      this.rebindWeaponSocket();

      if (this.stats) {
        this.stats.isRigged = true;
        this.stats.boneCount = rig.skeleton.bones.length;
      }
      return true;
    } catch (err) {
      console.error('Failed to apply custom markers, preserving existing character rig:', err);
      return false;
    }
  }

  public setSkeletonVisibility(visible: boolean) {
    this.showSkeleton = visible;
    if (this.riggedCharacter?.skeletonHelper) {
      this.riggedCharacter.skeletonHelper.visible = visible;
    }
  }

  public setTestAnimation(anim: string | null) {
    this.testAnimation = anim;
    if (anim && this.animator) {
      if (anim === 'walk' || anim === 'run') {
        this.animator.transitionTo('walk');
      } else if (anim === 'jump') {
        this.animator.transitionTo('jump');
      } else if (anim === 'punch' || anim === 'attack') {
        this.animator.transitionTo('punch');
      } else if (anim === 'idle') {
        this.animator.transitionTo('idle');
      }
    }
  }

  /**
   * Trigger landing squash & stretch recoil
   */
  public triggerLandingSquash() {
    this.landingSquash = 1.0;
  }

  /**
   * Trigger red hit reaction / damage flash
   */
  public triggerHitReaction() {
    this.hitReactionTimer = 0.3; // 300ms flash
  }

  /**
   * Modular Animation Update:
   * Drives AnimationMixer (idle, walk, jump, punch) and procedural transforms.
   */
  public updateAnimation(
    dt: number,
    state: CharacterAnimationState,
    playerVel?: THREE.Vector3,
    isGrounded: boolean = true
  ) {
    this.animTime += dt;

    // 1. Authoritative Skeleton Animation & Coordinated Kinematics
    if (this.riggedCharacter) {
      const isTestWalk = this.testAnimation === 'walk';
      const isTestRun = this.testAnimation === 'run';
      const isTestJump = this.testAnimation === 'jump';
      const isTestAttack = this.testAnimation === 'punch' || this.testAnimation === 'attack';
      const isTestWave = this.testAnimation === 'wave';

      AutoRigger.animateRig(this.riggedCharacter, this.animTime, {
        isMoving: state.isMoving || isTestWalk || isTestRun,
        isRunning: state.isRunning || isTestRun,
        isGrounded: isTestJump ? false : state.isGrounded,
        isAttacking: state.isAttacking || isTestAttack,
        attackTimer: state.attackTimer,
        isVictory: state.isVictory,
        isAiming: state.isAiming,
        isShooting: state.isShooting,
        isReloading: state.isReloading,
        aimPitch: state.aimPitch,
        isWaving: isTestWave,
        speed: playerVel ? Math.hypot(playerVel.x, playerVel.z) : (state.isMoving ? 4.5 : 0),
      });
    } else if (this.animator) {
      // Fallback only if unrigged
      const vel = playerVel || new THREE.Vector3(state.isMoving ? 3 : 0, state.verticalVelocity, 0);
      this.animator.updateState(vel, isGrounded, state.isAttacking, state.isRunning);
      this.animator.update(dt);
    }

    // 2. Strict Foot Grounding Guarantee:
    // When grounded, modelContainer remains firmly anchored at (0, 0, 0) with scale (1, 1, 1)
    // so both feet remain flush with the platform surface with zero hover gap!
    if (isGrounded) {
      this.modelContainer.position.set(0, 0, 0);
      this.modelContainer.rotation.set(0, 0, 0);
      this.modelContainer.scale.set(1, 1, 1);
    } else {
      // Subtle airborne stretch during jumps
      const stretch = state.verticalVelocity > 0.5 ? Math.min(0.08, state.verticalVelocity * 0.01) : 0;
      this.modelContainer.position.set(0, 0, 0);
      this.modelContainer.rotation.set(0, 0, 0);
      this.modelContainer.scale.set(1 - stretch * 0.2, 1 + stretch, 1 - stretch * 0.2);
    }

    this.root.updateMatrixWorld(true);

    if (this.riggedCharacter?.skeletonHelper && this.showSkeleton) {
      this.riggedCharacter.skeletonHelper.updateMatrixWorld(true);
    }

    // 3. Hit Reaction Flashing
    if (this.hitReactionTimer > 0) {
      this.hitReactionTimer -= dt;
      const isRed = (Math.floor(this.hitReactionTimer * 20) % 2) === 0;
      this.flashMaterials.forEach((item) => {
        const mat = item.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          if (!item.originalColor) item.originalColor = mat.color.clone();
          mat.color.setHex(isRed ? 0xff2222 : 0xffffff);
        }
      });
    } else if (this.flashMaterials.length > 0 && this.flashMaterials[0].originalColor) {
      this.flashMaterials.forEach((item) => {
        const mat = item.material as THREE.MeshStandardMaterial;
        if (mat.color && item.originalColor) {
          mat.color.copy(item.originalColor);
        }
      });
    }
  }

  /**
   * Set world position of character root
   */
  public setPosition(x: number, y: number, z: number) {
    this.root.position.set(x, y, z);
  }

  /**
   * Set rotation of character to face movement direction
   */
  public setRotationY(angle: number) {
    this.root.rotation.y = angle;
  }

  /**
   * Diagnostic method to inspect character bounds, foot grounding, and weapon socket
   */
  public getFootDiagnostics(): {
    rootY: number;
    modelContainerY: number;
    lowestWorldY: number;
    weaponBone: string | null;
  } {
    this.root.updateMatrixWorld(true);
    const worldBox = new THREE.Box3().setFromObject(this.root);
    return {
      rootY: this.root.position.y,
      modelContainerY: this.modelContainer.position.y,
      lowestWorldY: Math.round(worldBox.min.y * 1000) / 1000,
      weaponBone: this.attachedWeaponGroup?.parent?.name ?? null,
    };
  }
}

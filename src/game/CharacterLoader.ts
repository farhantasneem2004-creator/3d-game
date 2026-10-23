import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { AutoRigger, RiggedCharacter } from './AutoRigger.ts';

export interface ModelStats {
  vertexCount: number;
  triangleCount: number;
  boundingBoxSize: THREE.Vector3;
  normalizedHeight: number;
  source: string;
  isRigged: boolean;
  boneCount: number;
}

export interface CharacterAnimationState {
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
  isAttacking: boolean;
  attackTimer: number;
  verticalVelocity: number;
  isVictory?: boolean;
}

export class CharacterController {
  public root: THREE.Group;
  public modelContainer: THREE.Group; // Contains normalized model for anims
  public modelMesh: THREE.Group | null = null;
  public riggedCharacter: RiggedCharacter | null = null;
  public stats: ModelStats | null = null;

  // Collision and size adaptation
  public height: number = 1.8;
  public radius: number = 0.45;
  public footOffset: number = 0;

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
   * Loads character using Three.js MTLLoader and OBJLoader
   * Ensures materials are loaded first before geometry, and JPG texture is resolved.
   */
  public async loadModel(
    basePath: string = '/models/',
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

          // Ensure texture filtering & color space on loaded materials
          for (const matKey in materials.materials) {
            const mat = materials.materials[matKey] as THREE.MeshStandardMaterial;
            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.map.anisotropy = 4;
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
  public applyLoadedObject(obj: THREE.Group, sourceLabel: string) {
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

    // 1. Calculate raw model bounding box
    const bbox = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // 2. Normalize scale to target height of ~1.8 units
    const targetHeight = 1.8;
    const rawHeight = size.y || 1;
    const scaleFactor = targetHeight / rawHeight;
    obj.scale.setScalar(scaleFactor);

    // Recompute bounding box after scaling
    const scaledBbox = new THREE.Box3().setFromObject(obj);
    const scaledSize = new THREE.Vector3();
    scaledBbox.getSize(scaledSize);

    // 3. Place character feet directly at y = 0
    obj.position.x = -center.x * scaleFactor;
    obj.position.z = -center.z * scaleFactor;
    obj.position.y = -scaledBbox.min.y;

    // 4. Generate Humanoid Generic Rig & Skinning Weights!
    try {
      const rig = AutoRigger.rigHumanoid(obj);
      this.riggedCharacter = rig;
      rig.skeletonHelper.visible = this.showSkeleton;
      this.modelContainer.add(rig.skeletonHelper);
    } catch (rigError) {
      console.warn('Auto-rigger notice, falling back to procedural transforms:', rigError);
      this.riggedCharacter = null;
    }

    this.modelMesh = obj;
    this.modelContainer.add(obj);

    // Dynamic collision parameters adapted to model size
    this.height = targetHeight;
    this.radius = Math.max(0.35, Math.min(0.65, (scaledSize.x + scaledSize.z) / 4));
    this.footOffset = 0;

    this.stats = {
      vertexCount,
      triangleCount: Math.round(triangleCount),
      boundingBoxSize: scaledSize,
      normalizedHeight: targetHeight,
      source: sourceLabel,
      isRigged: !!this.riggedCharacter,
      boneCount: this.riggedCharacter ? this.riggedCharacter.skeleton.bones.length : 0,
    };
  }

  public setSkeletonVisibility(visible: boolean) {
    this.showSkeleton = visible;
    if (this.riggedCharacter?.skeletonHelper) {
      this.riggedCharacter.skeletonHelper.visible = visible;
    }
  }

  public setTestAnimation(anim: string | null) {
    this.testAnimation = anim;
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
   * Drives both the generated humanoid skeleton rig (if enabled) and procedural transforms.
   */
  public updateAnimation(dt: number, state: CharacterAnimationState) {
    this.animTime += dt;

    // Override with test animation if active in inspector
    let isMoving = state.isMoving;
    let isRunning = state.isRunning;
    let isGrounded = state.isGrounded;
    let isAttacking = state.isAttacking;
    let isWaving = false;
    let isVictory = state.isVictory;

    if (this.testAnimation === 'walk') {
      isMoving = true;
      isRunning = false;
      isGrounded = true;
    } else if (this.testAnimation === 'run') {
      isMoving = true;
      isRunning = true;
      isGrounded = true;
    } else if (this.testAnimation === 'jump') {
      isGrounded = false;
    } else if (this.testAnimation === 'attack') {
      isAttacking = true;
    } else if (this.testAnimation === 'wave') {
      isWaving = true;
      isMoving = false;
    } else if (this.testAnimation === 'victory') {
      isVictory = true;
      isMoving = false;
    }

    // 1. If skeleton rig is present and enabled, drive full bone kinematics!
    if (this.useAutoRig && this.riggedCharacter) {
      AutoRigger.animateRig(this.riggedCharacter, this.animTime, {
        isMoving,
        isRunning,
        isGrounded,
        isAttacking,
        isWaving,
        isVictory,
      });

      if (this.riggedCharacter.skeletonHelper && this.showSkeleton) {
        this.riggedCharacter.skeletonHelper.updateMatrixWorld(true);
      }
    }

    // 2. Procedural Squash/Stretch & Momentum Transforms
    let sx = 1.0;
    let sy = 1.0;
    let sz = 1.0;
    let py = 0;
    let rx = 0;
    let rz = 0;

    // Landing squash decay
    if (this.landingSquash > 0.001) {
      const squashAmount = Math.sin(this.landingSquash * Math.PI) * 0.22;
      sy -= squashAmount;
      sx += squashAmount * 0.5;
      sz += squashAmount * 0.5;
      this.landingSquash = Math.max(0, this.landingSquash - dt * 4.5);
    }

    // Air / Jump deformation
    if (!isGrounded) {
      if (state.verticalVelocity > 0.5) {
        const stretch = Math.min(0.18, state.verticalVelocity * 0.018);
        sy += stretch;
        sx -= stretch * 0.35;
        sz -= stretch * 0.35;
      }
    }

    // Apply overall procedural transforms
    this.modelContainer.scale.set(sx, sy, sz);
    this.modelContainer.position.y = py;
    this.modelContainer.rotation.x = rx;
    this.modelContainer.rotation.z = rz;

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
}

import * as THREE from 'three';

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  private currentPosition: THREE.Vector3;
  private currentLookAt: THREE.Vector3;

  // Orbit controls
  public yaw: number = 0; // horizontal angle in radians
  public pitch: number = 0.28; // vertical angle in radians (downwards view)
  public distance: number = 5.2;
  public height: number = 2.2;

  // Aiming (Over-the-shoulder GTA style)
  public isAiming: boolean = false;
  private currentAimWeight: number = 0; // 0 = standard, 1 = over shoulder
  private defaultFov: number = 60;
  private aimFov: number = 48;

  // Pitch constraints
  private minPitch: number = -0.65;
  private maxPitch: number = 1.1;

  constructor(fov = 60, aspect = 16 / 9, near = 0.1, far = 1000) {
    this.defaultFov = fov;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.currentPosition = new THREE.Vector3(0, 5, 8);
    this.currentLookAt = new THREE.Vector3(0, 1, 0);
    this.camera.position.copy(this.currentPosition);
  }

  /**
   * Handle touch/mouse drag rotation delta
   */
  public handleDrag(deltaX: number, deltaY: number) {
    const sensitivity = this.isAiming ? 0.0035 : 0.005;
    this.yaw -= deltaX * sensitivity;
    this.pitch += deltaY * sensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  /**
   * Returns exact normalized horizontal forward and right vectors for camera-relative movement.
   * Forward: projected direction camera is facing.
   * Right: Forward x UP (guarantees +X is screen right when looking forward).
   */
  public getHorizontalVectors(): { forward: THREE.Vector3; right: THREE.Vector3 } {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) {
      forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    } else {
      forward.normalize();
    }

    // Right vector = Forward x UP (in Three.js right-handed coordinate system: (0,0,-1) x (0,1,0) = (1,0,0) = Right)
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    return { forward, right };
  }

  /**
   * Smooth follow update loop with GTA-style over-the-shoulder aiming mode
   */
  public update(
    dt: number,
    targetPos: THREE.Vector3,
    _targetFacingAngle: number,
    _isMoving: boolean,
    obstacles: THREE.Object3D[] = []
  ) {
    // 1. Smoothly blend aiming weight (over-the-shoulder transition)
    const targetAimWeight = this.isAiming ? 1.0 : 0.0;
    this.currentAimWeight = THREE.MathUtils.damp(this.currentAimWeight, targetAimWeight, 14.0, dt);

    // 2. Adjust FOV for aim zoom
    const targetFov = THREE.MathUtils.lerp(this.defaultFov, this.aimFov, this.currentAimWeight);
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = targetFov;
      this.camera.updateProjectionMatrix();
    }

    // 3. Compute camera distance and heights based on aim state
    // Standard: 5.2m back, 2.2m up. Aiming: 2.6m back, 1.4m up, 0.65m right shoulder offset
    const currentDist = THREE.MathUtils.lerp(5.2, 2.6, this.currentAimWeight);
    const currentHeight = THREE.MathUtils.lerp(2.2, 1.4, this.currentAimWeight);
    const shoulderOffset = THREE.MathUtils.lerp(0.0, 0.65, this.currentAimWeight);

    const horizontalDist = currentDist * Math.cos(this.pitch);
    const verticalDist = currentDist * Math.sin(this.pitch) + currentHeight;

    // Calculate base position behind character relative to yaw
    let idealX = targetPos.x - Math.sin(this.yaw) * horizontalDist;
    let idealZ = targetPos.z - Math.cos(this.yaw) * horizontalDist;
    let idealY = targetPos.y + verticalDist;

    // Apply right-shoulder offset when aiming
    if (shoulderOffset > 0.001) {
      const { right } = this.getHorizontalVectors();
      idealX += right.x * shoulderOffset;
      idealZ += right.z * shoulderOffset;
    }

    const idealPosition = new THREE.Vector3(idealX, idealY, idealZ);
    // Look at point: centered on torso / head (higher when aiming for reticle alignment)
    const lookAtY = targetPos.y + THREE.MathUtils.lerp(1.1, 1.35, this.currentAimWeight);
    const idealLookAt = new THREE.Vector3(targetPos.x, lookAtY, targetPos.z);

    if (shoulderOffset > 0.001) {
      const { right } = this.getHorizontalVectors();
      idealLookAt.x += right.x * (shoulderOffset * 0.7);
      idealLookAt.z += right.z * (shoulderOffset * 0.7);
    }

    // Collision check: Raycast from target to ideal position to prevent clipping through platforms
    if (obstacles.length > 0) {
      const rayDir = idealPosition.clone().sub(idealLookAt).normalize();
      const maxRayDist = idealPosition.distanceTo(idealLookAt);
      const raycaster = new THREE.Raycaster(idealLookAt, rayDir, 0.2, maxRayDist);
      const hits = raycaster.intersectObjects(obstacles, false);

      if (hits.length > 0) {
        // Pull camera forward in front of the obstacle with 0.35m cushion
        const hitDist = hits[0].distance - 0.35;
        if (hitDist > 1.0) {
          idealPosition.copy(idealLookAt).addScaledVector(rayDir, hitDist);
        }
      }
    }

    // Never let camera drop below minimum safety floor height
    if (idealPosition.y < targetPos.y + 0.4) {
      idealPosition.y = targetPos.y + 0.4;
    }

    // Smooth frame-rate independent exponential damping
    const dampSpeed = this.isAiming ? 20.0 : 12.0;
    this.currentPosition.x = THREE.MathUtils.damp(this.currentPosition.x, idealPosition.x, dampSpeed, dt);
    this.currentPosition.y = THREE.MathUtils.damp(this.currentPosition.y, idealPosition.y, dampSpeed, dt);
    this.currentPosition.z = THREE.MathUtils.damp(this.currentPosition.z, idealPosition.z, dampSpeed, dt);

    this.currentLookAt.x = THREE.MathUtils.damp(this.currentLookAt.x, idealLookAt.x, dampSpeed * 1.2, dt);
    this.currentLookAt.y = THREE.MathUtils.damp(this.currentLookAt.y, idealLookAt.y, dampSpeed * 1.2, dt);
    this.currentLookAt.z = THREE.MathUtils.damp(this.currentLookAt.z, idealLookAt.z, dampSpeed * 1.2, dt);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  /**
   * Reset camera to default orientation directly behind player
   */
  public reset(facingAngle = 0) {
    this.yaw = facingAngle;
    this.pitch = 0.28;
    this.isAiming = false;
    this.currentAimWeight = 0;
  }

  public setAiming(aiming: boolean) {
    this.isAiming = aiming;
  }

  public updateAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

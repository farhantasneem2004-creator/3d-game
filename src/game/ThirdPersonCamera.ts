import * as THREE from 'three';

export class ThirdPersonCamera {
  public camera: THREE.PerspectiveCamera;
  private currentPosition: THREE.Vector3;
  private currentLookAt: THREE.Vector3;

  // Orbit controls
  public yaw: number = 0; // horizontal angle in radians
  public pitch: number = 0.28; // vertical angle in radians (downwards view)
  public distance: number = 5.6;
  public height: number = 2.4;

  // Pitch constraints
  private minPitch: number = -0.15;
  private maxPitch: number = 1.1;

  constructor(fov = 60, aspect = 16 / 9, near = 0.1, far = 1000) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.currentPosition = new THREE.Vector3(0, 5, 8);
    this.currentLookAt = new THREE.Vector3(0, 1, 0);
    this.camera.position.copy(this.currentPosition);
  }

  /**
   * Handle touch drag rotation delta
   */
  public handleDrag(deltaX: number, deltaY: number) {
    const sensitivity = 0.005;
    this.yaw -= deltaX * sensitivity;
    this.pitch += deltaY * sensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  /**
   * Smooth follow update loop
   */
  public update(
    dt: number,
    targetPos: THREE.Vector3,
    targetFacingAngle: number,
    isMoving: boolean,
    obstacles: THREE.Object3D[] = []
  ) {
    // If moving forward and no active touch drag, gently damp yaw towards player facing
    if (isMoving) {
      // Subtle auto-orient camera behind player
      const idealYaw = targetFacingAngle;
      const angleDiff = THREE.MathUtils.euclideanModulo(idealYaw - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
      this.yaw += angleDiff * Math.min(1.0, dt * 1.5);
    }

    // Calculate ideal camera position based on target and spherical orbit coordinates
    const horizontalDist = this.distance * Math.cos(this.pitch);
    const verticalDist = this.distance * Math.sin(this.pitch) + this.height;

    // Position behind character relative to yaw
    const idealX = targetPos.x - Math.sin(this.yaw) * horizontalDist;
    const idealZ = targetPos.z - Math.cos(this.yaw) * horizontalDist;
    const idealY = Math.max(targetPos.y + 0.8, targetPos.y + verticalDist);

    const idealPosition = new THREE.Vector3(idealX, idealY, idealZ);
    const idealLookAt = new THREE.Vector3(targetPos.x, targetPos.y + 1.2, targetPos.z);

    // Collision check: Raycast from target to ideal position to prevent clipping through platforms
    if (obstacles.length > 0) {
      const rayDir = idealPosition.clone().sub(idealLookAt).normalize();
      const maxRayDist = idealPosition.distanceTo(idealLookAt);
      const raycaster = new THREE.Raycaster(idealLookAt, rayDir, 0.2, maxRayDist);
      const hits = raycaster.intersectObjects(obstacles, false);

      if (hits.length > 0) {
        // Pull camera forward in front of the obstacle with 0.3m cushion
        const hitDist = hits[0].distance - 0.35;
        if (hitDist > 1.2) {
          idealPosition.copy(idealLookAt).addScaledVector(rayDir, hitDist);
        }
      }
    }

    // Never let camera drop below minimum safety floor height
    if (idealPosition.y < targetPos.y + 0.5) {
      idealPosition.y = targetPos.y + 0.5;
    }

    // Smooth frame-rate independent exponential damping
    const dampSpeed = 10.0;
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
  }

  public updateAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

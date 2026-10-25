import * as THREE from 'three';

export type AnimationStateName = 'idle' | 'walk' | 'jump' | 'punch';

export class CharacterAnimator {
  public mixer: THREE.AnimationMixer;
  public actions: Map<AnimationStateName, THREE.AnimationAction> = new Map();
  public currentAction: THREE.AnimationAction | null = null;
  public currentState: AnimationStateName = 'idle';

  constructor(rootObject: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(rootObject);
    this.createClips(rootObject);
  }

  /**
   * Constructs keyframed AnimationClips for 'idle', 'walk', 'jump', and 'punch'
   */
  private createClips(root: THREE.Object3D) {
    const clips = [
      this.buildIdleClip(),
      this.buildWalkClip(),
      this.buildJumpClip(),
      this.buildPunchClip(),
    ];

    for (const clip of clips) {
      const action = this.mixer.clipAction(clip, root);
      if (clip.name === 'punch') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = false;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      this.actions.set(clip.name as AnimationStateName, action);
    }

    // Start with idle
    const idleAction = this.actions.get('idle');
    if (idleAction) {
      idleAction.play();
      this.currentAction = idleAction;
      this.currentState = 'idle';
    }
  }

  /**
   * Cycles between 'idle', 'walk', 'jump', and 'punch' based on playerVel and isGrounded
   */
  public updateState(
    playerVel: THREE.Vector3,
    isGrounded: boolean,
    isAttacking: boolean,
    isRunning: boolean = false
  ) {
    let targetState: AnimationStateName = 'idle';

    if (isAttacking) {
      targetState = 'punch';
    } else if (!isGrounded) {
      targetState = 'jump';
    } else {
      const horizontalSpeed = Math.hypot(playerVel.x, playerVel.z);
      if (horizontalSpeed > 0.25) {
        targetState = 'walk';
      } else {
        targetState = 'idle';
      }
    }

    // Handle walk playback speed based on running
    const walkAction = this.actions.get('walk');
    if (walkAction) {
      walkAction.timeScale = isRunning ? 1.45 : 1.0;
    }

    if (this.currentState !== targetState) {
      this.transitionTo(targetState);
    }
  }

  public transitionTo(stateName: AnimationStateName) {
    const nextAction = this.actions.get(stateName);
    if (!nextAction || nextAction === this.currentAction) return;

    const fadeDuration = stateName === 'punch' ? 0.08 : (stateName === 'jump' ? 0.12 : 0.22);

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeDuration);
    }

    if (stateName === 'punch') {
      nextAction.reset();
    }

    nextAction.reset().fadeIn(fadeDuration).play();
    this.currentAction = nextAction;
    this.currentState = stateName;
  }

  public update(dt: number) {
    this.mixer.update(dt);

    // If punch finished, revert to idle or walk
    if (this.currentState === 'punch') {
      const punchAction = this.actions.get('punch');
      if (punchAction && !punchAction.isRunning()) {
        this.transitionTo('idle');
      }
    }
  }

  // -------------------------------------------------------------
  // ANIMATION CLIP BUILDERS (Real-world bipedal humanoid physics)
  // -------------------------------------------------------------

  private qFromEuler(x: number, y: number, z: number): number[] {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    return [q.x, q.y, q.z, q.w];
  }

  /**
   * IDLE: Natural breathing, organic resting arm sway, subtle pelvic shift
   */
  private buildIdleClip(): THREE.AnimationClip {
    const times = [0, 0.5, 1.0, 1.5, 2.0];

    // Spine breathing (slight pitch forward/back)
    const spineQuats = [
      ...this.qFromEuler(0.0, 0, 0),
      ...this.qFromEuler(0.03, 0, 0),
      ...this.qFromEuler(0.0, 0, 0),
      ...this.qFromEuler(-0.02, 0, 0),
      ...this.qFromEuler(0.0, 0, 0),
    ];
    const spineTrack = new THREE.QuaternionKeyframeTrack('Spine.quaternion', times, spineQuats);

    // Left arm resting sway
    const leftArmQuats = [
      ...this.qFromEuler(0, 0, -0.08),
      ...this.qFromEuler(0.02, 0, -0.10),
      ...this.qFromEuler(0, 0, -0.08),
      ...this.qFromEuler(-0.02, 0, -0.06),
      ...this.qFromEuler(0, 0, -0.08),
    ];
    const leftArmTrack = new THREE.QuaternionKeyframeTrack('LeftUpperArm.quaternion', times, leftArmQuats);

    // Right arm resting sway
    const rightArmQuats = [
      ...this.qFromEuler(0, 0, 0.08),
      ...this.qFromEuler(-0.02, 0, 0.10),
      ...this.qFromEuler(0, 0, 0.08),
      ...this.qFromEuler(0.02, 0, 0.06),
      ...this.qFromEuler(0, 0, 0.08),
    ];
    const rightArmTrack = new THREE.QuaternionKeyframeTrack('RightUpperArm.quaternion', times, rightArmQuats);

    // Head subtle glance
    const headQuats = [
      ...this.qFromEuler(0, 0, 0),
      ...this.qFromEuler(0.02, 0.04, 0),
      ...this.qFromEuler(0, 0, 0),
      ...this.qFromEuler(-0.01, -0.04, 0),
      ...this.qFromEuler(0, 0, 0),
    ];
    const headTrack = new THREE.QuaternionKeyframeTrack('Head.quaternion', times, headQuats);

    return new THREE.AnimationClip('idle', 2.0, [spineTrack, leftArmTrack, rightArmTrack, headTrack]);
  }

  /**
   * WALK: Contrapposto gait, swinging arms & legs, knee flexion, pelvis bounce
   */
  private buildWalkClip(): THREE.AnimationClip {
    // 0.8s stride cycle: 4 phases (0.0s, 0.2s, 0.4s, 0.6s, 0.8s)
    const times = [0.0, 0.2, 0.4, 0.6, 0.8];

    // Left Thigh: forward, mid, back, mid, forward
    const leftUpLegQuats = [
      ...this.qFromEuler(0.48, 0, 0),
      ...this.qFromEuler(0.0, 0, 0),
      ...this.qFromEuler(-0.48, 0, 0),
      ...this.qFromEuler(0.0, 0, 0),
      ...this.qFromEuler(0.48, 0, 0),
    ];
    const leftUpLegTrack = new THREE.QuaternionKeyframeTrack('LeftUpLeg.quaternion', times, leftUpLegQuats);

    // Right Thigh: opposite of left
    const rightUpLegQuats = [
      ...this.qFromEuler(-0.48, 0, 0),
      ...this.qFromEuler(0.0, 0, 0),
      ...this.qFromEuler(0.48, 0, 0),
      ...this.qFromEuler(0.0, 0, 0),
      ...this.qFromEuler(-0.48, 0, 0),
    ];
    const rightUpLegTrack = new THREE.QuaternionKeyframeTrack('RightUpLeg.quaternion', times, rightUpLegQuats);

    // Left Knee: bends when swinging back to clear ground
    const leftLegQuats = [
      ...this.qFromEuler(0.1, 0, 0),
      ...this.qFromEuler(0.55, 0, 0),
      ...this.qFromEuler(0.15, 0, 0),
      ...this.qFromEuler(0.05, 0, 0),
      ...this.qFromEuler(0.1, 0, 0),
    ];
    const leftLegTrack = new THREE.QuaternionKeyframeTrack('LeftLeg.quaternion', times, leftLegQuats);

    // Right Knee: opposite of left knee
    const rightLegQuats = [
      ...this.qFromEuler(0.15, 0, 0),
      ...this.qFromEuler(0.05, 0, 0),
      ...this.qFromEuler(0.1, 0, 0),
      ...this.qFromEuler(0.55, 0, 0),
      ...this.qFromEuler(0.15, 0, 0),
    ];
    const rightLegTrack = new THREE.QuaternionKeyframeTrack('RightLeg.quaternion', times, rightLegQuats);

    // Left Arm swings in opposition to Left Leg (contrapposto!)
    const leftArmQuats = [
      ...this.qFromEuler(-0.42, 0, -0.08),
      ...this.qFromEuler(0.0, 0, -0.08),
      ...this.qFromEuler(0.42, 0, -0.08),
      ...this.qFromEuler(0.0, 0, -0.08),
      ...this.qFromEuler(-0.42, 0, -0.08),
    ];
    const leftArmTrack = new THREE.QuaternionKeyframeTrack('LeftUpperArm.quaternion', times, leftArmQuats);

    // Right Arm swings in opposition to Right Leg
    const rightArmQuats = [
      ...this.qFromEuler(0.42, 0, 0.08),
      ...this.qFromEuler(0.0, 0, 0.08),
      ...this.qFromEuler(-0.42, 0, 0.08),
      ...this.qFromEuler(0.0, 0, 0.08),
      ...this.qFromEuler(0.42, 0, 0.08),
    ];
    const rightArmTrack = new THREE.QuaternionKeyframeTrack('RightUpperArm.quaternion', times, rightArmQuats);

    // Forearms slightly bent for active walking
    const leftForearmQuats = [
      ...this.qFromEuler(-0.35, 0, 0),
      ...this.qFromEuler(-0.25, 0, 0),
      ...this.qFromEuler(-0.45, 0, 0),
      ...this.qFromEuler(-0.25, 0, 0),
      ...this.qFromEuler(-0.35, 0, 0),
    ];
    const leftForearmTrack = new THREE.QuaternionKeyframeTrack('LeftForearm.quaternion', times, leftForearmQuats);

    const rightForearmQuats = [
      ...this.qFromEuler(-0.45, 0, 0),
      ...this.qFromEuler(-0.25, 0, 0),
      ...this.qFromEuler(-0.35, 0, 0),
      ...this.qFromEuler(-0.25, 0, 0),
      ...this.qFromEuler(-0.45, 0, 0),
    ];
    const rightForearmTrack = new THREE.QuaternionKeyframeTrack('RightForearm.quaternion', times, rightForearmQuats);

    // Feet flex on heel strike and toe push-off
    const leftFootQuats = [
      ...this.qFromEuler(0.15, 0, 0),
      ...this.qFromEuler(-0.1, 0, 0),
      ...this.qFromEuler(-0.25, 0, 0),
      ...this.qFromEuler(0.05, 0, 0),
      ...this.qFromEuler(0.15, 0, 0),
    ];
    const leftFootTrack = new THREE.QuaternionKeyframeTrack('LeftFoot.quaternion', times, leftFootQuats);

    const rightFootQuats = [
      ...this.qFromEuler(-0.25, 0, 0),
      ...this.qFromEuler(0.05, 0, 0),
      ...this.qFromEuler(0.15, 0, 0),
      ...this.qFromEuler(-0.1, 0, 0),
      ...this.qFromEuler(-0.25, 0, 0),
    ];
    const rightFootTrack = new THREE.QuaternionKeyframeTrack('RightFoot.quaternion', times, rightFootQuats);

    // Spine counter-rotation & forward stride lean
    const spineQuats = [
      ...this.qFromEuler(0.08, -0.1, 0),
      ...this.qFromEuler(0.08, 0.0, 0),
      ...this.qFromEuler(0.08, 0.1, 0),
      ...this.qFromEuler(0.08, 0.0, 0),
      ...this.qFromEuler(0.08, -0.1, 0),
    ];
    const spineTrack = new THREE.QuaternionKeyframeTrack('Spine.quaternion', times, spineQuats);

    return new THREE.AnimationClip('walk', 0.8, [
      leftUpLegTrack,
      rightUpLegTrack,
      leftLegTrack,
      rightLegTrack,
      leftFootTrack,
      rightFootTrack,
      leftArmTrack,
      rightArmTrack,
      leftForearmTrack,
      rightForearmTrack,
      spineTrack,
    ]);
  }

  /**
   * JUMP: Airborne physics, leg tuck, outstretched balance hands, landing compression
   */
  private buildJumpClip(): THREE.AnimationClip {
    const times = [0.0, 0.25, 0.6, 1.0];

    // Left & Right Thighs pull up into mid-air knee tuck
    const leftUpLegQuats = [
      ...this.qFromEuler(-0.35, 0, 0),
      ...this.qFromEuler(-0.55, 0, 0),
      ...this.qFromEuler(-0.45, 0, 0),
      ...this.qFromEuler(0.1, 0, 0),
    ];
    const leftUpLegTrack = new THREE.QuaternionKeyframeTrack('LeftUpLeg.quaternion', times, leftUpLegQuats);

    const rightUpLegQuats = [
      ...this.qFromEuler(-0.25, 0, 0),
      ...this.qFromEuler(-0.45, 0, 0),
      ...this.qFromEuler(-0.35, 0, 0),
      ...this.qFromEuler(0.1, 0, 0),
    ];
    const rightUpLegTrack = new THREE.QuaternionKeyframeTrack('RightUpLeg.quaternion', times, rightUpLegQuats);

    // Knees bend back for tuck
    const leftLegQuats = [
      ...this.qFromEuler(0.65, 0, 0),
      ...this.qFromEuler(0.85, 0, 0),
      ...this.qFromEuler(0.65, 0, 0),
      ...this.qFromEuler(0.1, 0, 0),
    ];
    const leftLegTrack = new THREE.QuaternionKeyframeTrack('LeftLeg.quaternion', times, leftLegQuats);

    const rightLegQuats = [
      ...this.qFromEuler(0.5, 0, 0),
      ...this.qFromEuler(0.75, 0, 0),
      ...this.qFromEuler(0.55, 0, 0),
      ...this.qFromEuler(0.1, 0, 0),
    ];
    const rightLegTrack = new THREE.QuaternionKeyframeTrack('RightLeg.quaternion', times, rightLegQuats);

    // Arms raise outward and slightly back for dynamic aerodynamic balance
    const leftArmQuats = [
      ...this.qFromEuler(-0.25, 0, -0.65),
      ...this.qFromEuler(-0.35, 0, -0.85),
      ...this.qFromEuler(-0.25, 0, -0.55),
      ...this.qFromEuler(0.0, 0, -0.1),
    ];
    const leftArmTrack = new THREE.QuaternionKeyframeTrack('LeftUpperArm.quaternion', times, leftArmQuats);

    const rightArmQuats = [
      ...this.qFromEuler(-0.25, 0, 0.65),
      ...this.qFromEuler(-0.35, 0, 0.85),
      ...this.qFromEuler(-0.25, 0, 0.55),
      ...this.qFromEuler(0.0, 0, 0.1),
    ];
    const rightArmTrack = new THREE.QuaternionKeyframeTrack('RightUpperArm.quaternion', times, rightArmQuats);

    // Spine stretches back slightly
    const spineQuats = [
      ...this.qFromEuler(-0.08, 0, 0),
      ...this.qFromEuler(-0.12, 0, 0),
      ...this.qFromEuler(0.05, 0, 0),
      ...this.qFromEuler(0.0, 0, 0),
    ];
    const spineTrack = new THREE.QuaternionKeyframeTrack('Spine.quaternion', times, spineQuats);

    return new THREE.AnimationClip('jump', 1.0, [
      leftUpLegTrack,
      rightUpLegTrack,
      leftLegTrack,
      rightLegTrack,
      leftArmTrack,
      rightArmTrack,
      spineTrack,
    ]);
  }

  /**
   * PUNCH / ATTACK: Real-world strike: wind-up, explosive punch thrust, torso torque, recovery
   */
  private buildPunchClip(): THREE.AnimationClip {
    // 0.35s total punch strike
    const times = [0.0, 0.08, 0.16, 0.26, 0.35];

    // Right Arm: Windup -> Explosive straight punch forward -> Retract
    const rightArmQuats = [
      ...this.qFromEuler(0.1, 0, 0.1),            // Neutral
      ...this.qFromEuler(0.4, 0.2, 0.2),           // Wind-up: elbow back
      ...this.qFromEuler(-1.55, -0.2, 0.05),       // IMPACT: punch straight forward!
      ...this.qFromEuler(-0.8, -0.1, 0.1),         // Recoil
      ...this.qFromEuler(0, 0, 0.08),              // Neutral
    ];
    const rightArmTrack = new THREE.QuaternionKeyframeTrack('RightUpperArm.quaternion', times, rightArmQuats);

    // Right Forearm: Extends on punch impact
    const rightForearmQuats = [
      ...this.qFromEuler(-0.2, 0, 0),
      ...this.qFromEuler(-1.1, 0, 0), // Cocked
      ...this.qFromEuler(-0.05, 0, 0), // Snapped straight forward
      ...this.qFromEuler(-0.5, 0, 0),
      ...this.qFromEuler(-0.2, 0, 0),
    ];
    const rightForearmTrack = new THREE.QuaternionKeyframeTrack('RightForearm.quaternion', times, rightForearmQuats);

    // Left Arm: Counter-guard defense at chest
    const leftArmQuats = [
      ...this.qFromEuler(0, 0, -0.08),
      ...this.qFromEuler(-0.3, 0.2, -0.4), // Guard up
      ...this.qFromEuler(-0.35, 0.25, -0.45),
      ...this.qFromEuler(-0.2, 0.1, -0.2),
      ...this.qFromEuler(0, 0, -0.08),
    ];
    const leftArmTrack = new THREE.QuaternionKeyframeTrack('LeftUpperArm.quaternion', times, leftArmQuats);

    // Spine torque: rotates into punch for physical weight
    const spineQuats = [
      ...this.qFromEuler(0, 0, 0),
      ...this.qFromEuler(0.05, 0.25, 0),  // Coiling back
      ...this.qFromEuler(0.12, -0.32, 0), // Snapping forward with hip torque
      ...this.qFromEuler(0.05, -0.1, 0),
      ...this.qFromEuler(0, 0, 0),
    ];
    const spineTrack = new THREE.QuaternionKeyframeTrack('Spine.quaternion', times, spineQuats);

    // Head stays focused forward on target
    const headQuats = [
      ...this.qFromEuler(0, 0, 0),
      ...this.qFromEuler(0, -0.1, 0),
      ...this.qFromEuler(0.04, 0.1, 0),
      ...this.qFromEuler(0, 0, 0),
      ...this.qFromEuler(0, 0, 0),
    ];
    const headTrack = new THREE.QuaternionKeyframeTrack('Head.quaternion', times, headQuats);

    return new THREE.AnimationClip('punch', 0.35, [
      rightArmTrack,
      rightForearmTrack,
      leftArmTrack,
      spineTrack,
      headTrack,
    ]);
  }
}

import * as THREE from 'three';

export interface RiggedCharacter {
  rootBone: THREE.Bone;
  skeleton: THREE.Skeleton;
  skinnedMeshes: THREE.SkinnedMesh[];
  skeletonHelper: THREE.SkeletonHelper;
  bones: {
    root: THREE.Bone;
    hips: THREE.Bone;
    spine: THREE.Bone;
    neck: THREE.Bone;
    head: THREE.Bone;
    leftShoulder: THREE.Bone;
    leftUpperArm: THREE.Bone;
    leftForearm: THREE.Bone;
    leftHand: THREE.Bone;
    rightShoulder: THREE.Bone;
    rightUpperArm: THREE.Bone;
    rightForearm: THREE.Bone;
    rightHand: THREE.Bone;
    leftUpLeg: THREE.Bone;
    leftLeg: THREE.Bone;
    leftFoot: THREE.Bone;
    rightUpLeg: THREE.Bone;
    rightLeg: THREE.Bone;
    rightFoot: THREE.Bone;
  };
}

export type AnimationClipType = 'idle' | 'walk' | 'run' | 'jump' | 'wave' | 'attack' | 'victory';

export class AutoRigger {
  /**
   * Automatically generates a humanoid bone skeleton and binds an unrigged 3D model
   * to create a fully animated SkinnedMesh character.
   */
  public static rigHumanoid(modelGroup: THREE.Group): RiggedCharacter {
    // 1. Calculate bounding box of the normalized model
    const bbox = new THREE.Box3().setFromObject(modelGroup);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const H = size.y || 1.8;
    const W = size.x || 0.8;
    const D = size.z || 0.5;

    // 2. Build bone hierarchy relative to model dimensions
    const root = new THREE.Bone();
    root.name = 'Root';
    root.position.set(0, 0, 0);

    const hips = new THREE.Bone();
    hips.name = 'Hips';
    hips.position.set(0, H * 0.52, 0);
    root.add(hips);

    const spine = new THREE.Bone();
    spine.name = 'Spine';
    spine.position.set(0, H * 0.22, 0); // Relative to hips (y ~ 0.74 H)
    hips.add(spine);

    const neck = new THREE.Bone();
    neck.name = 'Neck';
    neck.position.set(0, H * 0.14, 0); // Relative to spine (y ~ 0.88 H)
    spine.add(neck);

    const head = new THREE.Bone();
    head.name = 'Head';
    head.position.set(0, H * 0.10, 0); // Relative to neck (y ~ 0.98 H)
    neck.add(head);

    // Left Arm
    const leftShoulder = new THREE.Bone();
    leftShoulder.name = 'LeftShoulder';
    leftShoulder.position.set(-W * 0.26, H * 0.10, 0);
    spine.add(leftShoulder);

    const leftUpperArm = new THREE.Bone();
    leftUpperArm.name = 'LeftUpperArm';
    leftUpperArm.position.set(-W * 0.22, -H * 0.04, 0);
    leftShoulder.add(leftUpperArm);

    const leftForearm = new THREE.Bone();
    leftForearm.name = 'LeftForearm';
    leftForearm.position.set(0, -H * 0.18, 0);
    leftUpperArm.add(leftForearm);

    const leftHand = new THREE.Bone();
    leftHand.name = 'LeftHand';
    leftHand.position.set(0, -H * 0.14, 0);
    leftForearm.add(leftHand);

    // Right Arm
    const rightShoulder = new THREE.Bone();
    rightShoulder.name = 'RightShoulder';
    rightShoulder.position.set(W * 0.26, H * 0.10, 0);
    spine.add(rightShoulder);

    const rightUpperArm = new THREE.Bone();
    rightUpperArm.name = 'RightUpperArm';
    rightUpperArm.position.set(W * 0.22, -H * 0.04, 0);
    rightShoulder.add(rightUpperArm);

    const rightForearm = new THREE.Bone();
    rightForearm.name = 'RightForearm';
    rightForearm.position.set(0, -H * 0.18, 0);
    rightUpperArm.add(rightForearm);

    const rightHand = new THREE.Bone();
    rightHand.name = 'RightHand';
    rightHand.position.set(0, -H * 0.14, 0);
    rightForearm.add(rightHand);

    // Left Leg
    const leftUpLeg = new THREE.Bone();
    leftUpLeg.name = 'LeftUpLeg';
    leftUpLeg.position.set(-W * 0.22, -H * 0.05, 0); // Relative to hips
    hips.add(leftUpLeg);

    const leftLeg = new THREE.Bone();
    leftLeg.name = 'LeftLeg';
    leftLeg.position.set(0, -H * 0.24, 0);
    leftUpLeg.add(leftLeg);

    const leftFoot = new THREE.Bone();
    leftFoot.name = 'LeftFoot';
    leftFoot.position.set(0, -H * 0.20, D * 0.08);
    leftLeg.add(leftFoot);

    // Right Leg
    const rightUpLeg = new THREE.Bone();
    rightUpLeg.name = 'RightUpLeg';
    rightUpLeg.position.set(W * 0.22, -H * 0.05, 0);
    hips.add(rightUpLeg);

    const rightLeg = new THREE.Bone();
    rightLeg.name = 'RightLeg';
    rightLeg.position.set(0, -H * 0.24, 0);
    rightUpLeg.add(rightLeg);

    const rightFoot = new THREE.Bone();
    rightFoot.name = 'RightFoot';
    rightFoot.position.set(0, -H * 0.20, D * 0.08);
    rightLeg.add(rightFoot);

    const boneList = [
      root,          // 0
      hips,          // 1
      spine,         // 2
      neck,          // 3
      head,          // 4
      leftShoulder,  // 5
      leftUpperArm,  // 6
      leftForearm,   // 7
      leftHand,      // 8
      rightShoulder, // 9
      rightUpperArm, // 10
      rightForearm,  // 11
      rightHand,     // 12
      leftUpLeg,     // 13
      leftLeg,       // 14
      leftFoot,      // 15
      rightUpLeg,    // 16
      rightLeg,      // 17
      rightFoot,     // 18
    ];

    root.updateWorldMatrix(true, true);
    const skeleton = new THREE.Skeleton(boneList);

    // 3. Convert all meshes to SkinnedMeshes with computed vertex weights
    const skinnedMeshes: THREE.SkinnedMesh[] = [];

    modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !(child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry.clone();

        // Calculate skin weights based on vertex positions
        const posAttr = geom.attributes.position;
        const vertexCount = posAttr.count;

        const skinIndices: number[] = [];
        const skinWeights: number[] = [];

        const v = new THREE.Vector3();

        for (let i = 0; i < vertexCount; i++) {
          v.fromBufferAttribute(posAttr, i);
          // Apply mesh's local transformation if nested
          v.applyMatrix4(mesh.matrix);

          const ny = v.y / H; // Normalized height [0, 1]
          const nx = v.x / (W * 0.5); // Normalized width [-1, 1]

          let idx0 = 1, w0 = 1.0;
          let idx1 = 2, w1 = 0.0;
          let idx2 = 0, w2 = 0.0;
          let idx3 = 0, w3 = 0.0;

          if (ny < 0.22) {
            // Foot & Ankle
            if (nx < 0) {
              idx0 = 15; w0 = 0.75;
              idx1 = 14; w1 = 0.25;
            } else {
              idx0 = 18; w0 = 0.75;
              idx1 = 17; w1 = 0.25;
            }
          } else if (ny < 0.48) {
            // Knee & Upper Leg / Thigh
            if (nx < 0) {
              idx0 = 14; w0 = 0.5;
              idx1 = 13; w1 = 0.5;
            } else {
              idx0 = 17; w0 = 0.5;
              idx1 = 16; w1 = 0.5;
            }
          } else if (ny < 0.75) {
            // Torso or Arms
            if (Math.abs(nx) > 0.45) {
              // Arms & Hands
              if (nx < 0) {
                if (ny < 0.60) {
                  idx0 = 8; w0 = 0.6; idx1 = 7; w1 = 0.4;
                } else {
                  idx0 = 7; w0 = 0.5; idx1 = 6; w1 = 0.5;
                }
              } else {
                if (ny < 0.60) {
                  idx0 = 12; w0 = 0.6; idx1 = 11; w1 = 0.4;
                } else {
                  idx0 = 11; w0 = 0.5; idx1 = 10; w1 = 0.5;
                }
              }
            } else {
              // Hips & Spine
              idx0 = 1; w0 = 0.5;
              idx1 = 2; w1 = 0.5;
            }
          } else if (ny < 0.86) {
            // Upper Chest / Neck / Shoulders
            if (Math.abs(nx) > 0.40) {
              idx0 = nx < 0 ? 5 : 9; w0 = 0.7;
              idx1 = 2; w1 = 0.3;
            } else {
              idx0 = 2; w0 = 0.5;
              idx1 = 3; w1 = 0.5;
            }
          } else {
            // Head
            idx0 = 4; w0 = 0.85;
            idx1 = 3; w1 = 0.15;
          }

          skinIndices.push(idx0, idx1, idx2, idx3);
          skinWeights.push(w0, w1, w2, w3);
        }

        geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        const skinnedMesh = new THREE.SkinnedMesh(geom, mesh.material);
        skinnedMesh.castShadow = true;
        skinnedMesh.receiveShadow = true;

        skinnedMesh.add(root);
        skinnedMesh.bind(skeleton);

        skinnedMeshes.push(skinnedMesh);
      }
    });

    const skeletonHelper = new THREE.SkeletonHelper(root);
    (skeletonHelper.material as THREE.LineBasicMaterial).color.setHex(0x38bdf8);
    (skeletonHelper.material as THREE.LineBasicMaterial).depthTest = false;
    skeletonHelper.visible = false;

    return {
      rootBone: root,
      skeleton,
      skinnedMeshes,
      skeletonHelper,
      bones: {
        root,
        hips,
        spine,
        neck,
        head,
        leftShoulder,
        leftUpperArm,
        leftForearm,
        leftHand,
        rightShoulder,
        rightUpperArm,
        rightForearm,
        rightHand,
        leftUpLeg,
        leftLeg,
        leftFoot,
        rightUpLeg,
        rightLeg,
        rightFoot,
      },
    };
  }

  /**
   * Applies articulated skeletal procedural animation to the generated rig
   */
  public static animateRig(
    rig: RiggedCharacter,
    time: number,
    state: {
      isMoving: boolean;
      isRunning: boolean;
      isGrounded: boolean;
      isAttacking: boolean;
      isWaving?: boolean;
      isVictory?: boolean;
      speed?: number;
    }
  ) {
    const { bones } = rig;

    // Reset bone rotations
    for (const bone of rig.skeleton.bones) {
      bone.rotation.set(0, 0, 0);
    }

    if (state.isVictory) {
      // Celebratory Victory Dance!
      const t = time * 5.0;
      bones.hips.position.y = 0.95 + Math.abs(Math.sin(t)) * 0.1;
      // Both arms held high in celebration
      bones.leftUpperArm.rotation.z = -1.6 + Math.sin(t) * 0.2;
      bones.rightUpperArm.rotation.z = 1.6 - Math.sin(t) * 0.2;
      bones.leftForearm.rotation.x = -0.4;
      bones.rightForearm.rotation.x = -0.4;
      bones.head.rotation.y = Math.sin(t * 0.5) * 0.25;
      bones.leftUpLeg.rotation.x = Math.sin(t) * 0.3;
      bones.rightUpLeg.rotation.x = -Math.sin(t) * 0.3;
      return;
    }

    if (state.isWaving) {
      // Friendly Hand Wave Animation
      const t = time * 7.0;
      // Right arm raised
      bones.rightShoulder.rotation.z = 0.3;
      bones.rightUpperArm.rotation.z = 1.35;
      bones.rightUpperArm.rotation.x = -0.3;
      bones.rightForearm.rotation.z = Math.sin(t) * 0.45 + 0.5;
      bones.head.rotation.y = -0.15;
      bones.head.rotation.z = -0.1;
      return;
    }

    if (state.isAttacking) {
      // Attack Strike Slash
      const t = Math.sin(time * 12.0);
      bones.spine.rotation.y = t * 0.35;
      bones.rightUpperArm.rotation.x = -1.4 + t * 0.8;
      bones.rightForearm.rotation.x = -0.6;
      bones.leftUpperArm.rotation.x = 0.6; // counter-balance
      return;
    }

    if (!state.isGrounded) {
      // Jumping / In-air Pose
      bones.leftUpLeg.rotation.x = -0.45;
      bones.leftLeg.rotation.x = 0.7;
      bones.rightUpLeg.rotation.x = -0.25;
      bones.rightLeg.rotation.x = 0.4;

      // Arms raised outward for dynamic balance
      bones.leftUpperArm.rotation.z = -0.6;
      bones.rightUpperArm.rotation.z = 0.6;
      bones.leftUpperArm.rotation.x = -0.3;
      bones.rightUpperArm.rotation.x = -0.3;
      bones.head.rotation.x = 0.2; // look up towards apex
      return;
    }

    if (state.isMoving) {
      // Walking / Running Bipedal Locomotion Cycle
      const freq = state.isRunning ? 13.0 : 8.5;
      const legAmp = state.isRunning ? 0.75 : 0.45;
      const armAmp = state.isRunning ? 0.65 : 0.4;
      const t = time * freq;

      const legSin = Math.sin(t);
      const legCos = Math.cos(t);

      // Legs alternate swinging forward and backward
      bones.leftUpLeg.rotation.x = legSin * legAmp;
      bones.rightUpLeg.rotation.x = -legSin * legAmp;

      // Knees bend backward when leg is in back-swing
      bones.leftLeg.rotation.x = Math.max(0, -legSin) * (legAmp * 1.2);
      bones.rightLeg.rotation.x = Math.max(0, legSin) * (legAmp * 1.2);

      // Feet flex slightly on ground strike
      bones.leftFoot.rotation.x = legSin * 0.2;
      bones.rightFoot.rotation.x = -legSin * 0.2;

      // Arms swing counter to legs (contrapposto movement)
      bones.leftUpperArm.rotation.x = -legSin * armAmp;
      bones.rightUpperArm.rotation.x = legSin * armAmp;
      bones.leftForearm.rotation.x = -0.2 + Math.abs(legSin) * 0.3;
      bones.rightForearm.rotation.x = -0.2 + Math.abs(legSin) * 0.3;

      // Pelvis / Spine subtle twist and forward momentum tilt
      bones.spine.rotation.y = -legSin * 0.12;
      bones.spine.rotation.x = state.isRunning ? 0.18 : 0.08;
      bones.hips.position.y = 0.95 + Math.abs(legCos) * 0.05;
      return;
    }

    // Idle: Breathing & Subtle Living Organic Sway
    const breathe = Math.sin(time * 2.2);
    bones.spine.rotation.x = breathe * 0.03;
    bones.leftUpperArm.rotation.z = -0.08 + breathe * 0.02;
    bones.rightUpperArm.rotation.z = 0.08 - breathe * 0.02;
    bones.head.rotation.y = Math.sin(time * 0.8) * 0.06;
    bones.head.rotation.x = breathe * 0.02;
  }
}

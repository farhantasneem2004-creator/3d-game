import * as THREE from 'three';

export interface RiggedCharacter {
  rigGroup: THREE.Group;
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

interface BoneSegment {
  index: number;
  name: string;
  start: THREE.Vector3;
  end: THREE.Vector3;
  side: 'center' | 'left' | 'right';
  isArm: boolean;
  isLeg: boolean;
}

// Reusable math helpers for zero-GC per-vertex calculations
const _ab = new THREE.Vector3();
const _ap = new THREE.Vector3();
const _proj = new THREE.Vector3();

function distToSegmentSq(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  _ab.subVectors(b, a);
  _ap.subVectors(p, a);
  const lenSq = _ab.lengthSq();
  if (lenSq < 1e-6) return _ap.lengthSq();
  const t = Math.max(0, Math.min(1, _ap.dot(_ab) / lenSq));
  _proj.copy(a).addScaledVector(_ab, t);
  return p.distanceToSquared(_proj);
}

export class AutoRigger {
  /**
   * Automatically generates a humanoid bone skeleton and binds an unrigged 3D model
   * to create a fully animated SkinnedMesh character with natural anatomical skin weights.
   */
  public static rigHumanoid(
    modelGroup: THREE.Group,
    customMarkers?: import('./RiggingSystem.ts').MarkerPositions
  ): RiggedCharacter {
    // 1. Calculate bounding box of the normalized model (guaranteed height ~1.8, minY = 0)
    const bbox = new THREE.Box3().setFromObject(modelGroup);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const W = Math.max(0.65, size.x || 0.8);
    const D = Math.max(0.35, size.z || 0.5);

    // 2. Build humanoid skeletal bone hierarchy
    const root = new THREE.Bone();
    root.name = 'Root';
    root.position.set(0, 0, 0);

    const hips = new THREE.Bone();
    hips.name = 'Hips';
    hips.position.set(0, customMarkers ? customMarkers.pelvis.y : 0.94, customMarkers ? customMarkers.pelvis.z : 0);
    root.add(hips);

    const spine = new THREE.Bone();
    spine.name = 'Spine';
    spine.position.set(0, customMarkers ? customMarkers.spine.y - customMarkers.pelvis.y : 0.32, 0);
    hips.add(spine);

    const neck = new THREE.Bone();
    neck.name = 'Neck';
    neck.position.set(0, customMarkers ? customMarkers.neck.y - customMarkers.spine.y : 0.26, 0);
    spine.add(neck);

    const head = new THREE.Bone();
    head.name = 'Head';
    head.position.set(0, customMarkers ? customMarkers.head.y - customMarkers.neck.y : 0.12, 0);
    neck.add(head);

    // Left Arm (anatomical left: negative X)
    const shoulderOffsetX = customMarkers ? Math.abs(customMarkers.leftShoulder.x) : W * 0.28;
    const leftShoulder = new THREE.Bone();
    leftShoulder.name = 'LeftShoulder';
    leftShoulder.position.set(
      -shoulderOffsetX,
      customMarkers ? customMarkers.leftShoulder.y - customMarkers.spine.y : 0.18,
      customMarkers ? customMarkers.leftShoulder.z : 0
    );
    spine.add(leftShoulder);

    const leftUpperArm = new THREE.Bone();
    leftUpperArm.name = 'LeftUpperArm';
    leftUpperArm.position.set(
      customMarkers ? customMarkers.leftElbow.x - customMarkers.leftShoulder.x : -W * 0.16,
      customMarkers ? customMarkers.leftElbow.y - customMarkers.leftShoulder.y : -0.26,
      customMarkers ? customMarkers.leftElbow.z - customMarkers.leftShoulder.z : 0
    );
    leftShoulder.add(leftUpperArm);

    const leftForearm = new THREE.Bone();
    leftForearm.name = 'LeftForearm';
    leftForearm.position.set(
      customMarkers ? customMarkers.leftWrist.x - customMarkers.leftElbow.x : -0.06,
      customMarkers ? customMarkers.leftWrist.y - customMarkers.leftElbow.y : -0.24,
      customMarkers ? customMarkers.leftWrist.z - customMarkers.leftElbow.z : 0
    );
    leftUpperArm.add(leftForearm);

    const leftHand = new THREE.Bone();
    leftHand.name = 'LeftHand';
    leftHand.position.set(
      customMarkers ? customMarkers.leftHand.x - customMarkers.leftWrist.x : -0.04,
      customMarkers ? customMarkers.leftHand.y - customMarkers.leftWrist.y : -0.16,
      customMarkers ? customMarkers.leftHand.z - customMarkers.leftWrist.z : 0
    );
    leftForearm.add(leftHand);

    // Right Arm (anatomical right: positive X)
    const rightShoulder = new THREE.Bone();
    rightShoulder.name = 'RightShoulder';
    rightShoulder.position.set(
      shoulderOffsetX,
      customMarkers ? customMarkers.rightShoulder.y - customMarkers.spine.y : 0.18,
      customMarkers ? customMarkers.rightShoulder.z : 0
    );
    spine.add(rightShoulder);

    const rightUpperArm = new THREE.Bone();
    rightUpperArm.name = 'RightUpperArm';
    rightUpperArm.position.set(
      customMarkers ? customMarkers.rightElbow.x - customMarkers.rightShoulder.x : W * 0.16,
      customMarkers ? customMarkers.rightElbow.y - customMarkers.rightShoulder.y : -0.26,
      customMarkers ? customMarkers.rightElbow.z - customMarkers.rightShoulder.z : 0
    );
    rightShoulder.add(rightUpperArm);

    const rightForearm = new THREE.Bone();
    rightForearm.name = 'RightForearm';
    rightForearm.position.set(
      customMarkers ? customMarkers.rightWrist.x - customMarkers.rightElbow.x : 0.06,
      customMarkers ? customMarkers.rightWrist.y - customMarkers.rightElbow.y : -0.24,
      customMarkers ? customMarkers.rightWrist.z - customMarkers.rightElbow.z : 0
    );
    rightUpperArm.add(rightForearm);

    const rightHand = new THREE.Bone();
    rightHand.name = 'RightHand';
    rightHand.position.set(
      customMarkers ? customMarkers.rightHand.x - customMarkers.rightWrist.x : 0.04,
      customMarkers ? customMarkers.rightHand.y - customMarkers.rightWrist.y : -0.16,
      customMarkers ? customMarkers.rightHand.z - customMarkers.rightWrist.z : 0
    );
    rightForearm.add(rightHand);

    // Left Leg
    const hipOffsetX = customMarkers ? Math.abs(customMarkers.leftHip.x) : Math.max(0.12, W * 0.20);
    const leftUpLeg = new THREE.Bone();
    leftUpLeg.name = 'LeftUpLeg';
    leftUpLeg.position.set(
      -hipOffsetX,
      customMarkers ? customMarkers.leftHip.y - customMarkers.pelvis.y : -0.06,
      customMarkers ? customMarkers.leftHip.z : 0
    );
    hips.add(leftUpLeg);

    const leftLeg = new THREE.Bone();
    leftLeg.name = 'LeftLeg';
    leftLeg.position.set(
      customMarkers ? customMarkers.leftKnee.x - customMarkers.leftHip.x : 0,
      customMarkers ? customMarkers.leftKnee.y - customMarkers.leftHip.y : -0.40,
      customMarkers ? customMarkers.leftKnee.z - customMarkers.leftHip.z : -D * 0.05
    );
    leftUpLeg.add(leftLeg);

    const leftFoot = new THREE.Bone();
    leftFoot.name = 'LeftFoot';
    leftFoot.position.set(
      customMarkers ? customMarkers.leftAnkle.x - customMarkers.leftKnee.x : 0,
      customMarkers ? customMarkers.leftAnkle.y - customMarkers.leftKnee.y : -0.40,
      customMarkers ? customMarkers.leftAnkle.z - customMarkers.leftKnee.z : D * 0.10
    );
    leftLeg.add(leftFoot);

    // Right Leg
    const rightUpLeg = new THREE.Bone();
    rightUpLeg.name = 'RightUpLeg';
    rightUpLeg.position.set(
      hipOffsetX,
      customMarkers ? customMarkers.rightHip.y - customMarkers.pelvis.y : -0.06,
      customMarkers ? customMarkers.rightHip.z : 0
    );
    hips.add(rightUpLeg);

    const rightLeg = new THREE.Bone();
    rightLeg.name = 'RightLeg';
    rightLeg.position.set(
      customMarkers ? customMarkers.rightKnee.x - customMarkers.rightHip.x : 0,
      customMarkers ? customMarkers.rightKnee.y - customMarkers.rightHip.y : -0.40,
      customMarkers ? customMarkers.rightKnee.z - customMarkers.rightHip.z : -D * 0.05
    );
    rightUpLeg.add(rightLeg);

    const rightFoot = new THREE.Bone();
    rightFoot.name = 'RightFoot';
    rightFoot.position.set(
      customMarkers ? customMarkers.rightAnkle.x - customMarkers.rightKnee.x : 0,
      customMarkers ? customMarkers.rightAnkle.y - customMarkers.rightKnee.y : -0.40,
      customMarkers ? customMarkers.rightAnkle.z - customMarkers.rightKnee.z : D * 0.10
    );
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

    // 3. Assemble rigGroup and evaluate world matrices for skeleton calibration
    const rigGroup = new THREE.Group();
    rigGroup.name = 'RiggedHumanoidGroup';
    rigGroup.add(root);
    rigGroup.updateWorldMatrix(true, true);

    // Build anatomical 3D bone segments directly from rest-pose positions
    const segments: BoneSegment[] = [];

    const getPos = (bone: THREE.Bone): THREE.Vector3 => {
      const p = new THREE.Vector3();
      bone.getWorldPosition(p);
      return p;
    };

    const addSeg = (
      index: number,
      name: string,
      startBone: THREE.Bone,
      endBone: THREE.Bone | null,
      side: 'center' | 'left' | 'right',
      isArm: boolean,
      isLeg: boolean,
      fallbackEndOffset?: THREE.Vector3
    ) => {
      const start = getPos(startBone);
      let end: THREE.Vector3;
      if (endBone) {
        end = getPos(endBone);
      } else if (fallbackEndOffset) {
        end = start.clone().add(fallbackEndOffset);
      } else {
        end = start.clone();
      }
      segments.push({ index, name, start, end, side, isArm, isLeg });
    };

    addSeg(1, 'Hips', hips, spine, 'center', false, false);
    addSeg(2, 'Spine', spine, neck, 'center', false, false);
    addSeg(3, 'Neck', neck, head, 'center', false, false);
    addSeg(4, 'Head', head, null, 'center', false, false, new THREE.Vector3(0, 0.16, 0.02));

    addSeg(5, 'LeftShoulder', leftShoulder, leftUpperArm, 'left', true, false);
    addSeg(6, 'LeftUpperArm', leftUpperArm, leftForearm, 'left', true, false);
    addSeg(7, 'LeftForearm', leftForearm, leftHand, 'left', true, false);
    addSeg(8, 'LeftHand', leftHand, null, 'left', true, false, new THREE.Vector3(-0.03, -0.14, 0));

    addSeg(9, 'RightShoulder', rightShoulder, rightUpperArm, 'right', true, false);
    addSeg(10, 'RightUpperArm', rightUpperArm, rightForearm, 'right', true, false);
    addSeg(11, 'RightForearm', rightForearm, rightHand, 'right', true, false);
    addSeg(12, 'RightHand', rightHand, null, 'right', true, false, new THREE.Vector3(0.03, -0.14, 0));

    addSeg(13, 'LeftUpLeg', leftUpLeg, leftLeg, 'left', false, true);
    addSeg(14, 'LeftLeg', leftLeg, leftFoot, 'left', false, true);
    addSeg(15, 'LeftFoot', leftFoot, null, 'left', false, true, new THREE.Vector3(0, -0.08, 0.14));

    addSeg(16, 'RightUpLeg', rightUpLeg, rightLeg, 'right', false, true);
    addSeg(17, 'RightLeg', rightLeg, rightFoot, 'right', false, true);
    addSeg(18, 'RightFoot', rightFoot, null, 'right', false, true, new THREE.Vector3(0, -0.08, 0.14));

    // Initialize skeleton
    const skeleton = new THREE.Skeleton(boneList);
    skeleton.calculateInverses();

    const skinnedMeshes: THREE.SkinnedMesh[] = [];

    // 4. Volumetric anatomical skinning weights calculation
    modelGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !(child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry.clone();

        const posAttr = geom.attributes.position;
        const vertexCount = posAttr.count;

        const skinIndices: number[] = [];
        const skinWeights: number[] = [];

        const v = new THREE.Vector3();

        for (let i = 0; i < vertexCount; i++) {
          v.fromBufferAttribute(posAttr, i);

          const isRightSide = v.x > 0.015;
          const isLeftSide = v.x < -0.015;
          const isLateralArm = Math.abs(v.x) > 0.18 && v.y > 0.60 && v.y < 1.55;
          const isFootSole = v.y <= 0.09;

          // Compute distance to each candidate bone segment
          const candidates: { index: number; weight: number }[] = [];

          for (const seg of segments) {
            // Bilateral filter: Right side vertices cannot bind to Left bones, and vice-versa
            if (isRightSide && seg.side === 'left') continue;
            if (isLeftSide && seg.side === 'right') continue;

            const distSq = distToSegmentSq(v, seg.start, seg.end);
            let dist = Math.sqrt(distSq);

            // Anatomical protection: Arm skin should not bind to torso spine/hips
            if (isLateralArm && (seg.index === 1 || seg.index === 2)) {
              dist += 1.2;
            }

            // Torso vertices should not bind to arms
            if (!isLateralArm && Math.abs(v.x) < 0.16 && seg.isArm) {
              dist += 0.8;
            }

            // Foot soles: heavily favor foot bones so soles stay flat on ground
            if (isFootSole) {
              if (seg.index === 15 && isLeftSide) dist *= 0.15;
              else if (seg.index === 18 && isRightSide) dist *= 0.15;
              else if (seg.index === 14 || seg.index === 17) dist += 0.5; // penalize knee pull
            }

            // Inverse distance weighting
            const w = 1.0 / Math.pow(dist + 0.035, 3.0);
            candidates.push({ index: seg.index, weight: w });
          }

          // Sort candidates descending by weight and pick top 4
          candidates.sort((a, b) => b.weight - a.weight);

          const top4 = candidates.slice(0, 4);
          let sumW = 0;
          for (const c of top4) sumW += c.weight;

          if (sumW > 0.00001) {
            skinIndices.push(
              top4[0]?.index ?? 1,
              top4[1]?.index ?? 1,
              top4[2]?.index ?? 1,
              top4[3]?.index ?? 1
            );
            skinWeights.push(
              (top4[0]?.weight ?? 0) / sumW,
              (top4[1]?.weight ?? 0) / sumW,
              (top4[2]?.weight ?? 0) / sumW,
              (top4[3]?.weight ?? 0) / sumW
            );
          } else {
            skinIndices.push(1, 2, 0, 0);
            skinWeights.push(0.7, 0.3, 0, 0);
          }
        }

        geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
        geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        // Create standard material with double-sided rendering
        let mat = mesh.material;
        if (Array.isArray(mat)) {
          mat = mat.map((m) => {
            const clone = m.clone();
            clone.side = THREE.DoubleSide;
            return clone;
          });
        } else if (mat) {
          mat = mat.clone();
          mat.side = THREE.DoubleSide;
        }

        const skinnedMesh = new THREE.SkinnedMesh(geom, mat);
        skinnedMesh.name = mesh.name || `Skinned_${skinnedMeshes.length}`;
        skinnedMesh.castShadow = true;
        skinnedMesh.receiveShadow = true;

        rigGroup.add(skinnedMesh);

        // Bind with standard attached mode so parent transforms cancel cleanly
        skinnedMesh.bind(skeleton);
        skinnedMeshes.push(skinnedMesh);
      }
    });

    // 5. Update world matrices and finalize skeleton inverse bind matrices in rest pose
    rigGroup.updateWorldMatrix(true, true);
    skeleton.calculateInverses();

    // 6. Create SkeletonHelper attached to rigGroup
    const skeletonHelper = new THREE.SkeletonHelper(rigGroup);
    (skeletonHelper.material as THREE.LineBasicMaterial).color.setHex(0x38bdf8);
    (skeletonHelper.material as THREE.LineBasicMaterial).depthTest = false;
    skeletonHelper.renderOrder = 999;
    skeletonHelper.visible = false;
    rigGroup.add(skeletonHelper);

    return {
      rigGroup,
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
   * Applies coordinated skeletal animation:
   * Layer 1: Upper-Body (Aiming down sights, Reloading, Weapon low-ready carry, Punch attack)
   * Layer 2: Lower-Body (Bipedal walk, sprint, jump, idle ground planting)
   */
  public static animateRig(
    rig: RiggedCharacter,
    time: number,
    state: {
      isMoving: boolean;
      isRunning: boolean;
      isGrounded: boolean;
      isAttacking: boolean;
      attackTimer?: number;
      isWaving?: boolean;
      isVictory?: boolean;
      isAiming?: boolean;
      isShooting?: boolean;
      isReloading?: boolean;
      aimPitch?: number;
      speed?: number;
    }
  ) {
    const { bones } = rig;

    // Reset bone rotations and hips to rest pose
    for (const bone of rig.skeleton.bones) {
      bone.rotation.set(0, 0, 0);
    }
    const baseHipsY = (bones.hips.userData.baseY !== undefined) ? bones.hips.userData.baseY : bones.hips.position.y;
    bones.hips.userData.baseY = baseHipsY;
    const baseHipsZ = (bones.hips.userData.baseZ !== undefined) ? bones.hips.userData.baseZ : bones.hips.position.z;
    bones.hips.userData.baseZ = baseHipsZ;
    bones.hips.position.set(0, baseHipsY, baseHipsZ);

    // =========================================================================
    // LAYER 1: UPPER-BODY POSE & WEAPON HANDLING
    // =========================================================================
    if (state.isVictory) {
      // Celebratory Victory Dance
      const t = time * 5.0;
      bones.hips.position.y = baseHipsY + Math.abs(Math.sin(t)) * 0.08;
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
      // Friendly Hand Wave Animation for Rigging Studio testing
      const t = time * 7.0;
      bones.rightShoulder.rotation.z = 0.2;
      bones.rightUpperArm.rotation.z = 1.35;
      bones.rightUpperArm.rotation.x = -0.3;
      bones.rightForearm.rotation.z = Math.sin(t) * 0.45 + 0.4;
      bones.head.rotation.y = -0.15;
      bones.head.rotation.z = -0.1;
      return;
    }

    if (state.isReloading) {
      // TACTICAL WEAPON RELOAD ANIMATION (Natural arm anatomy preserved)
      bones.head.rotation.x = 0.22;
      // Right hand holds weapon securely at chest level
      bones.rightShoulder.rotation.set(-0.04, 0.08, 0.02);
      bones.rightUpperArm.rotation.set(-0.95, 0.18, 0.06);
      bones.rightForearm.rotation.set(-0.65, 0, 0);
      bones.rightHand.rotation.set(-0.1, 0, 0);

      // Left hand reaches down to waist belt and inserts fresh magazine
      const magPhase = Math.sin(time * 7.5);
      bones.leftShoulder.rotation.set(-0.04, -0.08, -0.02);
      bones.leftUpperArm.rotation.set(-0.45 + magPhase * 0.2, -0.15, 0);
      bones.leftForearm.rotation.set(-1.3 + magPhase * 0.25, 0.2, 0);
      bones.leftHand.rotation.set(0, 0, 0);
    } else if (state.isAiming) {
      // GTA-STYLE OVER-THE-SHOULDER AIMING STANCE (Preserves shoulder & elbow anatomy)
      const pitch = Math.max(-0.55, Math.min(0.75, state.aimPitch || 0));

      // Upper torso aligns with vertical aiming pitch
      bones.spine.rotation.x = -pitch * 0.28;
      bones.spine.rotation.y = 0.16;
      bones.neck.rotation.x = -pitch * 0.22;
      bones.head.rotation.x = -pitch * 0.15;
      bones.head.rotation.y = -0.18;

      // Right arm raises weapon along sightline
      const recoilOffset = state.isShooting ? 0.08 : 0;
      bones.rightShoulder.rotation.set(-0.06, 0.10, 0.02);
      bones.rightUpperArm.rotation.set(-1.42 - pitch * 0.5 + recoilOffset, 0.18, -0.04);
      bones.rightForearm.rotation.set(-0.28, 0, 0);
      bones.rightHand.rotation.set(-0.05, 0, 0);

      // Left arm reaches across to support weapon barrel
      bones.leftShoulder.rotation.set(-0.05, -0.20, -0.05);
      bones.leftUpperArm.rotation.set(-1.22 - pitch * 0.5, -0.32, -0.28);
      bones.leftForearm.rotation.set(-0.95, 0.28, 0);
      bones.leftHand.rotation.set(0, 0, 0);
    } else if (state.isAttacking) {
      // Martial arts straight cross punch
      const progress = 1.0 - Math.max(0, Math.min(1.0, (state.attackTimer ?? 0.17) / 0.35));
      const punchPhase = Math.sin(progress * Math.PI);
      bones.spine.rotation.y = punchPhase * 0.40;
      bones.spine.rotation.x = punchPhase * 0.10;
      bones.rightShoulder.rotation.y = punchPhase * 0.25;
      bones.rightUpperArm.rotation.x = -1.65 * punchPhase;
      bones.rightUpperArm.rotation.z = 0.10;
      bones.rightForearm.rotation.x = -0.25 * punchPhase;
      bones.leftUpperArm.rotation.x = -0.80;
      bones.leftUpperArm.rotation.z = -0.40;
      bones.leftForearm.rotation.x = -1.20;
    } else {
      // Natural low-ready resting weapon carry pose
      const breathe = Math.sin(time * 2.2);
      bones.rightShoulder.rotation.set(-0.02, 0.05, 0.02);
      bones.rightUpperArm.rotation.set(-0.42, 0.12, 0.04 + breathe * 0.015);
      bones.rightForearm.rotation.set(-0.55, 0, 0);
      bones.rightHand.rotation.set(-0.15, 0, 0);

      bones.leftShoulder.rotation.set(-0.02, -0.05, -0.02);
      bones.leftUpperArm.rotation.set(-0.25, -0.08, -0.04 - breathe * 0.015);
      bones.leftForearm.rotation.set(-0.35, 0, 0);
      bones.leftHand.rotation.set(-0.05, 0, 0);

      bones.spine.rotation.x = breathe * 0.02;
      bones.head.rotation.y = Math.sin(time * 0.8) * 0.04;
    }

    // =========================================================================
    // LAYER 2: LOWER-BODY LOCOMOTION & GROUND PLANTING
    // =========================================================================
    if (!state.isGrounded) {
      // Jumping / Airborne: Dynamic leg balance tuck
      bones.leftUpLeg.rotation.x = -0.40;
      bones.leftLeg.rotation.x = 0.65;
      bones.rightUpLeg.rotation.x = -0.25;
      bones.rightLeg.rotation.x = 0.40;
      return;
    }

    if (state.isMoving) {
      // Walking / Running Bipedal Locomotion Cycle
      const freq = state.isRunning ? 13.0 : 8.5;
      const legAmp = state.isRunning ? 0.70 : 0.42;
      const t = time * freq;

      const legSin = Math.sin(t);
      const legCos = Math.cos(t);

      // Thighs swing in opposition
      bones.leftUpLeg.rotation.x = legSin * legAmp;
      bones.rightUpLeg.rotation.x = -legSin * legAmp;

      // Knees bend backward on back-swing to clear ground
      bones.leftLeg.rotation.x = Math.max(0, -legSin) * (legAmp * 1.15);
      bones.rightLeg.rotation.x = Math.max(0, legSin) * (legAmp * 1.15);

      // Feet flex naturally
      bones.leftFoot.rotation.x = legSin * 0.15;
      bones.rightFoot.rotation.x = -legSin * 0.15;

      // Pelvis subtle bounce
      bones.hips.position.y = baseHipsY + Math.abs(legCos) * 0.035;

      // Subtle pelvis tilt into stride
      if (!state.isAiming) {
        bones.spine.rotation.y += -legSin * 0.08;
        bones.spine.rotation.x += state.isRunning ? 0.14 : 0.06;
      }
      return;
    }

    // Standing Idle: Soles firmly planted on platform surface
    bones.leftUpLeg.rotation.set(0, 0, 0);
    bones.leftLeg.rotation.set(0, 0, 0);
    bones.leftFoot.rotation.set(0, 0, 0);
    bones.rightUpLeg.rotation.set(0, 0, 0);
    bones.rightLeg.rotation.set(0, 0, 0);
    bones.rightFoot.rotation.set(0, 0, 0);
  }
}

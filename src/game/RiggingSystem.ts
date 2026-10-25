import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export type MarkerId =
  | 'head'
  | 'chin'
  | 'neck'
  | 'chest'
  | 'spine'
  | 'pelvis'
  | 'leftShoulder'
  | 'leftElbow'
  | 'leftWrist'
  | 'leftHand'
  | 'rightShoulder'
  | 'rightElbow'
  | 'rightWrist'
  | 'rightHand'
  | 'leftHip'
  | 'leftKnee'
  | 'leftAnkle'
  | 'leftFoot'
  | 'rightHip'
  | 'rightKnee'
  | 'rightAnkle'
  | 'rightFoot';

export interface MarkerInfo {
  id: MarkerId;
  label: string;
  category: 'Head & Neck' | 'Torso' | 'Left Arm' | 'Right Arm' | 'Left Leg' | 'Right Leg';
  side: 'center' | 'left' | 'right';
  pairedId?: MarkerId;
  color: string;
  defaultPos: { x: number; y: number; z: number };
}

export type MarkerPositions = Record<MarkerId, THREE.Vector3>;

export const MARKER_DEFINITIONS: MarkerInfo[] = [
  // Head & Neck
  { id: 'head', label: 'Head Crown', category: 'Head & Neck', side: 'center', color: '#f59e0b', defaultPos: { x: 0, y: 1.74, z: 0.02 } },
  { id: 'chin', label: 'Chin / Jaw', category: 'Head & Neck', side: 'center', color: '#f59e0b', defaultPos: { x: 0, y: 1.58, z: 0.08 } },
  { id: 'neck', label: 'Neck Base', category: 'Head & Neck', side: 'center', color: '#f59e0b', defaultPos: { x: 0, y: 1.50, z: 0.0 } },

  // Torso
  { id: 'chest', label: 'Upper Chest', category: 'Torso', side: 'center', color: '#eab308', defaultPos: { x: 0, y: 1.30, z: 0.0 } },
  { id: 'spine', label: 'Mid-Spine', category: 'Torso', side: 'center', color: '#eab308', defaultPos: { x: 0, y: 1.12, z: 0.0 } },
  { id: 'pelvis', label: 'Pelvis / Hips Center', category: 'Torso', side: 'center', color: '#eab308', defaultPos: { x: 0, y: 0.94, z: 0.0 } },

  // Left Arm (anatomical left: negative X)
  { id: 'leftShoulder', label: 'Left Shoulder', category: 'Left Arm', side: 'left', pairedId: 'rightShoulder', color: '#10b981', defaultPos: { x: -0.22, y: 1.44, z: 0.0 } },
  { id: 'leftElbow', label: 'Left Elbow', category: 'Left Arm', side: 'left', pairedId: 'rightElbow', color: '#10b981', defaultPos: { x: -0.38, y: 1.18, z: -0.02 } },
  { id: 'leftWrist', label: 'Left Wrist', category: 'Left Arm', side: 'left', pairedId: 'rightWrist', color: '#10b981', defaultPos: { x: -0.48, y: 0.96, z: 0.0 } },
  { id: 'leftHand', label: 'Left Hand', category: 'Left Arm', side: 'left', pairedId: 'rightHand', color: '#10b981', defaultPos: { x: -0.52, y: 0.88, z: 0.0 } },

  // Right Arm (anatomical right: positive X)
  { id: 'rightShoulder', label: 'Right Shoulder', category: 'Right Arm', side: 'right', pairedId: 'leftShoulder', color: '#06b6d4', defaultPos: { x: 0.22, y: 1.44, z: 0.0 } },
  { id: 'rightElbow', label: 'Right Elbow', category: 'Right Arm', side: 'right', pairedId: 'leftElbow', color: '#06b6d4', defaultPos: { x: 0.38, y: 1.18, z: -0.02 } },
  { id: 'rightWrist', label: 'Right Wrist', category: 'Right Arm', side: 'right', pairedId: 'leftWrist', color: '#06b6d4', defaultPos: { x: 0.48, y: 0.96, z: 0.0 } },
  { id: 'rightHand', label: 'Right Hand', category: 'Right Arm', side: 'right', pairedId: 'leftHand', color: '#06b6d4', defaultPos: { x: 0.52, y: 0.88, z: 0.0 } },

  // Left Leg
  { id: 'leftHip', label: 'Left Hip Socket', category: 'Left Leg', side: 'left', pairedId: 'rightHip', color: '#10b981', defaultPos: { x: -0.16, y: 0.88, z: 0.0 } },
  { id: 'leftKnee', label: 'Left Knee', category: 'Left Leg', side: 'left', pairedId: 'rightKnee', color: '#10b981', defaultPos: { x: -0.16, y: 0.48, z: 0.02 } },
  { id: 'leftAnkle', label: 'Left Ankle', category: 'Left Leg', side: 'left', pairedId: 'rightAnkle', color: '#10b981', defaultPos: { x: -0.16, y: 0.10, z: 0.0 } },
  { id: 'leftFoot', label: 'Left Foot Toe', category: 'Left Leg', side: 'left', pairedId: 'rightFoot', color: '#10b981', defaultPos: { x: -0.16, y: 0.04, z: 0.12 } },

  // Right Leg
  { id: 'rightHip', label: 'Right Hip Socket', category: 'Right Leg', side: 'right', pairedId: 'leftHip', color: '#06b6d4', defaultPos: { x: 0.16, y: 0.88, z: 0.0 } },
  { id: 'rightKnee', label: 'Right Knee', category: 'Right Leg', side: 'right', pairedId: 'leftKnee', color: '#06b6d4', defaultPos: { x: 0.16, y: 0.48, z: 0.02 } },
  { id: 'rightAnkle', label: 'Right Ankle', category: 'Right Leg', side: 'right', pairedId: 'leftAnkle', color: '#06b6d4', defaultPos: { x: 0.16, y: 0.10, z: 0.0 } },
  { id: 'rightFoot', label: 'Right Foot Toe', category: 'Right Leg', side: 'right', pairedId: 'leftFoot', color: '#06b6d4', defaultPos: { x: 0.16, y: 0.04, z: 0.12 } },
];

export class RiggingSystem {
  /**
   * Generates initial marker positions fitted to model bounding dimensions
   */
  public static getInitialMarkers(size?: THREE.Vector3): MarkerPositions {
    const W = size ? Math.max(0.65, size.x) : 0.8;
    const D = size ? Math.max(0.35, size.z) : 0.5;

    const markers = {} as MarkerPositions;

    for (const def of MARKER_DEFINITIONS) {
      const p = new THREE.Vector3(def.defaultPos.x, def.defaultPos.y, def.defaultPos.z);

      // Adapt width and depth proportionally if custom model size is provided
      if (def.side === 'left') {
        if (def.id === 'leftShoulder') p.x = -W * 0.28;
        else if (def.id === 'leftElbow') p.x = -W * 0.44;
        else if (def.id === 'leftWrist') p.x = -W * 0.52;
        else if (def.id === 'leftHand') p.x = -W * 0.56;
        else if (def.id.startsWith('left')) p.x = -W * 0.20;
      } else if (def.side === 'right') {
        if (def.id === 'rightShoulder') p.x = W * 0.28;
        else if (def.id === 'rightElbow') p.x = W * 0.44;
        else if (def.id === 'rightWrist') p.x = W * 0.52;
        else if (def.id === 'rightHand') p.x = W * 0.56;
        else if (def.id.startsWith('right')) p.x = W * 0.20;
      }

      if (def.id === 'leftFoot' || def.id === 'rightFoot') {
        p.z = D * 0.24;
      }

      markers[def.id] = p;
    }

    return markers;
  }

  /**
   * Applies bilateral symmetry across the character's sagittal X=0 mirror plane
   */
  public static applySymmetry(
    markers: MarkerPositions,
    movedId: MarkerId,
    newPos: THREE.Vector3,
    useSymmetry: boolean
  ): void {
    const def = MARKER_DEFINITIONS.find((m) => m.id === movedId);
    if (!def) return;

    if (useSymmetry) {
      if (def.side === 'center') {
        // Centerline markers stay exactly on X=0 plane
        markers[movedId].set(0, newPos.y, newPos.z);
      } else if (def.pairedId) {
        // Bilateral paired joint: mirror X across center
        markers[movedId].copy(newPos);
        const paired = markers[def.pairedId];
        if (paired) {
          paired.set(-newPos.x, newPos.y, newPos.z);
        }
      } else {
        markers[movedId].copy(newPos);
      }
    } else {
      markers[movedId].copy(newPos);
    }
  }

  /**
   * Assembles a real Three.js humanoid skeletal bone hierarchy directly from marker positions
   */
  public static buildSkeleton(markers: MarkerPositions): {
    root: THREE.Bone;
    boneList: THREE.Bone[];
    bonesByName: Record<string, THREE.Bone>;
    skeleton: THREE.Skeleton;
  } {
    // 1. Root bone at feet/platform level
    const root = new THREE.Bone();
    root.name = 'Root';
    root.position.set(0, 0, 0);

    // 2. Pelvis / Hips center
    const hips = new THREE.Bone();
    hips.name = 'Hips';
    hips.position.copy(markers.pelvis);
    root.add(hips);

    // 3. Spine (relative to hips)
    const spine = new THREE.Bone();
    spine.name = 'Spine';
    spine.position.copy(markers.spine).sub(markers.pelvis);
    hips.add(spine);

    // 4. Chest (relative to spine)
    const chest = new THREE.Bone();
    chest.name = 'Chest';
    chest.position.copy(markers.chest).sub(markers.spine);
    spine.add(chest);

    // 5. Neck (relative to chest)
    const neck = new THREE.Bone();
    neck.name = 'Neck';
    neck.position.copy(markers.neck).sub(markers.chest);
    chest.add(neck);

    // 6. Head (relative to neck)
    const head = new THREE.Bone();
    head.name = 'Head';
    head.position.copy(markers.head).sub(markers.neck);
    neck.add(head);

    // 7. Left Arm (from chest)
    const leftShoulder = new THREE.Bone();
    leftShoulder.name = 'LeftShoulder';
    leftShoulder.position.copy(markers.leftShoulder).sub(markers.chest);
    chest.add(leftShoulder);

    const leftUpperArm = new THREE.Bone();
    leftUpperArm.name = 'LeftUpperArm';
    leftUpperArm.position.copy(markers.leftElbow).sub(markers.leftShoulder);
    leftShoulder.add(leftUpperArm);

    const leftForearm = new THREE.Bone();
    leftForearm.name = 'LeftForearm';
    leftForearm.position.copy(markers.leftWrist).sub(markers.leftElbow);
    leftUpperArm.add(leftForearm);

    const leftHand = new THREE.Bone();
    leftHand.name = 'LeftHand';
    leftHand.position.copy(markers.leftHand).sub(markers.leftWrist);
    leftForearm.add(leftHand);

    // 8. Right Arm (from chest)
    const rightShoulder = new THREE.Bone();
    rightShoulder.name = 'RightShoulder';
    rightShoulder.position.copy(markers.rightShoulder).sub(markers.chest);
    chest.add(rightShoulder);

    const rightUpperArm = new THREE.Bone();
    rightUpperArm.name = 'RightUpperArm';
    rightUpperArm.position.copy(markers.rightElbow).sub(markers.rightShoulder);
    rightShoulder.add(rightUpperArm);

    const rightForearm = new THREE.Bone();
    rightForearm.name = 'RightForearm';
    rightForearm.position.copy(markers.rightWrist).sub(markers.rightElbow);
    rightUpperArm.add(rightForearm);

    const rightHand = new THREE.Bone();
    rightHand.name = 'RightHand';
    rightHand.position.copy(markers.rightHand).sub(markers.rightWrist);
    rightForearm.add(rightHand);

    // 9. Left Leg (from hips)
    const leftUpLeg = new THREE.Bone();
    leftUpLeg.name = 'LeftUpLeg';
    leftUpLeg.position.copy(markers.leftHip).sub(markers.pelvis);
    hips.add(leftUpLeg);

    const leftLeg = new THREE.Bone();
    leftLeg.name = 'LeftLeg';
    leftLeg.position.copy(markers.leftKnee).sub(markers.leftHip);
    leftUpLeg.add(leftLeg);

    const leftFoot = new THREE.Bone();
    leftFoot.name = 'LeftFoot';
    leftFoot.position.copy(markers.leftAnkle).sub(markers.leftKnee);
    leftLeg.add(leftFoot);

    const leftToe = new THREE.Bone();
    leftToe.name = 'LeftToe';
    leftToe.position.copy(markers.leftFoot).sub(markers.leftAnkle);
    leftFoot.add(leftToe);

    // 10. Right Leg (from hips)
    const rightUpLeg = new THREE.Bone();
    rightUpLeg.name = 'RightUpLeg';
    rightUpLeg.position.copy(markers.rightHip).sub(markers.pelvis);
    hips.add(rightUpLeg);

    const rightLeg = new THREE.Bone();
    rightLeg.name = 'RightLeg';
    rightLeg.position.copy(markers.rightKnee).sub(markers.rightHip);
    rightUpLeg.add(rightLeg);

    const rightFoot = new THREE.Bone();
    rightFoot.name = 'RightFoot';
    rightFoot.position.copy(markers.rightAnkle).sub(markers.rightKnee);
    rightLeg.add(rightFoot);

    const rightToe = new THREE.Bone();
    rightToe.name = 'RightToe';
    rightToe.position.copy(markers.rightFoot).sub(markers.rightAnkle);
    rightFoot.add(rightToe);

    const boneList = [
      root,          // 0
      hips,          // 1
      spine,         // 2
      chest,         // 3
      neck,          // 4
      head,          // 5
      leftShoulder,  // 6
      leftUpperArm,  // 7
      leftForearm,   // 8
      leftHand,      // 9
      rightShoulder, // 10
      rightUpperArm, // 11
      rightForearm,  // 12
      rightHand,     // 13
      leftUpLeg,     // 14
      leftLeg,       // 15
      leftFoot,      // 16
      leftToe,       // 17
      rightUpLeg,    // 18
      rightLeg,      // 19
      rightFoot,     // 20
      rightToe,      // 21
    ];

    const bonesByName: Record<string, THREE.Bone> = {};
    for (const b of boneList) {
      bonesByName[b.name] = b;
    }

    root.updateWorldMatrix(true, true);
    const skeleton = new THREE.Skeleton(boneList);

    return { root, boneList, bonesByName, skeleton };
  }

  /**
   * Distance between point P and line segment AB
   */
  private static distToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ap = new THREE.Vector3().subVectors(p, a);
    const lenSq = ab.lengthSq();
    if (lenSq < 0.000001) return ap.length();
    let t = ap.dot(ab) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const proj = new THREE.Vector3().copy(a).addScaledVector(ab, t);
    return p.distanceTo(proj);
  }

  /**
   * Computes bone-segment proximity skin weights for a geometry based on markers
   */
  public static computeSkinWeights(
    geometry: THREE.BufferGeometry,
    markers: MarkerPositions,
    boneList: THREE.Bone[]
  ): void {
    const posAttr = geometry.attributes.position;
    const vertexCount = posAttr.count;

    // Define major bone segments: [boneIndex, startMarker, endMarker, side, minWeight]
    const segments: Array<{ boneIdx: number; start: THREE.Vector3; end: THREE.Vector3; side: 'center' | 'left' | 'right'; priority: number }> = [
      { boneIdx: 1, start: markers.pelvis, end: markers.spine, side: 'center', priority: 1.0 }, // Hips/Pelvis
      { boneIdx: 2, start: markers.spine, end: markers.chest, side: 'center', priority: 1.0 }, // Spine
      { boneIdx: 3, start: markers.chest, end: markers.neck, side: 'center', priority: 1.0 },  // Chest
      { boneIdx: 4, start: markers.neck, end: markers.chin, side: 'center', priority: 1.1 },   // Neck
      { boneIdx: 5, start: markers.chin, end: markers.head, side: 'center', priority: 1.2 },   // Head

      // Left Arm
      { boneIdx: 6, start: markers.chest, end: markers.leftShoulder, side: 'left', priority: 1.0 },
      { boneIdx: 7, start: markers.leftShoulder, end: markers.leftElbow, side: 'left', priority: 1.1 },
      { boneIdx: 8, start: markers.leftElbow, end: markers.leftWrist, side: 'left', priority: 1.1 },
      { boneIdx: 9, start: markers.leftWrist, end: markers.leftHand, side: 'left', priority: 1.2 },

      // Right Arm
      { boneIdx: 10, start: markers.chest, end: markers.rightShoulder, side: 'right', priority: 1.0 },
      { boneIdx: 11, start: markers.rightShoulder, end: markers.rightElbow, side: 'right', priority: 1.1 },
      { boneIdx: 12, start: markers.rightElbow, end: markers.rightWrist, side: 'right', priority: 1.1 },
      { boneIdx: 13, start: markers.rightWrist, end: markers.rightHand, side: 'right', priority: 1.2 },

      // Left Leg
      { boneIdx: 14, start: markers.leftHip, end: markers.leftKnee, side: 'left', priority: 1.1 },
      { boneIdx: 15, start: markers.leftKnee, end: markers.leftAnkle, side: 'left', priority: 1.1 },
      { boneIdx: 16, start: markers.leftAnkle, end: markers.leftFoot, side: 'left', priority: 1.2 },
      { boneIdx: 17, start: markers.leftFoot, end: markers.leftFoot.clone().add(new THREE.Vector3(0, 0, 0.08)), side: 'left', priority: 1.2 },

      // Right Leg
      { boneIdx: 18, start: markers.rightHip, end: markers.rightKnee, side: 'right', priority: 1.1 },
      { boneIdx: 19, start: markers.rightKnee, end: markers.rightAnkle, side: 'right', priority: 1.1 },
      { boneIdx: 20, start: markers.rightAnkle, end: markers.rightFoot, side: 'right', priority: 1.2 },
      { boneIdx: 21, start: markers.rightFoot, end: markers.rightFoot.clone().add(new THREE.Vector3(0, 0, 0.08)), side: 'right', priority: 1.2 },
    ];

    const skinIndices: number[] = [];
    const skinWeights: number[] = [];
    const v = new THREE.Vector3();

    for (let i = 0; i < vertexCount; i++) {
      v.fromBufferAttribute(posAttr, i);

      // Compute weight for every candidate bone segment
      const candidates: Array<{ boneIdx: number; weight: number }> = [];

      for (const seg of segments) {
        // Enforce anatomical side affinity (don't weight left arm/leg to right bones)
        if (seg.side === 'left' && v.x > 0.08) continue;
        if (seg.side === 'right' && v.x < -0.08) continue;

        const dist = this.distToSegment(v, seg.start, seg.end);
        // Inverse square falloff with softness epsilon
        const rawW = seg.priority / Math.pow(dist + 0.06, 2.4);
        candidates.push({ boneIdx: seg.boneIdx, weight: rawW });
      }

      // Sort by weight descending
      candidates.sort((a, b) => b.weight - a.weight);

      // Pick top 4 influences
      const top4 = candidates.slice(0, 4);
      while (top4.length < 4) {
        top4.push({ boneIdx: 1, weight: 0.0 });
      }

      const sum = top4.reduce((acc, c) => acc + c.weight, 0);
      const normSum = sum > 0.0001 ? sum : 1.0;

      skinIndices.push(top4[0].boneIdx, top4[1].boneIdx, top4[2].boneIdx, top4[3].boneIdx);
      skinWeights.push(
        top4[0].weight / normSum,
        top4[1].weight / normSum,
        top4[2].weight / normSum,
        top4[3].weight / normSum
      );
    }

    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  }

  /**
   * Binds the skeleton to the normalized model and produces a SkinnedMesh hierarchy
   * Using bindMode = 'detached' to guarantee zero parent-transform divergence!
   */
  public static bindCharacter(
    normalizedModel: THREE.Group,
    markers: MarkerPositions
  ): {
    rigGroup: THREE.Group;
    rootBone: THREE.Bone;
    skeleton: THREE.Skeleton;
    skinnedMeshes: THREE.SkinnedMesh[];
    skeletonHelper: THREE.SkeletonHelper;
    bonesByName: Record<string, THREE.Bone>;
  } {
    const { root, boneList, bonesByName, skeleton } = this.buildSkeleton(markers);

    const rigGroup = new THREE.Group();
    rigGroup.name = 'RiggedHumanoidGroup';
    rigGroup.add(root);

    const skinnedMeshes: THREE.SkinnedMesh[] = [];

    normalizedModel.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !(child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry.clone();

        // Calculate smooth bone proximity skin weights
        this.computeSkinWeights(geom, markers, boneList);

        // Material setup
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

        // CRITICAL FIX: bind with detached mode so parent movement never causes bone/mesh displacement!
        skinnedMesh.bind(skeleton);
        skinnedMesh.bindMode = 'detached';

        skinnedMeshes.push(skinnedMesh);
        rigGroup.add(skinnedMesh);
      }
    });

    // Update initial world matrices
    rigGroup.updateWorldMatrix(true, true);
    skeleton.calculateInverses();

    // Create high-contrast SkeletonHelper
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
      bonesByName,
    };
  }

  /**
   * Exports the rigged model hierarchy as a standard binary GLB file
   */
  public static async exportToGLB(rigGroup: THREE.Group, filename: string = 'RiggedCharacter.glb'): Promise<void> {
    const exporter = new GLTFExporter();
    exporter.parse(
      rigGroup,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('Failed to export GLB:', error);
      },
      { binary: true }
    );
  }
}

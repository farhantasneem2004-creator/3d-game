const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');

// 1. Generate 512x512 Stylized Character Texture (3DModel.jpg)
const width = 512;
const height = 512;
const frameData = Buffer.alloc(width * height * 4);

// Palette for character regions
// UV mapping layout:
// x: [0, 256], y: [0, 256] -> Face & Head (Skin: #fed7aa, Hair: #1e293b, Visor: #38bdf8)
// x: [256, 512], y: [0, 256] -> Torso / Jacket (Cyan / Sky Suit: #0ea5e9, Chest Emblem: #f59e0b)
// x: [0, 256], y: [256, 512] -> Arms & Gloves (Sky suit with dark gloves: #334155)
// x: [256, 512], y: [256, 512] -> Pants & Boots (Dark Pants: #1e293b, Boots: #f97316)

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const idx = (y * width + x) * 4;
  frameData[idx] = r;
  frameData[idx + 1] = g;
  frameData[idx + 2] = b;
  frameData[idx + 3] = 255;
}

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (x < 256 && y < 256) {
      // Head & Face
      if (y > 80 && y < 180 && x > 50 && x < 206) {
        // Face area
        if (y > 110 && y < 140 && x > 70 && x < 186) {
          // Cyber Visor / Eyes
          setPixel(x, y, 56, 189, 248);
        } else {
          // Skin
          setPixel(x, y, 254, 215, 170);
        }
      } else {
        // Hair / Helmet
        setPixel(x, y, 30, 41, 59);
      }
    } else if (x >= 256 && y < 256) {
      // Torso / Jacket
      // Cyan suit with golden accents
      if (Math.abs(x - 384) < 30 && Math.abs(y - 128) < 30) {
        // Gold Chest Plate
        setPixel(x, y, 245, 158, 11);
      } else if (y > 210) {
        // Belt
        setPixel(x, y, 245, 158, 11);
      } else {
        // Primary Suit
        const stripe = Math.sin(x * 0.1) * 10;
        setPixel(x, y, 14, Math.floor(165 + stripe), 233);
      }
    } else if (x < 256 && y >= 256) {
      // Arms & Gloves
      if (y > 420) {
        // Gloves
        setPixel(x, y, 51, 65, 85);
      } else {
        // Arm sleeves
        setPixel(x, y, 2, 132, 199);
      }
    } else {
      // Legs & Boots
      if (y > 420) {
        // Orange / Red Adventurer Boots
        setPixel(x, y, 249, 115, 22);
      } else {
        // Dark Adventurer Pants
        setPixel(x, y, 30, 41, 59);
      }
    }
  }
}

const jpegImageData = jpeg.encode({ data: frameData, width, height }, 90);

// 2. Generate 3DModel.mtl
const mtlContent = `# Wavefront Material Template Library
newmtl CharacterMat
Ka 1.000 1.000 1.000
Kd 1.000 1.000 1.000
Ks 0.200 0.200 0.200
Ns 30.000
d 1.0
illum 2
map_Kd 3DModel.jpg
`;

// 3. Generate 3DModel.obj (Clean low-poly humanoid bipedal character)
// Box helper to generate vertices, UVs, normals, and quad faces
let vCount = 0;
let vtCount = 0;
let vnCount = 0;

let vLines = [];
let vtLines = [];
let vnLines = [];
let fLines = [];

function addBox(name, cx, cy, cz, wx, wy, wz, uvMinX, uvMinY, uvMaxX, uvMaxY) {
  fLines.push(`g ${name}`);
  fLines.push(`usemtl CharacterMat`);

  const hx = wx / 2;
  const hy = wy / 2;
  const hz = wz / 2;

  // 8 vertices of box
  const boxV = [
    [cx - hx, cy - hy, cz + hz], // 0: Front-Bottom-Left
    [cx + hx, cy - hy, cz + hz], // 1: Front-Bottom-Right
    [cx + hx, cy + hy, cz + hz], // 2: Front-Top-Right
    [cx - hx, cy + hy, cz + hz], // 3: Front-Top-Left
    [cx - hx, cy - hy, cz - hz], // 4: Back-Bottom-Left
    [cx + hx, cy - hy, cz - hz], // 5: Back-Bottom-Right
    [cx + hx, cy + hy, cz - hz], // 6: Back-Top-Right
    [cx - hx, cy + hy, cz - hz], // 7: Back-Top-Left
  ];

  const baseV = vCount + 1;
  for (const [x, y, z] of boxV) {
    vLines.push(`v ${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`);
    vCount++;
  }

  // 4 UV coordinates mapped to texture quadrant
  const u0 = uvMinX;
  const v0 = 1 - uvMaxY;
  const u1 = uvMaxX;
  const v1 = 1 - uvMinY;

  const baseVt = vtCount + 1;
  vtLines.push(`vt ${u0.toFixed(4)} ${v0.toFixed(4)}`);
  vtLines.push(`vt ${u1.toFixed(4)} ${v0.toFixed(4)}`);
  vtLines.push(`vt ${u1.toFixed(4)} ${v1.toFixed(4)}`);
  vtLines.push(`vt ${u0.toFixed(4)} ${v1.toFixed(4)}`);
  vtCount += 4;

  // 6 Face normals
  const baseVn = vnCount + 1;
  vnLines.push(`vn 0.0 0.0 1.0`);   // Front (0)
  vnLines.push(`vn 0.0 0.0 -1.0`);  // Back (1)
  vnLines.push(`vn 0.0 1.0 0.0`);   // Top (2)
  vnLines.push(`vn 0.0 -1.0 0.0`);  // Bottom (3)
  vnLines.push(`vn 1.0 0.0 0.0`);   // Right (4)
  vnLines.push(`vn -1.0 0.0 0.0`);  // Left (5)
  vnCount += 6;

  // 6 Quads (Front, Back, Top, Bottom, Right, Left)
  // Each quad split into 2 triangles
  const faces = [
    // Front: 0, 1, 2, 3 (vn 0)
    [[0, 1, 2], [0, 2, 3], 0],
    // Back: 5, 4, 7, 6 (vn 1)
    [[5, 4, 7], [5, 7, 6], 1],
    // Top: 3, 2, 6, 7 (vn 2)
    [[3, 2, 6], [3, 6, 7], 2],
    // Bottom: 4, 5, 1, 0 (vn 3)
    [[4, 5, 1], [4, 1, 0], 3],
    // Right: 1, 5, 6, 2 (vn 4)
    [[1, 5, 6], [1, 6, 2], 4],
    // Left: 4, 0, 3, 7 (vn 5)
    [[4, 0, 3], [4, 3, 7], 5],
  ];

  for (const [tri1, tri2, normalIdx] of faces) {
    const n = baseVn + normalIdx;
    const t0 = baseVt;
    const t1 = baseVt + 1;
    const t2 = baseVt + 2;
    const t3 = baseVt + 3;

    fLines.push(`f ${baseV + tri1[0]}/${t0}/${n} ${baseV + tri1[1]}/${t1}/${n} ${baseV + tri1[2]}/${t2}/${n}`);
    fLines.push(`f ${baseV + tri2[0]}/${t0}/${n} ${baseV + tri2[1]}/${t2}/${n} ${baseV + tri2[2]}/${t3}/${n}`);
  }
}

// Build Humanoid Character Parts:
// Total Height ~ 1.8 units, Feet placed at y = 0
// Head (y: 1.45 to 1.80)
addBox('Head', 0, 1.62, 0, 0.42, 0.36, 0.42, 0.0, 0.0, 0.5, 0.5);

// Torso / Chest (y: 0.85 to 1.44)
addBox('Torso', 0, 1.15, 0, 0.56, 0.58, 0.36, 0.5, 0.0, 1.0, 0.5);

// Left Arm (Upper & Lower) (y: 0.70 to 1.35)
addBox('LeftArm', -0.38, 1.05, 0, 0.18, 0.52, 0.20, 0.0, 0.5, 0.5, 1.0);

// Right Arm (Upper & Lower) (y: 0.70 to 1.35)
addBox('RightArm', 0.38, 1.05, 0, 0.18, 0.52, 0.20, 0.0, 0.5, 0.5, 1.0);

// Left Leg & Boot (y: 0.0 to 0.84)
addBox('LeftLeg', -0.16, 0.42, 0, 0.22, 0.84, 0.24, 0.5, 0.5, 1.0, 1.0);

// Right Leg & Boot (y: 0.0 to 0.84)
addBox('RightLeg', 0.16, 0.42, 0, 0.22, 0.84, 0.24, 0.5, 0.5, 1.0, 1.0);

const objHeader = `# 3D Character Model Wavefront OBJ
mtllib 3DModel.mtl
o Character
`;

const objContent = [
  objHeader,
  vLines.join('\n'),
  vtLines.join('\n'),
  vnLines.join('\n'),
  fLines.join('\n'),
].join('\n\n');

// 4. Save to target directories
const targetDirs = [
  path.join(__dirname, '../public/assets/game/models'),
  path.join(__dirname, '../public/models'),
  path.join(__dirname, '../android/app/src/main/assets/game/models'),
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(path.join(dir, '3DModel.obj'), objContent, 'utf8');
  fs.writeFileSync(path.join(dir, '3DModel.mtl'), mtlContent, 'utf8');
  fs.writeFileSync(path.join(dir, '3DModel.jpg'), jpegImageData.data);
  console.log(`Successfully generated 3DModel files in: ${dir}`);
}

========================================================================
PLACE YOUR 3D CHARACTER ASSET FILES HERE
========================================================================

Copy your actual 3D character files directly into this directory:

  1. 3DModel.obj  (Wavefront OBJ polygonal mesh)
  2. 3DModel.mtl  (Wavefront MTL material definitions)
  3. 3DModel.jpg  (Character texture map image)

REQUIREMENTS & PIPELINE:
- The Three.js loader uses MTLLoader to parse 3DModel.mtl first.
- OBJLoader is then configured with the loaded materials to parse 3DModel.obj.
- 3DModel.jpg is referenced inside 3DModel.mtl (e.g. map_Kd 3DModel.jpg) and resolved locally.
- When built into the APK, these files are bundled inside assets/game/models/
  and loaded offline by AndroidX WebKit WebViewAssetLoader.

For Android Studio APK build:
  Copy to: android/app/src/main/assets/game/models/

For local Web Vite dev server:
  Copy to: public/assets/game/models/
========================================================================

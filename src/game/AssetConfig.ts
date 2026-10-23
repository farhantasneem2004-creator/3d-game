/**
 * Centralized Asset Configuration for 3D Character Model
 * Configures exact paths for Web preview and Android APK bundling.
 */

export const CHARACTER_ASSETS = {
  // Directory where the real model files should be located
  DIRECTORY: 'assets/game/models/',
  
  // Web preview public URL base path
  WEB_BASE_PATH: '/assets/game/models/',

  // Exact file names expected by MTLLoader and OBJLoader
  OBJ_FILENAME: '3DModel.obj',
  MTL_FILENAME: '3DModel.mtl',
  JPG_FILENAME: '3DModel.jpg',

  // Android APK local asset destination path
  ANDROID_ASSET_DESTINATION: 'android/app/src/main/assets/game/models/',

  // Full path strings
  PATHS: {
    OBJ: 'assets/game/models/3DModel.obj',
    MTL: 'assets/game/models/3DModel.mtl',
    JPG: 'assets/game/models/3DModel.jpg',
  },
} as const;

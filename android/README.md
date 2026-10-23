# 3D Android Platformer (Native Kotlin & Jetpack Compose + Three.js WebView)

A native Android 3D platformer game that renders an interactive Three.js 3D world using your custom character model (`3DModel.obj`, `3DModel.mtl`, and `3DModel.jpg`), loaded 100% locally from the APK assets using **AndroidX WebKit `WebViewAssetLoader`**.

---

## ⚠️ Mandatory Character Assets Setup

Before building the APK, copy your three files:
- **3DModel.obj**
- **3DModel.mtl**
- **3DModel.jpg**

Directly into:
```
android/app/src/main/assets/game/models/
```

When running the web preview locally via Vite, copy them into:
```
public/assets/game/models/
```
Or use the **in-browser file picker** in the game UI to load them immediately into your session.

---

## Architecture Overview

```
android/
├── app/
│   ├── build.gradle.kts                   # MinSdk 24, TargetSdk 34, Jetpack Compose, AndroidX WebKit
│   └── src/main/
│       ├── AndroidManifest.xml           # Landscape orientation, hardware acceleration, immersive theme
│       ├── java/com/platformer3d/game/
│       │   ├── MainActivity.kt           # Fullscreen immersive mode, Android back-button handling
│       │   ├── GameWebView.kt            # AndroidView with WebViewAssetLoader & WebGL settings
│       │   └── WebAppInterface.kt        # Native haptic vibration & toast bridge
│       ├── res/values/
│       │   ├── strings.xml, colors.xml, themes.xml
│       └── assets/game/                  # BUNDLED LOCAL ASSETS (No remote CDN or internet needed)
│           ├── index.html                # Standalone Three.js platformer runner
│           └── models/
│               ├── 3DModel.obj           # Actual character geometry
│               ├── 3DModel.mtl           # Material definition
│               └── 3DModel.jpg           # 512x512 character texture map
```

---

## Prerequisites

1. **Android Studio** (2024.1 Hedgehog / Iguana / Jellyfish / Koala or later)
2. **JDK 17** (bundled with modern Android Studio)
3. **Android Device or Emulator** running Android 7.0 (API Level 24) or higher

---

## How to Build the APK

### Option A: Using Android Studio (Recommended)

1. Open **Android Studio**.
2. Select **File -> Open...** and select the `android` folder in this repository.
3. Allow Gradle to sync dependencies (`androidx.webkit:webkit:1.11.0`, Jetpack Compose BOM).
4. Connect an Android phone via USB (with **USB Debugging** enabled in Developer Options) or start an Android Virtual Device (AVD).
5. Click the green **Run ▶** button (or press `Shift + F10`).
6. The game will build, install, and launch immediately in landscape mode!

### Option B: Using Gradle Command Line

From inside the `android` directory:

```bash
# On Linux / macOS
chmod +x gradlew
./gradlew assembleDebug

# On Windows
gradlew.bat assembleDebug
```

The compiled APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`

---

## Installing and Testing on a Physical Android Device

1. Connect your Android phone to your computer with a USB cable.
2. Enable **Developer Options** and turn on **USB Debugging** on your phone.
3. Verify connection via `adb`:
   ```bash
   adb devices
   ```
4. Install the debug APK directly:
   ```bash
   adb install -r app/build/outputs/apk/debug/app-debug.apk
   ```
5. Tap **3D Platformer** on your phone's home screen or app drawer!

---

## Offline Guarantee & Local Asset Loading

- The app uses `WebViewAssetLoader.AssetsPathHandler(context)` mapped to `/assets/`.
- Three.js scripts, geometry (`3DModel.obj`), material (`3DModel.mtl`), and texture (`3DModel.jpg`) are loaded via `https://appassets.androidplatform.net/assets/game/`.
- The game runs seamlessly with **Airplane Mode enabled** (zero Wi-Fi or mobile data required).

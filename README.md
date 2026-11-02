# 3D Cyberpunk Platformer — Android & Web Action Game

A third-person 3D cyberpunk action platformer with full character rigging, GTA-style third-person combat and camera controls, weapon attachment socket calibration, and a native offline Android app.

---

# INSTALL GAME ON ANDROID USING USB

Follow these simple steps to install the game directly onto your Android phone from your Windows PC via a USB cable.

## 1. Prerequisites

- **Windows PC** (Windows 10 or 11)
- **Android Phone** (Android 7.0 / API 24 or higher)
- **USB Cable** (must support data transfer, not charging-only)
- **ADB (Android Debug Bridge)** (included with Android Studio or standalone Platform Tools)

---

## 2. Prepare Your Android Phone

### Step A: Enable Developer Options
1. Open **Settings** on your Android phone.
2. Scroll to the bottom and select **About phone** (or **About device**).
3. Find **Build number** (on Xiaomi/Redmi, tap **MIUI / HyperOS version**; on Samsung, go to **Software information** -> **Build number**).
4. Tap **Build number** rapidly **7 times** in a row.
5. You will see a notification: *"You are now a developer!"*

### Step B: Enable USB Debugging
1. Go back to main **Settings** -> **System** -> **Developer options** (or **Additional settings** -> **Developer options**).
2. Find the toggle for **USB debugging** and turn it **ON**.
3. If using Xiaomi / Redmi / Poco / Oppo / Realme devices:
   - Also enable **Install via USB**.
   - Also enable **USB debugging (Security settings)** if prompted.

### Step C: Connect via USB Cable
1. Plug your phone into your PC with your USB cable.
2. In your phone's notification shade, tap the USB notification and select **File Transfer (MTP)** or **Transfer files** (do not leave on *Charging only*).
3. Look at your phone screen: a popup will appear asking:
   **"Allow USB debugging?"**
4. Check the box **"Always allow from this computer"** and tap **Allow**.

---

## 3. Install ADB on Your Windows PC

If you do not already have ADB installed:
1. Download official **Android SDK Platform-Tools for Windows**:
   [https://developer.android.com/tools/releases/platform-tools](https://developer.android.com/tools/releases/platform-tools)
2. Extract the downloaded `platform-tools_rXX-windows.zip` (for example, to `C:\platform-tools`).
3. Add `C:\platform-tools` to your Windows **System PATH**, OR simply copy `install_game.bat` into that `platform-tools` folder.
4. Verify by opening Command Prompt and typing:
   ```cmd
   adb version
   ```

---

## 4. Run Automated Installation (`install_game.bat`)

The easiest way to install and launch the game:

1. Double-click **`install_game.bat`** in the project folder.
2. The script will:
   - Verify ADB is available.
   - Locate `android/app/build/outputs/apk/debug/app-debug.apk` (or `app-debug.apk`).
   - Run `adb devices` to check your phone's authorization.
   - Install the APK using `adb install -r -d` (replaces previous versions without data loss).
   - Automatically launch the game directly on your phone using `adb shell am start -n com.platformer3d.game/.MainActivity`.
   - Print a clear success message when complete!

---

## 5. Build and Install in One Step (`build_and_install.bat`)

If you modified game code, models, or shaders and want to recompile the web bundle, package the APK, and install it in a single command:

1. Ensure **Node.js 18+**, **Java JDK 17+**, and **ADB** are in your PATH.
2. Double-click **`build_and_install.bat`**.
3. The script will automatically:
   - Run `npm run build` to compile the Three.js client into `dist/`.
   - Sync web assets, 3D character OBJ models, and sounds into `android/app/src/main/assets/game/`.
   - Assemble the signed debug APK `app-debug.apk`.
   - Sideload and launch the game on your connected USB phone!

---

## 6. Manual ADB Commands (Advanced)

If you prefer using the terminal directly:

```cmd
# 1. Verify phone connection
adb devices

# 2. Install APK onto connected device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# 3. Launch game activity
adb shell am start -n com.platformer3d.game/.MainActivity
```

---

## 7. Troubleshooting Common USB Sideload Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`device unauthorized`** | Phone hasn't accepted PC RSA key | Unlock phone screen and tap **"Always allow from this computer"** on the USB prompt. |
| **`no devices/emulators found`** | Cable or driver issue | 1. Ensure USB cable supports data transfer (not charging-only).<br>2. Switch USB mode on phone to **File Transfer (MTP)**.<br>3. Install OEM USB drivers for your phone brand (Samsung, Google, Xiaomi). |
| **`INSTALL_FAILED_USER_RESTRICTED`** | Xiaomi / Oppo security restriction | Open **Settings -> Developer options** and turn **Install via USB** to ON. |
| **`INSTALL_FAILED_INSUFFICIENT_STORAGE`** | Low device storage | Free up at least 60 MB of internal storage on your device. |
| **`INSTALL_FAILED_UPDATE_INCOMPATIBLE`** | Previous version had conflicting signature | Run `adb uninstall com.platformer3d.game`, then re-run `install_game.bat`. |
| **Black screen on launch** | Outdated Android System WebView | Open Google Play Store on your phone and update **Android System WebView** or **Google Chrome**. |

---

# CHARACTER & WEAPON ATTACHMENT STUDIO

The in-game **Character Studio** allows you to:
1. **Mixamo-style Auto-Rigger**: Visual 3D joint markers with bilateral symmetry to rig any custom `.OBJ` character.
2. **Weapon Attachment Editor**:
   - Calibrate **Position (X, Y, Z)** in millimeters.
   - Adjust **Rotation (Pitch, Yaw, Roll)** in degrees so the barrel points forward along sightlines and the grip rests naturally inside the palm.
   - Select **Grip Presets** for Pistols, Rifles, SMGs, Shotguns, and Snipers.
   - Test grips in **Aim**, **Carry**, **Reload**, and **Walk** poses.
   - Switch camera views: **Front**, **Side**, **Back**, and **Free 360° Orbit**.
   - **Save Attachment** locally to `localStorage` so changes persist across sessions.
   - **Apply to Game** to see immediate live in-game weapon alignment.

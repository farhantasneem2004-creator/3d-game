#!/usr/bin/env bash
set -e

echo "=== Compiling 3D Cyberpunk Platformer Android APK ==="

WORKDIR="/app/applet"
cd "$WORKDIR"

BUILD_DIR="$WORKDIR/build_android"
OUT_DIR="$WORKDIR/android/app/build/outputs/apk/debug"
mkdir -p "$BUILD_DIR/gen" "$BUILD_DIR/obj" "$BUILD_DIR/apk" "$OUT_DIR"

ANDROID_JAR="/usr/lib/android-sdk/platforms/android-23/android.jar"
if [ ! -f "$ANDROID_JAR" ]; then
    echo "Error: android.jar not found at $ANDROID_JAR"
    exit 1
fi

echo "1. Generating R.java with AAPT..."
aapt package -f -m \
    -J "$BUILD_DIR/gen" \
    -M "$WORKDIR/android/app/src/main/AndroidManifest.xml" \
    -S "$WORKDIR/android/app/src/main/res" \
    -I "$ANDROID_JAR"

echo "2. Compiling Java sources with javac (Target 1.8)..."
javac -source 8 -target 8 \
    -d "$BUILD_DIR/obj" \
    -cp "$ANDROID_JAR" \
    "$BUILD_DIR/gen/com/platformer3d/game/R.java" \
    "$WORKDIR/android/app/src/main/java/com/platformer3d/game/MainActivity.java"

echo "3. Converting bytecode to classes.dex with dx..."
dx --dex --output="$BUILD_DIR/apk/classes.dex" "$BUILD_DIR/obj"

echo "4. Packaging raw APK with assets..."
aapt package -f \
    -M "$WORKDIR/android/app/src/main/AndroidManifest.xml" \
    -S "$WORKDIR/android/app/src/main/res" \
    -A "$WORKDIR/android/app/src/main/assets" \
    -I "$ANDROID_JAR" \
    -F "$BUILD_DIR/unsigned.apk" \
    "$BUILD_DIR/apk"

echo "5. Aligning APK with zipalign..."
zipalign -f -p 4 "$BUILD_DIR/unsigned.apk" "$BUILD_DIR/aligned.apk"

echo "6. Signing APK with apksigner (Debug Key)..."
KEYSTORE="$BUILD_DIR/debug.keystore"
if [ ! -f "$KEYSTORE" ]; then
    keytool -genkey -v -keystore "$KEYSTORE" -storepass android \
        -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 \
        -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
fi

apksigner sign --ks "$KEYSTORE" \
    --ks-pass pass:android \
    --ks-key-alias androiddebugkey \
    --key-pass pass:android \
    --out "$OUT_DIR/app-debug.apk" \
    "$BUILD_DIR/aligned.apk"

# Verify signature
echo "7. Verifying APK Signature..."
apksigner verify "$OUT_DIR/app-debug.apk"

# Copy for direct browser download and root access
cp "$OUT_DIR/app-debug.apk" "$WORKDIR/public/app-debug.apk"
cp "$OUT_DIR/app-debug.apk" "$WORKDIR/app-debug.apk"

APK_SIZE=$(du -h "$OUT_DIR/app-debug.apk" | cut -f1)
echo "=== BUILD SUCCESSFUL ==="
echo "Output APK: $OUT_DIR/app-debug.apk ($APK_SIZE)"
echo "Web Download Path: /public/app-debug.apk"
echo "Root Path: /app-debug.apk"

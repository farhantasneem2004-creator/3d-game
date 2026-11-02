@echo off
setlocal enabledelayedexpansion

title 3D Cyberpunk Platformer - Build & USB Install for Android

echo =====================================================================
echo    CYBERPUNK 3D PLATFORMER - BUILD ANDROID APK & INSTALL VIA USB
echo =====================================================================
echo.

:: 1. Check for Node.js and npm
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not found in PATH!
    pause
    exit /b 1
)

echo [OK] Node.js & npm detected.

:: 2. Check for Java JDK
where java >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java JDK is not found in PATH!
    echo Please install OpenJDK 17 or higher and set JAVA_HOME.
    pause
    exit /b 1
)
echo [OK] Java runtime detected.
echo.

:: 3. Build Web Bundle (Vite)
echo ---------------------------------------------------------------------
echo  STEP 1: BUILDING 3D THREE.JS WEB ASSETS (npm run build)...
echo ---------------------------------------------------------------------
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web build failed!
    pause
    exit /b 1
)
echo [OK] Web build successful.
echo.

:: 4. Sync assets into Android Project
echo ---------------------------------------------------------------------
echo  STEP 2: SYNCING GAME BUNDLE TO ANDROID ASSETS...
echo ---------------------------------------------------------------------
if not exist "android\app\src\main\assets\game" (
    mkdir "android\app\src\main\assets\game"
)

xcopy /E /Y /I "dist\*" "android\app\src\main\assets\game\" >nul
if exist "public\assets" (
    xcopy /E /Y /I "public\assets\*" "android\app\src\main\assets\game\assets\" >nul
)
echo [OK] Game assets synced to Android APK structure.
echo.

:: 5. Build Android APK
echo ---------------------------------------------------------------------
echo  STEP 3: COMPILING ANDROID APK PACKAGE...
echo ---------------------------------------------------------------------
if exist "android\gradlew.bat" (
    cd android
    call gradlew.bat assembleDebug
    cd ..
) else (
    where gradle >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        cd android
        call gradle assembleDebug
        cd ..
    ) else (
        echo [INFO] Using pre-packaged debug APK.
    )
)

:: Verify output APK
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if not exist "%APK_PATH%" (
    if exist "public\app-debug.apk" (
        set APK_PATH=public\app-debug.apk
    ) else if exist "app-debug.apk" (
        set APK_PATH=app-debug.apk
    )
)

if not exist "%APK_PATH%" (
    echo [ERROR] APK build output was not found at %APK_PATH%!
    pause
    exit /b 1
)

echo [OK] APK ready: %APK_PATH%
echo.

:: 6. Launch USB Installer
echo ---------------------------------------------------------------------
echo  STEP 4: LAUNCHING USB INSTALLATION TO CONNECTED DEVICE...
echo ---------------------------------------------------------------------
call install_game.bat

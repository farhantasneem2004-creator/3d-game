@echo off
setlocal enabledelayedexpansion

title 3D Cyberpunk Platformer - Android USB Installer

echo =====================================================================
echo      CYBERPUNK 3D PLATFORMER - USB GAME INSTALLER FOR ANDROID
echo =====================================================================
echo.

:: 1. Check for ADB in PATH
where adb >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ADB (Android Debug Bridge) was not found in your PATH.
    echo.
    echo Please install Android Platform Tools:
    echo   1. Download: https://developer.android.com/tools/releases/platform-tools
    echo   2. Extract the ZIP file (e.g. C:\platform-tools)
    echo   3. Add the extracted folder to your Windows System PATH, or
    echo      copy this install_game.bat file into the platform-tools folder.
    echo.
    pause
    exit /b 1
)

echo [OK] ADB detected:
adb version | findstr /i "Android Debug Bridge version"
echo.

:: 2. Locate APK file
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if not exist "%APK_PATH%" (
    set APK_PATH=app-debug.apk
)
if not exist "%APK_PATH%" (
    set APK_PATH=public\app-debug.apk
)

if not exist "%APK_PATH%" (
    echo [ERROR] Could not find app-debug.apk!
    echo Looked in:
    echo   - android\app\build\outputs\apk\debug\app-debug.apk
    echo   - app-debug.apk
    echo   - public\app-debug.apk
    echo.
    echo Please run build_and_install.bat first to build the APK.
    echo.
    pause
    exit /b 1
)

echo [OK] Found game package: %APK_PATH%
echo.

:: 3. Check for Connected USB Device
echo ---------------------------------------------------------------------
echo  CONNECT YOUR ANDROID PHONE:
echo   1. Connect phone to PC using a USB cable (use File Transfer / MTP mode)
echo   2. Ensure Developer Options is enabled (Settings - About Phone - tap Build 7x)
echo   3. Ensure USB Debugging is turned ON (Settings - Developer Options)
echo   4. If prompted on your phone screen, tap "Allow USB debugging"
echo ---------------------------------------------------------------------
echo.
echo Checking for connected Android devices via ADB...
echo.

adb devices > "%TEMP%\adb_devices.txt"
type "%TEMP%\adb_devices.txt"
echo.

:: Check if any device is listed
findstr /r /c:"[a-zA-Z0-9].*device$" "%TEMP%\adb_devices.txt" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    findstr /r /c:"[a-zA-Z0-9].*unauthorized$" "%TEMP%\adb_devices.txt" >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [WARNING] Device found but UNAUTHORIZED!
        echo Please unlock your phone screen and tap "Always allow from this computer"
        echo on the USB Debugging prompt, then run this script again.
    ) else (
        echo [ERROR] No authorized Android device detected.
        echo Troubleshooting tips:
        echo   - Try a different USB cable or USB port (USB 2.0/3.0 directly on PC)
        echo   - Switch USB mode on phone from "Charging only" to "File Transfer (MTP)"
        echo   - In Developer Options, enable "Install via USB" if prompted (MIUI/ColorOS)
        echo   - Ensure OEM USB drivers are installed for your phone brand
    )
    echo.
    del "%TEMP%\adb_devices.txt" >nul 2>nul
    pause
    exit /b 1
)
del "%TEMP%\adb_devices.txt" >nul 2>nul

echo [OK] Authorized Android device connected!
echo.

:: 4. Install APK onto Device
echo ---------------------------------------------------------------------
echo  INSTALLING 3D CYBERPUNK PLATFORMER (app-debug.apk)...
echo ---------------------------------------------------------------------
echo Installing with -r -d (replace existing, allow downgrade)...
adb install -r -d "%APK_PATH%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] ADB installation failed!
    echo Possible causes:
    echo   - "Install via USB" is disabled in Developer Options (common on Xiaomi/Oppo/Realme)
    echo   - Insufficient phone storage space (game requires ~35 MB free)
    echo   - Conflicting package signatures (uninstall old version first)
    echo.
    set /p UNINSTALL_PROMPT="Do you want to uninstall the old version and retry? (Y/N): "
    if /i "!UNINSTALL_PROMPT!"=="Y" (
        echo Uninstalling com.platformer3d.game...
        adb uninstall com.platformer3d.game
        echo Retrying install...
        adb install -r "%APK_PATH%"
        if !ERRORLEVEL! neq 0 (
            echo [ERROR] Retry failed. Check phone screen for permission prompts.
            pause
            exit /b 1
        )
    ) else (
        pause
        exit /b 1
    )
)

echo.
echo [SUCCESS] Game APK successfully installed on your Android device!
echo.

:: 5. Automatically Launch Game
echo ---------------------------------------------------------------------
echo  LAUNCHING GAME ON DEVICE: com.platformer3d.game/.MainActivity
echo ---------------------------------------------------------------------
adb shell am start -n com.platformer3d.game/.MainActivity
if %ERRORLEVEL% equ 0 (
    echo.
    echo [OK] 3D Platformer launched! Check your phone screen.
    echo Enjoy the cyberpunk city, GTA third-person combat, and rigged character!
) else (
    echo.
    echo [NOTE] You can now tap the "3D Platformer" icon on your phone's app drawer to play!
)

echo.
echo =====================================================================
echo                INSTALLATION COMPLETE!
echo =====================================================================
echo.
pause

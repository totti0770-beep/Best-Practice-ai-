@echo off
:: =============================================================================
:: setup.bat — Automated setup script for Ai Nursing Assistance (Windows)
::
:: Usage: Double-click setup.bat  OR  run from Command Prompt / PowerShell
::
:: Safe to re-run — each step is idempotent.
:: =============================================================================

setlocal EnableDelayedExpansion
title Ai Nursing Assistance — Setup

:: ── Move to the script's own directory ───────────────────────────────────────
cd /d "%~dp0"

set ERRORS=0
set WARNINGS=0

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║     Ai Nursing Assistance — Setup Script     ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: =============================================================================
:: STEP 1 — Prerequisite checks
:: =============================================================================
echo ══ Step 1: Checking Prerequisites ══

:: Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [FAIL] Node.js not found
    echo         Download from: https://nodejs.org
    set /A ERRORS+=1
) else (
    for /f "tokens=*" %%v in ('node -e "process.stdout.write(process.versions.node)"') do set NODE_VER=%%v
    for /f "delims=." %%m in ("!NODE_VER!") do set NODE_MAJOR=%%m
    if !NODE_MAJOR! GEQ 18 (
        echo   [OK]   Node.js v!NODE_VER!
    ) else (
        echo   [FAIL] Node.js v!NODE_VER! detected — v18 or higher required
        echo         Download from: https://nodejs.org
        set /A ERRORS+=1
    )
)

:: npm
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [FAIL] npm not found
    set /A ERRORS+=1
) else (
    for /f "tokens=*" %%v in ('npm --version') do echo   [OK]   npm %%v
)

:: Java
where java >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [FAIL] Java not found
    echo         Install Microsoft OpenJDK 11: https://www.microsoft.com/openjdk
    set /A ERRORS+=1
) else (
    for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do (
        set JAVA_RAW=%%v
    )
    set JAVA_RAW=!JAVA_RAW:"=!
    echo   [OK]   Java !JAVA_RAW!
)

:: ANDROID_HOME
if "%ANDROID_HOME%"=="" (
    echo   [FAIL] ANDROID_HOME environment variable is not set
    echo         Install Android Studio, then add to System Environment Variables:
    echo           ANDROID_HOME = C:\Users\^<YourName^>\AppData\Local\Android\Sdk
    echo           PATH += %%ANDROID_HOME%%\platform-tools
    set /A ERRORS+=1
) else if not exist "%ANDROID_HOME%" (
    echo   [FAIL] ANDROID_HOME points to a folder that does not exist: %ANDROID_HOME%
    set /A ERRORS+=1
) else (
    echo   [OK]   ANDROID_HOME = %ANDROID_HOME%
)

:: react-native CLI (optional)
where react-native >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [WARN] react-native CLI not installed globally (will use npx)
    set /A WARNINGS+=1
) else (
    echo   [OK]   react-native CLI found
)

if !ERRORS! GTR 0 (
    echo.
    echo   [FAIL] Fix the !ERRORS! error(s) above, then re-run setup.bat
    pause
    exit /b 1
)

:: =============================================================================
:: STEP 2 — npm install
:: =============================================================================
echo.
echo ══ Step 2: Installing JavaScript Dependencies ══

call npm install
if %ERRORLEVEL% NEQ 0 (
    echo   [FAIL] npm install failed
    pause
    exit /b 1
)
echo   [OK]   npm install complete

:: =============================================================================
:: STEP 3 — Generate gradle-wrapper.jar
:: =============================================================================
echo.
echo ══ Step 3: Generating Gradle Wrapper Binary ══

if exist "android\gradle\wrapper\gradle-wrapper.jar" (
    echo   [OK]   gradle-wrapper.jar already present
) else (
    where gradle >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo   [FAIL] gradle command not found — cannot generate wrapper binary
        echo         Install Gradle:
        echo           choco install gradle     (Chocolatey)
        echo           scoop install gradle     (Scoop)
        echo         Then re-run setup.bat
        set /A ERRORS+=1
    ) else (
        echo   Running: cd android ^&^& gradle wrapper
        pushd android
        call gradle wrapper --gradle-version 8.3 --distribution-type all
        popd
        echo   [OK]   gradle-wrapper.jar generated
    )
)

:: =============================================================================
:: STEP 4 — gradlew permissions (no-op on Windows)
:: =============================================================================
echo.
echo ══ Step 4: Gradle Wrapper Permissions ══
echo   [OK]   No chmod needed on Windows

:: =============================================================================
:: STEP 5 — Font installation check and asset linking
:: =============================================================================
echo.
echo ══ Step 5: Font Assets ══

set FONTS_READY=1

:: Check Tajawal
set TAJAWAL_COUNT=0
for %%f in ("src\assets\fonts\Tajawal\*.ttf") do set /A TAJAWAL_COUNT+=1
if !TAJAWAL_COUNT! EQU 0 (
    echo   [WARN] Tajawal font files not found
    echo         Download Tajawal-Regular.ttf and Tajawal-Bold.ttf from:
    echo           https://fonts.google.com/specimen/Tajawal
    echo         Place them in: src\assets\fonts\Tajawal\
    set FONTS_READY=0
    set /A WARNINGS+=1
) else (
    echo   [OK]   Tajawal fonts found (!TAJAWAL_COUNT! files)
)

:: Check Inter
set INTER_COUNT=0
for %%f in ("src\assets\fonts\Inter\*.ttf") do set /A INTER_COUNT+=1
if !INTER_COUNT! EQU 0 (
    echo   [WARN] Inter font files not found
    echo         Download Inter-Regular.ttf and Inter-Bold.ttf from:
    echo           https://fonts.google.com/specimen/Inter
    echo         Place them in: src\assets\fonts\Inter\
    set FONTS_READY=0
    set /A WARNINGS+=1
) else (
    echo   [OK]   Inter fonts found (!INTER_COUNT! files)
)

if !FONTS_READY! EQU 1 (
    echo   Linking font assets...
    call npx react-native-asset
    echo   [OK]   Font assets linked
) else (
    echo   [WARN] Skipping font linking — add font files and re-run setup.bat
)

:: =============================================================================
:: STEP 6 — GGUF model check (non-blocking)
:: =============================================================================
echo.
echo ══ Step 6: AI Model File ══

set GGUF_COUNT=0
for %%f in ("android\app\src\main\assets\models\*.gguf") do set /A GGUF_COUNT+=1
if !GGUF_COUNT! GTR 0 (
    echo   [OK]   GGUF model file found
) else (
    echo   [WARN] No .gguf model file found
    echo         The app will run, but the AI engine will not respond without a model.
    echo         Recommended: Phi-3-mini-4k-instruct-q4_k_m.gguf (~2.2 GB)
    echo         Download: https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf
    echo         Place at: android\app\src\main\assets\models\nursing_model.gguf
    set /A WARNINGS+=1
)

:: =============================================================================
:: STEP 7 — Final summary
:: =============================================================================
echo.
echo ══ Setup Summary ══
echo.

if !ERRORS! EQU 0 (
    if !WARNINGS! EQU 0 (
        echo   All checks passed!
    ) else (
        echo   Setup complete with !WARNINGS! warning(s) — see above.
    )
) else (
    echo   Setup failed with !ERRORS! error(s) — fix them and re-run.
    pause
    exit /b 1
)

echo.
echo  To run the app on a connected Android device or emulator:
echo    npx react-native run-android
echo.
echo  To start the Metro bundler separately:
echo    npx react-native start
echo.

pause
endlocal

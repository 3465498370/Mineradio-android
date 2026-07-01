@echo off
set ROOT=E:\code\Mineradio-android
echo ========================================
echo  Mineradio Android APK Builder
echo ========================================
echo.
echo [1/2] Syncing Capacitor...
cd /d "%ROOT%"
call npx cap sync android
if errorlevel 1 (echo ERROR: sync failed && pause && exit /b 1)

echo [2/2] Building APK...
set GRADLE_USER_HOME=E:\gradle-cache
cd /d "%ROOT%\android"
call gradlew assembleDebug
if errorlevel 1 (echo ERROR: build failed && pause && exit /b 1)

cd /d "%ROOT%"
echo ========================================
echo  BUILD SUCCESS
echo  APK: android\app\build\outputs\apk\debug\app-debug.apk
echo ========================================
pause

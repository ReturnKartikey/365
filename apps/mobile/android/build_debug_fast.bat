@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
set "ANDROID_HOME=C:\Users\Karti\AppData\Local\Android\Sdk"
echo ========================================================
echo Building Fast Debug APK (Target: arm64-v8a)
echo ========================================================
call gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a --build-cache --parallel -x lint
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Copying Debug APK to project root...
    copy /Y "%~dp0app\build\outputs\apk\debug\app-debug.apk" "%~dp0..\..\..\365-debug.apk"
    echo Done! APK available at: PROJECTS\365\365-debug.apk
)

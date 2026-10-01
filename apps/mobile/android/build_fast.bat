@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
set "ANDROID_HOME=C:\Users\Karti\AppData\Local\Android\Sdk"
echo ========================================================
echo Building Quick Release APK (Target: arm64-v8a physical devices)
echo ========================================================
if exist "%~dp0app\build\generated\assets\createBundleReleaseJsAndAssets" rd /s /q "%~dp0app\build\generated\assets\createBundleReleaseJsAndAssets"
if exist "%~dp0app\build\intermediates\assets\release" rd /s /q "%~dp0app\build\intermediates\assets\release"
if exist "%~dp0app\build\intermediates\merged_assets\release" rd /s /q "%~dp0app\build\intermediates\merged_assets\release"
call gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --build-cache --parallel -x lint -x lintVitalReportRelease -x lintVitalAnalyzeRelease
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Copying APK to project root...
    copy /Y "%~dp0app\build\outputs\apk\release\app-release.apk" "%~dp0..\..\..\365-release.apk"
    echo Done! APK available at: PROJECTS\365\365-release.apk
)

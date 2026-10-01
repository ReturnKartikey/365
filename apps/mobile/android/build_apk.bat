@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot"
set "ANDROID_HOME=C:\Users\Karti\AppData\Local\Android\Sdk"
echo Building APK with Java: %JAVA_HOME%
echo Android SDK: %ANDROID_HOME%
call gradlew.bat assembleRelease

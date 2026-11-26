@echo off
echo ===================================================
echo Installing WedSnap Photographer on Android...
echo ===================================================
cd /d "%~dp0android"
set "JAVA_HOME=C:\Program Files\Android\Android Studio1\jbr"
.\gradlew.bat assembleDebug
"C:\Users\shiva\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
echo.
echo WedSnap Photographer App installed successfully on your phone!
echo.
pause

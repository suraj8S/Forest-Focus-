@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Forest Focus Installer

set "APK_FILE=%~dp0Forest-Focus.apk"
set "ADB_EXE="

if not exist "%APK_FILE%" (
  echo Forest-Focus.apk was not found beside this installer.
  pause
  exit /b 1
)

for %%P in (
  "%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
  "%ANDROID_HOME%\platform-tools\adb.exe"
  "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
  "%USERPROFILE%\Android\platform-tools\adb.exe"
  "%USERPROFILE%\Android\Sdk\platform-tools\adb.exe"
) do if not defined ADB_EXE if exist "%%~P" set "ADB_EXE=%%~P"

if not defined ADB_EXE for /f "delims=" %%P in ('where adb.exe 2^>nul') do if not defined ADB_EXE set "ADB_EXE=%%P"

if not defined ADB_EXE (
  echo Android platform-tools were not found. You can still install the APK by copying it to your phone and opening it there.
  pause
  exit /b 1
)

echo Using Android tools: %ADB_EXE%
echo Connect your Android phone with USB debugging enabled, or start an emulator.
echo Waiting for an authorized device. Press Ctrl+C to cancel.
"%ADB_EXE%" start-server >nul 2>&1

:WAIT_DEVICE
set "DEVICE_ID="
for /f "skip=1 tokens=1,2" %%A in ('"%ADB_EXE%" devices') do (
  if "%%B"=="device" if not defined DEVICE_ID set "DEVICE_ID=%%A"
  if "%%B"=="unauthorized" echo Device %%A needs you to approve the USB debugging prompt on the phone.
)
if not defined DEVICE_ID (
  timeout /t 3 /nobreak >nul
  goto WAIT_DEVICE
)

echo Installing on %DEVICE_ID%...
"%ADB_EXE%" -s "%DEVICE_ID%" install -r "%APK_FILE%"
if errorlevel 1 (
  echo Installation failed. Unlock the phone and check that it allows this app to be installed.
  pause
  exit /b 1
)

"%ADB_EXE%" -s "%DEVICE_ID%" shell am start -n com.forest.focusapp/.MainActivity
if errorlevel 1 (
  echo The app installed, but Android could not launch it automatically.
  pause
  exit /b 1
)

echo Forest Focus is installed and running.
pause

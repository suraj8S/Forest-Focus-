# Forest Focus

An offline Android focus timer with a garden, tree unlocks, ambient sound, and a locally stored progress history. The interface is bundled with the app; it does not need an account or network connection.

## Install on Android

Use the included `Forest-Focus.apk` for direct installation. Copy it to an Android phone and open it, then allow installation from that source if Android asks. Or connect a phone with USB debugging enabled and run `install-app.bat` on Windows. The installer finds Android platform-tools from common SDK locations or `PATH`, installs the APK, and opens the app.

The included APK is a debug build for personal sideloading. It is not a Play Store release build and is not signed with a release key.

## Rebuild

Open the `android` folder in Android Studio and build the `app` debug variant. The project uses Android Gradle Plugin 8.3.2, compile SDK 34, and Java 17. The resulting APK is under `android/app/build/outputs/apk/debug/`.

## Review findings addressed

- The focus timer used elapsed interval ticks, which drift when Android pauses the WebView. It now uses a saved end time, so it stays accurate while backgrounded and resumes after the app is reopened.
- The Android app data was included in system backup. Backup is disabled because focus history and settings are stored locally.
- The app had an Internet permission despite using only bundled assets and local audio synthesis. The permission has been removed.
- The installer assumed one developer-specific Android SDK location. It now checks standard SDK environment variables, common Windows locations, and `PATH`.

## Known limitations

- This is a WebView-based prototype. Its timer can resume when the app is reopened, but it does not provide a background notification when a session finishes.
- Progress is stored on this device and is not synchronized or backed up.
- The app uses the Forest name and familiar focus-garden mechanics as a prototype; it is not affiliated with the Forest app publisher.

# Shadnox project

website/   -> the Render website (Publish Directory = website)
desktop/   -> Electron app for Windows, macOS and Linux
  build/   -> app icons + Windows setup artwork + macOS disk image artwork
android/   -> Android app (Kotlin): Private Screen overlay + App Shortcuts (custom name/icon)
.github/workflows/release.yml -> builds Windows, macOS, Linux and Android and publishes ONE release

Downloads (website links use "releases/latest"):
  PrivateScreen-Windows-Setup.exe, PrivateScreen-macOS-Universal.dmg,
  PrivateScreen-Linux.AppImage, PrivateScreen-Linux.deb, Shadnox-Android.apk

IMPORTANT: keep your existing desktop/scripts/ folder (wallpaper.ps1, lockscreen.ps1,
taskbar-color.ps1, taskbar-transparent.ps1). It is not part of this zip.

Android signing: android/app/shadnox.keystore signs every APK so new builds update old ones.
The passwords are in android/app/build.gradle.kts. Anyone with the repo could sign an app with
this key, which is fine for hobby sideloading but not for a store release.

iPhone: not included. iOS cannot draw over other apps, list installed apps, or install from a website.

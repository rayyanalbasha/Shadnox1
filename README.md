# Shadnox project

website/   -> the Render website (Publish Directory = website)
desktop/   -> Electron app for Windows, macOS and Linux
  build/   -> app icons + Windows setup artwork + macOS disk image artwork
android/   -> Android app (Kotlin): Private Screen overlay + App Shortcuts (custom name/icon)
.github/workflows/release.yml -> builds Windows, macOS, Linux and Android and publishes ONE release

Downloads (website links use "releases/latest"):
  Shadnox-Windows-Setup.exe, Shadnox-macOS-Universal.dmg,
  Shadnox-Linux.AppImage, Shadnox-Linux.deb, Shadnox-Android.apk

desktop/scripts/ (wallpaper.ps1, lockscreen.ps1, taskbar-color.ps1, taskbar-transparent.ps1)
is included in this zip.

If the Android download gives a 404: open GitHub -> Actions -> the latest run -> the "android" job.
The release is published even when Android fails, just without the APK.

Android signing: android/app/shadnox.keystore signs every APK so new builds update old ones.
The passwords are in android/app/build.gradle.kts. Anyone with the repo could sign an app with
this key, which is fine for hobby sideloading but not for a store release.

iPhone: not included. iOS cannot draw over other apps, list installed apps, or install from a website.

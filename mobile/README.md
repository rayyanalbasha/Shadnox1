# Shadnox Mobile — implementation notes

The mobile app is a separate native project from the Electron desktop app. This folder documents the required platform behavior so the desktop overlay is not incorrectly advertised as a phone feature.

## Required two-tab experience

1. **Private Screen** — show launchable apps where the OS permits it; let a user choose one, enter a shortcut name, pick an icon image, preview the result, and show **Confirm** only when the icon or name differs from the selected app's defaults.
2. **My shortcuts** — show shortcuts created by the user and let them remove them.

On Android, the intended implementation is a native Kotlin app using `PackageManager` to enumerate launchable activities and `ShortcutManager` / pinned shortcuts to request a home-screen shortcut with the chosen label and icon. Android launchers can vary in whether they accept or display pinned shortcuts exactly as requested. The shortcut should launch the selected app using its normal launch intent. App visibility must be declared with narrowly scoped `<queries>` entries or an appropriate launcher-app query policy; do not request broad package visibility without a legitimate need.

On iPhone, iOS does **not** provide a public API for an app to enumerate all installed third-party apps or create arbitrary home-screen icons that launch another app. The closest supported flow is to guide the user through Apple's Shortcuts app, where the user creates an “Open App” shortcut and adds it to the Home Screen; custom icon selection is performed by the user in Shortcuts. The app must not claim that it can silently install or directly create these aliases.

## Privacy and platform limits

- The desktop screen overlay is desktop-only and is not part of the mobile feature.
- A normal iOS or Android app cannot draw a universal privacy overlay over every other app without special OS-specific permissions/entitlements, and iOS does not permit a general-purpose system-wide overlay.
- The app should only create shortcuts at the user's explicit request and should clearly identify the target app before confirmation.
- Do not collect app lists, selected icons, or shortcut names remotely.

## Build status

This is a platform implementation specification, **not a compiled Android APK or iOS IPA**. Android requires a native Android Studio project and device testing; iOS requires Xcode on macOS and Apple signing for installation/distribution. The mobile app is not yet shipped from the website. Do not present it as downloadable until those platform builds exist.

## Android source quick start

Open `mobile/android/` in Android Studio (recent stable version with JDK 17). Let Gradle sync, connect an Android 8.0+ device or start an emulator, then run the `app` configuration. To build an APK, use **Build → Build Bundle(s) / APK(s) → Build APK(s)**. This source has not been compiled or device-tested in this delivery; check Gradle sync and test pinning on the launchers you support before publishing. A release APK must be signed before distribution.

The iOS side is intentionally documented rather than represented by a nonfunctional IPA: a real iOS build requires Xcode/macOS and a Shortcuts-guided workflow, not the Android app-enumeration API.

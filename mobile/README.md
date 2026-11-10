# Shadnox mobile builds

## Android
The GitHub Actions workflow builds `Shadnox-Android.apk` and attaches it to each published GitHub Release. It currently uses Android's debug signing for testing; do not treat this as a production-signed release. For a public production release, configure a private signing key in GitHub Actions secrets and build a signed release APK/AAB.

To build locally, open `mobile/android/` in Android Studio with JDK 17 and run the app, or use `gradle assembleDebug` from that directory after installing Android SDK components. The website's APK link works only after the workflow has completed successfully and a release asset exists.

## iPhone and iPad
The website is a Progressive Web App (PWA). On iOS, open the website in Safari, tap Share, then Add to Home Screen. This installs the website experience as a Home Screen web app. It is **not** a native iOS IPA and cannot enumerate all installed apps or create arbitrary aliases/overlays for other apps. A native iOS application requires Xcode on macOS and Apple-supported signing/distribution (such as TestFlight or the App Store). A website cannot silently install a native iPhone app.

## Private Screen limitations
The desktop overlay is not available on phones. Android restricts access to installed-app information and shortcut creation, and iOS does not provide an API for third-party apps to create arbitrary app aliases or overlay other apps. Do not describe the mobile app or PWA as having desktop-style overlay capabilities.

# Shadnox

- `website/` — static marketing/download website (Render publish directory: `website`).
- `desktop/` — Electron desktop app for Windows, macOS, and Linux.
- `mobile/` — mobile implementation notes and platform limitations.
- `.github/workflows/release.yml` — CI builds Windows, macOS, and Linux artifacts.

## Build desktop installers
Requires Node.js 22+. Run `cd desktop && npm install`, then one of:

- `npm run build:win` — Windows setup EXE (build on Windows or CI).
- `npm run build:mac` — universal macOS DMG (build on macOS or CI).
- `npm run build:linux` — Linux AppImage and Debian package.

The website's release links use the Shadnox artifact names. GitHub Actions creates the platform builds; signing/notarization credentials are not included.

## Mobile app status
See `mobile/README.md`. Android supports app shortcuts with launcher-dependent behavior; iOS does not allow third-party apps to enumerate all installed apps or create arbitrary home-screen aliases that launch other apps. The mobile UI should not claim to provide a system-wide overlay.


## Publishing downloads

The website links must exactly match the asset filenames attached to the latest GitHub Release. The release workflow publishes `PrivateScreen-Windows-Setup.exe`, `PrivateScreen-macOS-Universal.dmg`, Linux AppImage/DEB files, and `PrivateScreen-Android.apk`. After pushing changes, check the GitHub Actions workflow and confirm all assets appear in the latest release before testing website downloads. iPhone installation is the PWA instructions on the website, not a native IPA download.

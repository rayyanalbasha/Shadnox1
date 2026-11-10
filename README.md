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

# Private Screen

- `desktop/`  Electron app
- `website/`  static download site (deploy on Render, Root Directory = `website`)

Installers are built by GitHub Actions (`.github/workflows/release.yml`) and published
to GitHub Releases. The website download buttons link to the latest release.

Run it: GitHub repo -> Actions -> "Build installers and publish release" -> Run workflow.

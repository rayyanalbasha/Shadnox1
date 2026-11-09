# Shadnox project

website/   -> the Render website (index.html, about.html, style.css, script.js, icons)
desktop/   -> the Electron app (v1.2.0)
  build/   -> icon.ico / icon.png (app + installer icon), installerSidebar.bmp,
              installerHeader.bmp, uninstallerSidebar.bmp (Windows setup artwork),
              dmg-background.png (+@2x) (macOS disk image artwork)
.github/workflows/release.yml -> builds the Windows + macOS installers

IMPORTANT: your desktop/scripts/ folder (wallpaper.ps1, lockscreen.ps1,
taskbar-color.ps1, taskbar-transparent.ps1) is not in this zip. Keep your
existing desktop/scripts/ folder in the repo, the Windows build needs it.

Website on Render: Static Site, Publish Directory = website.

# Shadnox project

website/   -> the Render website (index.html, about.html, style.css, script.js, icons)
desktop/   -> the Electron app (main.js, renderer.js, package.json, build/ icons ...)
.github/workflows/release.yml -> builds the Windows + macOS installers

IMPORTANT: your desktop/scripts/ folder (wallpaper.ps1, lockscreen.ps1,
taskbar-color.ps1, taskbar-transparent.ps1) was not part of the files you sent,
so it is not in this zip. Keep your existing desktop/scripts/ folder in the repo.

Website: publish the website/ folder on Render (Static Site, publish directory = website).

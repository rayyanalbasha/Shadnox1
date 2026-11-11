"use strict";
// Wallpaper, lock screen and taskbar changes. Windows uses the PowerShell
// scripts in ./scripts, macOS supports the desktop wallpaper only.

const { execFile, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const isWin = process.platform === "win32";
const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".bmp"];

let dataDir = "";
let scriptsDir = "";
let tbProc = null;

function init(userDataDir) {
  dataDir = userDataDir;
  scriptsDir = path.join(userDataDir, "scripts");
  fs.mkdirSync(dataDir, { recursive: true });
  if (!isWin) return;
  // PowerShell cannot read inside the packaged app archive, so copy the scripts out.
  fs.mkdirSync(scriptsDir, { recursive: true });
  const from = path.join(__dirname, "scripts");
  for (const f of fs.readdirSync(from)) {
    fs.copyFileSync(path.join(from, f), path.join(scriptsDir, f));
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true, timeout: 90000 }, (err, stdout, stderr) => {
      if (!err) return resolve(stdout);
      const line = String(stderr || err.message)
        .split(/\r?\n/)
        .map(s => s.trim())
        .find(Boolean);
      reject(new Error(line || "Unknown error"));
    });
  });
}

const runPS = (file, args = []) =>
  run("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", path.join(scriptsDir, file), ...args
  ]);

// Runs a script as administrator (Windows shows its permission prompt).
function runElevated(file, extraArgs) {
  const q = s => `'"${String(s).replace(/'/g, "''")}"'`;
  const list = [
    "'-NoProfile'", "'-ExecutionPolicy'", "'Bypass'", "'-File'",
    q(path.join(scriptsDir, file)), ...extraArgs
  ].join(",");
  const cmd =
    "try { $p = Start-Process -FilePath powershell.exe -Verb RunAs -Wait -PassThru " +
    "-WindowStyle Hidden -ArgumentList " + list + "; " +
    "if ($p.ExitCode -ne 0) { [Console]::Error.WriteLine('Windows did not accept the change.'); exit 1 }; exit 0 } " +
    "catch { [Console]::Error.WriteLine('Permission was not granted.'); exit 1 }";
  return run("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-EncodedCommand",
    Buffer.from(cmd, "utf16le").toString("base64")
  ]);
}

function checkImage(src) {
  const ext = path.extname(String(src || "")).toLowerCase();
  if (!IMAGE_EXT.includes(ext) || !fs.existsSync(src)) {
    throw new Error("Choose a JPG, PNG or BMP image first.");
  }
  return ext;
}

function requireWin(what) {
  if (!isWin) throw new Error(what + " is only available on Windows.");
}

// ---- Desktop wallpaper ----
async function setDesktopWallpaper(src) {
  const ext = checkImage(src);
  // Keep our own copy so the wallpaper survives if the original file is moved.
  for (const f of fs.readdirSync(dataDir)) {
    if (f.startsWith("desktop-")) fs.rmSync(path.join(dataDir, f), { force: true });
  }
  const dest = path.join(dataDir, "desktop-" + Date.now() + ext);
  fs.copyFileSync(src, dest);

  if (isWin) return runPS("wallpaper.ps1", ["-Path", dest]);
  if (isMac) {
    if (/["\\]/.test(dest)) throw new Error("Unsupported characters in the app data path.");
    return run("osascript", [
      "-e",
      'tell application "System Events" to tell every desktop to set picture to POSIX file "' + dest + '"'
    ]);
  }
  if (isLinux) return setLinuxWallpaper(dest);
  throw new Error("Changing the wallpaper is not supported on this system.");
}

// Linux: try the common desktops in turn (GNOME/Cinnamon/MATE, KDE Plasma, XFCE, then feh).
async function setLinuxWallpaper(file) {
  const uri = "file://" + encodeURI(file);
  const tries = [
    async () => {
      await run("gsettings", ["set", "org.gnome.desktop.background", "picture-uri", uri]);
      try { await run("gsettings", ["set", "org.gnome.desktop.background", "picture-uri-dark", uri]); } catch (_) {}
      try { await run("gsettings", ["set", "org.gnome.desktop.background", "picture-options", "zoom"]); } catch (_) {}
    },
    () => run("plasma-apply-wallpaperimage", [file]),
    async () => {
      const list = await run("xfconf-query", ["-c", "xfce4-desktop", "-l"]);
      const props = list.split(/\r?\n/).filter(p => p.endsWith("/last-image"));
      if (!props.length) throw new Error("no xfce desktop");
      for (const p of props) await run("xfconf-query", ["-c", "xfce4-desktop", "-p", p, "-s", file]);
    },
    () => run("feh", ["--bg-fill", file])
  ];
  for (const attempt of tries) {
    try { await attempt(); return; } catch (_) { /* try the next desktop */ }
  }
  throw new Error("Could not change the wallpaper on this Linux desktop.");
}

// ---- Lock screen (Windows, needs administrator once) ----
async function setLockScreen(src) {
  requireWin("The lock screen wallpaper");
  const ext = checkImage(src);
  const stable = path.join(dataDir, "lock-source" + ext);
  fs.copyFileSync(src, stable);
  const q = s => `'"${String(s).replace(/'/g, "''")}"'`;
  return runElevated("lockscreen.ps1", ["'-Src'", q(stable)]);
}

async function resetLockScreen() {
  requireWin("The lock screen wallpaper");
  return runElevated("lockscreen.ps1", ["'-Remove'"]);
}

// ---- Taskbar (Windows) ----
const backupFile = () => path.join(dataDir, "taskbar-backup.json");

async function setTaskbarColor(hex) {
  requireWin("Taskbar colours");
  if (!/^#[0-9a-fA-F]{6}$/.test(String(hex))) throw new Error("Enter a colour like #7C6CFF.");
  return runPS("taskbar-color.ps1", ["-Hex", hex.slice(1), "-BackupFile", backupFile()]);
}

function startTransparent() {
  if (!isWin || tbProc) return;
  tbProc = spawn("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden",
    "-File", path.join(scriptsDir, "taskbar-transparent.ps1"),
    "-Mode", "loop", "-ParentPid", String(process.pid)
  ], { windowsHide: true, stdio: "ignore" });
  tbProc.on("exit", () => { tbProc = null; });
  tbProc.on("error", () => { tbProc = null; });
}

async function stopTransparent() {
  if (!isWin) return;
  if (tbProc) { tbProc.kill(); tbProc = null; }
  try { await runPS("taskbar-transparent.ps1", ["-Mode", "off"]); } catch (_) {}
}

async function resetTaskbar() {
  requireWin("The taskbar");
  await stopTransparent();
  return runPS("taskbar-color.ps1", ["-BackupFile", backupFile(), "-Restore"]);
}

module.exports = {
  init, setDesktopWallpaper, setLockScreen, resetLockScreen,
  setTaskbarColor, resetTaskbar, startTransparent, stopTransparent
};

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  ipcMain,
  screen,
  dialog
} = require("electron");

const path = require("path");
const fs = require("fs");
const customize = require("./customize");

let mainWindow = null;
let tray = null;
const overlayWindows = new Map();

let overlayEnabled = false;
let strength = 45;

const isMac = process.platform === "darwin";
const DEFAULT_HOTKEY = "CommandOrControl+Shift+P";
let hotkey = DEFAULT_HOTKEY;
let runInBackground = true;

// Customization settings
let taskbarColor = "#7c6cff";
let taskbarColorApplied = false;
let taskbarTransparent = false;
let startWithWindows = false;
let desktopWallpaperName = "";
let lockScreenSet = false;
const startHidden = process.argv.includes("--hidden");
const picked = {}; // image paths chosen in the file dialog, by purpose

// Only allow one copy of the app. A second launch just opens the existing window,
// so you can always turn the overlay off from the running instance.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (app.isReady()) createMainWindow();
  });
}

function settingsFile() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadSettings() {
  try {
    const data = JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
    if (typeof data.hotkey === "string" && data.hotkey.length < 80) hotkey = data.hotkey;
    if (typeof data.runInBackground === "boolean") runInBackground = data.runInBackground;
    const saved = Number(data.strength);
    if (Number.isFinite(saved)) strength = Math.max(0, Math.min(90, Math.round(saved)));
    if (typeof data.taskbarColor === "string" && /^#[0-9a-fA-F]{6}$/.test(data.taskbarColor)) taskbarColor = data.taskbarColor;
    if (typeof data.taskbarColorApplied === "boolean") taskbarColorApplied = data.taskbarColorApplied;
    if (typeof data.taskbarTransparent === "boolean") taskbarTransparent = data.taskbarTransparent;
    if (typeof data.startWithWindows === "boolean") startWithWindows = data.startWithWindows;
    if (typeof data.desktopWallpaperName === "string") desktopWallpaperName = data.desktopWallpaperName.slice(0, 120);
    if (typeof data.lockScreenSet === "boolean") lockScreenSet = data.lockScreenSet;
  } catch (_) {
    // first run or unreadable file: use defaults
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify({
      hotkey, strength, runInBackground,
      taskbarColor, taskbarColorApplied, taskbarTransparent, startWithWindows,
      desktopWallpaperName, lockScreenSet
    }));
  } catch (_) {}
}

function currentState() {
  return {
    enabled: overlayEnabled, strength, hotkey, runInBackground,
    platform: process.platform,
    taskbarColor, taskbarColorApplied, taskbarTransparent, startWithWindows,
    desktopWallpaperName, lockScreenSet
  };
}

function broadcastState() {
  const state = currentState();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("state-changed", state);
  }

  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.webContents.send("overlay-update", state);
    }
  }
}

function updateOverlayWindows() {
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      if (overlayEnabled) {
        win.showInactive();
      } else {
        win.hide();
      }
    }
  }

  broadcastState();
}

function toggleOverlay() {
  overlayEnabled = !overlayEnabled;
  updateOverlayWindows();
}

function createOverlay(display) {
  const existing = overlayWindows.get(display.id);
  if (existing && !existing.isDestroyed()) {
    existing.setBounds(display.bounds);
    return;
  }

  const overlay = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    focusable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  overlay.setMenuBarVisibility(false);
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.setIgnoreMouseEvents(true);

  overlayWindows.set(display.id, overlay);

  overlay.loadFile(path.join(__dirname, "overlay.html")).then(() => {
    overlay.webContents.send("overlay-update", {
      enabled: overlayEnabled,
      strength
    });

    if (overlayEnabled) overlay.showInactive();
  });

  overlay.on("closed", () => {
    overlayWindows.delete(display.id);
  });
}

function syncDisplays() {
  const displays = screen.getAllDisplays();
  const activeIds = new Set(displays.map(display => display.id));

  for (const [id, win] of overlayWindows.entries()) {
    if (!activeIds.has(id)) {
      if (!win.isDestroyed()) win.close();
      overlayWindows.delete(id);
    }
  }

  for (const display of displays) {
    createOverlay(display);
  }

  updateOverlayWindows();
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1040,
    height: 780,
    minWidth: 420,
    minHeight: 600,
    title: "Shadnox",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: "#090b12",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.once("ready-to-show", () => {
    if (!startHidden) mainWindow.show();
    broadcastState();
  });

  mainWindow.on("close", event => {
    if (app.isQuitting) return;

    if (runInBackground) {
      // Keep running in the system tray.
      event.preventDefault();
      mainWindow.hide();
    } else {
      // Fully quit (this also removes the overlay).
      app.isQuitting = true;
      app.quit();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
}

function createTray() {
  if (tray) return;

  const icon = nativeImage.createFromPath(path.join(__dirname, "tray.png"));

  tray = new Tray(icon);
  tray.setToolTip("Shadnox");

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Open Shadnox",
      click: () => createMainWindow()
    },
    {
      label: "Turn overlay on/off",
      click: () => toggleOverlay()
    },
    { type: "separator" },
    {
      label: "Quit Shadnox",
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]));

  tray.on("double-click", () => createMainWindow());
}

function registerHotkey() {
  globalShortcut.unregisterAll();
  try {
    return globalShortcut.register(hotkey, toggleOverlay);
  } catch (_) {
    return false;
  }
}

ipcMain.handle("get-state", () => currentState());

ipcMain.handle("toggle-overlay", () => {
  toggleOverlay();
  return currentState();
});

ipcMain.handle("set-strength", (_event, value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return currentState();

  strength = Math.max(0, Math.min(90, Math.round(numericValue)));
  saveSettings();
  broadcastState();
  return currentState();
});

ipcMain.handle("set-hotkey", (_event, accelerator) => {
  if (typeof accelerator !== "string" || accelerator.length > 80) {
    return { ...currentState(), error: "Invalid shortcut" };
  }

  const previous = hotkey;
  hotkey = accelerator;

  if (!registerHotkey()) {
    hotkey = previous;
    registerHotkey();
    return { ...currentState(), error: "That shortcut is not available. Try another." };
  }

  saveSettings();
  broadcastState();
  return currentState();
});

ipcMain.handle("reset-hotkey", () => {
  hotkey = DEFAULT_HOTKEY;
  registerHotkey();
  saveSettings();
  broadcastState();
  return currentState();
});

// Pause the global shortcut while the user is recording a new one.
ipcMain.handle("hotkey-recording", (_event, recording) => {
  if (recording) {
    globalShortcut.unregisterAll();
  } else {
    registerHotkey();
  }
});

ipcMain.handle("set-background", (_event, value) => {
  runInBackground = Boolean(value);
  saveSettings();
  broadcastState();
  return currentState();
});

ipcMain.handle("show-main", () => {
  createMainWindow();
});

ipcMain.handle("quit-app", () => {
  app.isQuitting = true;
  app.quit();
});

// ---- Customization ----
async function guarded(work) {
  try {
    await work();
    return { ...currentState(), ok: true };
  } catch (err) {
    return { ...currentState(), error: (err && err.message) || "Something went wrong." };
  }
}

ipcMain.handle("pick-image", async (_event, purpose) => {
  if (purpose !== "desktop" && purpose !== "lock") return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose an image",
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "bmp"] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const file = result.filePaths[0];
  const image = nativeImage.createFromPath(file);
  if (image.isEmpty()) {
    delete picked[purpose];
    return { error: "That file could not be read as an image." };
  }
  picked[purpose] = file;
  return { name: path.basename(file), preview: image.resize({ width: 480 }).toDataURL() };
});

ipcMain.handle("apply-desktop-wallpaper", () => guarded(async () => {
  if (!picked.desktop) throw new Error("Choose an image first.");
  await customize.setDesktopWallpaper(picked.desktop);
  desktopWallpaperName = path.basename(picked.desktop);
  saveSettings();
}));

ipcMain.handle("apply-lockscreen", () => guarded(async () => {
  if (!picked.lock) throw new Error("Choose an image first.");
  await customize.setLockScreen(picked.lock);
  lockScreenSet = true;
  saveSettings();
}));

ipcMain.handle("reset-lockscreen", () => guarded(async () => {
  await customize.resetLockScreen();
  lockScreenSet = false;
  saveSettings();
}));

ipcMain.handle("apply-taskbar-color", (_event, hex) => guarded(async () => {
  await customize.setTaskbarColor(hex);
  taskbarColor = String(hex).toLowerCase();
  taskbarColorApplied = true;
  saveSettings();
}));

ipcMain.handle("reset-taskbar", () => guarded(async () => {
  await customize.resetTaskbar();
  taskbarColorApplied = false;
  taskbarTransparent = false;
  saveSettings();
}));

ipcMain.handle("set-taskbar-transparent", (_event, value) => guarded(async () => {
  if (process.platform !== "win32") throw new Error("The taskbar is only available on Windows.");
  taskbarTransparent = Boolean(value);
  if (taskbarTransparent) customize.startTransparent();
  else await customize.stopTransparent();
  saveSettings();
}));

ipcMain.handle("set-start-with-windows", (_event, value) => guarded(async () => {
  startWithWindows = Boolean(value);
  app.setLoginItemSettings({ openAtLogin: startWithWindows, args: ["--hidden"] });
  saveSettings();
}));

app.whenReady().then(() => {
  if (!gotLock) return;
  loadSettings();
  customize.init(app.getPath("userData"));
  if (taskbarTransparent) customize.startTransparent();
  createMainWindow();
  syncDisplays();
  createTray();
  registerHotkey();

  screen.on("display-added", syncDisplays);
  screen.on("display-removed", syncDisplays);
  screen.on("display-metrics-changed", syncDisplays);

  app.on("activate", () => createMainWindow());
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", event => {
  // Keep the app running in the tray until the user chooses Quit.
});

app.on("before-quit", () => {
  app.isQuitting = true;

  // Make sure every overlay window is removed when the app quits.
  for (const win of overlayWindows.values()) {
    if (!win.isDestroyed()) {
      win.setClosable(true);
      win.destroy();
    }
  }
  overlayWindows.clear();
});
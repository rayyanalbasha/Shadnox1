const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  ipcMain,
  screen
} = require("electron");

const path = require("path");
const fs = require("fs");

let mainWindow = null;
let tray = null;
const overlayWindows = new Map();

let overlayEnabled = false;
let strength = 45;

const isMac = process.platform === "darwin";
const DEFAULT_HOTKEY = "CommandOrControl+Shift+P";
let hotkey = DEFAULT_HOTKEY;
let runInBackground = true;

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
  } catch (_) {
    // first run or unreadable file: use defaults
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify({ hotkey, strength, runInBackground }));
  } catch (_) {}
}

function currentState() {
  return { enabled: overlayEnabled, strength, hotkey, runInBackground };
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
    width: 470,
    height: 690,
    minWidth: 390,
    minHeight: 590,
    title: "Private Screen",
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
    mainWindow.show();
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
  tray.setToolTip("Private Screen");

  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "Open Private Screen",
      click: () => createMainWindow()
    },
    {
      label: "Turn overlay on/off",
      click: () => toggleOverlay()
    },
    { type: "separator" },
    {
      label: "Quit Private Screen",
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

app.whenReady().then(() => {
  if (!gotLock) return;
  loadSettings();
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

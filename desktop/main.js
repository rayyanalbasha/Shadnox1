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

let mainWindow = null;
let tray = null;
const overlayWindows = new Map();

let overlayEnabled = false;
let strength = 45;

const isMac = process.platform === "darwin";

function broadcastState() {
  const state = { enabled: overlayEnabled, strength };

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
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
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

function registerHotkeys() {
  // Windows/Linux: Ctrl+Shift+P. macOS: Cmd+Shift+P.
  globalShortcut.register("CommandOrControl+Shift+P", toggleOverlay);

  // Also support Control+Shift+P on macOS.
  if (isMac) {
    globalShortcut.register("Control+Shift+P", toggleOverlay);
  }
}

ipcMain.handle("get-state", () => ({
  enabled: overlayEnabled,
  strength
}));

ipcMain.handle("toggle-overlay", () => {
  toggleOverlay();
  return { enabled: overlayEnabled, strength };
});

ipcMain.handle("set-strength", (_event, value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return { enabled: overlayEnabled, strength };

  strength = Math.max(0, Math.min(90, Math.round(numericValue)));
  broadcastState();
  return { enabled: overlayEnabled, strength };
});

ipcMain.handle("show-main", () => {
  createMainWindow();
});

ipcMain.handle("quit-app", () => {
  app.isQuitting = true;
  app.quit();
});

app.whenReady().then(() => {
  createMainWindow();
  syncDisplays();
  createTray();
  registerHotkeys();

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
});

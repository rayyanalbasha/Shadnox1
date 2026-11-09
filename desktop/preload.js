const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("privateScreen", {
  getState: () => ipcRenderer.invoke("get-state"),
  toggleOverlay: () => ipcRenderer.invoke("toggle-overlay"),
  setStrength: value => ipcRenderer.invoke("set-strength", value),
  setHotkey: accelerator => ipcRenderer.invoke("set-hotkey", accelerator),
  setBackground: value => ipcRenderer.invoke("set-background", value),
  resetHotkey: () => ipcRenderer.invoke("reset-hotkey"),
  hotkeyRecording: recording => ipcRenderer.invoke("hotkey-recording", recording),
  showMain: () => ipcRenderer.invoke("show-main"),
  quitApp: () => ipcRenderer.invoke("quit-app"),

  pickImage: purpose => ipcRenderer.invoke("pick-image", purpose),
  applyDesktopWallpaper: () => ipcRenderer.invoke("apply-desktop-wallpaper"),
  applyLockScreen: () => ipcRenderer.invoke("apply-lockscreen"),
  resetLockScreen: () => ipcRenderer.invoke("reset-lockscreen"),
  applyTaskbarColor: hex => ipcRenderer.invoke("apply-taskbar-color", hex),
  resetTaskbar: () => ipcRenderer.invoke("reset-taskbar"),
  setTaskbarTransparent: value => ipcRenderer.invoke("set-taskbar-transparent", value),
  setStartWithWindows: value => ipcRenderer.invoke("set-start-with-windows", value),

  onStateChanged: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("state-changed", listener);
    return () => ipcRenderer.removeListener("state-changed", listener);
  },

  onOverlayUpdate: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("overlay-update", listener);
    return () => ipcRenderer.removeListener("overlay-update", listener);
  }
});

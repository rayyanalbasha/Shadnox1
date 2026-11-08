const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("privateScreen", {
  getState: () => ipcRenderer.invoke("get-state"),
  toggleOverlay: () => ipcRenderer.invoke("toggle-overlay"),
  setStrength: value => ipcRenderer.invoke("set-strength", value),
  showMain: () => ipcRenderer.invoke("show-main"),
  quitApp: () => ipcRenderer.invoke("quit-app"),

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

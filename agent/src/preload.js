const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mydex", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  login: (credentials) => ipcRenderer.invoke("login", credentials),
  disconnect: () => ipcRenderer.invoke("disconnect"),
  getStatus: () => ipcRenderer.invoke("get-status"),
});

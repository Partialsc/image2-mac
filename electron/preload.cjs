const { contextBridge, ipcRenderer } = require('electron')

// 渲染进程无法直接删除 profile 里的 IndexedDB 目录(句柄由主进程持有),
// 修复动作统一走 IPC 由主进程在重启后清理。
contextBridge.exposeInMainWorld('electronAPI', {
  repairIndexedDB: () => ipcRenderer.invoke('storage:repair-indexed-db'),
})

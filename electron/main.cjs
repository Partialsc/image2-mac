const { app, BrowserWindow, shell, ipcMain } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

let mainWindow

// 单实例锁:第二个实例的 IndexedDB 会因 LevelDB 锁被占用而整体报
// "Internal error opening backing store"(上传图片/历史记录全挂),
// 便携版解压慢导致双击两次极易触发,必须禁止双开。
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  function openExternalUrl(url) {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 960,
      minHeight: 640,
      backgroundColor: '#111827',
      ...(process.platform === 'darwin' ? {} : { icon: path.join(__dirname, '..', 'build', 'icon.ico') }),
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, 'preload.cjs'),
      },
    })

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      openExternalUrl(url)
      return { action: 'deny' }
    })

    mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url.startsWith('file:')) return
      event.preventDefault()
      openExternalUrl(url)
    })

    mainWindow.on('closed', () => {
      mainWindow = null
    })

    void mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // IndexedDB 损坏自愈:渲染进程确认修复后写入标记文件并重启应用,
  // 新进程在打开任何页面前删除损坏的 IndexedDB 目录(此时句柄已全部释放)。
  // 历史任务与本地图片会清空,API 配置存于 localStorage 不受影响。
  function getRepairFlagPath() {
    return path.join(app.getPath('userData'), 'repair-indexed-db.flag')
  }

  ipcMain.handle('storage:repair-indexed-db', () => {
    try {
      fs.writeFileSync(getRepairFlagPath(), String(Date.now()))
      // 便携版:process.execPath 指向临时解包目录,壳进程退出时会清理该目录,
      // 直接 relaunch 会闪退;须重启原始 EXE(PORTABLE_EXECUTABLE_FILE)。
      const portableExe = process.env.PORTABLE_EXECUTABLE_FILE
      if (portableExe && fs.existsSync(portableExe)) {
        app.relaunch({ execPath: portableExe })
      } else {
        app.relaunch()
      }
      app.exit(0)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  app.whenReady().then(() => {
    try {
      if (fs.existsSync(getRepairFlagPath())) {
        fs.rmSync(path.join(app.getPath('userData'), 'IndexedDB'), { recursive: true, force: true })
        fs.rmSync(getRepairFlagPath(), { force: true })
      }
    } catch (err) {
      console.error('IndexedDB repair failed:', err)
    }

    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

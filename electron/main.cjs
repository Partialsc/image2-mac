const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

let mainWindow

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

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

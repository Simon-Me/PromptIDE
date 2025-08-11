import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main.js    > Electron-Main
// │ └─┬ preload.js > Preload-Scripts
// ├─┬ dist
// │ └── index.html  > Electron-Renderer
//
process.env.DIST_ELECTRON = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let mainWindow = null
const preload = path.join(__dirname, 'preload.js')
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173'
const indexHtml = path.join(process.env.DIST || path.join(__dirname, '../dist'), 'index.html')

// Check if we're in development mode
function isDevelopment() {
  return process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || !app.isPackaged || process.env.VITE_DEV_SERVER_URL
}

// Data directory for storing user data
const userDataPath = path.join(app.getPath('userData'), 'prompt-ide-data')

// Ensure data directory exists
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true })
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Prompt IDE',
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // Mac-style title bar
    trafficLightPosition: { x: 20, y: 20 },
    backgroundColor: '#0f172a', // Dark slate background
    vibrancy: 'under-window', // Mac vibrancy effect
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow loading local files
      allowRunningInsecureContent: true,
    },
  })

  // Load the app
  if (isDevelopment()) {
    // Development - load from Vite dev server
    console.log('Development mode: Loading Vite dev server at', devServerUrl)
    console.log('Environment variables:', { NODE_ENV: process.env.NODE_ENV, VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL })
    console.log('App is packaged:', app.isPackaged)
    
    try {
      await mainWindow.loadURL(devServerUrl)
      console.log('Successfully loaded dev server')
    } catch (error) {
      console.error('Failed to load dev server:', error)
      // Fallback to production mode
      console.log('Falling back to production mode')
      await mainWindow.loadFile(indexHtml)
    }
    
    // Open devtools in development
    mainWindow.webContents.openDevTools()
  } else {
    // Production - load built files
    console.log('Production mode: Loading built files from', indexHtml)
    await mainWindow.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto-updater events
  mainWindow.webContents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })

  // Set up menu
  createMenu()
}

function createMenu() {
  const template = [
    {
      label: 'Prompt IDE',
      submenu: [
        {
          label: 'About Prompt IDE',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Prompt IDE',
              message: 'Prompt IDE',
              detail: 'A powerful prompt development environment for Mac\nVersion 1.0.0',
              buttons: ['OK']
            })
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('open-preferences')
          }
        },
        { type: 'separator' },
        {
          label: 'Hide Prompt IDE',
          accelerator: 'Command+H',
          role: 'hide'
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers'
        },
        {
          label: 'Show All',
          role: 'unhide'
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Prompt',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-prompt')
          }
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('open-file')
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('save-file')
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('save-file-as')
          }
        },
        { type: 'separator' },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.webContents.send('close-tab')
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            mainWindow.webContents.send('toggle-sidebar')
          }
        },
        {
          label: 'Toggle Properties Panel',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow.webContents.send('toggle-properties')
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload()
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            mainWindow.webContents.reloadIgnoringCache()
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools()
          }
        },
        { type: 'separator' },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          role: 'resetzoom'
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          role: 'zoomin'
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          role: 'zoomout'
        },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Prompt IDE',
              message: 'Prompt IDE',
              detail: 'A powerful prompt development environment for Mac',
              buttons: ['OK']
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// IPC handlers for data persistence
ipcMain.handle('save-data', async (event, key, data) => {
  try {
    const filePath = path.join(userDataPath, `${key}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return { success: true }
  } catch (error) {
    console.error('Error saving data:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('load-data', async (event, key) => {
  try {
    const filePath = path.join(userDataPath, `${key}.json`)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8')
      return { success: true, data: JSON.parse(data) }
    }
    return { success: true, data: null }
  } catch (error) {
    console.error('Error loading data:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('delete-data', async (event, key) => {
  try {
    const filePath = path.join(userDataPath, `${key}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    return { success: true }
  } catch (error) {
    console.error('Error deleting data:', error)
    return { success: false, error: error.message }
  }
})

// App event handlers
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
}) 
const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Data persistence methods
  saveData: (key, data) => ipcRenderer.invoke('save-data', key, data),
  loadData: (key) => ipcRenderer.invoke('load-data', key),
  deleteData: (key) => ipcRenderer.invoke('delete-data', key),
  
  // Menu shortcuts listeners
  onMenuAction: (callback) => {
    const actionHandlers = {
      'new-prompt': () => callback('new-prompt'),
      'open-file': () => callback('open-file'),
      'save-file': () => callback('save-file'),
      'save-file-as': () => callback('save-file-as'),
      'close-tab': () => callback('close-tab'),
      'toggle-sidebar': () => callback('toggle-sidebar'),
      'toggle-properties': () => callback('toggle-properties'),
      'open-preferences': () => callback('open-preferences'),
    }
    
    Object.keys(actionHandlers).forEach(action => {
      ipcRenderer.on(action, actionHandlers[action])
    })
    
    // Return cleanup function
    return () => {
      Object.keys(actionHandlers).forEach(action => {
        ipcRenderer.removeAllListeners(action)
      })
    }
  },
  
  // Platform info
  platform: process.platform,
  
  // App version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Theme detection
  isDarkMode: () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  },
  
  // Listen for theme changes
  onThemeChange: (callback) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      callback(e.matches)
    })
    
    return () => {
      mediaQuery.removeEventListener('change', callback)
    }
  }
})

// Remove menu bar for cleaner look on Windows/Linux
if (process.platform !== 'darwin') {
  window.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style')
    style.textContent = `
      .menubar {
        display: none !important;
      }
      
      .titlebar {
        -webkit-app-region: drag;
        height: 32px;
        background: #1e293b;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        padding: 0 16px;
        color: #e2e8f0;
        font-size: 14px;
        font-weight: 500;
      }
      
      .titlebar-buttons {
        -webkit-app-region: no-drag;
        margin-left: auto;
        display: flex;
        gap: 8px;
      }
      
      .titlebar-button {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        cursor: pointer;
      }
      
      .titlebar-button.close {
        background: #ef4444;
      }
      
      .titlebar-button.minimize {
        background: #f59e0b;
      }
      
      .titlebar-button.maximize {
        background: #10b981;
      }
    `
    document.head.appendChild(style)
  })
} 
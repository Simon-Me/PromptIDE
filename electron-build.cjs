const fs = require('fs')
const path = require('path')

// Build preload script
const preloadSource = fs.readFileSync(path.join(__dirname, 'electron/preload.js'), 'utf8')
const preloadConverted = preloadSource.replace(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g, 'const {$1} = require(\'$2\')')

// Ensure dist-electron directory exists
const distElectron = path.join(__dirname, 'dist-electron')
if (!fs.existsSync(distElectron)) {
  fs.mkdirSync(distElectron, { recursive: true })
}

// Write converted preload script
fs.writeFileSync(path.join(distElectron, 'preload.js'), preloadConverted)

// Copy main.js
fs.copyFileSync(path.join(__dirname, 'electron/main.js'), path.join(distElectron, 'main.js'))

console.log('Electron files built successfully!') 
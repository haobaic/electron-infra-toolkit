const { app, BrowserWindow, ipcMain } = require('electron')
const { WindowManager, WindowBridge } = require('../../dist') // Assuming dist is built

// Mocking the library if running from source directly without build might require ts-node
// But for standard example usage, we assume the user imports from the package

const windowManager = new WindowManager()
const bridge = WindowBridge.getInstance()

app.whenReady().then(() => {
  // Create Main Window
  const mainId = windowManager.create({
    name: 'main',
    title: 'Main Window - Controller',
    defaultConfig: {
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    }
  })

  // Create Second Window
  const secondId = windowManager.create({
    name: 'receiver',
    title: 'Second Window - Receiver',
    defaultConfig: {
      width: 600,
      height: 400,
      x: 100,
      y: 100,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      }
    }
  })

  // Load content
  const mainWin = windowManager.getMainWindow()
  if (mainWin) {
    mainWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html>
        <body>
          <h1>Main Window</h1>
          <button onclick="updateTheme()">Set Theme to Dark</button>
          <button onclick="resetTheme()">Reset Theme</button>
          <script>
            const { ipcRenderer } = require('electron')
            
            // Listen for port
            window.onmessage = (event) => {
              if (event.data === 'window-bridge-port') {
                const port = event.ports[0]
                window.bridgePort = port
                port.onmessage = (e) => {
                  console.log('Main received update:', JSON.parse(e.data))
                }
              }
            }

            function updateTheme() {
              // In a real app, you might send IPC to main to set data via WindowBridge
              // Or if WindowBridge supported direct renderer access (via context bridge), call it there.
              // Here we simulate via IPC for the example if direct port usage isn't fully wrapped yet.
              ipcRenderer.send('set-data', { key: 'theme', value: 'dark' })
            }
            
            function resetTheme() {
               ipcRenderer.send('set-data', { key: 'theme', value: 'light' })
            }
          </script>
        </body>
      </html>
    `))
  }

  const secondWin = windowManager.getWindowById(secondId)
  if (secondWin) {
    secondWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <html>
        <body>
          <h1>Receiver Window</h1>
          <div id="status">Current Theme: unknown</div>
          <script>
            window.onmessage = (event) => {
              if (event.data === 'window-bridge-port') {
                const port = event.ports[0]
                port.onmessage = (e) => {
                  const msg = JSON.parse(e.data)
                  if (msg.type === 'set' && msg.key === 'theme') {
                    document.getElementById('status').innerText = 'Current Theme: ' + msg.value
                    document.body.style.backgroundColor = msg.value === 'dark' ? '#333' : '#fff'
                    document.body.style.color = msg.value === 'dark' ? '#fff' : '#000'
                  }
                }
              }
            }
          </script>
        </body>
      </html>
    `))
  }

  // IPC handlers to demo Main Process usage of WindowBridge
  ipcMain.on('set-data', (event, { key, value }) => {
    console.log(`Setting ${key} to ${value}`)
    bridge.setData(key, value)
  })
})

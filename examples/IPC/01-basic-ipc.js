const { app, ipcRenderer } = require('electron')
const { WindowManager, WindowStore, IPC } = require('../../dist/index.umd.js')

// =============================================================================
// 示例: IPC 模块基础使用
// 注意：本示例依赖于 index.ts 中导出 IPC 模块。
// 请确保 src/index.ts 中包含: export { default as IPC } from './IPC'
// =============================================================================
// 模块: IPC
// 功能:
// 1. 使用 IPC.on 注册事件监听
// 2. 使用 IPC.handle 注册 invoke 处理
// 3. 自动日志记录 (IPC 模块内置功能)
// =============================================================================

const windowManager = new WindowManager()

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <title>IPC 模块示例</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #f5f5f5; }
    .box { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }
    button { padding: 8px 16px; cursor: pointer; }
    #logs { background: #333; color: #0f0; padding: 10px; height: 200px; overflow-y: auto; font-family: monospace; }
  </style>
</head>
<body>
  <div class="box">
    <h2>IPC 通信测试</h2>
    <button onclick="testInvoke()">测试 IPC.handle (Invoke)</button>
    <button onclick="testSend()">测试 IPC.on (Send)</button>
  </div>
  
  <div class="box">
    <h3>渲染进程日志：</h3>
    <div id="logs"></div>
  </div>

  <script>
    const { ipcRenderer } = require('electron')
    
    function log(msg) {
      const el = document.getElementById('logs')
      el.innerHTML += \`<div>[\${new Date().toLocaleTimeString()}] \${msg}</div>\`
      el.scrollTop = el.scrollHeight
    }

    async function testInvoke() {
      try {
        log('调用 ipcRenderer.invoke("test-invoke", { name: "demo" })...')
        const result = await ipcRenderer.invoke('test-invoke', { name: 'demo', value: 123 })
        log(\`收到结果: \${JSON.stringify(result)}\`)
      } catch (err) {
        log(\`错误: \${err.message}\`)
      }
    }

    function testSend() {
      log('发送 ipcRenderer.send("test-event", { name: "event-demo" })...')
      ipcRenderer.send('test-event', { name: 'event-demo', timestamp: Date.now() })
    }
    
    ipcRenderer.on('test-reply', (e, data) => {
      log(\`收到主进程回复: \${data}\`)
    })
  </script>
</body>
</html>
`

app.whenReady().then(() => {
  // 1. 注册 IPC 处理器 (使用 IPC 模块)

  // handle 示例
  // 注意：IPC 模块会自动记录日志
  IPC.handle('test-invoke', (event, data) => {
    console.log('[Main] 处理 invoke:', data)
    return { success: true, received: data, serverTime: Date.now() }
  })

  // on 示例
  IPC.on('test-event', (event, data) => {
    console.log('[Main] 收到 event:', data)
    // 回复渲染进程
    event.sender.send('test-reply', '主进程已收到消息')
  })

  // 2. 创建窗口
  const windowId = windowManager.create({
    name: 'ipc-demo',
    title: 'IPC 模块示例',
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  const win = WindowStore.get(windowId)
  if (win) {
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(HTML_CONTENT)}`)
    // 打开开发者工具以便查看 Console
    // win.webContents.openDevTools()
  }

  console.log('IPC 示例已启动。请查看控制台日志以观察 IPC 模块的自动日志输出。')
})

app.on('window-all-closed', () => {
  app.quit()
})

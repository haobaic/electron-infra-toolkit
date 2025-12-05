const { app, ipcMain } = require('electron')
const { WindowManager, WindowStore } = require('../../dist/index.umd.js')

// =============================================================================
// 示例 2: 窗口间通信 (IPC)
// 模块: WindowManager + WindowEvents
// 功能:
// 1. 创建发送方窗口 (Sender)
// 2. 创建接收方窗口 (Receiver)
// 3. 使用 windowManager.send() 进行点对点通信
// =============================================================================

const windowManager = new WindowManager()

// 发送方窗口 HTML
const SENDER_HTML = `
<!DOCTYPE html>
<body style="background:#e3f2fd; padding:20px; font-family:sans-serif;">
  <h2>📤 发送方窗口</h2>
  <input type="text" id="msgInput" value="Hello World!" style="padding:5px;">
  <button onclick="sendMsg()">发送消息给接收方</button>
  <script>
    const { ipcRenderer } = require('electron')
    function sendMsg() {
      const text = document.getElementById('msgInput').value
      // 使用 WindowManager 统一的 IPC 通道 'renderer-to-main'
      // 数据格式必须包含 name 字段，对应主进程注册的 handler name
      ipcRenderer.invoke('renderer-to-main', { name: 'send-to-receiver', text })
    }
  </script>
</body>
`

// 接收方窗口 HTML
const RECEIVER_HTML = `
<!DOCTYPE html>
<body style="background:#e8f5e9; padding:20px; font-family:sans-serif;">
  <h2>📥 接收方窗口</h2>
  <div id="log" style="border:1px solid #ccc; background:white; padding:10px; min-height:100px;">
    等待消息...
  </div>
  <script>
    const { ipcRenderer } = require('electron')
    // 监听来自主进程转发的消息
    ipcRenderer.on('custom-event', (e, data) => {
      const log = document.getElementById('log')
      log.innerHTML += \`<p style="color:green">[\${new Date().toLocaleTimeString()}] 收到: <b>\${data.text}</b></p>\`
    })
  </script>
</body>
`

app.whenReady().then(() => {
  // 1. 创建接收方
  const receiverId = windowManager.create({
    name: 'receiver',
    isDevelopment: !app.isPackaged,
    defaultConfig: {
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    },
    title: '接收方',
    x: 100, y: 100, width: 400, height: 400
  })
  WindowStore.get(receiverId).loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(RECEIVER_HTML)}`)

  // 2. 创建发送方
  const senderId = windowManager.create({
    name: 'sender',
    title: '发送方',
    x: 520, y: 100, width: 400, height: 400
  })
  WindowStore.get(senderId).loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SENDER_HTML)}`)

  // 3. 处理 IPC 转发逻辑
  // 使用 windowManager.ipcBridge 注册处理器，而不是直接使用 ipcMain
  windowManager.ipcBridge.addHandler({
    name: 'send-to-receiver',
    callback: (api, data) => {
      const { text } = data
      console.log(`[Main] 转发消息: ${text}`)

      // 核心 API: windowManager.send(windowId, channel, ...args)
      windowManager.send(receiverId, 'custom-event', { text, from: 'sender' })
      
      return { success: true }
    }
  })
})

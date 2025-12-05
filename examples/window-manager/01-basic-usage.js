const { app, BrowserWindow, ipcMain } = require('electron')
const { WindowManager, WindowStore } = require('../../dist/index.umd.js')

// =============================================================================
// 示例 1: 基础窗口创建与管理
// 模块: WindowManager (Core)
// 功能:
// 1. 初始化 WindowManager
// 2. 创建主窗口 (name: 'main')
// 3. 演示防止重复创建 (Single Instance)
// 4. 简单的窗口状态恢复 (聚焦已存在的窗口)
// =============================================================================

// 1. 初始化窗口管理器
const windowManager = new WindowManager()

const HTML_CONTENT = `
<!DOCTYPE html>
<html>
<head>
  <title>Electron Infra Kit - 基础示例</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 20px; background: #f0f2f5; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    button { padding: 8px 16px; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🏠 主窗口</h1>
    <p>这是一个基础窗口示例。</p>
    <p>当前窗口 ID: <span id="win-id">...</span></p>
    <hr/>
    <h3>测试功能：</h3>
    <button onclick="require('electron').ipcRenderer.invoke('renderer-to-main', { name: 'open-second-window' })">
      打开第二个窗口 (防止重复)
    </button>
  </div>
  <script>
    // 获取当前窗口 ID (实际开发中推荐使用 preload)
    const currentId = require('electron').remote?.getCurrentWindow()?.id || 'unknown';
    document.getElementById('win-id').innerText = currentId;
  </script>
</body>
</html>
`

app.whenReady().then(() => {
  // 2. 创建主窗口
  const windowId = windowManager.create({
    name: 'main', // 【关键】唯一标识符
    isDevelopment: !app.isPackaged, // 设置开发模式
    defaultConfig: { // 设置默认配置
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    },
    title: '主窗口',
    // 可以在这里覆盖默认配置
    width: 1000,
    height: 800
  })

  console.log(`[Main] 主窗口创建成功，ID: ${windowId}`)

  // 加载内容
  const win = WindowStore.get(windowId)
  if (win) {
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(HTML_CONTENT)}`)
  }
})

// 演示：尝试重复创建窗口
// 使用 WindowManager 的 ipcBridge 处理 IPC 请求
windowManager.ipcBridge.addHandler({
  name: 'open-second-window',
  callback: () => {
    console.log('[IPC] 收到打开第二个窗口请求')

    // 尝试创建名为 'second' 的窗口
    // 如果再次点击按钮，因为 name 相同，windowManager 会自动聚焦已存在的窗口，而不会新建
    const id = windowManager.create({
      name: 'second',
      title: '第二个窗口 (单例模式)',
      width: 400,
      height: 300,
      alwaysOnTop: true
    })

    const win = WindowStore.get(id)
    if (win) {
      win.loadURL('data:text/html,<h1>我是第二个窗口</h1><p>再次点击主窗口按钮只会聚焦我。</p>')
    }

    return id
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

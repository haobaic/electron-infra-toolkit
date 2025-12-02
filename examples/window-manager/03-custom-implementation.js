const { app } = require('electron')
const { WindowManager, WindowStore } = require('../../dist/index.umd.js')

// =============================================================================
// 示例 3: 自定义窗口类
// 模块: WindowManager (Inheritance)
// 功能:
// 1. 继承 WindowManager 创建特定业务的窗口管理器 (如 LoginWindow, PlayerWindow)
// 2. 封装特定的配置和方法
// =============================================================================

/**
 * 登录窗口管理器
 * 封装了登录窗口特有的配置（无边框、固定大小）
 */
class LoginWindowManager extends WindowManager {
  constructor() {
    super()
  }

  /**
   * 封装打开方法
   * 外部只需调用 loginMgr.show() 即可，无需关心具体配置
   */
  show() {
    const id = this.create({
      name: 'login-core', // 确保单例
      title: '用户登录',
      defaultConfig: {
        width: 300,
        height: 450,
        frame: false, // 无边框
        resizable: false,
        alwaysOnTop: true,
        webPreferences: { nodeIntegration: true, contextIsolation: false }
      }
    })

    const win = WindowStore.get(id)
    if (win) {
      win.loadURL('data:text/html,<body style="-webkit-app-region:drag; background:#333; color:white; display:flex; justify-content:center; align-items:center; height:100vh;"><h3>Login Window</h3></body>')
    }
    return id
  }
}

/**
 * 播放器窗口管理器
 * 封装了黑色背景、特定尺寸
 */
class PlayerWindowManager extends WindowManager {
  constructor() {
    super()
  }

  playVideo(videoId) {
    // 使用 videoId 作为 name 的一部分，意味着同一个视频不会重复打开
    // 但不同视频会打开新窗口
    const id = this.create({
      name: `player-${videoId}`,
      title: `正在播放: ${videoId}`,
      defaultConfig: {
        width: 800,
        height: 500,
        backgroundColor: '#000', // 黑色背景防止白屏
        titleBarStyle: 'hiddenInset'
      }
    })

    const win = WindowStore.get(id)
    win?.loadURL(`data:text/html,<h1 style="color:white">Playing ${videoId}</h1>`)
    return id
  }
}

// --- 主程序 ---

const loginMgr = new LoginWindowManager()
const playerMgr = new PlayerWindowManager()

app.whenReady().then(() => {
  console.log('1. 打开登录窗口...')
  loginMgr.show()

  setTimeout(() => {
    console.log('2. 模拟打开播放器...')
    playerMgr.playVideo('video-001')
  }, 1500)

  setTimeout(() => {
    console.log('3. 再次打开同一个视频 (应聚焦旧窗口)...')
    playerMgr.playVideo('video-001')
  }, 3000)
})

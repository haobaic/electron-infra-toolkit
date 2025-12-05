import {
  BrowserWindow,
  shell,
  BrowserWindowConstructorOptions,
  app
} from 'electron'
import WindowEvents from './WindowEvents'
import type { WindowManagerConfig } from './window-manager.type'
import IpcBridge from '../ipc-bridge/IpcBridge'
import { IpcSetup } from './IpcSetup'

const IS_DEV = !app.isPackaged

/**
 * WindowManager - 管理 Electron 窗口的核心类
 * 继承自 WindowEvents 以处理窗口生命周期事件
 */
export default class WindowManager extends WindowEvents {
  protected config: WindowManagerConfig = {}
  private ready: boolean = false
  public ipcBridge: IpcBridge
  private currentIpcChannel: string | null = null
  private currentIpcSyncChannel: string | null = null

  constructor(config: WindowManagerConfig = {}) {
    super()
    this.config = config
    this.ipcBridge = new IpcBridge()
    if (this.config.ipc?.autoInit !== false) {
      this.setupIPC()
    }
  }

  /**
   * 设置 IPC 通信
   * @param options 可选的 IPC 配置，如果不传则使用 config 中的配置或默认值
   */
  public setupIPC(options?: { channel?: string; syncChannel?: string }): void {
    const result = IpcSetup.setup({
      config: this.config,
      ipcBridge: this.ipcBridge,
      currentIpcChannel: this.currentIpcChannel,
      currentIpcSyncChannel: this.currentIpcSyncChannel,
      options
    })

    this.currentIpcChannel = result.channel
    this.currentIpcSyncChannel = result.syncChannel
  }

  /**
   * 创建一个新窗口
   * @param config 配置对象
   * @returns 窗口 ID
   */
  create(
    config: BrowserWindowConstructorOptions & {
      name?: string
      windowId?: string
      isDevelopment?: boolean
      defaultConfig?: BrowserWindowConstructorOptions
      [key: string]: any
    } = {}
  ): string {
    // 从创建参数初始化配置
    if (config.defaultConfig) {
      this.config.defaultConfig = config.defaultConfig
    }

    // 使用空值合并允许显式 false
    // 使用模块级常量 IS_DEV 锁定环境状态
    this.config.isDevelopment = config.isDevelopment ?? IS_DEV

    console.log('当前环境:', {
      appIsPackaged: app.isPackaged,
      cachedIsDev: IS_DEV,
      finalConfigIsDev: this.config.isDevelopment
    })

    let existingWindowId: string | undefined

    if (config?.name && this.hasByName(config.name)) {
      existingWindowId = this.getWindowByNameId(config.name)
    } else if (config?.windowId && this.hasById(config.windowId)) {
      existingWindowId = config.windowId
    }

    if (existingWindowId) {
      const existingWindow = this.getWindowById(existingWindowId)
      if (!existingWindow || existingWindow.isDestroyed()) {
        this.removeWindow(existingWindowId)
      } else {
        if (existingWindow.isMinimized()) {
          existingWindow.restore()
        }
        existingWindow.focus()
        return existingWindowId
      }
    }

    const newWindow = this.createBrowserWindow(config)
    const windowId = this.createWindow(newWindow, config)

    this.configureWindowBehavior(newWindow, windowId)

    return windowId
  }

  private getMainWindowId(): string | undefined {
    return this.mainWindow ? this.getWindowId(this.mainWindow) : undefined
  }

  protected createBrowserWindow(
    config?: BrowserWindowConstructorOptions
  ): BrowserWindow {
    const defaultConfig = this.getDefaultWindowConfig()
    return new BrowserWindow({ ...defaultConfig, ...config })
  }

  protected getDefaultWindowConfig(): BrowserWindowConstructorOptions {
    return this.config.defaultConfig || {
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    }
  }

  protected configureWindowBehavior(
    window: BrowserWindow,
    windowId: string
  ): void {
    if (this.config.isDevelopment) {
      this.openDevTools(windowId)
    }

    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    window.once('ready-to-show', () => this.readyToShow(window))

    window.on('closed', () => {
      this.removeWindow(windowId)
    })
  }

  readyToShow(window: BrowserWindow): void {
    this.ready = true
    this.setMovable(window)
  }

  get isReady(): boolean {
    return this.ready
  }
  set isReady(value: boolean) {
    this.ready = value
  }
}

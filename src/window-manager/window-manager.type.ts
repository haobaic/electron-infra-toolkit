import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron'

export interface WindowManagerApi {
  window: {
    hasById(id: string): boolean
    isDestroyed(id: string): boolean
    deleteByName(name: string): boolean
    deleteById(id: string): boolean
    getTargetWindow(id: string): BrowserWindow | undefined
    removeWindow(id: string): void
    show(window: BrowserWindow, id: string): void
  }
}

export interface WindowManagerConfig {
  /** 默认浏览器窗口选项 */
  defaultConfig?: BrowserWindowConstructorOptions
  /** 开发模式标志 */
  isDevelopment?: boolean
  /** Linux 平台标志 */
  isLinux?: boolean
  /** IPC 配置 */
  ipc?: {
    /** 是否在实例化时自动初始化 IPC，默认为 true */
    autoInit?: boolean
    /** 异步通信频道名称，默认为 'renderer-to-main' */
    channel?: string
    /** 同步通信频道名称，默认为 'renderer-to-main-sync' */
    syncChannel?: string
  }
}

export interface Frame {
  create(config?: any): string
}

export interface FrameConstructor {
  new(): Frame
}

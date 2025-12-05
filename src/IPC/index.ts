import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import Logger from '../logger'
import type { EmptyFunc, IPCEventHandler, IPCHandleHandler } from './ipc.type'

const emptyFunc: EmptyFunc = () => { }

// 定义 IPC 类
class IPC {
  // 存储所有频道的回调函数 (用于清理)
  private channels: Set<string> = new Set()
  private handlers: Set<string> = new Set()

  // 日志实例
  private logger: Logger

  constructor() {
    this.logger = new Logger('IPC')
  }

  /**
   * 注册监听事件 (ipcMain.on)
   * @param channel - 事件名称
   * @param cb - 回调函数
   */
  public on(channel: string, cb: IPCEventHandler = emptyFunc): void {
    this.channels.add(channel)

    // 包装回调函数以添加日志和错误处理
    const wrappedCb = async (event: IpcMainEvent, ...args: unknown[]) => {
      try {
        this.logEvent(channel, 'on', args)
        await cb(event, ...args)
      } catch (error) {
        this.logError(channel, 'on', error)
      }
    }

    ipcMain.on(channel, wrappedCb)
  }

  /**
   * 注册处理事件 (ipcMain.handle)
   * 注意: 同一个 channel 只能注册一个 handler，重复注册会覆盖之前的 handler
   * @param channel - 事件名称
   * @param cb - 回调函数
   */
  public handle(channel: string, cb: IPCHandleHandler = emptyFunc): void {
    // 确保先移除旧的 handler，防止 electron 抛出 "second handler" 错误
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel)
    }
    this.handlers.add(channel)

    // 包装回调函数以添加日志和错误处理
    const wrappedCb = async (event: IpcMainInvokeEvent, ...args: unknown[]) => {
      try {
        this.logEvent(channel, 'handle', args)
        return await cb(event, ...args)
      } catch (error) {
        this.logError(channel, 'handle', error)
        throw error // handle 需要抛出错误以便渲染进程捕获
      }
    }

    ipcMain.handle(channel, wrappedCb)
  }

  /**
   * 移除指定频道的监听器
   * @param channel - 频道名称
   */
  public removeListener(channel: string): void {
    if (this.channels.has(channel)) {
      ipcMain.removeAllListeners(channel)
      this.channels.delete(channel)
    }
  }

  /**
   * 移除所有监听器
   * @param channel - 可选，指定频道名称
   */
  public removeAllListeners(channel?: string): void {
    if (channel) {
      this.removeListener(channel)
    } else {
      for (const ch of this.channels) {
        ipcMain.removeAllListeners(ch)
      }
      this.channels.clear()
    }
  }

  /**
   * 移除处理器
   * @param channel - 频道名称
   */
  public removeHandler(channel: string): void {
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel)
      this.handlers.delete(channel)
    }
  }

  /**
   * 移除所有处理器
   */
  public removeAllHandlers(): void {
    for (const channel of this.handlers) {
      ipcMain.removeHandler(channel)
    }
    this.handlers.clear()
  }

  /**
   * 记录错误信息
   * @param err - 错误信息
   */
  public error(err: string): void {
    this.logger.error(`[IPC System Error]: ${err}`)
  }

  /**
   * 记录普通日志
   * @param data - 日志信息
   */
  public log(data: string): void {
    this.logger.info(`[IPC System Log]: ${data}`)
  }

  // 私有辅助方法：格式化日志
  private logEvent(channel: string, type: 'on' | 'handle', args: unknown[]): void {
    try {
      // 尝试获取 data.name 作为操作名，这是我们约定的通信格式
      const actionName = (args[0] as { name?: string })?.name
      const argStr = actionName ? `[Action: ${actionName}]` : `[Args: ${this.safeStringify(args)}]`
      this.logger.info(`[${type.toUpperCase()}] ${channel} ${argStr}`)
    } catch {
      this.logger.info(`[${type.toUpperCase()}] ${channel} [Args parsing failed]`)
    }
  }

  private logError(channel: string, type: 'on' | 'handle', error: unknown): void {
    this.logger.error(`[${type.toUpperCase()} ERROR] ${channel}: ${error instanceof Error ? error.message : String(error)}`)
  }

  private safeStringify(obj: unknown): string {
    try {
      return JSON.stringify(obj)
    } catch {
      return '[Circular or Non-serializable]'
    }
  }
}

// 创建并导出单例
export default new IPC()

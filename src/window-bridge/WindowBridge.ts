import {
  MessageChannelMain,
  MessagePortMain,
  BrowserWindow,
  ipcMain
} from 'electron'
import { EventEmitter } from 'events'
import type {
  DataChangeEvent,
  FieldPermission,
  DataStoreItem,
  WindowBridgeHandler,
  BridgeMessageHandler
} from './window-bridge.type'

/**
 * WindowBridge - 多窗口状态同步与通信桥梁
 *
 * 设计模式：
 * - 静态存储：所有实例共享同一份数据（参考 WindowStore）
 * - MessagePort 广播：高效的窗口间通信
 * - 权限控制：字段级 + 窗口级双重权限
 * - 消息代理：统一的通信接口 (借鉴 ipc-bridge 思想但用于窗口桥接)
 */
export default class WindowBridge extends EventEmitter {
  private static instance: WindowBridge
  private eventName: string = 'window-state-changed'

  // ✅ 静态属性：所有实例共享（遵循 WindowStore 模式）
  protected static dataStore: Map<string, DataStoreItem> = new Map()
  protected static windowPorts: Map<string, MessagePortMain> = new Map()
  // 消息处理器集合
  protected messageHandlers: Map<string, BridgeMessageHandler> = new Map()

  private constructor(eventName: string = 'window-state-changed') {
    super()
    this.eventName = eventName
    this.registerDefaultHandlers()
  }

  static getInstance(eventName?: string): WindowBridge {
    if (!WindowBridge.instance) {
      WindowBridge.instance = new WindowBridge(eventName)
    }
    return WindowBridge.instance
  }

  /**
   * 创建并注册窗口的 MessagePort
   * @param windowId 窗口ID
   * @param window BrowserWindow 实例
   */
  registerWindowPort(windowId: string, window: BrowserWindow): void {
    // Clean up existing port if any (e.g. during reload)
    this.unregisterWindowPort(windowId)

    const { port1, port2 } = new MessageChannelMain()

    // port1 保存在主进程，用于发送消息
    WindowBridge.windowPorts.set(windowId, port1)

    // port2 发送给渲染进程
    if (window.webContents.isLoading()) {
      window.webContents.once('did-finish-load', () => {
        window.webContents.postMessage('window-bridge-port', null, [port2])
      })
    } else {
      window.webContents.postMessage('window-bridge-port', null, [port2])
    }
  }

  /**
   * 注销窗口的 MessagePort
   * @param windowId 窗口ID
   */
  unregisterWindowPort(windowId: string): void {
    const port = WindowBridge.windowPorts.get(windowId)
    if (port) {
      port.close()
      WindowBridge.windowPorts.delete(windowId)
    }
  }

  /**
   * 注册单个事件处理器
   */
  registerHandler(handler: WindowBridgeHandler): void {
    this.on(handler.eventName, handler.callback)
  }

  /**
   * 批量注册事件处理器
   */
  registerHandlers(handlers: WindowBridgeHandler[]): void {
    handlers.forEach((handler) => this.registerHandler(handler))
  }

  /**
   * 注销单个事件处理器
   */
  unregisterHandler(handler: WindowBridgeHandler): void {
    this.removeListener(handler.eventName, handler.callback)
  }

  /**
   * 批量注销事件处理器
   */
  unregisterHandlers(handlers: WindowBridgeHandler[]): void {
    handlers.forEach((handler) => this.unregisterHandler(handler))
  }

  /**
   * 获取数据
   * @param key 数据键，不传则返回所有数据
   */
  getData(key?: string): any {
    if (key) {
      return WindowBridge.dataStore.get(key)?.value
    }

    const result: Record<string, any> = {}
    WindowBridge.dataStore.forEach((item, k) => {
      result[k] = item.value
    })
    return result
  }

  /**
   * 设置数据（带权限验证）
   * @param key 数据键
   * @param value 数据值
   * @param windowId 操作窗口ID
   */
  setData(
    key: string,
    value: any,
    windowId?: string,
    eventName?: string
  ): { success: boolean; error?: string } {
    const item = WindowBridge.dataStore.get(key)

    // 检查只读权限
    if (item?.permission?.readonly) {
      return { success: false, error: `Field "${key}" is readonly` }
    }

    // 检查窗口级权限
    if (item?.permission?.allowedWindows && windowId) {
      if (!item.permission.allowedWindows.includes(windowId)) {
        return {
          success: false,
          error: `Window "${windowId}" is not allowed to modify "${key}"`
        }
      }
    }

    const oldValue = item?.value
    WindowBridge.dataStore.set(key, {
      value,
      permission: item?.permission
    })

    // 广播变更
    const event: DataChangeEvent = {
      type: 'set',
      key,
      value,
      oldValue,
      windowId,
      timestamp: Date.now()
    }
    this.broadcastChange(event)
    this.emit(eventName || this.eventName, event)

    return { success: true }
  }

  /**
   * 删除数据
   */
  deleteData(
    key: string,
    windowId?: string,
    eventName?: string
  ): { success: boolean; error?: string } {
    const item = WindowBridge.dataStore.get(key)

    if (item?.permission?.readonly) {
      return { success: false, error: `Field "${key}" is readonly` }
    }

    if (item?.permission?.allowedWindows && windowId) {
      if (!item.permission.allowedWindows.includes(windowId)) {
        return {
          success: false,
          error: `Window "${windowId}" is not allowed to delete "${key}"`
        }
      }
    }

    const oldValue = item?.value
    WindowBridge.dataStore.delete(key)

    const event: DataChangeEvent = {
      type: 'delete',
      key,
      oldValue,
      windowId,
      timestamp: Date.now()
    }
    this.broadcastChange(event)
    this.emit(eventName || this.eventName, event)

    return { success: true }
  }


  /**
   * 设置字段权限
   */
  setFieldPermission(key: string, permission: FieldPermission): void {
    const item = WindowBridge.dataStore.get(key)
    if (item) {
      item.permission = permission
    } else {
      WindowBridge.dataStore.set(key, { value: undefined, permission })
    }
  }

  /**
   * 获取已注册的窗口列表（调试用）
   * @returns 已注册的窗口ID数组
   */
  getRegisteredWindows(): string[] {
    return Array.from(WindowBridge.windowPorts.keys())
  }

  /**
   * 注册消息处理器
   */
  registerMessageHandler(handler: BridgeMessageHandler): void {
    this.messageHandlers.set(handler.name, handler)
  }

  /**
   * 注册默认处理器
   */
  private registerDefaultHandlers(): void {
    this.registerMessageHandler({
      name: 'get',
      callback: (bridge, { key } = {}) => bridge.getData(key)
    })

    this.registerMessageHandler({
      name: 'set',
      callback: (bridge, { key, value, windowId, eventName }) =>
        bridge.setData(key, value, windowId, eventName)
    })

    this.registerMessageHandler({
      name: 'delete',
      callback: (bridge, { key, windowId, eventName }) =>
        bridge.deleteData(key, windowId, eventName)
    })

    this.registerMessageHandler({
      name: 'set-permission',
      callback: (bridge, { key, permission }) =>
        bridge.setFieldPermission(key, permission)
    })
  }

  /**
   * 处理消息
   */
  handleMessage(name: string, data: any): any {
    const handler = this.messageHandlers.get(name)
    if (handler) {
      return handler.callback(this, data)
    }
    console.warn(`WindowBridge: No handler for message "${name}"`)
    return null
  }

  /**
   * 初始化通信监听器（可选）
   * 允许渲染进程通过统一通道直接读写数据
   */
  initializeListener(): void {
    // 统一通道，优化通信方式
    ipcMain.handle('window-bridge-invoke', (_, { name, data }) =>
      this.handleMessage(name, data)
    )
  }

  /**
   * 通过 MessagePort 广播变更到所有窗口
   */
  private broadcastChange(event: DataChangeEvent): void {
    const message = JSON.stringify(event)

    WindowBridge.windowPorts.forEach((port, windowId) => {
      try {
        port.postMessage(message)
      } catch (error) {
        console.error(`Failed to broadcast to window ${windowId}:`, error)
      }
    })
  }
}

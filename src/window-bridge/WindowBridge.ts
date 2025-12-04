import { MessageChannelMain, MessagePortMain, BrowserWindow, ipcMain } from 'electron'

export interface DataChangeEvent {
  type: 'set' | 'delete' | 'clear'
  key?: string
  value?: any
  oldValue?: any
  windowId?: string
  timestamp: number
}

export interface FieldPermission {
  readonly: boolean
  allowedWindows?: string[]
}

interface DataStoreItem {
  value: any
  permission?: FieldPermission
}

/**
 * WindowBridge - 多窗口状态同步与通信桥梁
 *
 * 设计模式：
 * - 静态存储：所有实例共享同一份数据（参考 WindowStore）
 * - MessagePort 广播：高效的窗口间通信
 * - 权限控制：字段级 + 窗口级双重权限
 */
export default class WindowBridge {
  private static instance: WindowBridge

  // ✅ 静态属性：所有实例共享（遵循 WindowStore 模式）
  protected static dataStore: Map<string, DataStoreItem> = new Map()
  protected static windowPorts: Map<string, MessagePortMain> = new Map()

  private constructor() { }

  static getInstance(): WindowBridge {
    if (!WindowBridge.instance) {
      WindowBridge.instance = new WindowBridge()
    }
    return WindowBridge.instance
  }

  /**
   * 创建并注册窗口的 MessagePort
   * @param windowId 窗口ID
   * @param window BrowserWindow 实例
   */
  registerWindowPort(windowId: string, window: BrowserWindow): void {
    const { port1, port2 } = new MessageChannelMain()

    // port1 保存在主进程，用于发送消息
    WindowBridge.windowPorts.set(windowId, port1)

    // port2 发送给渲染进程
    window.webContents.once('did-finish-load', () => {
      window.webContents.postMessage('window-bridge-port', null, [port2])
    })
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
    windowId?: string
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
    this.broadcastChange({
      type: 'set',
      key,
      value,
      oldValue,
      windowId,
      timestamp: Date.now()
    })

    return { success: true }
  }

  /**
   * 删除数据
   */
  deleteData(
    key: string,
    windowId?: string
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

    this.broadcastChange({
      type: 'delete',
      key,
      oldValue,
      windowId,
      timestamp: Date.now()
    })

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
   * 初始化 IPC 监听器（可选）
   * 允许渲染进程通过 IPC 直接读写数据
   */
  initializeIpc(): void {
    ipcMain.handle('window-bridge-get', (_, { key } = {}) => this.getData(key))

    ipcMain.handle('window-bridge-set', (_, { key, value, windowId }) =>
      this.setData(key, value, windowId)
    )

    ipcMain.handle('window-bridge-delete', (_, { key, windowId }) =>
      this.deleteData(key, windowId)
    )

    ipcMain.handle('window-bridge-set-permission', (_, { key, permission }) =>
      this.setFieldPermission(key, permission)
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

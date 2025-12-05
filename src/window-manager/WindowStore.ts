import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
/**
 * WindowStore - 窗口存储管理类
 *
 * 窗口命名规范:
 * - windowId: UUID 格式的唯一标识符，如 "550e8400-e29b-41d4-a716-446655440000"
 * - windowName: 业务语义化名称，如 "main-frame", "setting-window"
 *
 * 注意：windowName 必须唯一，会在创建时验证
 */
export default class WindowStore {
  // 窗口数量限制
  private static readonly MAX_WINDOWS = 50

  // ✅ 静态属性：所有实例共享
  protected static windows: Map<string, BrowserWindow> = new Map()
  protected static windowNames: Map<string, string> = new Map()
  // 反向索引：提升查询性能
  protected static windowIds: Map<string, string> = new Map() // windowId -> windowName
  protected static windowInstanceIds: Map<BrowserWindow, string> = new Map() // window -> windowId
  // 实例追踪：存储 WindowManager 子类实例
  protected static instances: Map<string, WindowStore> = new Map() // windowId -> WindowStore instance
  protected static mainWindow: BrowserWindow | null = null

  // ✅ 提供实例访问器
  public get mainWindow(): BrowserWindow | null {
    return WindowStore.mainWindow
  }

  // ✅ 可选：设置器用于赋值
  protected set mainWindow(window: BrowserWindow | null) {
    WindowStore.mainWindow = window
  }

  // 窗口创建与注册
  /**
   * 创建并注册一个新的窗口
   * @param window 窗口对象
   * @param config 窗口配置，包含名称和窗口ID，可选
   * @returns 窗口ID
   */
  createWindow(
    window: BrowserWindow,
    config?: { name?: string; windowId?: string }
  ): string {
    // 检查窗口数量限制
    if (WindowStore.windows.size >= WindowStore.MAX_WINDOWS) {
      throw new Error(
        `Maximum window limit (${WindowStore.MAX_WINDOWS}) reached`
      )
    }

    const windowId = config?.windowId || uuidv4()
    let windowName = config?.name || `window-${windowId}`

    // 验证窗口名称，如果重复则自动生成唯一名称
    try {
      windowName = this.validateWindowName(windowName)
    } catch {
      console.warn(
        `Window name "${windowName}" already exists, generating unique name`
      )
      windowName = `${windowName}-${Date.now()}`
    }

    this.registerWindow(windowId, windowName, window)
    return windowId
  }

  // 窗口获取
  /**
   * 获取所有窗口的数量
   * @returns 窗口数量
   */
  getWindowCount(): number {
    return WindowStore.windows.size
  }

  /**
   * 获取所有窗口的ID列表
   * @returns 窗口ID列表
   */
  getAllWindowKeys(): string[] {
    return Array.from(WindowStore.windows.keys())
  }

  /**
   * 获取所有窗口对象列表
   * @returns 窗口对象列表
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(WindowStore.windows.values())
  }

  /**
   * 获取所有窗口名称和ID的映射
   * @returns 窗口名称和ID的映射
   */
  getWindowNames(): Map<string, string> {
    return WindowStore.windowNames
  }

  /**
   * 根据窗口ID获取窗口名称
   * @param windowId 窗口ID
   * @returns 窗口名称或undefined
   */
  getNameByWindowId(windowId: string): string | undefined {
    return WindowStore.windowIds.get(windowId)
  }

  /**
   * 根据窗口ID或名称获取目标窗口
   * @param windowId 窗口ID或名称，可选
   * @returns 目标窗口或undefined
   */
  getTargetWindow(windowId?: string): BrowserWindow | undefined {
    if (!windowId) {
      return this.getCurrentWindow()
    }

    // 先检查是否是 ID
    const windowById = this.getWindowById(windowId)
    if (windowById) return windowById

    // 再检查是否是名称
    return this.getWindowByName(windowId)
  }

  /**
   * 获取当前聚焦的窗口
   * @returns 当前聚焦的窗口或undefined
   */
  getCurrentWindow(): BrowserWindow | undefined {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow && !focusedWindow.isDestroyed()) return focusedWindow
    return WindowStore.mainWindow ?? undefined
  }

  /**
   * 根据窗口名称获取窗口ID
   * @param name 窗口名称
   * @returns 窗口ID或undefined
   */
  getWindowByNameId(name: string): string | undefined {
    const windowId = WindowStore.windowNames.get(name)
    return windowId ? windowId : undefined
  }

  /**
   * 根据窗口名称获取窗口对象
   * @param name 窗口名称
   * @returns 窗口对象或undefined
   */
  getWindowByName(name: string): BrowserWindow | undefined {
    const windowId = this.getWindowByNameId(name)
    return windowId ? WindowStore.windows.get(windowId) : undefined
  }

  /**
   * 检查是否存在指定名称的窗口
   * @param proposedName 窗口名称
   * @returns 是否存在指定名称的窗口
   */
  hasByName(proposedName: string): boolean {
    return WindowStore.windowNames.has(proposedName)
  }
  /**
   * 删除指定名称的窗口
   * @param proposedName 窗口名称
   * @returns 删除指定名称的窗口
   */
  deleteByName(proposedName: string): boolean {
    return WindowStore.windowNames.delete(proposedName)
  }

  /**
   * 根据窗口ID获取窗口对象
   * @param windowId 窗口ID
   * @returns 窗口对象或undefined
   */
  getWindowById(windowId: string): BrowserWindow | undefined {
    return WindowStore.windows.get(windowId)
  }

  /**
   * 根据窗口ID获取 WindowStore (或子类) 实例
   * @param windowId 窗口ID
   * @returns 实例对象或undefined
   */
  getInstance<T extends WindowStore = WindowStore>(
    windowId: string
  ): T | undefined {
    return WindowStore.instances.get(windowId) as T | undefined
  }

  /**
   * 检查是否存在指定ID的窗口
   * @param windowId 窗口ID
   * @returns 是否存在指定ID的窗口
   */
  hasById(windowId: string): boolean {
    return WindowStore.windows.has(windowId)
  }

  /**
   * 删除指定ID的窗口
   * @param windowId 窗口ID
   * @returns 删除指定ID的窗口
   */
  deleteById(windowId: string): boolean {
    return WindowStore.windows.delete(windowId)
  }

  /**
   * 根据窗口对象获取窗口ID
   * @param window 窗口对象
   * @returns 窗口ID或undefined
   */
  getWindowId(window: BrowserWindow): string | undefined {
    return WindowStore.windowInstanceIds.get(window)
  }

  /**
   * 获取主窗口对象
   * @returns 主窗口对象或null
   */
  getMainWindow(): BrowserWindow | null {
    return WindowStore.mainWindow
  }

  // 窗口操作
  /**
   * 更新窗口名称
   * @param windowId 窗口ID
   * @param newName 新窗口名称
   */
  updateWindowName(windowId: string, newName: string): void {
    const currentName = this.getNameByWindowId(windowId)
    if (currentName) WindowStore.windowNames.delete(currentName)
    WindowStore.windowNames.set(newName, windowId)
    WindowStore.windowIds.set(windowId, newName)
  }

  /**
   * 移除并关闭指定窗口
   * @param windowId 窗口ID
   */
  removeWindow(windowId: string): void {
    const name = this.getNameByWindowId(windowId)
    if (name) WindowStore.windowNames.delete(name)

    const window = WindowStore.windows.get(windowId)
    if (window && !window.isDestroyed()) {
      try {
        // 清理反向索引
        WindowStore.windowInstanceIds.delete(window)

        window.close()
        // destroy 通常在 close 后自动触发，但为了保险可保留
        if (!window.isDestroyed()) {
          window.destroy()
        }
      } catch (error) {
        console.error(`Failed to remove window ${windowId}:`, error)
      } finally {
        WindowStore.windows.delete(windowId)
        WindowStore.windowIds.delete(windowId)
        WindowStore.instances.delete(windowId) // 清理实例引用
        if (WindowStore.mainWindow === window) {
          WindowStore.mainWindow = null
        }
      }
    }
  }

  // 辅助方法
  /**
   * 验证窗口名称是否唯一
   * @param proposedName 窗口名称
   * @returns 验证后的窗口名称
   * @throws 如果窗口名称已存在，则抛出错误
   */
  private validateWindowName(proposedName: string): string {
    if (this.hasByName(proposedName)) {
      throw new Error(`Window name "${proposedName}" already exists`)
    }
    return proposedName
  }

  /**
   * 注册窗口
   * @param id 窗口ID
   * @param name 窗口名称
   * @param window 窗口对象
   */
  private registerWindow(
    id: string,
    name: string,
    window: BrowserWindow
  ): void {
    WindowStore.windows.set(id, window)
    WindowStore.windowNames.set(name, id)
    // 维护反向索引
    WindowStore.windowIds.set(id, name)
    WindowStore.windowInstanceIds.set(window, id)
    // 存储实例引用
    WindowStore.instances.set(id, this)
    if (!WindowStore.mainWindow) {
      WindowStore.mainWindow = window
    }
  }
}

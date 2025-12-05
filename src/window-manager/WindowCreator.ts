import { delay } from '../utils'
import { BrowserWindow } from 'electron'
import type { WindowManagerApi, Frame, FrameConstructor } from './window-manager.type'

// 新增通用窗口创建类
/**
 * WindowCreator - 通用窗口创建辅助类
 * 用于处理窗口创建、恢复、显示以及异常重试逻辑
 */
export default class WindowCreator<T = any> {
  private api: WindowManagerApi
  private data: { data: T & { winId?: string } }
  private winId: string
  private FrameClass: FrameConstructor
  private extraOptions?: (data: T) => object

  /**
   * 构造函数
   * @param api WindowManager API 接口
   * @param data 传递给窗口的数据对象，包含 winId
   * @param FrameClass 窗口类构造函数
   * @param extraOptions 可选的额外配置生成函数
   */
  constructor(
    api: WindowManagerApi,
    data: { data: T & { winId?: string } },
    FrameClass: FrameConstructor,
    extraOptions?: (data: T) => object
  ) {
    this.api = api
    this.data = data
    this.winId = data?.data?.winId || ''
    this.FrameClass = FrameClass
    this.extraOptions = extraOptions
  }

  /**
   * 内部方法：创建窗口
   * @returns 对象包含窗口ID和是否为新创建标志
   */
  private createWindow(): { winId: string; isNew: boolean } {
    let isNew = false
    if (!this.api.window.hasById(this.winId)) {
      const windowInstance = new this.FrameClass()
      const options = this.winId
        ? {
          windowId: this.winId,
          ...(this.extraOptions?.(this.data.data) || {})
        }
        : this.data.data
      this.winId = windowInstance.create(options)
      isNew = true
    }
    return { winId: this.winId, isNew }
  }

  /**
   * 内部方法：显示窗口
   * 处理窗口已销毁的异常情况并尝试重试
   * @param winId 窗口ID
   * @param isNew 是否为新创建
   * @param retryCount 重试计数
   */
  private showWindow(winId: string, isNew: boolean, retryCount = 0): void {
    if (this.api.window?.isDestroyed(winId)) {
      // 防止无限递归，限制重试次数
      if (retryCount >= 3) {
        console.error(
          `Failed to create and show window ${winId} after 3 retries`
        )
        return
      }

      this.api.window?.deleteByName(`window-${winId}`)
      this.api.window?.deleteById(winId)
      delay(500).then(() => {
        const result = this.createWindow()
        this.showWindow(result.winId, result.isNew, retryCount + 1)
      })
    } else {
      const win = this.api.window?.getTargetWindow(winId)
      if (win) {
        if (isNew) {
          win.once('ready-to-show', () => {
            this.api.window.show(win, winId)
          })
        } else {
          this.api.window.show(win, winId)
        }
      }
    }
  }

  /**
   * 创建并显示窗口
   * 如果窗口已存在则恢复并聚焦，如果不存在则创建
   * @returns 窗口ID
   */
  public createAndShow(): string {
    const { isNew } = this.createWindow()
    this.showWindow(this.winId, isNew)
    return this.winId
  }
}

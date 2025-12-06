# WindowManager - 企业级窗口管理方案

`WindowManager` 是一个高内聚的 Electron 窗口管理模块，旨在解决原生 `BrowserWindow` API 过于底层、缺乏统一管理机制的问题。它提供了窗口注册表、防重复创建、环境感知配置以及优雅的生命周期管理。

## 安装

```bash
# 使用 npm
npm install electron-infra-toolkit

# 使用 yarn
yarn add electron-infra-toolkit

# 使用 pnpm
pnpm add electron-infra-toolkit
```

## 核心价值

### 1. 全局窗口注册表 (Global Window Registry)

内置 `WindowStore`，维护了一个 `Map<windowId, BrowserWindow>` 的静态注册表。

- **价值**: 你可以在应用的任何地方（包括 IPC Handler、Menu 回调、Tray 事件中）通过 ID 或 Name 瞬间找到目标窗口，而不需要自己维护脆弱的数组。

### 2. 智能防重 (Singleton Window Assurance)

当你尝试创建一个已存在的窗口时，`create` 方法会自动执行 **"Find & Focus"** 策略：

1.  检查窗口是否已存在。
2.  如果已最小化，自动还原。
3.  将窗口置顶并聚焦。
4.  **不会**创建重复的窗口实例。

### 3. 生产环境感知 (Environment Awareness)

自动识别 `IS_DEV` 状态：

- 开发环境：自动打开 DevTools。
- 生产环境：强制屏蔽 DevTools，禁用不安全的链接跳转（默认拦截 `new-window` 事件并调用外部浏览器）。

### 4. 优雅的生命周期管理 (Graceful Lifecycle)

自动处理窗口的创建、显示、隐藏、关闭等生命周期事件：

- 窗口创建时自动注册到全局注册表
- 窗口关闭时自动从注册表中清理
- 提供完整的事件钩子，便于扩展自定义逻辑

### 5. 内置 IPC 通信集成 (Integrated IPC)

自动集成了 `IPC` 模块和 `IpcBridge`，支持：

- **统一通信入口**: 默认提供 `renderer-to-main` (异步) 和 `renderer-to-main-sync` (同步) 两个标准通信频道。
- **命令模式分发**: 通过 `IpcBridge` 自动分发业务逻辑。
- **自动日志记录**: 所有通信都会自动通过 Logger 记录参数和结果。
- **灵活配置**: 支持自定义频道名称，或完全手动控制初始化时机。

## 架构设计

`WindowManager` 采用**分层继承**与**静态注册表**相结合的设计模式。

```
      ┌────────────────┐
      │  WindowStore   │  (Static Registry: Map<ID, Window>)
      └────────────────┘
              ▲
              │ inherits
      ┌────────────────┐
      │  WindowEvents  │  (Lifecycle Management)
      └────────────────┘
              ▲
              │ inherits
      ┌────────────────┐
      │ WindowCreator  │  (Factory: createBrowserWindow)
      └────────────────┘
              ▲
              │ inherits
      ┌────────────────┐
      │ WindowManager  │  (Facade: create, remove, get, setupIPC)
      └────────────────┘
              ▲
              │ inherits
      ┌────────────────┐
      │ MyMainWindow   |  (Concrete Implementation)
      └────────────────┘
```

**各层职责：**

1.  **`WindowStore` (Base)**: **数据层**。负责静态数据的存储和索引。它不包含任何业务逻辑，只负责“存”和“取”。
2.  **`WindowEvents`**: **事件层**。负责窗口的生命周期事件监听（如 `closed`, `resize`），确保窗口销毁时自动清理 Store。
3.  **`WindowCreator`**: **工厂层**。负责 `BrowserWindow` 实例的创建，封装了默认配置（Default Config）的合并逻辑。
4.  **`WindowManager`**: **控制层 (Facade)**。对外暴露统一的 API（如 `create`, `remove`, `setupIPC`），协调上述各层的工作，处理单例逻辑，并集成 IPC 能力。

## 快速开始

### 1. 基本使用

```typescript
// main.ts
import { app, BrowserWindow } from "electron";
import * as path from "path";
import WindowManager from "electron-infra-toolkit/src/window-manager/WindowManager";

// 创建窗口管理器实例
// 默认会自动初始化 IPC 通信 (监听 renderer-to-main)
const windowManager = new WindowManager();

app.whenReady().then(() => {
  // 创建主窗口
  const mainWindowId = windowManager.create({
    name: "main-app",
    title: "My Application",
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 注册 IPC 业务逻辑
  windowManager.ipcBridge.addHandler({
    name: 'get-app-info',
    callback: () => ({ version: app.getVersion() })
  });
});
```

### 2. 自定义 IPC 配置

```typescript
const windowManager = new WindowManager({
  ipc: {
    autoInit: false // 暂不初始化
  }
});

// 稍后手动初始化，并自定义频道名
windowManager.setupIPC({
  channel: 'my-app-api',
  syncChannel: 'my-app-sync'
});
```

### 3. 在其他地方查找窗口

得益于静态的 `WindowStore`，你可以在任何地方查找窗口：

```typescript
// ipc-handlers.ts
import { ipcMain } from "electron";
import { WindowStore } from "electron-infra-toolkit";

// 在 IPC Handler 中发送消息到指定窗口
ipcMain.handle("send-message-to-window", (event, windowName, message) => {
  const targetWindow = WindowStore.getWindowByName(windowName);
  if (targetWindow) {
    targetWindow.webContents.send("window-message", message);
    return { success: true };
  }
  return { success: false, error: "Window not found" };
});
```

## API 参考

### WindowManager 类

#### 构造函数
```typescript
new WindowManager(options?: { ipc?: { autoInit?: boolean } })
```

#### 主要方法

- **`create(config: WindowConfig): string`**
  - 创建新窗口
  - `config`: 窗口配置对象，包含以下属性：
    - `name`: 窗口名称（唯一标识符）
    - `url`: 窗口加载的 URL
    - `width`: 窗口宽度（可选，默认 800）
    - `height`: 窗口高度（可选，默认 600）
    - `webPreferences`: Electron WebPreferences 对象（可选）
    - 其他 BrowserWindow 配置选项
  - 返回窗口 ID

- **`setupIPC(windowId?: string | { channel?: string; syncChannel?: string }): void`**
  - 设置窗口的 IPC 通信
  - `windowId`: 窗口 ID 或配置对象

- **`configureWindowBehavior(windowId: string, behavior: WindowBehaviorConfig): void`**
  - 配置窗口行为
  - `windowId`: 窗口 ID
  - `behavior`: 行为配置对象，包含以下属性：
    - `closeHandler`: 窗口关闭前的处理函数，返回 boolean
    - `blurHandler`: 窗口失去焦点时的处理函数
    - `focusHandler`: 窗口获得焦点时的处理函数

### WindowEvents 类 (继承自 WindowStore)

#### 窗口显示与隐藏

- **`show(window: BrowserWindow, windowId?: string): void`**
  - 显示窗口
  - `window`: 窗口对象
  - `windowId`: 窗口 ID，可选

- **`hide(windowId: string): void`**
  - 隐藏指定窗口
  - `windowId`: 窗口 ID

#### 窗口状态检查

- **`isDestroyed(windowId: string): boolean`**
  - 检查指定窗口是否已被销毁
  - `windowId`: 窗口 ID

- **`isVisible(windowId: string): boolean`**
  - 检查指定窗口是否可见
  - `windowId`: 窗口 ID

- **`isMinimized(windowId: string): boolean`**
  - 检查指定窗口是否已被最小化
  - `windowId`: 窗口 ID

- **`isMaximized(windowId: string): boolean`**
  - 检查指定窗口是否已被最大化
  - `windowId`: 窗口 ID

- **`fullScreenState(windowId: string): boolean`**
  - 检查指定窗口是否处于全屏状态
  - `windowId`: 窗口 ID

#### 窗口操作

- **`minimize(windowId?: string): void`**
  - 最小化指定窗口
  - `windowId`: 窗口 ID，可选

- **`restore(windowId: string): void`**
  - 恢复指定窗口
  - `windowId`: 窗口 ID

- **`maximize(windowId: string): void`**
  - 最大化指定窗口
  - `windowId`: 窗口 ID

- **`unmaximize(windowId: string): void`**
  - 恢复指定窗口的大小
  - `windowId`: 窗口 ID

- **`fullScreen(windowId: string): void`**
  - 切换指定窗口的全屏状态
  - `windowId`: 窗口 ID

- **`focus(windowId: string): void`**
  - 给指定窗口设置焦点
  - `windowId`: 窗口 ID

- **`setMovable(window: BrowserWindow): void`**
  - 设置窗口是否可移动
  - `window`: 窗口对象

- **`winClose(windowId: string): void`**
  - 关闭指定窗口
  - `windowId`: 窗口 ID

#### 开发者工具操作

- **`openDevTools(windowId: string): void`**
  - 打开指定窗口的开发者工具
  - `windowId`: 窗口 ID

- **`isDevToolsOpened(windowId: string): boolean`**
  - 检查指定窗口的开发者工具是否已打开
  - `windowId`: 窗口 ID

- **`closeDevTools(windowId: string): void`**
  - 关闭指定窗口的开发者工具
  - `windowId`: 窗口 ID

#### 应用程序控制

- **`quit(): void`**
  - 退出应用程序

#### 窗口大小与位置操作

- **`getWindowSize(): { width: number; height: number }`**
  - 获取主显示器的工作区域大小

#### 消息发送

- **`send(windowId: string, name: string, data: unknown = ''): void`**
  - 向指定窗口发送消息
  - `windowId`: 窗口 ID
  - `name`: 消息名称
  - `data`: 消息数据，可选，默认为空字符串

### WindowStore 类

#### 窗口创建与注册

- **`createWindow(window: BrowserWindow, config?: { name?: string; windowId?: string }): string`**
  - 创建并注册一个新的窗口
  - `window`: 窗口对象
  - `config`: 窗口配置，包含名称和窗口ID，可选
  - 返回窗口ID

#### 窗口获取

- **`getWindowCount(): number`**
  - 获取所有窗口的数量

- **`getAllWindowKeys(): string[]`**
  - 获取所有窗口的ID列表

- **`getAllWindows(): BrowserWindow[]`**
  - 获取所有窗口对象列表

- **`getWindowNames(): Map<string, string>`**
  - 获取所有窗口名称和ID的映射

- **`getNameByWindowId(windowId: string): string | undefined`**
  - 根据窗口ID获取窗口名称
  - `windowId`: 窗口ID

- **`getTargetWindow(windowId?: string): BrowserWindow | undefined`**
  - 根据窗口ID或名称获取目标窗口
  - `windowId`: 窗口ID或名称，可选

- **`getCurrentWindow(): BrowserWindow | undefined`**
  - 获取当前聚焦的窗口

- **`getWindowByNameId(name: string): string | undefined`**
  - 根据窗口名称获取窗口ID
  - `name`: 窗口名称

- **`getWindowByName(name: string): BrowserWindow | undefined`**
  - 根据窗口名称获取窗口对象
  - `name`: 窗口名称

- **`getWindowById(windowId: string): BrowserWindow | undefined`**
  - 根据窗口ID获取窗口对象
  - `windowId`: 窗口ID

- **`getMainWindow(): BrowserWindow | null`**
  - 获取主窗口对象

#### 窗口操作

- **`updateWindowName(windowId: string, newName: string): void`**
  - 更新窗口名称
  - `windowId`: 窗口ID
  - `newName`: 新窗口名称

- **`removeWindow(windowId: string): void`**
  - 移除并关闭指定窗口
  - `windowId`: 窗口ID

#### 窗口存在性检查

- **`hasByName(proposedName: string): boolean`**
  - 检查是否存在指定名称的窗口
  - `proposedName`: 窗口名称

- **`hasById(windowId: string): boolean`**
  - 检查是否存在指定ID的窗口
  - `windowId`: 窗口ID

#### 窗口删除

- **`deleteByName(proposedName: string): boolean`**
  - 删除指定名称的窗口
  - `proposedName`: 窗口名称

- **`deleteById(windowId: string): boolean`**
  - 删除指定ID的窗口
  - `windowId`: 窗口ID

#### 窗口ID获取

- **`getWindowId(window: BrowserWindow): string | undefined`**
  - 根据窗口对象获取窗口ID
  - `window`: 窗口对象

## 最佳实践

### 1. 窗口命名规范

使用清晰、语义化的窗口名称，便于管理和调试：

```javascript
// 好的命名
win.create({ name: 'main-window', ... })
win.create({ name: 'settings-panel', ... })
win.create({ name: 'about-dialog', ... })

// 不推荐的命名
win.create({ name: 'window1', ... })
win.create({ name: 'win2', ... })
```

### 2. 窗口生命周期管理

在应用关闭时，确保正确清理所有窗口资源：

```javascript
app.on('before-quit', () => {
  const windowManager = WindowManager.getInstance()
  // 获取所有窗口ID
  const windowIds = windowManager.getAllWindowKeys()
  // 关闭所有窗口
  windowIds.forEach(id => windowManager.removeWindow(id))
})
```

### 3. 错误处理

在窗口创建和操作时添加适当的错误处理：

```javascript
try {
  const windowId = win.create({
    name: 'main-window',
    width: 800,
    height: 600,
    url: 'http://localhost:3000'
  })
  console.log('窗口创建成功:', windowId)
} catch (error) {
  console.error('窗口创建失败:', error)
}
```

### 4. 性能优化

避免创建过多窗口，合理利用窗口复用：

```javascript
// 检查窗口是否已存在，如果存在则显示，否则创建
const windowName = 'settings-panel'
if (win.getWindowByName(windowName)) {
  win.show(win.getWindowByName(windowName), windowName)
} else {
  win.create({
    name: windowName,
    width: 600,
    height: 400,
    url: 'http://localhost:3000/settings'
  })
}
```

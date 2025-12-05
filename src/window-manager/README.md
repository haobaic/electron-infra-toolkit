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

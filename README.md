# Electron Infra Toolkit

一个专为 Electron 应用打造的综合基础设施套件（Infrastructure Kit），包含功能强大的窗口管理器、状态持久化、进程间通信及完整的 TypeScript 支持。

## ✨ 特性

- **UUID 窗口管理**: 使用 UUID 唯一标识窗口，同时支持自定义可读名称。
- **事件处理**: 简化的 API 用于显示、隐藏、关闭窗口以及窗口间通信。
- **防重复创建**: 内置机制防止同一业务窗口被重复创建，自动聚焦已存在的窗口。
- **类型安全**: 提供完整的 TypeScript 类型定义，开发体验极佳。
- **窗口状态管理**: 轻松获取和管理所有活跃窗口。

## 📦 安装

```bash
npm install electron-infra-toolkit
# 或者
pnpm add electron-infra-toolkit
# 或者
yarn add electron-infra-toolkit
```

## 🚀 使用指南

### 1. 基础配置 (Basic Setup)

在 Electron 的主进程文件中（通常是 `main.ts` 或 `index.ts`）初始化管理器。

```typescript
import { app } from "electron";
import { WindowManager } from "electron-infra-toolkit";

// 1. 初始化管理器
const windowManager = new WindowManager();

app.whenReady().then(() => {
  // 2. 创建主窗口
  const windowId = windowManager.create({
    name: "main-window", // 给窗口起个名字，方便后续查找
    title: "我的应用主页",
    url: "https://xxx.com", // 支持加载远程 URL 或本地文件

    // 根据环境判断是否开启开发模式（开启后会自动打开 DevTools）
    isDevelopment: !app.isPackaged,

    // 所有窗口的默认配置
    defaultConfig: {
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    },
  });

  console.log("窗口创建成功，ID:", windowId);
});
```

### 2. 管理多个窗口 (Managing Multiple Windows)

`electron-infra-toolkit` 会自动处理窗口的唯一性。如果你尝试用相同的 `name` 创建窗口，它会直接聚焦已存在的窗口，而不是新建一个。

```typescript
// 创建设置窗口
function openSettings() {
  windowManager.create({
    name: "settings", // 唯一标识
    width: 600,
    height: 400,
    title: "设置",
    resizable: false,
  });
}

// 在应用任何地方调用，不用担心重复创建
openSettings();
openSettings(); // 第二次调用只会聚焦已打开的设置窗口
```

### 3. 窗口间通信 (IPC Communication)

通过窗口 ID 或名称轻松发送消息。

```typescript
// 假设我们有一个名为 'dashboard' 的窗口
const dashboardId = windowManager.create({ name: 'dashboard', ... })

// 发送消息给指定窗口
windowManager.send(dashboardId, 'update-data', { status: 'ok' })

// 或者如果你不知道 ID，但知道名字（需结合自定义逻辑查找）
// 推荐在创建时保存 ID，或者使用 WindowStore 获取
import { WindowStore } from 'electron-infra-toolkit'

const windows = WindowStore.getAllWindows()
// 遍历查找特定窗口...
```

### 4. 高级用法：自定义窗口类 (Custom Window Classes)

对于复杂的应用，建议为不同类型的窗口创建单独的类。

```typescript
import { WindowManager } from "electron-infra-toolkit";

// 定义一个专门的登录窗口类
class LoginWindow extends WindowManager {
  constructor() {
    super();
  }

  // 封装创建逻辑
  open() {
    return this.create({
      name: "login",
      title: "用户登录",
      defaultConfig: {
        width: 400,
        height: 500,
        frame: false, // 无边框窗口
        resizable: false,
      },
    });
  }
}

// 使用
const loginWin = new LoginWindow();
loginWin.open();
```

### 5. 使用 WindowCreator 辅助类 (Safe Creation)

在 IPC 处理程序中，使用 `WindowCreator` 可以更安全地创建或恢复窗口。

```typescript
import { WindowCreator } from "electron-infra-toolkit";

// 假设这是你的 IPC 处理函数
ipcMain.handle("open-detail", async (event, data) => {
  const creator = new WindowCreator(
    { window: windowManager }, // 传入管理器实例
    {
      // 传递给窗口的数据
      data: { id: data.id },
    },
    WindowManager // 或者传入自定义的窗口类
  );

  // 创建并显示窗口
  // 如果窗口已存在，会自动恢复并聚焦
  creator.createAndShow();
});
```

### 6. IPC Bridge (Advanced IPC)

`ipc-bridge` 模块提供了一种更结构化的方式来处理 IPC 消息，特别适合需要统一管理 API 和处理器的场景。

```typescript
import { IpcBridge, IpcHandler } from "electron-infra-toolkit";

const bridge = new IpcBridge();

// 1. 定义处理器
const userHandler = new IpcHandler("user-service", "get-user", (api, data) => {
  return { id: 1, name: "John Doe" };
});

// 2. 注册处理器
bridge.addHandler(userHandler);

// 3. 模拟调用 (通常在 IPC 接收端调用)
const result = bridge.handle({ name: "user-service" });
console.log(result); // { id: 1, name: "John Doe" }
```

## 📚 API 文档

### `WindowManager` 类

核心管理类，提供窗口的增删改查。

- **`create(config)`**: 创建新窗口。
  - `config`: Electron `BrowserWindowConstructorOptions` 对象，额外支持 `name` (唯一标识) 和 `windowId`。
  - 返回: `string` (窗口的 UUID)。
- **`show(window, id)`**: 显示指定窗口。
- **`hide(id)`**: 隐藏指定窗口。
- **`close(id)`**: 关闭并销毁指定窗口。
- **`send(id, channel, data)`**: 向指定窗口发送 IPC 消息。
- **`getMainWindow()`**: 获取主窗口实例（通常是第一个创建的窗口）。

### `WindowStore` 静态类

用于全局访问和查询窗口实例。

- **`WindowStore.get(id)`**: 根据 ID 获取 `BrowserWindow` 实例。
- **`WindowStore.has(id)`**: 检查 ID 是否存在。
- **`WindowStore.getAllWindows()`**: 获取所有当前活跃的窗口映射 `Map<string, BrowserWindow>`。
- **`WindowStore.getByWebContentsId(id)`**: 通过 WebContents ID 查找窗口 ID。

## 📄 License

[ISC](LICENSE)

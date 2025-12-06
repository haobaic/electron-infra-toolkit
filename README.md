# Electron Infra Toolkit

一个专为 Electron 应用打造的综合基础设施套件（Infrastructure Kit），提供完整的窗口管理、进程间通信、状态同步和日志记录解决方案，助力开发者快速构建高质量的 Electron 应用。

## ✨ 特性

### 窗口管理 (Window Management)
- **UUID 窗口标识**: 使用 UUID 唯一标识窗口，同时支持自定义可读名称。
- **防重复创建**: 内置机制防止同一业务窗口被重复创建，自动聚焦已存在的窗口。
- **完整的生命周期管理**: 支持窗口的创建、显示、隐藏、关闭等完整生命周期操作。
- **全局窗口访问**: 通过静态存储实现全局窗口实例的访问和管理。

### 多窗口通信与同步
- **高效 IPC 通信**: 基于 Electron 的 IPC 机制，提供简化的通信接口。
- **IPC 桥接器**: 依赖注入设计，解耦业务逻辑与基础设施。
- **实时状态同步**: 基于 MessageChannel API 的高性能窗口间状态同步。
- **权限控制**: 字段级和窗口级的双重权限控制机制。

### 工具与日志
- **环境感知日志**: 自动根据环境调整日志级别和输出方式。
- **多实例日志**: 支持为不同模块创建独立的日志实例。
- **实用工具函数**: 提供常用的工具函数，如异步延迟等。
- **完整 TypeScript 支持**: 提供完整的类型定义，确保类型安全。

## 📦 安装

```bash
npm install electron-infra-toolkit
# 或者
pnpm add electron-infra-toolkit
# 或者
yarn add electron-infra-toolkit
```

## 🚀 使用指南

### 1. 窗口管理器 (Window Manager)

窗口管理器是 Electron Infra Toolkit 的核心模块，提供完整的窗口生命周期管理功能。

```typescript
import { app } from "electron";
import { WindowManager } from "electron-infra-toolkit";

// 初始化窗口管理器
const windowManager = new WindowManager();

app.whenReady().then(() => {
  // 创建主窗口
  const windowId = windowManager.create({
    name: "main-window", // 窗口名称，用于标识
    title: "Electron Infra Toolkit",
    url: "https://example.com", // 支持远程 URL 或本地文件路径
    isDevelopment: !app.isPackaged, // 开发环境自动打开 DevTools
    defaultConfig: {
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    },
  });

  // 创建设置窗口
  windowManager.create({
    name: "settings",
    title: "设置",
    width: 600,
    height: 400,
    resizable: false,
  });

  // 显示/隐藏窗口
  windowManager.show(windowId);
  windowManager.hide(windowId);

  // 发送消息给窗口
  windowManager.send(windowId, "update-data", { status: "ok" });
});
```

### 2. 进程间通信 (IPC)

IPC 模块提供了简化的 Electron 进程间通信接口。

```typescript
import { IPC } from "electron-infra-toolkit";

// 获取 IPC 实例（单例模式）
const ipc = IPC.getInstance();

// 注册事件监听器
ipc.on("window-created", (event, data) => {
  console.log("Window created:", data);
});

// 注册同步处理程序
ipc.handle("get-app-info", (event, data) => {
  return {
    version: app.getVersion(),
    name: app.getName(),
  };
});

// 移除监听器
ipc.removeListener("window-created", listener);
```

### 3. IPC 桥接器 (IPC Bridge)

IPC Bridge 提供了基于依赖注入的 IPC 通信解决方案，解耦业务逻辑与基础设施。

```typescript
import { IpcBridge, IpcHandler } from "electron-infra-toolkit";

// 创建 IPC Bridge 实例
const ipcBridge = new IpcBridge();

// 注入依赖
ipcBridge.addApi("app", app);
ipcBridge.addApi("windowManager", windowManager);

// 创建处理器
const appInfoHandler = new IpcHandler(
  "get-app-info",
  "app-info-request",
  (api, data) => {
    return {
      version: api.app.getVersion(),
      name: api.app.getName(),
      windowCount: api.windowManager.getWindowCount(),
    };
  }
);

// 注册处理器
ipcBridge.addHandler(appInfoHandler);

// 在主进程中处理请求
ipcMain.handle("ipc-bridge", (event, data) => {
  return ipcBridge.handle(data);
});
```

### 4. 多窗口状态同步 (Window Bridge)

Window Bridge 提供了基于 MessageChannel API 的高性能窗口间状态同步功能。

```typescript
import { WindowBridge } from "electron-infra-toolkit";

// 获取 Window Bridge 实例（单例模式）
const windowBridge = WindowBridge.getInstance();

// 绑定窗口
app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    // 窗口配置
  });

  // 注册窗口通信通道
  windowBridge.registerWindowPort("main-window", mainWindow);
});

// 设置共享数据
windowBridge.setData("app.theme", "dark");
windowBridge.setData("user", { name: "Alice", id: 123 });

// 获取数据
const theme = windowBridge.getData("app.theme");
const allData = windowBridge.getData();

// 删除数据
windowBridge.deleteData("app.tempData");
```

### 5. 日志模块 (Logger)

Logger 模块提供了环境感知的日志记录功能，基于 electron-log 封装。

```typescript
import { Logger } from "electron-infra-toolkit";

// 创建日志实例
const logger = new Logger("main");

// 记录不同级别的日志
logger.info("应用启动成功");
logger.debug("调试信息：用户配置已加载");
logger.warn("警告：内存使用率较高");
logger.error("错误：数据库连接失败");
logger.verbose("详细信息：正在执行初始化操作");
logger.silly("最详细信息：变量值为", variable);

// 为不同模块创建独立日志实例
const windowLogger = new Logger("window-manager");
const ipcLogger = new Logger("ipc-bridge");
```

### 6. 工具函数 (Utils)

Utils 模块提供了常用的工具函数。

```typescript
import { delay } from "electron-infra-toolkit";

// 使用异步延迟函数
async function processData() {
  console.log("开始处理数据");
  await delay(1000); // 延迟 1 秒
  console.log("数据处理完成");
}

// 在循环中使用
async function processItems(items: any[]) {
  for (const item of items) {
    await processItem(item);
    await delay(500); // 处理完一个项目后延迟 500ms
  }
}
```

## 📚 API 文档

### 窗口管理模块

#### `WindowManager` 类

核心窗口管理类，提供完整的窗口生命周期管理功能。

- **`create(config)`**: 创建新窗口。
  - `config`: 窗口配置对象，包含 `name`、`title`、`url`、`isDevelopment` 和 `defaultConfig` 等属性。
  - 返回: `string` (窗口的 UUID)。

- **`show(id)`**: 显示指定窗口。
  - `id`: 窗口 UUID。

- **`hide(id)`**: 隐藏指定窗口。
  - `id`: 窗口 UUID。

- **`close(id)`**: 关闭并销毁指定窗口。
  - `id`: 窗口 UUID。

- **`send(id, channel, data)`**: 向指定窗口发送 IPC 消息。
  - `id`: 窗口 UUID。
  - `channel`: 消息通道名称。
  - `data`: 要发送的数据。

- **`getMainWindow()`**: 获取主窗口实例。

#### `WindowStore` 静态类

全局窗口存储，用于访问和管理所有窗口实例。

- **`WindowStore.get(id)`**: 根据 ID 获取 `BrowserWindow` 实例。

- **`WindowStore.has(id)`**: 检查 ID 是否存在。

- **`WindowStore.getAllWindows()`**: 获取所有当前活跃的窗口映射 `Map<string, BrowserWindow>`。

- **`WindowStore.getByWebContentsId(id)`**: 通过 WebContents ID 查找窗口 ID。

### IPC 通信模块

#### `IPC` 类 (单例)

简化的 Electron IPC 通信接口。

- **`IPC.getInstance()`**: 获取 IPC 实例。

- **`on(channel, listener)`**: 注册事件监听器。

- **`handle(channel, listener)`**: 注册 IPC 消息处理程序。

- **`removeListener(channel, listener)`**: 移除事件监听器。

- **`removeHandler(channel)`**: 移除 IPC 消息处理程序。

#### `IpcBridge` 类

基于依赖注入的 IPC 通信桥接器。

- **`addApi(key, api)`**: 注入依赖 API。

- **`addHandler(handler)`**: 注册单个 IPC 处理器。

- **`addHandlers(handlers)`**: 批量注册多个 IPC 处理器。

- **`removeHandler(name)`**: 根据名称移除指定的 IPC 处理器。

- **`handle(data)`**: 处理 IPC 请求并返回结果。

#### `IpcHandler` 类

IPC 消息处理器。

- **构造函数**: `new IpcHandler(name, event, callback)`
  - `name`: 处理器名称。
  - `event`: 事件类型。
  - `callback`: 处理函数，接收 `api` 和 `data` 参数。

### 窗口桥接模块

#### `WindowBridge` 类 (单例)

多窗口状态同步管理类。

- **`WindowBridge.getInstance(eventName?)`**: 获取单例实例。
  - `eventName`: 可选，自定义事件名称，默认为 'window-state-changed'。

- **`registerWindowPort(windowId, window)`**: 为窗口注册 MessagePort 通信通道。

- **`unregisterWindowPort(windowId)`**: 注销窗口的 MessagePort 通信通道。

- **`getData(key?)`**: 获取共享状态。

- **`setData(key, value, windowId?, eventName?)`**: 设置共享状态（带权限验证）。

- **`deleteData(key, windowId?, eventName?)`**: 删除共享状态中的字段（带权限验证）。

### 日志模块

#### `Logger` 类

环境感知的日志记录类。

- **构造函数**: `new Logger(appName?)`
  - `appName`: 可选，日志实例名称，默认为 'main'。

- **`info(message)`**: 记录信息级别日志。

- **`debug(message)`**: 记录调试级别日志。

- **`error(message)`**: 记录错误级别日志。

- **`warn(message)`**: 记录警告级别日志。

- **`verbose(message)`**: 记录详细级别日志。

- **`silly(message)`**: 记录最详细级别日志。

- **`getLogger()`**: 获取底层的 electron-log 实例。

### 工具模块

#### `delay(ms)`

异步延迟函数。

- `ms`: 延迟毫秒数。
- 返回: `Promise<void>`

## 📁 项目结构

```
electron-infra-toolkit/
├── src/
│   ├── IPC/              # 进程间通信模块
│   ├── ipc-bridge/       # IPC 通信桥接器
│   ├── logger/           # 日志模块
│   ├── utils/            # 工具函数
│   ├── window-bridge/    # 多窗口状态同步桥接器
│   └── window-manager/   # 窗口管理器
├── examples/             # 使用示例
├── package.json
├── tsconfig.json
└── README.md
```

## 📄 License

[ISC](LICENSE)

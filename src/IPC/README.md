# IPC 模块

IPC 模块是对 Electron 原生 `ipcMain` 的封装，旨在提供更安全、更健壮且具备日志记录能力的通信机制。

## 特性

- **自动日志记录**：自动记录所有通信事件的参数，如果参数包含 `name` 字段，会优先记录 Action Name。
- **错误自动捕获**：`handle` 方法中的业务异常会被自动捕获并记录错误日志，防止主进程崩溃。
- **防止重复注册**：自动检测并清理重复注册的 Handler，避免 Electron 抛出 "second handler" 错误。
- **资源管理**：提供细粒度的 `removeListener` 和 `removeHandler` 方法，以及一键清理功能。

## 使用方法

```typescript
import IPC from "./IPC";

// 1. 注册 invoke/handle 处理器 (异步)
IPC.handle("my-channel", async (event, data) => {
  console.log("收到请求:", data);
  return { success: true };
});

// 2. 注册 send/on 监听器 (同步/异步)
IPC.on("my-sync-channel", (event, data) => {
  console.log("收到消息:", data);
});

// 3. 移除监听
IPC.removeHandler("my-channel");
```

## 日志格式

模块会自动生成如下格式的日志，方便排查问题：

- **普通调用**: `[INFO] [HANDLE] my-channel [Action: get-user]`
- **详细参数**: `[INFO] [HANDLE] my-channel [Args: [{"id": 1}]]`
- **错误日志**: `[ERROR] [HANDLE ERROR] my-channel: Database connection failed`

## API 参考

### IPC 类

#### 构造函数
```typescript
// IPC 是单例模式，直接导入使用
import IPC from "./IPC";
```

#### 方法

- **`on(channel: string, cb: IPCEventHandler = emptyFunc): void`**
  - 注册监听事件 (对应 `ipcMain.on`)
  - `channel`: 事件名称
  - `cb`: 回调函数，接收 `(event: IpcMainEvent, ...args: unknown[])` 参数
  - 自动记录事件日志并捕获错误

- **`handle(channel: string, cb: IPCHandleHandler = emptyFunc): void`**
  - 注册处理事件 (对应 `ipcMain.handle`)
  - `channel`: 事件名称
  - `cb`: 回调函数，接收 `(event: IpcMainInvokeEvent, ...args: unknown[])` 参数
  - 自动记录事件日志、捕获错误，并防止重复注册

- **`removeListener(channel: string): void`**
  - 移除指定频道的所有监听器
  - `channel`: 事件名称

- **`removeAllListeners(channel?: string): void`**
  - 移除所有监听器或指定频道的监听器
  - `channel`: 可选，事件名称，不指定则移除所有监听器

- **`removeHandler(channel: string): void`**
  - 移除指定频道的处理器
  - `channel`: 事件名称

- **`removeAllHandlers(): void`**
  - 移除所有处理器

- **`error(err: string): void`**
  - 记录 IPC 系统错误日志
  - `err`: 错误信息

- **`log(data: string): void`**
  - 记录 IPC 系统普通日志
  - `data`: 日志信息

## 最佳实践

### 1. 统一通信格式

建议使用以下格式进行 IPC 通信，以便日志系统能够自动识别操作名称：

```typescript
// 渲染进程
electron.ipcRenderer.invoke('my-channel', {
  name: 'get-user', // 操作名称，将被日志系统自动识别
  data: { id: 1 }   // 实际数据
});

// 主进程
IPC.handle('my-channel', async (event, request) => {
  const { name, data } = request;
  // 处理请求
});
```

### 2. 错误处理

虽然 IPC 模块会自动捕获错误，但建议在回调函数中添加适当的错误处理：

```typescript
IPC.handle('my-channel', async (event, request) => {
  try {
    // 业务逻辑
    return { success: true, result: data };
  } catch (error) {
    // 自定义错误处理
    return { success: false, error: error.message };
  }
});
```

### 3. 资源清理

在应用关闭或模块卸载时，清理所有 IPC 监听器和处理器：

```typescript
// 清理所有监听器
IPC.removeAllListeners();

// 清理所有处理器
IPC.removeAllHandlers();
```

### 4. 频道命名规范

使用清晰、描述性的频道名称，建议采用 `模块名-操作类型` 的格式：

```typescript
// 好的命名
IPC.handle('user-get', ...);
IPC.handle('user-save', ...);
IPC.on('window-close', ...);

// 不推荐的命名
IPC.handle('get', ...);
IPC.handle('save', ...);
IPC.on('close', ...);
```

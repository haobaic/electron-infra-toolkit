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

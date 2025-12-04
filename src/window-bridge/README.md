# WindowBridge - 多窗口状态同步与通信桥梁

## 概述

`WindowBridge` 是 `electron-infra-toolkit` 的核心模块之一，提供高效的多窗口实时状态同步与通信功能。

## 特性

- ✅ **静态存储**：遵循 WindowStore 设计模式，所有实例共享数据
- ✅ **MessagePort 广播**：高效的窗口间通信，低延迟
- ✅ **权限控制**：字段级只读 + 窗口级修改权限
- ✅ **自动集成**：与 WindowManager 生命周期自动集成
- ✅ **本地缓存**：渲染进程维护数据副本，减少 IPC 调用

## 架构

```
主进程                          渲染进程
┌─────────────────┐            ┌──────────────┐
│  WindowBridge   │            │  Window A    │
│  (静态存储)      │◄──IPC──────┤  本地缓存     │
│                 │            └──────────────┘
│  MessagePort    │──广播────┐
│  管理器          │          │  ┌──────────────┐
└─────────────────┘          ├─►│  Window B    │
                             │  │  本地缓存     │
                             │  └──────────────┘
                             │
                             │  ┌──────────────┐
                             └─►│  Window C    │
                                │  本地缓存     │
                                └──────────────┘
```

## API 参考

### 主进程 API

```typescript
import { WindowBridge } from 'electron-infra-toolkit'

const bridge = WindowBridge.getInstance()

// 初始化 IPC 监听器 (可选)
bridge.initializeIpc()

// 获取数据
bridge.getData(key?: string): any

// 设置数据
bridge.setData(key: string, value: any, windowId?: string): { success: boolean; error?: string }

// 删除数据
bridge.deleteData(key: string, windowId?: string): { success: boolean; error?: string }

// 设置权限
bridge.setFieldPermission(key: string, permission: FieldPermission): void
```

### IPC 通道

如果调用了 `initializeIpc()`，将启用以下 IPC 通道：

| 通道名称                       | 参数                                  | 返回值                | 说明     |
| ------------------------------ | ------------------------------------- | --------------------- | -------- |
| `window-bridge-get`            | `{ key?: string }`                    | `any`                 | 获取数据 |
| `window-bridge-set`            | `{ key, value, windowId }`            | `{ success, error? }` | 设置数据 |
| `window-bridge-delete`         | `{ key, windowId }`                   | `{ success, error? }` | 删除数据 |
| `window-bridge-set-permission` | `{ key, readonly?, allowedWindows? }` | `{ success }`         | 设置权限 |

### 渲染进程事件

| 事件名称              | 数据格式          | 说明             |
| --------------------- | ----------------- | ---------------- |
| `window-bridge-port`  | `MessagePort`     | 接收数据同步端口 |
| MessagePort.onmessage | `DataChangeEvent` | 数据变更通知     |

## 使用示例

### 基本用法

```typescript
// 渲染进程
// 设置数据
await window.api.invoke("window-bridge-set", {
  key: "user",
  value: { name: "Alice", age: 25 },
  windowId: currentWindowId,
});

// 获取数据
const user = await window.api.invoke("window-bridge-get", { key: "user" });
console.log(user); // { name: 'Alice', age: 25 }
```

### 监听数据变化

```typescript
// 接收 MessagePort
window.api.on("window-bridge-port", (event) => {
  const port = event.ports[0];

  port.onmessage = (e) => {
    const change = JSON.parse(e.data);
    console.log("数据变化:", change);
    // { type: 'set', key: 'user', value: {...}, timestamp: ... }
  };

  port.start();
});
```

### 完整示例：带本地缓存

```typescript
// 渲染进程初始化代码
let bridgePort: MessagePort | null = null;
let localDataCache: Record<string, any> = {};

// 1. 接收 MessagePort
window.api.on("window-bridge-port", (event) => {
  bridgePort = event.ports[0];

  // 监听数据变更
  bridgePort.onmessage = (e) => {
    const changeEvent = JSON.parse(e.data);
    console.log("📡 Data changed:", changeEvent);

    // 更新本地缓存
    if (changeEvent.type === "set") {
      localDataCache[changeEvent.key] = changeEvent.value;
    } else if (changeEvent.type === "delete") {
      delete localDataCache[changeEvent.key];
    }

    // 触发应用状态更新（例如 Pinia/Vuex）
    // store.commit('syncData', changeEvent)
  };

  bridgePort.start();

  // 初始化：获取所有数据
  window.api.invoke("window-bridge-get").then((data) => {
    localDataCache = data;
    console.log("📦 Initial data loaded:", data);
  });
});

// 2. 设置数据
async function setSharedData(key: string, value: any) {
  const windowId = getWindowId(); // 获取当前窗口ID
  const result = await window.api.invoke("window-bridge-set", {
    key,
    value,
    windowId,
  });

  if (!result.success) {
    console.error("❌ Failed to set data:", result.error);
  }
  return result;
}

// 3. 获取数据（从本地缓存，快速）
function getSharedData(key?: string) {
  return key ? localDataCache[key] : localDataCache;
}
```

### 权限控制

```typescript
// 设置只读字段
await window.api.invoke("window-bridge-set-permission", {
  key: "appConfig",
  readonly: true,
});

// 设置窗口级权限（只有主窗口可修改）
await window.api.invoke("window-bridge-set-permission", {
  key: "settings",
  allowedWindows: ["main-window-id"],
});

// 尝试修改只读字段
const result = await window.api.invoke("window-bridge-set", {
  key: "appConfig",
  value: "new value",
});
console.log(result); // { success: false, error: 'Field "appConfig" is readonly' }
```

## 集成到项目

模块已自动集成到 `WindowManager`，无需额外配置。

创建窗口时会自动：

1. 注册 MessagePort
2. 发送端口到渲染进程
3. 窗口关闭时自动清理

## 最佳实践

1. **使用本地缓存**：渲染进程维护数据副本，读取时直接从缓存获取
2. **避免频繁更新**：虽然 MessagePort 很快，但过于频繁的更新仍会占用资源

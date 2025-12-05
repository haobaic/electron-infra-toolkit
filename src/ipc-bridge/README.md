# IpcBridge - IPC 通信桥接器

`IpcBridge` 是一个轻量级、高度可扩展的 IPC（进程间通信）管理模块，专为 Electron 应用设计，旨在解决传统 IPC 通信中存在的逻辑分散、耦合度高、难以维护等问题。

它采用 **依赖注入 (Dependency Injection)** 和 **单通道多路复用** 的设计思想，将 IPC 通信转化为可插拔的“处理器”模式，使业务逻辑与基础设施完全解耦。

## 核心价值

### 1. 依赖注入 (Dependency Injection)

传统的 IPC 写法通常直接在 Handler 中引用 `mainWindow` 或其他全局变量，导致业务逻辑与主进程启动代码强耦合，难以测试和拆分。

`IpcBridge` 允许你在运行时通过 `addApi` 注入依赖，Handler 只需关注“使用 API”而无需关心“API 从哪来”。

### 2. 单通道多路复用 (Single Channel Multiplexing)

无论应用有多少个 IPC 接口，主进程只需要保留**一个** IPC 监听入口。所有的业务逻辑分发都由 `IpcBridge` 内部完成，保持 `main.ts` 的极致整洁。

### 3. 开闭原则 (Open-Closed Principle)

新增功能时，只需添加新的 `IpcHandler`，无需修改主进程的初始化代码。这使得多人协作和功能扩展变得异常简单。

## 架构设计

```
Renderer Process (渲染进程)        Main Process (主进程)
┌──────────────────────┐          ┌─────────────────────────────────────┐
│                      │          │                                     │
│  ipcRenderer.invoke  │─────────►│  ipcMain.handle('channel')          │
│   (name, data)       │          │            │                        │
│                      │          │            ▼                        │
│                      │          │      ┌─────────────┐                │
│                      │          │      │  IpcBridge  │                │
│                      │          │      └─────────────┘                │
│                      │          │            │                        │
│                      │          │    1. Find Handler by 'name'        │
│                      │          │    2. Inject API (DI Container)     │
│                      │          │            │                        │
│                      │          │            ▼                        │
│                      │          │      ┌─────────────┐                │
│                      │          │      │ IpcHandler  │                │
│                      │          │      │ (Business)  │◄── APIs        │
│                      │          │      └─────────────┘                │
│                      │          │            │                        │
│                      │          │            ▼                        │
│                      │          │      Return Result                  │
│                      │          │            │                        │
└──────────────────────┘          │            │                        │
│      Result          │◄─────────│────────────┘                        │
└──────────────────────┘          └─────────────────────────────────────┘
```

**流程详解：**

1.  **请求发起**：渲染进程通过单一通道（如 `renderer-to-main`）发送请求，附带目标处理器名称（`name`）。
2.  **统一分发**：主进程的监听器将请求直接转交给 `IpcBridge`。
3.  **依赖组装**：`IpcBridge` 找到对应的 Handler，并将预先注入的 API 对象（`DI_Container`）传递给 Handler。
4.  **业务执行**：Handler 使用注入的 API 执行具体的业务逻辑（如读写文件、查询数据库）。
5.  **结果返回**：执行结果原路返回给渲染进程。

## 快速开始

### 1. 安装与导入

```bash
# 使用 npm
npm install electron-infra-toolkit

# 使用 yarn
yarn add electron-infra-toolkit

# 使用 pnpm
pnpm add electron-infra-toolkit
```

```typescript
// 主进程中导入
import { IpcBridge, IpcHandler } from 'electron-infra-toolkit';
import { ipcMain as IPC } from 'electron';
```

### 2. 定义业务处理器 (Handlers)

业务逻辑可以拆分到独立的文件中，不依赖任何具体的 Electron 实例，便于测试和维护。

```typescript
// handlers/app-handlers.ts
import { IpcHandler } from 'electron-infra-toolkit';

const appHandlers: IpcHandler[] = [];

// 示例：应用信息处理器
appHandlers.push(
  new IpcHandler(
    'getAppInfo', // 处理器唯一名称
    'app-info-event', // 事件类型（元数据）
    (api): { name: string; version: string; isDev: boolean } => {
      return {
        name: 'My Electron App',
        version: api.app.getVersion(),
        isDev: !api.app.isPackaged
      };
    }
  )
);

// 示例：窗口控制处理器
appHandlers.push(
  new IpcHandler(
    'controlWindow',
    'window-control-event',
    (api, data: { action: string; windowId?: string }) => {
      const { action, windowId } = data;
      const targetWindowId = windowId || api.window.getMainWindowId();
      
      switch (action) {
        case 'minimize':
          api.window.minimize(targetWindowId);
          return { success: true, action: 'minimize' };
        case 'maximize':
          api.window.maximize(targetWindowId);
          return { success: true, action: 'maximize' };
        case 'close':
          api.window.winClose(targetWindowId);
          return { success: true, action: 'close' };
        default:
          return { success: false, error: 'Unknown action' };
      }
    }
  )
);

// 示例：文件操作处理器
appHandlers.push(
  new IpcHandler(
    'fileOperation',
    'file-operation-event',
    (api, data: { operation: string; path: string; content?: string }) => {
      const { operation, path, content } = data;
      
      try {
        switch (operation) {
          case 'read':
            return { success: true, content: api.fs.readFileSync(path, 'utf8') };
          case 'write':
            if (!content) throw new Error('Content is required for write operation');
            api.fs.writeFileSync(path, content, 'utf8');
            return { success: true };
          default:
            return { success: false, error: 'Unknown operation' };
        }
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }
  )
);

export default appHandlers;
```

### 3. 主进程初始化与依赖注入

在应用启动代码中，实例化 `IpcBridge` 并将所需的依赖（如 `app`、`windowManager`、`fs` 等）注入到 Bridge 中。

```typescript
// main.ts
import { app, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IpcBridge } from 'electron-infra-toolkit';
import WindowManager from './window-manager/WindowManager';
import appHandlers from './handlers/app-handlers';

class App {
  private ipcBridge: IpcBridge;
  private windowManager: WindowManager;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    // 实例化 IpcBridge
    this.ipcBridge = new IpcBridge();
    
    // 实例化窗口管理器
    this.windowManager = new WindowManager();
    
    // 设置应用事件
    app.on('ready', () => this.onReady());
    app.on('window-all-closed', () => this.onWindowAllClosed());
    app.on('activate', () => this.onActivate());
  }

  private onReady() {
    // 创建主窗口
    this.mainWindow = this.windowManager.create({
      name: 'main-window',
      title: 'My Electron App',
      width: 1024,
      height: 768,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    // 加载应用
    if (app.isPackaged) {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    } else {
      this.mainWindow.loadURL('http://localhost:5173');
    }
    
    // 【关键步骤】注入依赖 API
    this.ipcBridge.addApi('app', app);
    this.ipcBridge.addApi('window', this.windowManager);
    this.ipcBridge.addApi('fs', fs);
    this.ipcBridge.addApi('path', path);
    
    // 【关键步骤】注册业务处理器
    this.ipcBridge.addHandlers(appHandlers);
    
    // 设置 IPC 通信通道
    this.setupIPC();
  }

  /**
   * 设置 Electron IPC 通信通道
   */
  private setupIPC() {
    // 异步 IPC 通信（推荐使用）
    IPC.handle('renderer-to-main', (_event, data) => {
      console.log('Received async IPC request:', data);
      return this.ipcBridge.handle(data);
    });
    
    // 同步 IPC 通信（仅在必要时使用）
    IPC.on('renderer-to-main-sync', (event, data) => {
      console.log('Received sync IPC request:', data);
      const result = this.ipcBridge.handle(data);
      event.returnValue = result;
    });
  }

  private onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  private onActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.onReady();
    }
  }
}

// 启动应用
new App();
```

### 4. 渲染进程调用

在渲染进程中，通过预加载脚本暴露的 API 调用 IPC 方法。

#### 预加载脚本 (preload.ts)

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 IPC API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 异步 IPC 调用
  invoke: (channel: string, data: any) => {
    return ipcRenderer.invoke(channel, data);
  },
  
  // 同步 IPC 调用（仅在必要时使用）
  sendSync: (channel: string, data: any) => {
    return ipcRenderer.sendSync(channel, data);
  },
  
  // 发送事件（单向）
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  
  // 监听事件
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  
  // 移除事件监听
  off: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.off(channel, callback);
  }
});
```

#### 渲染进程代码 (renderer.ts)

```typescript
// renderer.ts

// 异步调用示例：获取应用信息
async function getAppInfo() {
  try {
    const result = await window.electronAPI.invoke('renderer-to-main', {
      name: 'getAppInfo'
    });
    console.log('应用信息:', result);
    // 输出: { name: 'My Electron App', version: '1.0.0', isDev: true }
  } catch (error) {
    console.error('获取应用信息失败:', error);
  }
}

// 异步调用示例：控制窗口
async function controlWindow(action: string, windowId?: string) {
  try {
    const result = await window.electronAPI.invoke('renderer-to-main', {
      name: 'controlWindow',
      action,
      windowId
    });
    console.log('窗口控制结果:', result);
  } catch (error) {
    console.error('窗口控制失败:', error);
  }
}

// 异步调用示例：文件操作
async function readFile(filePath: string) {
  try {
    const result = await window.electronAPI.invoke('renderer-to-main', {
      name: 'fileOperation',
      operation: 'read',
      path: filePath
    });
    
    if (result.success) {
      console.log('文件内容:', result.content);
      return result.content;
    } else {
      console.error('读取文件失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('读取文件发生错误:', error);
    return null;
  }
}

async function writeFile(filePath: string, content: string) {
  try {
    const result = await window.electronAPI.invoke('renderer-to-main', {
      name: 'fileOperation',
      operation: 'write',
      path: filePath,
      content
    });
    
    if (result.success) {
      console.log('文件写入成功');
      return true;
    } else {
      console.error('文件写入失败:', result.error);
      return false;
    }
  } catch (error) {
    console.error('文件写入发生错误:', error);
    return false;
  }
}
```
```

## API 参考

### `IpcBridge` 类

#### 构造函数
```typescript
new IpcBridge();
```
创建一个新的 `IpcBridge` 实例。

#### 方法

- **`addApi(key: string, api: any): void`**
  - 向 IpcBridge 注入依赖 API。
  - `key`: API 在依赖容器中的属性名。
  - `api`: 要注入的 API 对象或模块。

- **`addHandler(handler: IpcHandler): void`**
  - 注册单个 IPC 处理器。
  - `handler`: `IpcHandler` 实例。

- **`addHandlers(handlers: IpcHandler[]): void`**
  - 批量注册多个 IPC 处理器。
  - `handlers`: `IpcHandler` 实例数组。

- **`removeHandler(name: string): void`**
  - 根据名称移除指定的 IPC 处理器。
  - `name`: 处理器的名称。

- **`handle(data: { name: string, [key: string]: any }): any`**
  - 处理 IPC 请求并返回结果。
  - `data`: 包含请求信息的对象。
    - `name`: 处理器名称（必填）。
    - 其他属性：传递给处理器的数据。

### `IpcHandler` 类

#### 构造函数
```typescript
new IpcHandler(name: string, event: string, callback: (api: Record<string, any>, data: any) => any);
```
创建一个新的 IPC 处理器。

#### 参数
- `name`: 处理器的唯一名称，用于匹配 IPC 请求。
- `event`: 事件类型（元数据，用于标识处理器的用途）。
- `callback`: 处理 IPC 请求的回调函数。
  - `api`: 包含所有注入依赖的对象。
  - `data`: 从渲染进程传递的数据。
  - 返回值：处理结果，将返回给渲染进程。

#### 属性
- `name: string`: 获取处理器名称。
- `event: string`: 获取事件类型。
- `callback: (api: Record<string, any>, data: any) => any`: 获取回调函数。

## 高级特性

### 1. 动态添加/移除处理器

`IpcBridge` 支持在应用运行时动态添加或移除处理器，这对于插件化架构特别有用。

```typescript
// 动态添加处理器
const dynamicHandler = new IpcHandler(
  'dynamic-feature',
  'dynamic-event',
  (api, data) => {
    return { message: 'This is a dynamic feature' };
  }
);

ipcBridge.addHandler(dynamicHandler);

// 动态移除处理器
ipcBridge.removeHandler('dynamic-feature');
```

### 2. 依赖注入的优势

- **解耦**: 业务逻辑与基础设施（如 `app`、`window`、`fs` 等）完全解耦。
- **可测试**: 可以轻松替换依赖进行单元测试。
- **可维护**: 依赖关系清晰，便于理解和维护。
- **可扩展**: 可以轻松添加新的依赖，而不需要修改现有的处理器。

### 3. 错误处理

建议在处理器中添加适当的错误处理，以确保错误能够正确返回给渲染进程。

```typescript
const safeHandler = new IpcHandler(
  'safe-operation',
  'safe-event',
  async (api, data) => {
    try {
      // 执行可能抛出错误的操作
      const result = await api.someService.performOperation(data);
      return { success: true, result };
    } catch (error) {
      // 捕获并格式化错误
      return { 
        success: false, 
        error: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      };
    }
  }
);
```

## 最佳实践

### 1. 处理器组织

- **按功能模块组织**: 将相关的处理器放在同一个文件或目录中。
- **命名规范**: 为处理器选择清晰、描述性的名称。
- **单一职责**: 每个处理器只负责一个功能。

### 2. 依赖管理

- **最小化注入**: 只注入处理器真正需要的依赖。
- **依赖分组**: 将相关的依赖分组注入，提高代码可读性。

### 3. 性能考虑

- **避免同步调用**: 尽量使用异步 IPC 调用 (`ipcRenderer.invoke`)，避免阻塞渲染进程。
- **批量操作**: 将多个相关操作合并为一个 IPC 请求，减少通信开销。

### 4. 安全性

- **输入验证**: 在处理器中验证所有来自渲染进程的输入。
- **权限检查**: 对于敏感操作，添加适当的权限检查。
- **数据过滤**: 返回给渲染进程的数据应该只包含必要的信息。

## 与传统 IPC 通信的对比

| 特性 | 传统 IPC | IpcBridge |
|------|----------|-----------|
| 代码组织 | 分散在多个文件中 | 集中管理，按功能分组 |
| 耦合度 | 高（直接依赖基础设施） | 低（通过依赖注入解耦） |
| 可测试性 | 困难（难以模拟依赖） | 容易（可以替换依赖进行测试） |
| 可扩展性 | 差（添加新功能需要修改多处代码） | 好（只需添加新的处理器） |
| 错误处理 | 分散 | 统一 |
| 调试难度 | 高（需要跟踪多个 IPC 通道） | 低（单一入口，统一日志） |

## 测试示例

以下是使用 Jest 测试 IPC 处理器的示例：

```typescript
// handlers/app-handlers.test.ts
import IpcHandler from 'electron-infra-toolkit/src/ipc-bridge/IpcHandler';
import appHandlers from './app-handlers';

// 模拟依赖
const mockApi = {
  app: {
    getVersion: () => '1.0.0',
    isPackaged: false
  },
  window: {
    minimize: jest.fn(),
    maximize: jest.fn(),
    winClose: jest.fn(),
    getMainWindowId: () => 'main-window-123'
  },
  fs: {
    readFileSync: jest.fn(() => 'test content'),
    writeFileSync: jest.fn()
  }
};

describe('App Handlers', () => {
  test('getAppInfo handler should return correct app info', () => {
    const getAppInfoHandler = appHandlers.find(handler => handler.name === 'getAppInfo');
    expect(getAppInfoHandler).toBeDefined();
    
    if (getAppInfoHandler) {
      const result = getAppInfoHandler.callback(mockApi, {});
      expect(result).toEqual({
        name: 'My Electron App',
        version: '1.0.0',
        isDev: true
      });
    }
  });
  
  test('controlWindow handler should call correct window method', () => {
    const controlWindowHandler = appHandlers.find(handler => handler.name === 'controlWindow');
    expect(controlWindowHandler).toBeDefined();
    
    if (controlWindowHandler) {
      // 测试 minimize 操作
      controlWindowHandler.callback(mockApi, { action: 'minimize' });
      expect(mockApi.window.minimize).toHaveBeenCalledWith('main-window-123');
      
      // 测试 maximize 操作
      controlWindowHandler.callback(mockApi, { action: 'maximize' });
      expect(mockApi.window.maximize).toHaveBeenCalledWith('main-window-123');
    }
  });
  
  test('fileOperation handler should handle file read correctly', () => {
    const fileOperationHandler = appHandlers.find(handler => handler.name === 'fileOperation');
    expect(fileOperationHandler).toBeDefined();
    
    if (fileOperationHandler) {
      const result = fileOperationHandler.callback(mockApi, { 
        operation: 'read', 
        path: '/test/file.txt' 
      });
      
      expect(result).toEqual({
        success: true,
        content: 'test content'
      });
      expect(mockApi.fs.readFileSync).toHaveBeenCalledWith('/test/file.txt', 'utf8');
    }
  });
});
```


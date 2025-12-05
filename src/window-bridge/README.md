# WindowBridge - 多窗口状态管理桥接器

`WindowBridge` 是一个功能强大、高度可扩展的多窗口状态管理和通信模块，专为 Electron 应用设计，解决了传统多窗口应用中状态不一致、通信复杂等问题。

它基于 **MessageChannel API** 构建，通过共享状态和事件广播实现窗口间的实时数据同步与通信，同时提供了灵活的权限控制机制，确保数据安全。

## 核心价值

### 1. 实时状态广播 (Real-time State Broadcasting)

在多窗口应用中，保持各窗口数据一致是最大的挑战（例如：在一个窗口修改了主题，所有窗口都需要立即响应）。
`WindowBridge` 实现了一个“单一数据源”模型：任何窗口修改数据，Bridge 会自动将变更**广播**给所有其他已注册的窗口。

### 2. 高性能通信 (High Performance)

基于 `MessageChannelMain` 和 `MessagePort`，直接在进程间传递消息，比传统的通过主进程中转 IPC 事件的方式更高效，延迟更低。

### 3. 细粒度权限控制 (Permission Control)

支持字段级别的权限设置，防止未授权的窗口修改关键数据。

- **ReadOnly**: 只读数据，任何窗口都无法修改。
- **AllowedWindows**: 指定只有特定的窗口（如设置窗口）才能修改某个字段。

## 架构设计

`WindowBridge` 采用了**发布-订阅 (Pub/Sub)** 和 **单一数据源 (Single Source of Truth)** 的混合架构。

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

**关键流程解析：**

1.  **初始化阶段**：主进程为每个窗口创建一个 `MessageChannel`，端口 1 留在主进程，端口 2 发送给渲染进程。
2.  **数据修改**：渲染进程通过 IPC 通道（如 `window-bridge-set`）发送修改请求。
3.  **鉴权与更新**：主进程检查 `readonly` 和 `allowedWindows` 权限。如果通过，更新主进程的静态存储。
4.  **全量广播**：主进程通过 `MessagePort 管理器` 遍历所有连接的端口，发送 `set` 事件。
5.  **本地更新**：渲染进程收到广播后，更新本地的缓存（Cache），触发 UI 响应式更新。

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

### 2. 主进程配置

```typescript
// main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import WindowBridge from 'electron-infra-toolkit/src/window-bridge/WindowBridge';
import WindowManager from './window-manager/WindowManager';

class App {
  private windowBridge: WindowBridge;
  private windowManager: WindowManager;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    // 初始化 WindowBridge 并定义全局共享状态
    this.windowBridge = new WindowBridge({
      // 基本窗口状态
      name: "main",
      title: "主窗口",
      visible: true,
      settings: {
        theme: "light",
        language: "zh-CN",
        fontSize: 16,
        autoSave: true
      },
      
      // 用户数据
      user: {
        id: "12345",
        name: "张三",
        email: "zhangsan@example.com",
        role: "admin"
      },
      
      // 应用状态
      app: {
        version: "1.0.0",
        isOnline: true,
        lastSync: new Date().toISOString()
      }
    });

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

    // 将主窗口与 WindowBridge 绑定
    this.windowBridge.bindWindow(this.mainWindow);

    // 配置权限控制
    this.setupPermissions();

    // 加载应用
    if (app.isPackaged) {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    } else {
      this.mainWindow.loadURL('http://localhost:5173');
    }
  }

  /**
   * 配置字段权限
   */
  private setupPermissions() {
    // 基本窗口状态 - 允许读写
    this.windowBridge.setFieldPermission("title", "both");
    this.windowBridge.setFieldPermission("visible", "both");
    
    // 应用设置 - 只读（只能在主进程修改）
    this.windowBridge.setFieldPermission("settings", "readOnly");
    
    // 用户数据 - 只读
    this.windowBridge.setFieldPermission("user", "readOnly");
    
    // 应用状态 - 只读
    this.windowBridge.setFieldPermission("app", "readOnly");
  }

  // 其他应用生命周期方法...
}

// 启动应用
new App();
```

### 3. 预加载脚本配置

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// 暴露 WindowBridge API 给渲染进程
contextBridge.exposeInMainWorld('windowBridge', {
  // 获取共享状态
  getData: () => ipcRenderer.invoke('window-bridge-get-data'),
  
  // 更新共享状态
  update: (field: string, value: any) => ipcRenderer.invoke('window-bridge-update', { field, value }),
  
  // 获取字段权限
  getFieldPermission: (field: string) => ipcRenderer.invoke('window-bridge-get-permission', field),
  
  // 监听状态变化
  onDataChange: (callback: (event: any) => void) => {
    const listener = (event: any, data: any) => callback(data);
    ipcRenderer.on('window-bridge-data-change', listener);
    return () => ipcRenderer.off('window-bridge-data-change', listener);
  }
});

// 主进程 IPC 处理器
ipcMain.handle('window-bridge-get-data', (event) => {
  const windowBridge = global.windowBridge as WindowBridge;
  return windowBridge.getData();
});

ipcMain.handle('window-bridge-update', (event, { field, value }) => {
  const windowBridge = global.windowBridge as WindowBridge;
  return windowBridge.update(field, value);
});

ipcMain.handle('window-bridge-get-permission', (event, field) => {
  const windowBridge = global.windowBridge as WindowBridge;
  return windowBridge.getFieldPermission(field);
});
```

### 4. 渲染进程使用

```typescript
// renderer.ts

// 初始化 WindowBridge （通过预加载脚本暴露）
const windowBridge = window.windowBridge;

// 获取当前共享状态
async function getSharedState() {
  const state = await windowBridge.getData();
  console.log('当前共享状态:', state);
  // 输出示例: { name: 'main', title: '主窗口', settings: { theme: 'light' }, ... }
  return state;
}

// 监听状态变化
function setupStateListeners() {
  const removeListener = windowBridge.onDataChange((event) => {
    console.log(`字段 ${event.field} 从 ${event.oldValue} 变为 ${event.newValue}`);
    
    // 根据不同字段更新 UI
    if (event.field === 'settings.theme') {
      updateTheme(event.newValue);
    } else if (event.field === 'title') {
      document.title = event.newValue;
    }
  });
  
  // 在组件卸载时移除监听
  // removeListener();
}

// 更新共享状态
async function updateSharedState() {
  // 更新窗口标题
  await windowBridge.update('title', '更新后的窗口标题');
  
  // 更新主题设置（如果有写入权限）
  const canWriteTheme = await windowBridge.getFieldPermission('settings.theme');
  if (canWriteTheme === 'both') {
    await windowBridge.update('settings.theme', 'dark');
  } else {
    console.log('没有权限修改主题设置');
  }
  
  // 更新嵌套字段
  await windowBridge.update('settings.fontSize', 18);
  await windowBridge.update('user.name', '李四');
}

// 检查权限
async function checkPermissions() {
  const titlePermission = await windowBridge.getFieldPermission('title');
  const themePermission = await windowBridge.getFieldPermission('settings.theme');
  
  console.log('标题权限:', titlePermission); // both
  console.log('主题权限:', themePermission); // readOnly
}

// 初始化应用
async function initApp() {
  await getSharedState();
  setupStateListeners();
  await checkPermissions();
}

// 启动初始化
initApp();

## API 参考

### WindowBridge 类

#### 构造函数

```typescript
new WindowBridge(initialData: Record<string, any>);
```
- `initialData`: 共享状态的初始值，可以是任意 JSON 序列化的对象。

#### 核心方法

- **`bindWindow(window: Electron.BrowserWindow): void`**
  - 关联一个 BrowserWindow 实例到 WindowBridge。
  - 必须在窗口创建后调用，确保通信通道建立。

- **`update(field: string, value: any): boolean`**
  - 更新共享状态的指定字段。
  - 支持嵌套字段（如 `settings.theme`）。
  - 无权限或字段不存在时返回 `false`。

- **`getData(): Record<string, any>`**
  - 获取当前完整的共享状态。

- **`getFieldPermission(field: string): 'readOnly' | 'writeOnly' | 'both' | null`**
  - 获取指定字段的权限设置。
  - 若字段不存在则返回 `null`。

- **`setFieldPermission(field: string, permission: 'readOnly' | 'writeOnly' | 'both'): void`**
  - 设置指定字段的操作权限。
  - 支持递归设置（如设置 `settings` 的权限会影响所有子字段）。

- **`canRead(field: string): boolean`**
  - 检查是否有读取指定字段的权限。

- **`canWrite(field: string): boolean`**
  - 检查是否有写入指定字段的权限。

#### 事件系统

- **`on(event: 'dataChange', callback: (event: DataChangeEvent) => void): void`**
  - 监听数据变化事件。
  - `event.field`: 发生变化的字段名。
  - `event.oldValue`: 字段的旧值。
  - `event.newValue`: 字段的新值。

- **`off(event: 'dataChange', callback: (event: DataChangeEvent) => void): void`**
  - 移除数据变化事件监听。

### 数据结构

#### `DataChangeEvent`

```typescript
interface DataChangeEvent {
  field: string;      // 发生变化的字段名
  oldValue: any;      // 字段的旧值
  newValue: any;      // 字段的新值
}
```

#### `FieldPermission`

```typescript
type FieldPermission = 'readOnly' | 'writeOnly' | 'both';
```

## 高级特性

### 1. 嵌套字段操作

WindowBridge 支持对嵌套对象字段的精细操作：

```typescript
// 嵌套字段更新
windowBridge.update('settings.theme', 'dark');
windowBridge.update('user.profile.name', '张三');
windowBridge.update('app.config.apiUrl', 'https://api.example.com');

// 获取嵌套字段值
const theme = windowBridge.getData()?.settings?.theme;
const userName = windowBridge.getData()?.user?.profile?.name;

// 嵌套字段权限控制
windowBridge.setFieldPermission('user.profile', 'readOnly');
windowBridge.setFieldPermission('app.config', 'both');
```

### 2. 多窗口同步策略

WindowBridge 使用以下策略确保多窗口状态同步：

1. **实时广播**：任何窗口的状态更新都会实时广播到所有绑定的窗口
2. **权限验证**：每次更新都会检查权限，确保安全
3. **冲突解决**：使用时间戳机制解决潜在的同步冲突
4. **初始化同步**：新窗口加入时自动获取最新状态

### 3. 性能优化

- **增量更新**：只传输变化的字段，减少通信开销
- **批量操作**：支持批量更新多个字段，减少事件触发次数
- **防抖机制**：快速连续的更新会被合并处理

```typescript
// 批量更新示例
function updateMultipleFields() {
  windowBridge.update('title', '新标题');
  windowBridge.update('settings.fontSize', 18);
  windowBridge.update('visible', false);
  // 这些更新会被合并成一个事件广播
}
```

### 4. 自定义事件

除了内置的 `dataChange` 事件，WindowBridge 还支持发送和接收自定义事件：

```typescript
// 主进程发送自定义事件
windowBridge.sendCustomEvent('custom-event', { message: 'Hello from main' });

// 渲染进程监听自定义事件
windowBridge.onCustomEvent('custom-event', (data) => {
  console.log('收到自定义事件:', data);
});
```

## 最佳实践

### 1. 状态设计原则

- **扁平化结构**：尽量保持状态结构扁平化，避免过深的嵌套
- **命名规范**：使用统一的命名规范（如驼峰命名）
- **类型安全**：结合 TypeScript 定义状态接口，确保类型安全

```typescript
// 推荐的状态结构
interface AppState {
  // 窗口状态
  window: {
    title: string;
    visible: boolean;
    width: number;
    height: number;
  };
  
  // 用户设置
  settings: {
    theme: 'light' | 'dark';
    language: string;
    fontSize: number;
  };
  
  // 应用数据
  data: {
    currentProject: string | null;
    recentFiles: string[];
  };
}
```

### 2. 权限管理策略

- **最小权限原则**：只授予必要的权限
- **分层权限**：为不同层级的字段设置不同权限
- **动态权限**：根据用户角色或应用状态动态调整权限

```typescript
// 动态权限示例
function updatePermissions(isAdmin: boolean) {
  if (isAdmin) {
    windowBridge.setFieldPermission('settings', 'both');
    windowBridge.setFieldPermission('user', 'both');
  } else {
    windowBridge.setFieldPermission('settings', 'readOnly');
    windowBridge.setFieldPermission('user', 'readOnly');
  }
}
```

### 3. 性能优化建议

- **避免频繁更新**：对频繁变化的值（如动画参数）考虑使用本地状态
- **批量处理**：将相关的更新合并为一批操作
- **合理使用监听**：只监听必要的字段变化

### 4. 错误处理

```typescript
// 安全的状态更新
async function safeUpdate(field: string, value: any) {
  try {
    const success = await windowBridge.update(field, value);
    if (!success) {
      console.warn(`更新字段 ${field} 失败，可能没有权限`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`更新字段 ${field} 时发生错误:`, error);
    return false;
  }
}
```

## 常见问题与解决方案

### 1. 状态同步延迟

**问题**：窗口间状态同步出现延迟

**解决方案**：
- 确保所有窗口都正确绑定到 WindowBridge
- 检查网络连接（对于远程窗口）
- 避免在短时间内进行大量更新

### 2. 权限失效

**问题**：设置的权限控制不起作用

**解决方案**：
- 检查字段路径是否正确
- 确保权限设置在窗口绑定之前完成
- 检查是否有代码覆盖了权限设置

### 3. 新窗口状态不同步

**问题**：新创建的窗口没有获取到最新状态

**解决方案**：
- 确保在窗口创建完成后调用 `bindWindow`
- 检查渲染进程是否正确初始化了 WindowBridge
- 验证 IPC 通信是否正常

### 4. 性能问题

**问题**：大量状态更新导致应用卡顿

**解决方案**：
- 使用增量更新，只更新变化的字段
- 合并批量更新操作
- 优化状态结构，减少不必要的字段

## 测试示例

```typescript
// window-bridge.test.ts
import WindowBridge from '../src/window-bridge/WindowBridge';

describe('WindowBridge', () => {
  let windowBridge: WindowBridge;
  
  beforeEach(() => {
    // 创建新实例进行测试
    windowBridge = new WindowBridge({
      title: 'Test Window',
      settings: {
        theme: 'light',
        fontSize: 16
      },
      user: {
        name: 'Test User'
      }
    });
  });
  
  test('should initialize with correct initial data', () => {
    const data = windowBridge.getData();
    expect(data.title).toBe('Test Window');
    expect(data.settings.theme).toBe('light');
    expect(data.user.name).toBe('Test User');
  });
  
  test('should update fields correctly', () => {
    windowBridge.update('title', 'Updated Title');
    windowBridge.update('settings.theme', 'dark');
    
    const data = windowBridge.getData();
    expect(data.title).toBe('Updated Title');
    expect(data.settings.theme).toBe('dark');
  });
  
  test('should handle nested fields', () => {
    windowBridge.update('user.name', 'New User');
    windowBridge.update('settings.fontSize', 18);
    
    const data = windowBridge.getData();
    expect(data.user.name).toBe('New User');
    expect(data.settings.fontSize).toBe(18);
  });
  
  test('should respect field permissions', () => {
    windowBridge.setFieldPermission('settings', 'readOnly');
    
    const success = windowBridge.update('settings.theme', 'dark');
    expect(success).toBe(false);
    
    const data = windowBridge.getData();
    expect(data.settings.theme).toBe('light'); // 保持不变
  });
  
  test('should check permissions correctly', () => {
    windowBridge.setFieldPermission('title', 'both');
    windowBridge.setFieldPermission('user', 'readOnly');
    
    expect(windowBridge.canRead('title')).toBe(true);
    expect(windowBridge.canWrite('title')).toBe(true);
    expect(windowBridge.canRead('user')).toBe(true);
    expect(windowBridge.canWrite('user')).toBe(false);
  });
});
```

## 与其他状态管理方案的对比

| 特性 | WindowBridge | Redux | MobX | localStorage |
|------|--------------|-------|------|--------------|
| 多窗口同步 | ✅ 原生支持 | ❌ 需要额外配置 | ❌ 需要额外配置 | ✅ 但性能较差 |
| 权限控制 | ✅ 内置支持 | ❌ 需要自定义 | ❌ 需要自定义 | ❌ 不支持 |
| 实时通信 | ✅ 基于 MessageChannel | ❌ 需要 WebSocket | ❌ 需要 WebSocket | ❌ 轮询 |
| 易用性 | ✅ 简单 API | ⭐ 复杂概念 | ⭐ 中等复杂度 | ✅ 简单但功能有限 |
| 性能 | ✅ 高性能 | ⭐ 中等性能 | ⭐ 高性能 | ❌ 低性能 |
| 类型安全 | ✅ 支持 TypeScript | ✅ 支持 TypeScript | ✅ 支持 TypeScript | ❌ 不支持 |

## 应用场景

WindowBridge 适用于以下 Electron 应用场景：

1. **多窗口管理应用**：如 IDE、设计工具、多文档编辑器
2. **实时协作应用**：如聊天工具、协作编辑工具
3. **需要状态同步的应用**：如设置面板、preferences 窗口
4. **权限敏感应用**：需要严格控制数据访问权限的应用

## 未来规划

- [ ] 支持持久化存储
- [ ] 支持离线模式
- [ ] 增强的冲突解决机制
- [ ] 可视化状态管理工具
- [ ] 更丰富的权限控制策略

## 最佳实践

1.  **全局配置同步**: 将 `theme`, `language`, `userInfo` 等全局状态放入 Bridge，实现“一处修改，处处更新”。
2.  **窗口间指令**: 利用自定义 Handler 实现窗口间的远程调用，例如“主窗口控制子窗口关闭”。
3.  **敏感数据保护**: 对于 `licenseStatus`, `vipLevel` 等关键字段，务必在主进程初始化时设置为 `readonly`，防止前端篡改。

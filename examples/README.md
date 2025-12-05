# Electron Infra Toolkit 示例指南

本目录包含 `electron-infra-toolkit` 的详细使用示例，按模块功能分类，帮助你快速上手和理解各个组件的核心功能。

## 📁 目录结构

### window-manager/ - 核心窗口管理模块

**功能**: 提供企业级的窗口管理解决方案，包括窗口注册表、防重复创建、环境感知配置等。

- **`01-basic-usage.js`**: 基础入门示例

  - 初始化 WindowManager 实例
  - 创建主窗口和子窗口
  - 演示智能防重机制（重复创建时自动聚焦）
  - 窗口状态检查和控制

- **`02-ipc-communication.js`**: IPC 通信示例

  - 演示 WindowManager 与 IpcBridge 的结合使用
  - 窗口间消息发送与接收
  - 主进程与渲染进程的通信
  - 使用静态 WindowStore 查找窗口

- **`03-custom-implementation.js`**: 高级封装示例
  - 通过继承 WindowManager 实现特定业务窗口
  - 自定义窗口配置和默认选项
  - 封装业务逻辑（登录窗口、设置窗口）
  - 实现窗口组管理

### window-bridge/ - 多窗口状态同步模块

**功能**: 实现主进程与多个渲染进程之间的状态同步，支持权限控制和高性能通信。

- **`01-basic-sync.js`**: 基础同步示例
  - 创建 WindowBridge 实例并配置初始状态
  - 主进程与多个窗口间的数据同步
  - 实现字段级别的权限控制
  - 监听和处理状态变更事件

### ipc-bridge/ - 增强型 IPC 通信模块

**功能**: 提供依赖注入、单通道多路复用、开闭原则的 IPC 通信解决方案。

- **`01-basic-usage.js`**: 基础使用示例

  - 初始化 IpcBridge 实例
  - 添加和移除 IPC 处理器
  - 主进程与渲染进程的异步通信
  - 错误处理和响应机制

- **`02-advanced-dependency-injection.js`**: 依赖注入示例
  - 演示如何使用依赖注入模式
  - 共享 API 和服务实例
  - 实现模块化的 IPC 处理器
  - 高级错误处理和日志记录

### IPC/ - 基础 IPC 通信模块

**功能**: 封装了 Electron 原生 `ipcMain`，提供更安全、更健壮且具备日志记录能力的基础通信机制。

- **`01-basic-ipc.js`**: 基础 IPC 通信示例
  - 初始化 IPC 实例
  - 注册 invoke/handle 处理器（异步通信）
  - 注册 send/on 监听器（同步通信）
  - 演示自动日志记录和错误捕获功能

### logger/ - 日志记录模块

**功能**: 封装了 electron-log，提供环境感知、配置友好且具有统一格式的日志记录功能。

- **`01-basic-logger.js`**: 基础日志使用示例
  - 创建不同模块的日志实例
  - 记录不同级别的日志信息
  - 演示环境感知的日志输出
  - 查看日志文件位置和格式

## 🏃 如何运行

### 1. 构建库文件

由于示例直接引用了构建后的库文件，在运行前请先构建项目：

```bash
# 在项目根目录执行
npm run build
```

### 2. 安装依赖

确保已安装所有必需的依赖，包括 Electron：

```bash
npm install
```

### 3. 运行示例

使用 Electron 命令运行对应的示例文件：

#### Windows (PowerShell):

```powershell
# WindowManager 示例
.\node_modules\.bin\electron examples/window-manager/01-basic-usage.js
.\node_modules\.bin\electron examples/window-manager/02-ipc-communication.js
.\node_modules\.bin\electron examples/window-manager/03-custom-implementation.js

# WindowBridge 示例
.\node_modules\.bin\electron examples/window-bridge/01-basic-sync.js

# IpcBridge 示例
.\node_modules\.bin\electron examples/ipc-bridge/01-basic-usage.js
.\node_modules\.bin\electron examples/ipc-bridge/02-advanced-dependency-injection.js

# IPC 基础示例
.\node_modules\.bin\electron examples/IPC/01-basic-ipc.js

# Logger 示例
.\node_modules\.bin\electron examples/logger/01-basic-logger.js
```

#### macOS / Linux:

```bash
# WindowManager 示例
./node_modules/.bin/electron examples/window-manager/01-basic-usage.js
./node_modules/.bin/electron examples/window-manager/02-ipc-communication.js
./node_modules/.bin/electron examples/window-manager/03-custom-implementation.js

# WindowBridge 示例
./node_modules/.bin/electron examples/window-bridge/01-basic-sync.js

# IpcBridge 示例
./node_modules/.bin/electron examples/ipc-bridge/01-basic-usage.js
./node_modules/.bin/electron examples/ipc-bridge/02-advanced-dependency-injection.js

# IPC 基础示例
./node_modules/.bin/electron examples/IPC/01-basic-ipc.js

# Logger 示例
./node_modules/.bin/electron examples/logger/01-basic-logger.js
```

## 💡 示例特点

- **自包含**: 所有示例使用 `data:text/html` 加载简单 UI，无需额外 HTML 文件
- **易于理解**: 代码结构清晰，注释详细，便于学习和调试
- **可扩展**: 示例代码可直接用于实际项目，或作为扩展基础
- **完整流程**: 每个示例展示了从初始化到使用的完整流程

## 🛠️ 实际应用建议

1. **替换 UI 加载方式**: 在实际项目中，将 `data:text/html` 替换为真实的 HTML 文件：

   ```javascript
   // 开发环境
   if (app.isPackaged) {
     window.loadFile(path.join(__dirname, "../renderer/index.html"));
   } else {
     window.loadURL("http://localhost:5173"); // Vite 开发服务器
   }
   ```

2. **添加错误处理**: 生产环境中应添加适当的错误处理和日志记录

3. **性能优化**: 对于大型应用，考虑实现窗口懒加载和资源预加载

4. **安全设置**: 确保正确配置 `contextIsolation` 和 `nodeIntegration`

## 📚 相关文档

- [WindowManager 详细文档](../src/window-manager/README.md)
- [WindowBridge 详细文档](../src/window-bridge/README.md)
- [IpcBridge 详细文档](../src/ipc-bridge/README.md)
- [IPC 基础模块文档](../src/IPC/README.md)
- [Logger 模块文档](../src/logger/README.md)
- [项目主文档](../README.md)

## 🤝 贡献

欢迎提交更多示例或改进现有示例！请遵循以下原则：

1. 保持示例简单明了，专注于单个功能
2. 添加详细的注释和说明
3. 遵循项目的代码风格
4. 确保示例能够独立运行

## 📄 许可证

所有示例代码遵循 MIT 许可证，与项目主体保持一致。

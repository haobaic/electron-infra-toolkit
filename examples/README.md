# Electron Infra Toolkit 示例指南

本目录包含 `electron-infra-toolkit` 的详细使用示例。代码位于不同的子目录中，按模块功能分类。

## 📁 目录结构

- **`window-manager/`**: 核心窗口管理模块的示例
  - `01-basic-usage.js`: 基础入门。包含初始化、创建窗口、防止重复创建。
  - `02-ipc-communication.js`: 进阶交互。演示如何使用 `windowManager.send` 进行窗口间通信。
  - `03-custom-implementation.js`: 高级封装。演示如何通过继承 `WindowManager` 类来封装特定业务（如登录窗、播放器）。

## 🏃 如何运行

由于这些示例直接引用了构建后的库文件 (`dist/index.umd.js`)，请确保在运行前已执行构建。

1. **构建库文件** (在项目根目录):

   ```bash
   npm run build
   ```

2. **运行示例**:
   使用 `electron` 命令运行对应的 JS 文件。

   **Windows:**

   ```powershell
   # 运行基础示例
   .\node_modules\.bin\electron examples/window-manager/01-basic-usage.js

   # 运行 IPC 示例
   .\node_modules\.bin\electron examples/window-manager/02-ipc-communication.js
   ```

   **macOS / Linux:**

   ```bash
   # 运行基础示例
   ./node_modules/.bin/electron examples/window-manager/01-basic-usage.js
   ```

## 💡 提示

这些示例使用了 `data:text/html` 来加载简单的 UI，因此不需要额外的 HTML 文件。在实际项目中，你可以替换为 `win.loadURL('file://...')` 或 `win.loadURL('http://...')`。

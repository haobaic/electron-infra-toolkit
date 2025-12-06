# API 文档自动生成指南

本指南将介绍如何使用 TypeDoc 自动生成 Electron Infra Toolkit 的 API 文档。

## 什么是 TypeDoc

TypeDoc 是一个为 TypeScript 项目生成 API 文档的工具，它能够解析 TypeScript 代码中的类型信息和 JSDoc 注释，生成结构化的 API 文档。

## 配置说明

我们已经在项目中配置了 TypeDoc，主要包含以下部分：

### 1. TypeDoc 配置文件

在项目根目录创建了 `typedoc.json` 文件，包含以下配置：

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "name": "Electron Infra Toolkit API Documentation",
  "includeVersion": true,
  "readme": "none",
  "excludeNotDocumented": false,
  "excludePrivate": true,
  "excludeProtected": false,
  "sort": ["source-order"],
  "navigation": {
    "includeCategories": true,
    "includeGroups": true
  }
}
```

主要配置项说明：
- `entryPoints`: 指定文档生成的入口文件
- `out`: 文档输出目录
- `plugin`: 使用的插件，这里使用了 `typedoc-plugin-markdown` 来生成 Markdown 格式的文档
- `name`: 文档标题
- `includeVersion`: 在文档中包含项目版本信息
- `excludePrivate`: 排除私有成员
- `sort`: 文档排序方式，这里使用源代码顺序

### 2. package.json 脚本

在 `package.json` 中添加了文档生成脚本：

```json
"scripts": {
  "docs": "typedoc"
}
```

## 安装依赖

如果尚未安装 TypeDoc 依赖，可以运行以下命令：

```bash
npm install --save-dev typedoc typedoc-plugin-markdown
```

## 生成文档

要生成 API 文档，只需运行以下命令：

```bash
npm run docs
```

生成的文档将输出到 `docs/api` 目录。

## 代码注释规范

为了生成高质量的文档，需要在代码中添加适当的 JSDoc 注释。以下是一些基本规范：

### 类注释

```typescript
/**
 * 窗口管理器类，提供窗口的创建、管理和通信功能
 * @class WindowManager
 */
export class WindowManager {
  // 类实现...
}
```

### 方法注释

```typescript
/**
 * 创建新窗口
 * @param config 窗口配置对象
 * @returns 窗口 ID
 */
create(config: WindowConfig): string {
  // 方法实现...
}
```

### 属性注释

```typescript
/**
 * 窗口存储实例
 */
private windowStore: WindowStore;
```

### 参数注释

```typescript
/**
 * 发送消息到指定窗口
 * @param windowId 窗口 ID
 * @param channel 消息通道
 * @param data 消息数据
 */
send(windowId: string, channel: string, data: any): void {
  // 方法实现...
}
```

### 返回值注释

```typescript
/**
 * 获取所有窗口
 * @returns 所有窗口的映射
 */
getAllWindows(): Map<string, BrowserWindow> {
  // 方法实现...
}
```

## 文档自定义

### 修改输出格式

如果需要生成 HTML 格式的文档，可以：

1. 移除 `typedoc-plugin-markdown` 插件
2. 或者修改插件配置

### 添加额外信息

可以在 `typedoc.json` 中添加以下配置：

```json
{
  "description": "Electron Infra Toolkit 是一个为 Electron 应用提供的综合基础设施套件",
  "homepage": "https://github.com/haobaic/electron-infra-toolkit",
  "footer": "Electron Infra Toolkit - API Documentation"
}
```

### 配置导航结构

可以使用 JSDoc 标签 `@category` 和 `@group` 来组织导航结构：

```typescript
/**
 * 窗口管理器类
 * @category 窗口管理
 */
export class WindowManager {
  // 类实现...
}
```

## 最佳实践

1. **保持注释简洁明了**：只包含必要的信息，避免冗余
2. **定期更新文档**：确保文档与代码保持同步
3. **使用标准的 JSDoc 标签**：提高文档的可读性和一致性
4. **为公共 API 添加完整注释**：私有 API 可以适当简化
5. **添加示例代码**：帮助用户理解如何使用 API

## 示例

以下是一个完整的文档注释示例：

```typescript
/**
 * 窗口管理器类，提供窗口的创建、管理和通信功能
 * @class WindowManager
 * @category 窗口管理
 */
export class WindowManager {
  /**
   * 窗口存储实例
   */
  private windowStore: WindowStore;

  /**
   * 窗口事件处理器
   */
  private windowEvents: WindowEvents;

  /**
   * 创建新的窗口管理器实例
   */
  constructor() {
    this.windowStore = new WindowStore();
    this.windowEvents = new WindowEvents();
  }

  /**
   * 创建新窗口
   * @param config 窗口配置对象
   * @returns 窗口 ID
   * @example
   * ```typescript
   * const windowId = windowManager.create({
   *   name: "main-window",
   *   title: "主窗口",
   *   url: "https://example.com"
   * });
   * ```
   */
  create(config: WindowConfig): string {
    // 方法实现...
  }
}
```

## 常见问题

### 1. 文档没有包含所有的类/方法

- 确保类和方法是导出的（使用 `export` 关键字）
- 检查是否配置了 `excludeNotDocumented: true`，如果是，确保所有需要包含的 API 都有注释

### 2. 文档格式不正确

- 检查 JSDoc 注释格式是否正确
- 确保安装了正确版本的 TypeDoc 和插件

### 3. 生成的文档没有样式

- 如果生成的是 HTML 文档，检查是否包含样式文件
- 如果生成的是 Markdown 文档，可以使用 Markdown 查看器或转换工具添加样式

## 结论

使用 TypeDoc 可以轻松地为 TypeScript 项目生成结构化、类型安全的 API 文档。通过遵循上述指南，您可以确保 Electron Infra Toolkit 始终拥有最新、最准确的 API 文档。
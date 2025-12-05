# Logger 模块

Logger 模块是对 `electron-log` 的封装，提供了环境感知、配置友好且具有统一格式的日志记录功能，为 Electron 应用提供完整的日志解决方案。

## 特性

- **环境感知**：自动根据 `NODE_ENV` 环境变量调整日志级别和输出方式
- **多实例支持**：支持为不同模块创建独立的日志实例，便于日志隔离和管理
- **统一日志格式**：采用标准化的日志格式，包含时间戳、日志级别和日志内容
- **文件大小控制**：自动限制日志文件大小，防止日志文件过度增长
- **灵活的日志级别**：支持从 silly 到 error 的多级日志记录

## 安装

```bash
# 使用 npm
npm install electron-log

# 使用 yarn
yarn add electron-log

# 使用 pnpm
pnpm add electron-log
```

## 使用方法

### 基本使用

```typescript
import Logger from './logger'

// 创建日志实例，指定模块名称
const logger = new Logger('main-window')

// 记录不同级别的日志
logger.info('应用启动成功')
logger.debug('调试信息：用户配置已加载')
logger.warn('警告：内存使用率较高')
logger.error('错误：数据库连接失败')
```

### 不同模块使用独立日志

```typescript
import Logger from './logger'

// 主进程日志
const mainLogger = new Logger('main')

// 渲染进程日志
const rendererLogger = new Logger('renderer')

// IPC 通信日志
const ipcLogger = new Logger('ipc')

// 分别记录日志
mainLogger.info('主进程已初始化')
rendererLogger.info('渲染进程已加载')
ipcLogger.info('IPC 通道已建立')
```

## API 参考

### Logger 类

#### 构造函数

```typescript
new Logger(appName?: string)
```

- **appName**：可选，日志实例名称，用于标识不同模块的日志，默认为 'main'

#### 方法

| 方法名 | 参数 | 返回值 | 描述 |
|-------|------|-------|------|
| `info(message)` | `message: string` | `void` | 记录信息级别日志 |
| `debug(message)` | `message: string` | `void` | 记录调试级别日志 |
| `error(message)` | `message: string` | `void` | 记录错误级别日志 |
| `warn(message)` | `message: string` | `void` | 记录警告级别日志 |
| `verbose(message)` | `message: string` | `void` | 记录详细级别日志 |
| `silly(message)` | `message: string` | `void` | 记录最详细级别日志 |
| `getLogger()` | 无 | `LoggerService` | 获取底层的 electron-log 实例，用于高级配置 |

## 配置说明

### 默认配置

Logger 模块根据环境自动应用以下默认配置：

| 配置项 | 开发环境 | 生产环境 |
|-------|---------|---------|
| 文件日志级别 | debug | info |
| 控制台日志级别 | debug | false |
| 日志文件名称 | `${appName}_dev.log` | `${appName}.log` |
| 日志文件大小限制 | 10MB | 10MB |
| 日志格式 | `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}` | `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}` |

### 高级配置

通过 `getLogger()` 方法可以获取底层的 electron-log 实例，进行更高级的配置：

```typescript
import Logger from './logger'

const logger = new Logger('main')
const electronLog = logger.getLogger()

// 修改日志文件路径
electronLog.transports.file.resolvePath = (variables) => {
  return path.join(app.getPath('logs'), variables.fileName)
}

// 增加自定义传输方式
electronLog.transports.custom = {
  send: (message) => {
    // 自定义日志处理逻辑
    console.log('Custom transport:', message)
  }
}
```

## 日志格式

日志采用标准化格式，包含以下信息：

```
[2023-10-01 14:30:45.123] [INFO] 应用启动成功
[2023-10-01 14:30:45.456] [DEBUG] 调试信息：用户配置已加载
[2023-10-01 14:30:45.789] [WARN] 警告：内存使用率较高
[2023-10-01 14:30:46.012] [ERROR] 错误：数据库连接失败
```

格式说明：
- `[2023-10-01 14:30:45.123]`：精确到毫秒的时间戳
- `[INFO]`：日志级别
- `应用启动成功`：日志内容

## 最佳实践

### 1. 为每个模块创建独立的日志实例

```typescript
// window-manager 模块
const windowLogger = new Logger('window-manager')

// ipc-bridge 模块
const ipcLogger = new Logger('ipc-bridge')

// window-bridge 模块
const bridgeLogger = new Logger('window-bridge')
```

### 2. 合理使用日志级别

- **error**：记录导致功能失效或应用崩溃的严重错误
- **warn**：记录可能导致问题的警告信息
- **info**：记录应用的主要流程和重要事件
- **debug**：记录开发调试信息，仅在开发环境可见
- **verbose**/**silly**：记录非常详细的调试信息，一般用于深度调试

### 3. 结构化日志内容

```typescript
// 推荐：结构化的日志内容
logger.info(`[Window Created] ID: ${windowId}, Name: ${windowName}, Dimensions: ${width}x${height}`)

// 不推荐：非结构化的日志内容
logger.info('创建了一个窗口，ID是' + windowId + '，名称是' + windowName)
```

### 4. 避免记录敏感信息

确保日志中不包含用户密码、API 密钥等敏感信息：

```typescript
// 不推荐：记录完整的用户凭证
logger.debug(`用户登录：${username}，密码：${password}`)

// 推荐：仅记录必要信息
logger.debug(`用户登录：${username}`)
```

## 总结

Logger 模块提供了一个简单易用但功能强大的日志解决方案，通过环境感知和统一格式，帮助开发者更好地监控和调试 Electron 应用。无论是开发阶段的调试还是生产环境的问题排查，Logger 模块都能提供可靠的日志支持。
const { app } = require('electron')
const { Logger } = require('../../dist/index.umd.js')
const path = require('path')

// =============================================================================
// 示例: Logger 模块基础使用
// 注意：本示例依赖于 index.ts 中导出 Logger 模块。
// 请确保 src/index.ts 中包含: export { default as Logger } from './logger'
// =============================================================================
// 模块: Logger
// 功能:
// 1. 创建 Logger 实例
// 2. 写入不同级别的日志 (info, warn, error, debug)
// 3. 查看日志文件位置
// =============================================================================

// 实例化 Logger
// 参数 'ExampleApp' 将作为日志文件名的一部分 (ExampleApp_dev.log 或 ExampleApp.log)
const logger = new Logger('ExampleApp')

console.log('正在启动 Logger 示例...')

// 模拟一些业务逻辑并记录日志
logger.info('应用启动中...')
logger.debug('调试信息：环境变量 = ' + process.env.NODE_ENV)

setTimeout(() => {
  logger.warn('这是一条警告信息：磁盘空间可能不足 (模拟)')
}, 1000)

setTimeout(() => {
  try {
    throw new Error('模拟的一个致命错误')
  } catch (err) {
    logger.error('捕获到异常: ' + err.message)
  }
  
  console.log('日志写入完成。')
  
  // 获取日志文件路径 (通过 electron-log 的内部 API)
  // 注意：Logger 类封装了 electron-log，可以通过 getLogger() 获取原始实例
  const logPath = logger.getLogger().transports.file.getFile().path
  console.log('---------------------------------------------------')
  console.log('日志文件位置:', logPath)
  console.log('您可以打开该文件查看写入的日志内容。')
  console.log('---------------------------------------------------')
  
  // 退出应用
  // app.quit() 
}, 2000)

// 为了保持进程运行一段时间以完成异步日志写入
app.whenReady().then(() => {
  console.log('Electron App Ready')
})

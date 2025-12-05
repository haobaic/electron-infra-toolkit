import LoggerService from 'electron-log'

class Logger {
  private logger: typeof LoggerService
  private isDev: boolean

  // Constructor for Logger, accepts app name and log type (main or renderer)
  constructor(appName: string = 'main') {
    this.isDev = process.env.NODE_ENV !== 'production' // Check if environment is development

    // Create a logger instance for either 'main' or 'renderer'
    this.logger = LoggerService.create({ logId: appName })
    this.logger.scope(appName)

    // Set log level based on environment (debug for dev, info for prod)
    this.logger.transports.file.level = this.isDev ? 'debug' : 'info'

    // Enable console logs in development only
    this.logger.transports.console.level = this.isDev ? 'debug' : false

    // 优化日志格式，增加日期和日志级别
    this.logger.transports.file.format =
      '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'

    this.logger.transports.file.maxSize = 10 * 1024 * 1024 // 设置最大文件大小为 10MB

    this.logger.transports.file.fileName = this.isDev
      ? `${appName}_dev.log`
      : `${appName}.log`
  }

  // Info log
  info(message: string): void {
    this.logger.info(message)
  }

  // Debug log
  debug(message: string): void {
    this.logger.debug(message)
  }

  // Error log
  error(message: string): void {
    this.logger.error(message)
  }

  // Warn log
  warn(message: string): void {
    this.logger.warn(message)
  }

  // Verbose log
  verbose(message: string): void {
    this.logger.verbose(message)
  }

  // Silly log
  silly(message: string): void {
    this.logger.silly(message)
  }

  // Get the logger instance (useful if you need more custom configurations)
  getLogger(): typeof LoggerService {
    return this.logger
  }
}

export default Logger

# Utils 模块

Utils 模块提供了一组通用的工具函数，用于简化 Electron 应用开发中的常见任务。

## 功能

当前提供的工具函数：

- **delay**：异步延迟函数，用于创建可控的等待时间

## 使用方法

### delay 函数

```typescript
import { delay } from './utils'

// 等待 1 秒
await delay(1000)

// 在异步函数中使用
async function someAsyncFunction() {
  console.log('开始执行')
  
  // 等待 500 毫秒
  await delay(500)
  
  console.log('延迟后继续执行')
}

// 在 Promise 链中使用
fetchData()
  .then(data => {
    console.log('数据获取成功')
    return delay(1000)
  })
  .then(() => {
    console.log('延迟后执行下一步')
  })
```

## API 参考

### delay(time: number): Promise<void>

创建一个指定时间的异步延迟。

- **参数**：
  - `time`：延迟的毫秒数

- **返回值**：
  - `Promise<void>`：一个在指定时间后解析的 Promise

## 扩展计划

未来将根据需要添加更多实用工具函数，如：

- 路径处理工具
- 数据验证函数
- 字符串格式化工具
- 日期时间处理函数
- 随机数生成器

## 贡献

欢迎提交 PR 添加新的工具函数或改进现有功能。请确保所有新函数都有适当的文档和测试。
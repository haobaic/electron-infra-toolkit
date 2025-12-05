import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import { builtinModules } from 'module'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ElectronWindowManager',
      // 生成 index.js (CJS) 和 index.mjs (ESM)
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ['electron', 'uuid', 'electron-log', ...builtinModules, ...builtinModules.map(m => `node:${m}`)],
      output: {
        globals: {
          electron: 'Electron'
        }
      }
    }
  },
  plugins: [
    dts({
      entryRoot: 'src',
      outputDir: 'dist',
      // 确保类型定义文件也被正确生成
      insertTypesEntry: true,
    })
  ]
})

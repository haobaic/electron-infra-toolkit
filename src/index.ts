export { default as WindowStore } from './window-manager/WindowStore'
export { default as WindowEvents } from './window-manager/WindowEvents'
export { default as WindowManager } from './window-manager/WindowManager'
export { default as WindowCreator } from './window-manager/WindowCreator'
export { default as IpcBridge } from './ipc-bridge/IpcBridge'
export { default as IpcHandler } from './ipc-bridge/IpcHandler'
export { default as WindowBridge } from './window-bridge/WindowBridge'
export { default as IPC } from './IPC'
export { default as Logger } from './logger'
// 导出类型
export type { WindowManagerApi, WindowManagerConfig } from './window-manager/window-manager.type'
export type {
    DataChangeEvent,
    FieldPermission,
    DataStoreItem,
    WindowBridgeHandler,
    BridgeMessageHandler
} from './window-bridge/window-bridge.type'
export type { IpcHandlerCallback, IpcHandlerData } from './ipc-bridge/ipc-bridge.type'
export * from './utils'

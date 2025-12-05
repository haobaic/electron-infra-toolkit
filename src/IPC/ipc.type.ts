import { IpcMainEvent, IpcMainInvokeEvent } from 'electron'

// 定义空函数类型
export type EmptyFunc = () => void

// 定义 IPC.on 的回调函数类型
export type IPCEventHandler = (event: IpcMainEvent, ...args: unknown[]) => void

// 定义 IPC.handle 的回调函数类型
export type IPCHandleHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown> | unknown

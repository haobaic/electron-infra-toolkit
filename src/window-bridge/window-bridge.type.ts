import type WindowBridge from './WindowBridge'

export interface DataChangeEvent {
    type: 'set' | 'delete' | 'clear'
    key?: string
    value?: any
    oldValue?: any
    windowId?: string
    timestamp: number
}

export interface FieldPermission {
    readonly: boolean
    allowedWindows?: string[]
}

export interface DataStoreItem {
    value: any
    permission?: FieldPermission
}

export interface WindowBridgeHandler {
    eventName: string
    callback: (event: DataChangeEvent) => void
}

export interface BridgeMessageHandler {
    name: string
    callback: (bridge: WindowBridge, data: any) => any
}

export interface IpcHandlerCallback {
  (api: Record<string, any>, data: any): any
}

export interface IpcHandlerData {
  name: string
  data?: any
}

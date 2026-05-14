// API模块相关类型
export type APIStatus = '200' | '300' | '401' | '403' | '500'

export interface APIResponse<T = unknown> {
  data: T;
  status: APIStatus;
  message: string
}
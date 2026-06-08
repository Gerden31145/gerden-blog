// API模块相关类型
export type APIStatus = 'success' | number

export interface APIResponse<T = unknown> {
  data: T;
  status: APIStatus;
  message: string
}

import { APIResponse, APIStatus } from "~/types/api";

export function success<T>(data: T, message = 'success'): APIResponse<T> {
  return {
    data,
    message,
    status: '200'
  }
}

export function error(status: APIStatus, message = 'error'): APIResponse {
  return {
    data: null,
    message,
    status
  }
}
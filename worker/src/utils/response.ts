export type ApiSuccess<T> = {
  status: 200
  message: string,
  data: T
}

export type ApiError = {
  status: number
  message: string
}

export function success<T>(data: T, message = 'ok'): ApiSuccess<T> {
  return {
    status: 200,
    message,
    data
  }
}

export function error(status: number, message: string): ApiError {
  return {
    status,
    message
  }
}
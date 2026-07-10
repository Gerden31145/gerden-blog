import type { StatusCode } from "hono/utils/http-status";

export class AppError extends Error {
  constructor(
    public readonly status: StatusCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}
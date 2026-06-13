export type UserRole = 'user' | 'admin'

export type AuthUser = {
  id: number;
  sessionId: string;
  role: UserRole;
  tokenVersion: number;
}

export type AppBindings = CloudflareBindings & {
  JWT_SECRET: string
}

export type AppEnv = {
  Bindings: AppBindings,
  Variables: {
    user: AuthUser
  }
}
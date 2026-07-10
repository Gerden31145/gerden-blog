import { RenderPostMessage } from "./render-job";

export type UserRole = 'user' | 'admin'

export type AuthUser = {
  id: number;
  sessionId: string;
  role: UserRole;
  tokenVersion: number;
}

export type AppBindings = Omit<CloudflareBindings, 'POST_RENDER_QUEUE'> & {
  JWT_SECRET: string,
  POST_RENDER_QUEUE: Queue<RenderPostMessage>
}

export type AppEnv = {
  Bindings: AppBindings,
  Variables: {
    user: AuthUser
  }
}
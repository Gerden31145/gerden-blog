// shared/types/auth.d.ts
declare module '#auth-utils' {
  interface User {
    id: string
    name?: string
    role: 'admin'
  }
}

export { }
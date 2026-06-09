export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  username: string
  email: string
  role: UserRole
}

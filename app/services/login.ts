import type { APIResponse } from "~/types/api";

export const loginAPI = {
  login(username: string, password: string) {
    return useAPI<APIResponse<{ ok: boolean }>>('admin/login', {
      method: 'POST',
      body: {
        username,
        password
      }
    })
  },
  logout() {
    return useAPI<APIResponse<{ ok: true }>>('admin/logout', {
      method: 'POST'
    })
  }
}
export interface noticeItem {
  id: number,
  content: string,
  timer: number,
  pause: boolean
}

export const useToast = () => {
  const toasts = useState<noticeItem[]>('toast-list', () => []) // global array
  const id = useState('toast-id', () => 0)

  const addMessage = (msg: string) => {
    const newToast: noticeItem = {
      content: msg,
      timer: 3,
      pause: false,
      id: id.value++
    }
    toasts.value.unshift(newToast)
  }

  const remove = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const pause = (id: number) => {
    const target = toasts.value.find((toast) => toast.id === id)
    if (!target) return
    target.pause = true
  }

  const resume = (id: number) => {
    const target = toasts.value.find((toast) => toast.id === id)
    if (!target) return
    target.pause = false
  }

  return {
    toasts,
    addMessage,
    remove,
    pause,
    resume
  }
}
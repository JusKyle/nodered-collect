export type ToastType = 'error' | 'success' | 'info'

export interface ToastEventDetail {
  message: string
  type: ToastType
}

export const TOAST_EVENT = 'toast'

export function showToast(message: string, type: ToastType = 'info'): void {
  const event = new CustomEvent<ToastEventDetail>(TOAST_EVENT, {
    detail: { message, type },
  })
  window.dispatchEvent(event)
}

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Kind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: Kind
  message: string
}

export interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const push = useCallback((kind: Kind, message: string) => {
    const id = nextId.current++
    setToasts(current => [...current, { id, kind, message }])
    setTimeout(() => setToasts(current => current.filter(t => t.id !== id)), kind === 'error' ? 6000 : 4000)
  }, [])

  const value = useMemo<ToastApi>(
    () => ({
      success: message => push('success', message),
      error: message => push('error', message),
      info: message => push('info', message),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => setToasts(c => c.filter(x => x.id !== t.id))}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

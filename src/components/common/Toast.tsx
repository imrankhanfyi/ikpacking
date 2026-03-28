// src/components/common/Toast.tsx
import { useToastStore } from '../../store/toastStore'

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-[env(safe-area-inset-bottom,0px)] left-0 right-0 z-50 flex flex-col items-center gap-2 p-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded text-sm max-w-sm w-full animate-[slideUp_0.2s_ease-out] ${
            t.type === 'error'
              ? 'bg-[#fef8f5] border-[1.5px] border-[#e05a33] text-[#e05a33]'
              : t.type === 'undo'
              ? 'bg-white border-[1.5px] border-[#2d2d2d] text-[#2d2d2d]'
              : 'bg-[#f0f7f3] border-[1.5px] border-[#2a6e4e] text-[#2a6e4e]'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          {t.type === 'undo' && t.onUndo && (
            <button
              onClick={() => {
                t.onUndo!()
                removeToast(t.id)
              }}
              className="shrink-0 px-2 py-1 rounded bg-[#2d2d2d] text-white text-xs font-semibold"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss"
            className="shrink-0 text-current opacity-50 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

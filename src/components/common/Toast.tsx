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
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm w-full animate-[slideUp_0.2s_ease-out] ${
            t.type === 'error'
              ? 'bg-red-950 border border-red-800 text-red-200'
              : t.type === 'undo'
              ? 'bg-slate-800 border border-slate-600 text-slate-200'
              : 'bg-green-950 border border-green-800 text-green-200'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          {t.type === 'undo' && t.onUndo && (
            <button
              onClick={() => {
                t.onUndo!()
                removeToast(t.id)
              }}
              className="shrink-0 px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 text-current opacity-50 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

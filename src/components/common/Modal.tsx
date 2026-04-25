import { useEffect, useRef } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, wide }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded border-[1.5px] border-[#2d2d2d] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b-[1.5px] border-[#2d2d2d] sticky top-0 bg-white rounded-t z-10">
          <h2 className="text-[#2d2d2d] font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded text-[#ccc] hover:text-[#e05a33] hover:bg-[#f5f3ef]">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-[#1e1e1e] rounded-t-lg animate-slide-up max-h-[90dvh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#444] rounded" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 pt-2 border-b border-white/10">
          <h2 className="text-lg font-black uppercase tracking-tight text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded bg-[#333] text-gray-300 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        {/* Content */}
        <div className="px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

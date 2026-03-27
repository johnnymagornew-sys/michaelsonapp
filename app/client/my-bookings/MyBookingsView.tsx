'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CLASS_TYPE_COLORS } from '@/types'
import { formatTime, canCancelBooking } from '@/lib/utils/dates'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'

interface Props {
  upcoming: any[]
  userId: string
}

export default function MyBookingsView({ upcoming, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [cancelModal, setCancelModal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCancel(booking: any) {
    setLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('id', booking.id)
    setLoading(false)
    setCancelModal(null)
    if (error) {
      showToast('שגיאה בביטול')
    } else {
      showToast('האימון בוטל בהצלחה')
      startTransition(() => router.refresh())
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-black text-white mb-5">האימונים שלי</h1>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-3">📅</span>
          <p className="text-gray-500 font-medium">אין אימונים קרובים</p>
          <p className="text-gray-600 text-sm mt-1">הרשם לאימון במערכת השעות</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map(booking => {
            const occ = booking.class_occurrences
            if (!occ) return null
            const cls = occ.classes
            const date = new Date(occ.date + 'T00:00:00')
            const canCancel = canCancelBooking(occ.date, cls.start_time)
            const isCancelled = occ.is_cancelled

            return (
              <div
                key={booking.id}
                className={`bg-[#1a1a1a] rounded-2xl border ${
                  isCancelled ? 'border-gray-800 opacity-60' : 'border-[#2a2a2a]'
                } overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CLASS_TYPE_COLORS[cls.type as keyof typeof CLASS_TYPE_COLORS]}`}>
                          {cls.type}
                        </span>
                        {isCancelled && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">
                            בוטל
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-white text-base">{cls.name}</h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {' · '}
                        {formatTime(cls.start_time)}
                      </p>
                    </div>
                    <div className="text-left mr-3">
                      <div className="text-center bg-[#242424] rounded-xl px-3 py-2">
                        <p className="text-xs text-gray-500">{date.toLocaleDateString('he-IL', { month: 'short' })}</p>
                        <p className="text-2xl font-black text-white leading-none">{date.getDate()}</p>
                      </div>
                    </div>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() => setCancelModal(booking)}
                      className={`w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                        canCancel
                          ? 'bg-[#242424] text-red-400 hover:bg-red-950/30'
                          : 'bg-[#1e1e1e] text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={!canCancel}
                    >
                      {canCancel ? 'ביטול הרשמה' : 'לא ניתן לבטל (פחות מ-24 שעות)'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cancel Modal */}
      <Modal
        open={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="ביטול אימון"
      >
        {cancelModal && (
          <div className="space-y-4">
            <div className="bg-[#242424] rounded-xl p-4">
              <p className="text-white font-bold">{cancelModal.class_occurrences?.classes?.name}</p>
              <p className="text-gray-400 text-sm mt-1">
                {new Date(cancelModal.class_occurrences?.date + 'T00:00:00').toLocaleDateString('he-IL', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
                {' · '}
                {formatTime(cancelModal.class_occurrences?.classes?.start_time)}
              </p>
            </div>
            <p className="text-gray-400 text-sm text-center">האם לבטל את ההרשמה?</p>
            <button
              onClick={() => handleCancel(cancelModal)}
              disabled={loading}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl"
            >
              {loading ? 'מבטל...' : 'כן, בטל'}
            </button>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed top-20 right-4 left-4 z-50 bg-emerald-800 text-emerald-100 px-4 py-3 rounded-xl text-sm font-medium text-center animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

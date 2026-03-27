'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DAY_NAMES_SHORT, CLASS_TYPE_COLORS, SUBSCRIPTION_LABELS, Subscription } from '@/types'
import { formatTime, isToday, canCancelBooking, daysRemaining } from '@/lib/utils/dates'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'

interface Props {
  occurrences: any[]
  subscription: Subscription | null
  myBookings: any[]
  weekDates: string[]
  userId: string
  bookedIds: string[]
  weekOffset: number
}

export default function ScheduleView({ occurrences, subscription, myBookings, weekDates, userId, bookedIds, weekOffset }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [selectedDay, setSelectedDay] = useState(() => {
    if (weekOffset === 0) {
      const todayIdx = weekDates.findIndex(d => d === new Date().toISOString().split('T')[0])
      return todayIdx >= 0 ? todayIdx : 0
    }
    return 0
  })
  const [bookingModal, setBookingModal] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const bookedSet = new Set(bookedIds)

  // Count quotas
  const now = new Date()
  const weekStart = new Date(weekDates[0] + 'T00:00:00')
  const weekEnd = new Date(weekDates[6] + 'T23:59:59')
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  // We'll recount from occurrences data for accuracy
  const weeklyBooked = myBookings.filter(b => {
    const occ = occurrences.find(o => o.id === b.occurrence_id)
    if (!occ) return false
    const d = new Date(occ.date + 'T00:00:00')
    return d >= weekStart && d <= weekEnd && !b.cancelled_at
  }).length

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Day's occurrences
  const dayOccurrences = occurrences
    .filter(o => o.date === weekDates[selectedDay])
    .sort((a, b) => a.classes.start_time.localeCompare(b.classes.start_time))

  function getBookingStatus(occ: any) {
    const isBooked = bookedSet.has(occ.id)
    const bookingCount = occ.bookings?.filter((b: any) => !b.cancelled_at).length ?? 0
    const capacity = occ.override_capacity ?? occ.classes.max_capacity
    const isFull = bookingCount >= capacity
    const classDateTime = new Date(`${occ.date}T${occ.classes.start_time}`)
    const isPast = classDateTime < now

    if (occ.is_cancelled) return { label: 'בוטל', color: 'bg-gray-800 text-gray-500', canBook: false, isBooked }
    if (isPast) return { label: 'הסתיים', color: 'bg-gray-800 text-gray-500', canBook: false, isBooked }
    if (isBooked) return { label: 'רשום', color: 'bg-emerald-900/50 text-emerald-400', canBook: true, isBooked }
    if (isFull) return { label: 'מלא', color: 'bg-red-950 text-red-400', canBook: false, isBooked }
    if (!subscription) return { label: 'ללא מנוי', color: 'bg-gray-800 text-gray-500', canBook: false, isBooked }
    if (subscription.end_date < weekDates[0]) return { label: 'פג תוקף', color: 'bg-amber-950 text-amber-400', canBook: false, isBooked }

    if (subscription.type === '8_per_month' && weeklyBooked >= 2) {
      return { label: 'מכסה מלאה', color: 'bg-gray-800 text-gray-500', canBook: false, isBooked }
    }

    return { label: `פנוי (${capacity - bookingCount})`, color: 'bg-emerald-950/40 text-emerald-500', canBook: true, isBooked }
  }

  async function handleBook(occ: any) {
    setActionLoading(true)
    const { error } = await supabase.from('bookings').insert({
      user_id: userId,
      occurrence_id: occ.id,
    })
    setActionLoading(false)
    setBookingModal(null)
    if (error) {
      showToast('שגיאה בקביעת האימון', 'error')
    } else {
      showToast('האימון נקבע בהצלחה! 🥊', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function handleCancel(occ: any) {
    setActionLoading(true)
    const { error } = await supabase
      .from('bookings')
      .update({ cancelled_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('occurrence_id', occ.id)
      .is('cancelled_at', null)
    setActionLoading(false)
    setBookingModal(null)
    if (error) {
      showToast('שגיאה בביטול האימון', 'error')
    } else {
      showToast('האימון בוטל', 'success')
      startTransition(() => router.refresh())
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Subscription banner */}
      {subscription ? (
        <div className="mx-4 mt-4 bg-[#1C1C1C] border-r-4 border-red-600 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">מנוי פעיל</p>
            <p className="font-bold text-white">{SUBSCRIPTION_LABELS[subscription.type as keyof typeof SUBSCRIPTION_LABELS]}</p>
          </div>
          <div className="text-left">
            {subscription.type === '8_per_month' && (
              <p className="text-xs text-gray-400">{weeklyBooked}/2 השבוע</p>
            )}
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-0.5">{daysRemaining(subscription.end_date)} ימים נותרו</p>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 bg-amber-950/30 border border-amber-800/30 rounded-lg px-4 py-3">
          <p className="text-amber-400 text-sm font-medium">לקביעת אימון יש ליצור קשר עם המאמן</p>
        </div>
      )}

      {/* Week selector */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push(`/client/schedule?week=${weekOffset - 1}`)}
            className="text-gray-400 text-2xl font-black hover:text-white transition-colors"
          >
            ›
          </button>
          <div className="text-center">
            <h2 className="text-base font-black uppercase tracking-tight text-white">
              {weekOffset === 0 ? 'השבוע שלי' : weekOffset === 1 ? 'שבוע הבא' : weekOffset === -1 ? 'שבוע שעבר' : weekOffset > 0 ? `${weekOffset} שבועות קדימה` : `${Math.abs(weekOffset)} שבועות אחורה`}
            </h2>
            <p className="text-[11px] text-gray-300">
              {new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
              {' — '}
              {new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <button
            onClick={() => router.push(`/client/schedule?week=${weekOffset + 1}`)}
            className="text-gray-400 text-2xl font-black hover:text-white transition-colors"
          >
            ‹
          </button>
        </div>
        <div className="flex justify-between items-start mb-4">
          {weekDates.map((dateStr, i) => {
            const date = new Date(dateStr + 'T00:00:00')
            const today = isToday(dateStr)
            const active = selectedDay === i

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(i)}
                className="flex flex-col items-center gap-1"
              >
                <span className={`text-[10px] font-bold uppercase ${active ? 'text-red-600' : 'text-gray-500'}`}>{DAY_NAMES_SHORT[i]}</span>
                <span className={`text-base font-black ${active ? 'text-red-600' : today ? 'text-white' : 'text-gray-400'}`}>{date.getDate()}</span>
                <div className={`h-0.5 w-4 ${active ? 'bg-red-600' : 'bg-transparent'}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Classes list */}
      <div className="px-4 pt-2 pb-4 flex-1">
        <p className="uppercase tracking-widest text-[10px] font-bold text-gray-400 mb-3">
          {new Date(weekDates[selectedDay] + 'T00:00:00').toLocaleDateString('he-IL', {
            weekday: 'long', day: 'numeric', month: 'long'
          })}
        </p>

        {dayOccurrences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 font-medium">אין אימונים ביום זה</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayOccurrences.map(occ => {
              const status = getBookingStatus(occ)
              const bookingCount = occ.bookings?.filter((b: any) => !b.cancelled_at).length ?? 0
              const capacity = occ.override_capacity ?? occ.classes.max_capacity
              const isActiveCard = !occ.is_cancelled && (status.isBooked || status.canBook)

              return (
                <div
                  key={occ.id}
                  className={`bg-[#1e1e1e] rounded-lg overflow-hidden ${
                    isActiveCard ? 'border-r-4 border-red-600' : 'border-r-4 border-white/8'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${CLASS_TYPE_COLORS[occ.classes.type as keyof typeof CLASS_TYPE_COLORS]}`}>
                            {occ.classes.type}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-black text-white text-lg uppercase tracking-tight truncate">{occ.classes.name}</h3>
                        {(occ.classes.branch || occ.classes.coach) && (
                          <p className="text-gray-400 text-xs mt-0.5">{occ.classes.branch ?? ''}{occ.classes.coach ? ` · ${occ.classes.coach}` : ''}</p>
                        )}
                      </div>
                      <div className="text-left mr-3 shrink-0">
                        <p className="text-3xl font-black text-white">{formatTime(occ.classes.start_time)}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{occ.classes.duration_minutes} דק'</p>
                      </div>
                    </div>

                    {/* Capacity bar */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 h-1.5 bg-[#333] rounded-none overflow-hidden">
                        <div
                          className={`h-full rounded-none transition-all ${
                            bookingCount >= capacity ? 'bg-red-600' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, (bookingCount / capacity) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{bookingCount}/{capacity}</span>
                    </div>

                    {/* Action button */}
                    {!occ.is_cancelled && (
                      <button
                        onClick={() => setBookingModal(occ)}
                        disabled={!status.canBook && !status.isBooked}
                        className={`w-full py-3 font-black uppercase tracking-tight text-sm rounded-lg transition-colors ${
                          status.isBooked
                            ? 'bg-[#1a2a1a] text-emerald-400 border border-emerald-800/40'
                            : status.canBook
                            ? 'bg-red-600 hover:bg-red-500 text-white active:scale-[0.98]'
                            : 'bg-[#2a2a2a] text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {status.isBooked ? '✓ רשום — לחץ לביטול' : status.canBook ? 'הרשמה לאימון' : 'לא זמין'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Booking/Cancel modal */}
      {bookingModal && (
        <Modal
          open={!!bookingModal}
          onClose={() => setBookingModal(null)}
          title={bookedSet.has(bookingModal.id) ? 'ביטול אימון' : 'הרשמה לאימון'}
        >
          <div className="space-y-4">
            <div className="bg-[#242424] rounded-lg p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">{bookingModal.classes.type}</p>
              <p className="text-white font-black uppercase tracking-tight text-lg">{bookingModal.classes.name}</p>
              <p className="text-gray-400 text-sm mt-1">
                {new Date(bookingModal.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                {formatTime(bookingModal.classes.start_time)}
              </p>
            </div>

            {bookedSet.has(bookingModal.id) ? (
              <>
                {canCancelBooking(bookingModal.date, bookingModal.classes.start_time) ? (
                  <>
                    <p className="text-gray-400 text-sm text-center">האם לבטל את ההרשמה לאימון זה?</p>
                    <button
                      onClick={() => handleCancel(bookingModal)}
                      disabled={actionLoading}
                      className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-tight rounded-lg transition-colors"
                    >
                      {actionLoading ? 'מבטל...' : 'כן, בטל הרשמה'}
                    </button>
                  </>
                ) : (
                  <div className="bg-amber-950/30 border border-amber-800/30 rounded-lg p-4 text-center">
                    <p className="text-amber-400 font-medium text-sm">
                      לא ניתן לבטל פחות מ-24 שעות לפני האימון
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-400 text-sm text-center">אשר הרשמה לאימון זה</p>
                <button
                  onClick={() => handleBook(bookingModal)}
                  disabled={actionLoading}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-tight rounded-lg transition-colors"
                >
                  {actionLoading ? 'מאשר...' : '✓ אשר הרשמה'}
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 left-4 z-50 px-4 py-3 rounded-lg text-sm font-medium text-center animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-800 text-emerald-100' : 'bg-red-900 text-red-100'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

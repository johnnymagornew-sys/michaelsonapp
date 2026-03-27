import { createClient } from '@/lib/supabase/server'
import { CLASS_TYPE_COLORS } from '@/types'
import { formatTime } from '@/lib/utils/dates'
import { toDateString } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = toDateString(new Date())

  const { data: history } = await supabase
    .from('bookings')
    .select(`
      id, booked_at,
      class_occurrences (
        id, date, is_cancelled,
        classes (id, name, type, start_time, duration_minutes)
      )
    `)
    .eq('user_id', user.id)
    .is('cancelled_at', null)
    .lt('class_occurrences.date', today)
    .order('class_occurrences.date', { ascending: false })
    .limit(50)

  const validHistory = (history ?? []).filter(b => b.class_occurrences)

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-black text-white mb-2">היסטוריה</h1>
      <p className="text-gray-500 text-sm mb-5">{validHistory.length} אימונים שהושלמו</p>

      {validHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-3">🏋️</span>
          <p className="text-gray-500 font-medium">עדיין אין היסטוריית אימונים</p>
          <p className="text-gray-600 text-sm mt-1">האימונים שתשלים יופיעו כאן</p>
        </div>
      ) : (
        <div className="space-y-2">
          {validHistory.map(booking => {
            const occ = booking.class_occurrences
            if (!occ) return null
            const cls = occ.classes
            const date = new Date(occ.date + 'T00:00:00')

            return (
              <div
                key={booking.id}
                className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#242424] rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-lg">
                      {cls.type === 'MMA' ? '🥊' : cls.type === 'BJJ' ? '🥋' : '🥊'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{cls.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CLASS_TYPE_COLORS[cls.type as keyof typeof CLASS_TYPE_COLORS]}`}>
                        {cls.type}
                      </span>
                      <span className="text-gray-500 text-xs">{formatTime(cls.start_time)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-gray-300 text-sm font-medium">
                    {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {date.toLocaleDateString('he-IL', { weekday: 'short' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

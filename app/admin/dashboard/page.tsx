import { createClient } from '@/lib/supabase/server'
import { toDateString } from '@/lib/utils/dates'
import { formatTime } from '@/lib/utils/dates'
import { CLASS_TYPE_COLORS } from '@/types'
import QuickAddTask from '@/components/admin/QuickAddTask'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = createClient()
  const today = toDateString(new Date())

  // Stats
  const [
    { count: totalClients },
    { count: activeSubscriptions },
    { count: expiredSubs },
    { data: todayClasses },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true })
      .lte('start_date', today).gte('end_date', today),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).lt('end_date', today),
    supabase.from('class_occurrences')
      .select('id, date, is_cancelled, override_capacity, classes(name, type, start_time, max_capacity), bookings(id, cancelled_at)')
      .eq('date', today)
      .order('classes.start_time'),
  ])

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name, belt')
    .eq('role', 'client')
    .order('full_name')

  // This week classes
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const { count: weekBookings } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .is('cancelled_at', null)
    .gte('class_occurrences.date', toDateString(weekStart))
    .lte('class_occurrences.date', toDateString(weekEnd))

  return (
    <div className="px-4 py-5 space-y-6">
      <div>
        <h1 className="font-black uppercase tracking-tight text-3xl text-white">לוח בקרה</h1>
        <p className="uppercase tracking-widest text-[10px] text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="תלמידים רשומים" value={totalClients ?? 0} />
        <StatCard label="מנויים פעילים" value={activeSubscriptions ?? 0} />
        <StatCard label="מנויים שפגו" value={expiredSubs ?? 0} />
        <StatCard label="הזמנות השבוע" value={weekBookings ?? 0} />
      </div>

      {/* Quick add task */}
      <QuickAddTask clients={clients ?? []} />

      {/* Reports link */}
      <Link
        href="/admin/reports"
        className="w-full flex items-center justify-between bg-[#1C1C1C] border border-[#2a2a2a] hover:border-blue-800/50 rounded-lg px-4 py-4 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-white text-lg">
            📊
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-sm">דוחות</p>
            <p className="text-gray-500 text-xs">נוכחות, הכנסות ועוד</p>
          </div>
        </div>
        <span className="text-gray-600 text-lg group-hover:text-gray-400 transition-colors">‹</span>
      </Link>

      {/* Today's classes */}
      <div>
        <h2 className="font-black uppercase tracking-tight text-lg text-white mb-3">אימונים היום</h2>
        {!todayClasses || todayClasses.length === 0 ? (
          <div className="bg-[#1C1C1C] border border-[#2a2a2a] rounded-lg p-6 text-center">
            <p className="text-gray-500">אין אימונים מתוכננים להיום</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((occ: any) => {
              const cls = occ.classes
              const bookingCount = (occ.bookings ?? []).filter((b: any) => !b.cancelled_at).length
              const capacity = occ.override_capacity ?? cls.max_capacity
              const isFull = bookingCount >= capacity

              return (
                <div key={occ.id} className={`bg-[#1C1C1C] rounded-lg p-4 ${occ.is_cancelled ? 'opacity-60 border-r-4 border-[#2a2a2a]' : isFull ? 'border-r-4 border-red-600' : 'border-r-4 border-[#2a2a2a]'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${CLASS_TYPE_COLORS[cls.type as keyof typeof CLASS_TYPE_COLORS]}`}>
                          {cls.type}
                        </span>
                        {occ.is_cancelled && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-gray-800 text-gray-500 px-2 py-0.5 rounded">בוטל</span>
                        )}
                      </div>
                      <p className="text-white font-bold">{cls.name}</p>
                      <p className="text-gray-400 text-sm">{formatTime(cls.start_time)}</p>
                    </div>
                    <div className="text-left">
                      <p className={`text-4xl font-black ${isFull ? 'text-red-500' : 'text-white'}`}>
                        {bookingCount}
                      </p>
                      <p className="text-gray-500 text-xs">/ {capacity}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-[#2a2a2a] rounded-none overflow-hidden">
                    <div
                      className={`h-full rounded-none ${isFull ? 'bg-red-600' : 'bg-emerald-600'}`}
                      style={{ width: `${Math.min(100, (bookingCount / capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#1C1C1C] rounded-lg p-4 border-r-4 border-[#2a2a2a]">
      <p className="text-4xl font-black text-white">{value.toLocaleString()}</p>
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{label}</p>
    </div>
  )
}

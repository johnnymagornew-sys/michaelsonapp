import { createClient } from '@/lib/supabase/server'
import ScheduleView from './ScheduleView'
import { getWeekDates, toDateString } from '@/lib/utils/dates'
import { Subscription } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SchedulePage({ searchParams }: { searchParams: { week?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Week offset (0 = current, -1 = last, 1 = next, etc.)
  const weekOffset = parseInt(searchParams.week ?? '0', 10) || 0
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)

  // Get week dates
  const weekDates = getWeekDates(baseDate)
  const weekStart = toDateString(weekDates[0])
  const weekEnd = toDateString(weekDates[6])

  // Get all occurrences for this week with class info + booking count
  const { data: occurrences } = await supabase
    .from('class_occurrences')
    .select(`
      id, class_id, date, is_cancelled, override_capacity,
      classes (id, name, type, start_time, duration_minutes, max_capacity, day_of_week),
      bookings (id, user_id, cancelled_at)
    `)
    .gte('date', weekStart)
    .lte('date', weekEnd)
    .order('date')

  // Get user's active subscription
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .lte('start_date', toDateString(new Date()))
    .gte('end_date', toDateString(new Date()))
    .order('end_date', { ascending: false })
    .limit(1)

  const subscription: Subscription | null = subscriptions?.[0] ?? null

  // Get user's active bookings this week
  const { data: myBookings } = await supabase
    .from('bookings')
    .select('id, occurrence_id, cancelled_at')
    .eq('user_id', user.id)
    .is('cancelled_at', null)

  // Count this week's and month's bookings for quota
  const bookedOccurrenceIds = new Set((myBookings ?? []).map(b => b.occurrence_id))

  return (
    <ScheduleView
      occurrences={occurrences ?? []}
      subscription={subscription}
      myBookings={myBookings ?? []}
      weekDates={weekDates.map(toDateString)}
      userId={user.id}
      bookedIds={Array.from(bookedOccurrenceIds)}
      weekOffset={weekOffset}
    />
  )
}

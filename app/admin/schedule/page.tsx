import { createClient } from '@/lib/supabase/server'
import ScheduleAdmin from './ScheduleAdmin'
import { getWeekDates, toDateString } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default async function AdminSchedulePage({ searchParams }: { searchParams: { week?: string } }) {
  const supabase = createClient()

  const weekOffset = parseInt(searchParams.week ?? '0', 10) || 0
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)

  // Get all active classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week')

  // Get this week's occurrences
  const weekDates = getWeekDates(baseDate)
  const weekStart = toDateString(weekDates[0])
  const weekEnd = toDateString(weekDates[6])

  const { data: occurrences } = await supabase
    .from('class_occurrences')
    .select('id, class_id, date, is_cancelled, override_capacity, bookings(id, cancelled_at, profiles(full_name, phone))')
    .gte('date', weekStart)
    .lte('date', weekEnd)

  // Upcoming occurrences for all classes (for the "כל השיעורים" tab)
  const today = toDateString(new Date())
  const { data: upcomingOccurrences } = await supabase
    .from('class_occurrences')
    .select('id, class_id, date, is_cancelled, override_capacity, bookings(id, cancelled_at, profiles(full_name, phone))')
    .gte('date', today)
    .order('date')

  return (
    <ScheduleAdmin
      classes={classes ?? []}
      occurrences={occurrences ?? []}
      upcomingOccurrences={upcomingOccurrences ?? []}
      weekDates={weekDates.map(toDateString)}
      weekOffset={weekOffset}
    />
  )
}

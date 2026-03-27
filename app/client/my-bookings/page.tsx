import { createClient } from '@/lib/supabase/server'
import MyBookingsView from './MyBookingsView'
import { toDateString } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default async function MyBookingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const today = toDateString(new Date())

  // Upcoming active bookings
  const { data: upcoming } = await supabase
    .from('bookings')
    .select(`
      id, booked_at, cancelled_at,
      class_occurrences (
        id, date, is_cancelled, override_capacity,
        classes (id, name, type, start_time, duration_minutes, max_capacity)
      )
    `)
    .eq('user_id', user.id)
    .is('cancelled_at', null)

  const filtered = (upcoming ?? [])
    .filter(b => b.class_occurrences && b.class_occurrences.date >= today)
    .sort((a, b) => a.class_occurrences.date.localeCompare(b.class_occurrences.date))

  return (
    <MyBookingsView
      upcoming={filtered}
      userId={user.id}
    />
  )
}

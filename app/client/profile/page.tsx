import { createClient } from '@/lib/supabase/server'
import ProfileView from './ProfileView'
import { toDateString } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('end_date', { ascending: false })
    .limit(3)

  // Count total attended
  const today = toDateString(new Date())
  const { count: totalAttended } = await supabase
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('cancelled_at', null)
    .lt('class_occurrences.date', today)

  return (
    <ProfileView
      profile={profile}
      subscriptions={subscriptions ?? []}
      email={user.email ?? ''}
      totalAttended={totalAttended ?? 0}
    />
  )
}

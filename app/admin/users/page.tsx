import { createClient } from '@/lib/supabase/server'
import UsersView from './UsersView'
import { toDateString } from '@/lib/utils/dates'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = createClient()
  const today = toDateString(new Date())

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'client')
    .order('full_name')

  // Get latest subscription per user
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .order('end_date', { ascending: false })

  // Map subscription to user
  const subMap: Record<string, any> = {}
  for (const sub of subscriptions ?? []) {
    if (!subMap[sub.user_id]) {
      subMap[sub.user_id] = sub
    }
  }

  // Get all task assignments with task info
  const { data: taskAssignments } = await supabase
    .from('task_assignments')
    .select('id, user_id, completed_at, tasks(id, title, description)')

  // Map tasks to user
  const tasksMap: Record<string, any[]> = {}
  for (const a of taskAssignments ?? []) {
    if (!tasksMap[a.user_id]) tasksMap[a.user_id] = []
    tasksMap[a.user_id].push(a)
  }

  const usersWithSubs = (profiles ?? []).map(p => ({
    ...p,
    subscription: subMap[p.id] ?? null,
    tasks: tasksMap[p.id] ?? [],
  }))

  return <UsersView users={usersWithSubs} today={today} />
}

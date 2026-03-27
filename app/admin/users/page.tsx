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

  // Get recurring classes
  const { data: recurringClasses } = await supabase
    .from('classes')
    .select('id, name, type, day_of_week, start_time, branch, coach')
    .eq('is_recurring', true)
    .eq('is_active', true)
    .order('day_of_week')

  // Get all permanent enrollments
  const { data: permanentEnrollments } = await supabase
    .from('permanent_enrollments')
    .select('id, user_id, class_id')

  // Map enrollments to user
  const enrollmentsMap: Record<string, any[]> = {}
  for (const e of permanentEnrollments ?? []) {
    if (!enrollmentsMap[e.user_id]) enrollmentsMap[e.user_id] = []
    enrollmentsMap[e.user_id].push(e)
  }

  const usersWithSubs = (profiles ?? []).map(p => ({
    ...p,
    subscription: subMap[p.id] ?? null,
    tasks: tasksMap[p.id] ?? [],
    permanentEnrollments: enrollmentsMap[p.id] ?? [],
  }))

  return <UsersView users={usersWithSubs} today={today} recurringClasses={recurringClasses ?? []} />
}

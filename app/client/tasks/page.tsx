import { createClient } from '@/lib/supabase/server'
import TasksView from './TasksView'

export const dynamic = 'force-dynamic'

export default async function ClientTasksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: assignments } = await supabase
    .from('task_assignments')
    .select('id, task_id, completed_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const taskIds = (assignments ?? []).map(a => a.task_id)

  const { data: tasksData } = taskIds.length > 0
    ? await supabase.from('tasks').select('id, title, description, deadline').in('id', taskIds)
    : { data: [] }

  const tasksMap = Object.fromEntries((tasksData ?? []).map(t => [t.id, t]))

  const enrichedAssignments = (assignments ?? []).map(a => ({
    ...a,
    tasks: tasksMap[a.task_id] ?? null,
  }))

  return <TasksView assignments={enrichedAssignments} userId={user.id} />
}

import { createClient } from '@/lib/supabase/server'
import TasksAdmin from './TasksAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminTasksPage() {
  const supabase = createClient()

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name, belt')
    .eq('role', 'client')
    .order('full_name')

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id, title, description, created_at,
      task_assignments (id, user_id, completed_at, profiles(full_name, belt))
    `)
    .order('created_at', { ascending: false })

  return <TasksAdmin clients={clients ?? []} tasks={tasks ?? []} />
}

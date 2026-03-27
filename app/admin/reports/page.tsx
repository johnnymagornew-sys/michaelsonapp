import { createClient } from '@/lib/supabase/server'
import ReportsView from './ReportsView'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = createClient()

  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, type')
    .eq('is_active', true)
    .order('name')

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'client')
    .order('full_name')

  return <ReportsView classes={classes ?? []} clients={clients ?? []} />
}

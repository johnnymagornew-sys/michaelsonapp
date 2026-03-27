import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminBottomNav from '@/components/admin/BottomNav'
import LogoutButton from '@/components/admin/LogoutButton'
import Image from 'next/image'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/client/schedule')

  return (
    <div className="min-h-dvh bg-[#0f0f0f]">
      <header className="sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur-xl border-b border-[#1e1e1e]">
        <div className="flex items-center justify-between px-4 h-14">
          <Image src="/logo_new.png" alt="Michaelson Brothers MMA" width={120} height={40} className="object-contain" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-500 font-bold bg-red-950/40 px-2 py-1 rounded-full">ADMIN</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="content-with-nav">
        {children}
      </main>

      <AdminBottomNav />
    </div>
  )
}

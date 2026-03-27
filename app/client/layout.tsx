import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/client/BottomNav'
import Image from 'next/image'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin') redirect('/admin/dashboard')

  return (
    <div className="min-h-dvh bg-[#0f0f0f]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f0f0f]/90 backdrop-blur-xl border-b border-[#1e1e1e]">
        <div className="flex items-center justify-between px-4 h-14">
          <Image src="/logo_new.png" alt="Michaelson Brothers MMA" width={120} height={40} className="object-contain" />
        </div>
      </header>

      {/* Page content */}
      <main className="content-with-nav">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}

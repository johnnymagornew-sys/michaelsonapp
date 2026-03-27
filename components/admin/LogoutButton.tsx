'use client'

import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs text-gray-500 hover:text-red-500 transition-colors font-medium px-2 py-1"
    >
      התנתק
    </button>
  )
}

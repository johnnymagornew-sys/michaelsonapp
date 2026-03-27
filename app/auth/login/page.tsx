'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    // Let the server (page.tsx) decide where to redirect based on role
    window.location.href = '/'
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#141414] to-[#0f0f0f] flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="text-center mb-10">
        <Image src="/logo_new.png" alt="Michaelson Brothers MMA" width={200} height={70} className="object-contain mx-auto mb-4" />
        <h1 className="text-2xl font-black uppercase tracking-tight text-white">MICHAELSON MMA</h1>
        <p className="text-gray-500 text-sm mt-1">ברוך הבא — כניסה למערכת</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block uppercase tracking-widest text-xs font-bold text-gray-300 mb-2">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#141414] border-0 border-b-2 border-[#444] focus:border-red-600 rounded-none px-0 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors"
              placeholder="your@email.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block uppercase tracking-widest text-xs font-bold text-gray-300 mb-2">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#141414] border-0 border-b-2 border-[#444] focus:border-red-600 rounded-none px-0 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase tracking-tight py-4 rounded-lg transition-colors mt-2"
          >
            {loading ? 'נכנס...' : 'כניסה'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-6">
          אין לך חשבון?{' '}
          <Link href="/auth/register" className="text-red-500 font-medium">
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  )
}

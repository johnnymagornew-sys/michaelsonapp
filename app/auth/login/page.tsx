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
    <div className="min-h-dvh bg-[#0f0f0f] flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="text-center mb-10">
        <Image src="/logo_new.png" alt="Michaelson Brothers MMA" width={200} height={70} className="object-contain mx-auto mb-4" />
        <p className="text-gray-500 text-sm">כניסה למערכת</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors"
              placeholder="your@email.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors mt-2"
          >
            {loading ? 'נכנס...' : 'כניסה'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          אין לך חשבון?{' '}
          <Link href="/auth/register" className="text-red-500 font-medium">
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '',
    medical_notes: '',
  })

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          phone: form.phone,
          date_of_birth: form.date_of_birth || null,
          medical_notes: form.medical_notes || null,
          role: 'client',
        },
      },
    })

    if (authError) {
      setError(authError.message === 'User already registered'
        ? 'אימייל זה כבר רשום במערכת'
        : `שגיאה: ${authError.message}`)
      setLoading(false)
      return
    }

    router.push('/client/schedule')
    router.refresh()
  }

  const inputClass = "w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors"

  return (
    <div className="min-h-dvh bg-[#0f0f0f] flex flex-col px-5 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <Image src="/logo_new.png" alt="Michaelson Brothers MMA" width={180} height={65} className="object-contain mx-auto mb-3" />
        <p className="text-gray-500 text-sm">צור חשבון חדש</p>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">שם מלא *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setField('full_name', e.target.value)}
              required
              className={inputClass}
              placeholder="ישראל ישראלי"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">אימייל *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              required
              className={inputClass}
              placeholder="your@email.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">סיסמה *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setField('password', e.target.value)}
              required
              minLength={6}
              className={inputClass}
              placeholder="לפחות 6 תווים"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">טלפון *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setField('phone', e.target.value)}
              required
              className={inputClass}
              placeholder="050-0000000"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">תאריך לידה</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => setField('date_of_birth', e.target.value)}
              className={inputClass}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              הערות רפואיות
              <span className="text-gray-600 font-normal mr-1">(אופציונלי)</span>
            </label>
            <textarea
              value={form.medical_notes}
              onChange={e => setField('medical_notes', e.target.value)}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="פציעות, אלרגיות, מגבלות..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors mt-2"
          >
            {loading ? 'נרשם...' : 'הרשמה'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          יש לך כבר חשבון?{' '}
          <Link href="/auth/login" className="text-red-500 font-medium">
            כניסה
          </Link>
        </p>
      </div>
    </div>
  )
}

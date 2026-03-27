'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import AvatarCropper from '@/components/ui/AvatarCropper'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  function handleCropDone(blob: Blob) {
    setAvatarBlob(blob)
    setAvatarPreview(URL.createObjectURL(blob))
    setCropSrc(null)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signUp({
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

    // Upload avatar if selected
    if (avatarBlob && data.user) {
      const path = `${data.user.id}/avatar.jpg`
      const { data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(path, avatarBlob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', data.user.id)
      }
    }

    router.push('/client/schedule')
    router.refresh()
  }

  const inputClass = "w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors"

  return (
    <div className="min-h-dvh bg-[#0f0f0f] flex flex-col px-5 py-10">
      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onCrop={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
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

          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden bg-[#1a1a1a] border-2 border-dashed border-[#3a3a3a] hover:border-red-600 transition-colors flex items-center justify-center group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="תמונת פרופיל" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-600 group-hover:text-gray-400 transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
              )}
              {avatarPreview && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              )}
            </button>
            <p className="text-gray-600 text-xs">תמונת פרופיל (אופציונלי)</p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">שם מלא *</label>
            <input type="text" value={form.full_name} onChange={e => setField('full_name', e.target.value)} required className={inputClass} placeholder="ישראל ישראלי" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">אימייל *</label>
            <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} required className={inputClass} placeholder="your@email.com" dir="ltr" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">סיסמה *</label>
            <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} required minLength={6} className={inputClass} placeholder="לפחות 6 תווים" dir="ltr" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">טלפון *</label>
            <input type="tel" value={form.phone} onChange={e => setField('phone', e.target.value)} required className={inputClass} placeholder="050-0000000" dir="ltr" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">תאריך לידה</label>
            <input type="date" value={form.date_of_birth} onChange={e => setField('date_of_birth', e.target.value)} className={inputClass} dir="ltr" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              הערות רפואיות
              <span className="text-gray-600 font-normal mr-1">(אופציונלי)</span>
            </label>
            <textarea value={form.medical_notes} onChange={e => setField('medical_notes', e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="פציעות, אלרגיות, מגבלות..." />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors mt-2">
            {loading ? 'נרשם...' : 'הרשמה'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          יש לך כבר חשבון?{' '}
          <Link href="/auth/login" className="text-red-500 font-medium">כניסה</Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile, Subscription, SUBSCRIPTION_LABELS, BELT_LABELS, BELT_COLORS, BELT_ORDER, Belt } from '@/types'
import BeltIcon from '@/components/ui/BeltIcon'
import AvatarCropper from '@/components/ui/AvatarCropper'
import { formatDateHebrew, daysRemaining, isSubscriptionActive } from '@/lib/utils/dates'

interface Props {
  profile: Profile | null
  subscriptions: Subscription[]
  email: string
  totalAttended: number
}

export default function ProfileView({ profile, subscriptions, email, totalAttended }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url ?? null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const activeSub = subscriptions.find(s => isSubscriptionActive(s))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  async function handleCropDone(blob: Blob) {
    if (!profile) return
    setCropSrc(null)
    setUploadingAvatar(true)
    const path = `${profile.id}/avatar.jpg`
    const { data: uploadData } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (uploadData) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const newUrl = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', profile.id)
      setAvatarUrl(newUrl)
    }
    setUploadingAvatar(false)
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="px-4 py-5 space-y-5">
      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onCrop={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}

      {/* Profile hero */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
          className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 group"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="תמונת פרופיל" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-red-600 flex items-center justify-center text-white font-black text-xl">
              {initials}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploadingAvatar ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        <div>
          <h1 className="text-xl font-black text-white">{profile?.full_name}</h1>
          <p className="text-gray-500 text-sm">{email}</p>
          <p className="text-gray-600 text-xs mt-0.5">לחץ על התמונה לשינוי</p>
        </div>
      </div>

      {/* Belt card */}
      {profile?.belt && (() => {
        const belt = profile.belt as Belt
        const c = BELT_COLORS[belt]
        const beltIdx = BELT_ORDER.indexOf(belt)
        return (
          <div className="bg-[#1e1e1e] border border-white/8 rounded-2xl p-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">דרגת חגורה</p>
            <div className="flex items-center gap-4">
              <BeltIcon belt={belt} size="lg" />
              <div className="flex-1">
                <p className="text-white font-black text-xl">חגורה {BELT_LABELS[belt]}</p>
                <p className="text-gray-500 text-xs mt-0.5">דרגה {beltIdx + 1} מתוך 8</p>
                <div className="flex gap-1 mt-2">
                  {BELT_ORDER.map((b, i) => (
                    <div key={b} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: i <= beltIdx ? BELT_COLORS[b].bar : '#2a2a2a' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1e1e1e] border border-white/8 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-red-500">{totalAttended}</p>
          <p className="text-gray-400 text-xs mt-1">אימונים שהושלמו</p>
        </div>
        <div className="bg-[#1e1e1e] border border-white/8 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-white">{activeSub ? daysRemaining(activeSub.end_date) : '—'}</p>
          <p className="text-gray-400 text-xs mt-1">ימים נותרו במנוי</p>
        </div>
      </div>

      {/* Subscription card */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">מנוי</h2>
        {activeSub ? (
          <div className="bg-gradient-to-br from-red-900/50 to-red-950/30 border border-red-700/50 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-red-400 font-semibold uppercase tracking-wide">מנוי פעיל</p>
                <p className="text-white font-bold text-lg mt-0.5">{SUBSCRIPTION_LABELS[activeSub.type as keyof typeof SUBSCRIPTION_LABELS]}</p>
              </div>
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-full">פעיל</span>
            </div>
            <div className="mt-3 pt-3 border-t border-red-800/20 flex justify-between text-sm">
              <span className="text-gray-400">תוקף עד</span>
              <span className="text-white font-medium">{formatDateHebrew(activeSub.end_date)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-[#1e1e1e] border border-white/8 rounded-2xl p-4">
            <p className="text-gray-400 font-medium text-center">אין מנוי פעיל</p>
            <p className="text-gray-500 text-sm text-center mt-1">לרכישת מנוי יש ליצור קשר עם המאמן</p>
          </div>
        )}
      </div>

      {/* Personal info */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">פרטים אישיים</h2>
        <div className="bg-[#1e1e1e] border border-white/8 rounded-2xl divide-y divide-white/10">
          {profile?.phone && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-gray-400 text-sm">טלפון</span>
              <span className="text-white text-sm font-medium" dir="ltr">{profile.phone}</span>
            </div>
          )}
          {profile?.date_of_birth && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-gray-400 text-sm">תאריך לידה</span>
              <span className="text-white text-sm font-medium">{formatDateHebrew(profile.date_of_birth)}</span>
            </div>
          )}
          {profile?.medical_notes && (
            <div className="px-4 py-3">
              <span className="text-gray-400 text-sm block mb-1">הערות רפואיות</span>
              <span className="text-white text-sm">{profile.medical_notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} className="w-full py-4 border border-white/10 text-red-500 font-semibold rounded-2xl hover:bg-red-950/20 transition-colors">
        התנתקות
      </button>
    </div>
  )
}

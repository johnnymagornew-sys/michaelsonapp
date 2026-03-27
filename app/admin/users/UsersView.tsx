'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { SUBSCRIPTION_LABELS, SubscriptionType, Belt, BELT_LABELS, BELT_ORDER, BELT_COLORS, AGE_GROUPS, AgeGroup, DAY_NAMES, CLASS_TYPE_COLORS, ClassType } from '@/types'
import { formatTime } from '@/lib/utils/dates'
import BeltIcon from '@/components/ui/BeltIcon'
import { formatDateHebrew, isSubscriptionActive } from '@/lib/utils/dates'

interface Props {
  users: any[]
  today: string
  recurringClasses: any[]
  initialFilter?: string
}

export default function UsersView({ users, today, recurringClasses, initialFilter = 'all' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'subscription' | 'name' | 'belt'>('subscription')
  const [filterBelt, setFilterBelt] = useState<Belt | 'all'>('all')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [subModal, setSubModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [taskModal, setTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', deadline: '' })
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [subForm, setSubForm] = useState({
    type: '8_per_month' as SubscriptionType,
    start_date: today,
    end_date: '',
    age_group: 'כולם' as AgeGroup,
  })

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = users
    .filter(u => {
      if (!(u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search))) return false
      if (filterBelt !== 'all' && u.belt !== filterBelt) return false
      if (initialFilter === 'expired') return u.subscription && u.subscription.end_date < today
      if (initialFilter === 'active') return u.subscription && u.subscription.end_date >= today && u.subscription.start_date <= today
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.full_name ?? '').localeCompare(b.full_name ?? '', 'he')
      }
      if (sortBy === 'belt') {
        return (BELT_ORDER.indexOf(a.belt) ?? -1) - (BELT_ORDER.indexOf(b.belt) ?? -1)
      }
      // sortBy === 'subscription': soonest expiry first, no-sub last
      const aDate = a.subscription?.end_date ?? '9999-12-31'
      const bDate = b.subscription?.end_date ?? '9999-12-31'
      return aDate.localeCompare(bDate)
    })

  function getSubStatus(sub: any) {
    if (!sub) return { label: 'ללא מנוי', color: 'bg-gray-800 text-gray-500' }
    if (isSubscriptionActive(sub)) return { label: 'פעיל', color: 'bg-emerald-900/40 text-emerald-400' }
    return { label: 'פג תוקף', color: 'bg-amber-900/40 text-amber-400' }
  }

  function openSubModal(user: any) {
    setSelectedUser(user)
    if (user.subscription) {
      setSubForm({
        type: user.subscription.type,
        start_date: user.subscription.start_date,
        end_date: user.subscription.end_date,
        age_group: user.subscription.age_group ?? 'כולם',
      })
    } else {
      setSubForm({ type: '8_per_month', start_date: today, end_date: '', age_group: 'כולם' })
    }
    setSubModal(true)
  }

  async function saveSub() {
    if (!selectedUser || !subForm.end_date) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    let error

    if (selectedUser.subscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          type: subForm.type,
          start_date: subForm.start_date,
          end_date: subForm.end_date,
          age_group: subForm.age_group,
          assigned_by: user?.id,
        })
        .eq('id', selectedUser.subscription.id)
      error = updateError
    } else {
      // Insert new subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: selectedUser.id,
          type: subForm.type,
          start_date: subForm.start_date,
          end_date: subForm.end_date,
          age_group: subForm.age_group,
          assigned_by: user?.id,
        })
      error = insertError
    }

    setLoading(false)
    setSubModal(false)
    if (error) {
      showToast('שגיאה בשמירת המנוי', 'error')
    } else {
      showToast('המנוי נשמר בהצלחה', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function approveTask(assignmentId: string) {
    setLoading(true)
    await supabase.from('task_assignments').delete().eq('id', assignmentId)
    setLoading(false)
    showToast('המטלה אושרה והוסרה', 'success')
    startTransition(() => router.refresh())
  }

  async function addTaskToUser() {
    if (!selectedUser || !taskForm.title.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ title: taskForm.title.trim(), description: taskForm.description.trim() || null, deadline: taskForm.deadline || null, created_by: user?.id })
      .select().single()
    if (!error && task) {
      await supabase.from('task_assignments').insert({ task_id: task.id, user_id: selectedUser.id })
    }
    setLoading(false)
    setTaskModal(false)
    setTaskForm({ title: '', description: '', deadline: '' })
    if (error) {
      showToast('שגיאה בהוספת המטלה', 'error')
    } else {
      showToast('המטלה נוספה בהצלחה', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function saveBelt(userId: string, belt: Belt | null) {
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ belt })
      .eq('id', userId)
    setLoading(false)
    if (error) {
      showToast(`שגיאה: ${error.message}`, 'error')
    } else {
      showToast('החגורה עודכנה', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function revokeSub(subId: string) {
    setLoading(true)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const { error } = await supabase
      .from('subscriptions')
      .update({ end_date: yesterday.toISOString().split('T')[0] })
      .eq('id', subId)
    setLoading(false)
    setDetailModal(false)
    if (error) {
      showToast('שגיאה', 'error')
    } else {
      showToast('המנוי בוטל', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function addPermanentEnrollment(userId: string, classId: string) {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    // Add enrollment record
    await supabase.from('permanent_enrollments').insert({ user_id: userId, class_id: classId })
    // Book all future occurrences not already booked
    const { data: futureOccs } = await supabase
      .from('class_occurrences')
      .select('id')
      .eq('class_id', classId)
      .gte('date', today)
      .eq('is_cancelled', false)
    if (futureOccs && futureOccs.length > 0) {
      await supabase.from('bookings').upsert(
        futureOccs.map(o => ({ user_id: userId, occurrence_id: o.id })),
        { onConflict: 'user_id,occurrence_id', ignoreDuplicates: true }
      )
    }
    setLoading(false)
    showToast('התלמיד שובץ לאימון', 'success')
    startTransition(() => router.refresh())
  }

  async function removePermanentEnrollment(enrollmentId: string) {
    setLoading(true)
    await supabase.from('permanent_enrollments').delete().eq('id', enrollmentId)
    setLoading(false)
    showToast('השיבוץ הוסר', 'success')
    startTransition(() => router.refresh())
  }

  const inputClass = "w-full bg-[#242424] border border-[#3a3a3a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"

  return (
    <div className="px-4 py-5">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-white">
          {initialFilter === 'expired' ? 'מנויים שפגו' : initialFilter === 'active' ? 'מנויים פעילים' : 'משתמשים'}
        </h1>
        {initialFilter !== 'all' && (
          <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold mt-0.5">
            מסונן — {initialFilter === 'expired' ? 'פג תוקף' : 'פעיל'}
          </p>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם או טלפון..."
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors pr-10"
        />
        <span className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-600">🔍</span>
      </div>

      {/* Sort buttons */}
      <div className="flex gap-2 mb-3">
        {([
          { key: 'subscription', label: 'מנוי' },
          { key: 'name', label: 'א-ב' },
          { key: 'belt', label: 'חגורה' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
              sortBy === key ? 'bg-red-600 text-white' : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Belt filter */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterBelt('all')}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filterBelt === 'all' ? 'bg-white text-black' : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a]'
          }`}
        >
          הכל
        </button>
        {BELT_ORDER.map(belt => (
          <button
            key={belt}
            onClick={() => setFilterBelt(filterBelt === belt ? 'all' : belt)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
              filterBelt === belt ? 'border-white/40 bg-white/10 text-white' : 'border-[#2a2a2a] text-gray-400'
            }`}
            style={filterBelt === belt ? { borderColor: BELT_COLORS[belt].bar + '80' } : {}}
          >
            {BELT_LABELS[belt]}
          </button>
        ))}
      </div>

      <p className="text-gray-500 text-sm mb-3">{filtered.length} תלמידים</p>

      {/* User list */}
      <div className="space-y-2">
        {filtered.map(user => {
          const status = getSubStatus(user.subscription)
          return (
            <div
              key={user.id}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#2a2a2a] flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{user.full_name}</p>
                    <p className="text-gray-500 text-xs" dir="ltr">{user.phone}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 mr-2 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                  {user.subscription?.end_date && (
                    <span className="text-[10px] text-gray-600">
                      עד {user.subscription.end_date}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { setSelectedUser(user); setDetailModal(true) }}
                  className="flex-1 py-2.5 bg-[#242424] text-gray-300 text-sm font-medium rounded-xl hover:bg-[#2e2e2e] transition-colors"
                >
                  פרטים
                </button>
                <button
                  onClick={() => openSubModal(user)}
                  className="flex-1 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-500 transition-colors"
                >
                  {user.subscription ? 'עדכן מנוי' : 'הוסף מנוי'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail modal */}
      <Modal open={detailModal} onClose={() => setDetailModal(false)} title="פרטי תלמיד">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-red-600 flex items-center justify-center">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-black text-lg">
                    {selectedUser.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-bold text-lg">{selectedUser.full_name}</p>
                <p className="text-gray-500 text-sm" dir="ltr">{selectedUser.phone}</p>
              </div>
            </div>

            <div className="bg-[#242424] rounded-xl divide-y divide-[#3a3a3a]">
              {selectedUser.date_of_birth && (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-gray-500 text-sm">תאריך לידה</span>
                  <span className="text-white text-sm">{formatDateHebrew(selectedUser.date_of_birth)}</span>
                </div>
              )}
              {selectedUser.medical_notes && (
                <div className="px-4 py-3">
                  <p className="text-gray-500 text-sm mb-1">הערות רפואיות</p>
                  <p className="text-white text-sm">{selectedUser.medical_notes}</p>
                </div>
              )}
            </div>

            {/* Belt selector */}
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-2">דרגת חגורה</p>
              <div className="grid grid-cols-4 gap-2">
                {BELT_ORDER.map(belt => {
                  const isSelected = selectedUser.belt === belt
                  const c = BELT_COLORS[belt]
                  return (
                    <button
                      key={belt}
                      onClick={() => saveBelt(selectedUser.id, isSelected ? null : belt)}
                      disabled={loading}
                      className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-white/40 bg-white/5 scale-105'
                          : 'border-[#3a3a3a] bg-[#242424] hover:border-gray-500'
                      }`}
                    >
                      <BeltIcon belt={belt} size="sm" />
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                        {BELT_LABELS[belt]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Subscription info */}
            {selectedUser.subscription && (
              <div className="bg-[#242424] rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-2">מנוי נוכחי</p>
                <p className="text-white font-bold">{SUBSCRIPTION_LABELS[selectedUser.subscription.type as SubscriptionType]}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {formatDateHebrew(selectedUser.subscription.start_date)} — {formatDateHebrew(selectedUser.subscription.end_date)}
                </p>
                {isSubscriptionActive(selectedUser.subscription) && (
                  <button
                    onClick={() => revokeSub(selectedUser.subscription.id)}
                    disabled={loading}
                    className="w-full mt-3 py-2.5 border border-red-800/50 text-red-500 text-sm font-medium rounded-xl"
                  >
                    {loading ? '...' : 'ביטול מנוי'}
                  </button>
                )}
              </div>
            )}

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm font-semibold">
                  מטלות ({(selectedUser.tasks ?? []).length})
                </p>
                <button
                  onClick={() => setTaskModal(true)}
                  className="text-red-500 text-xs font-bold"
                >
                  + הוסף מטלה
                </button>
              </div>
              {(selectedUser.tasks ?? []).length === 0 ? (
                <div className="bg-[#242424] rounded-xl px-4 py-3 text-center">
                  <p className="text-gray-600 text-sm">אין מטלות עדיין</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {(selectedUser.tasks ?? []).map((a: any) => (
                    <div key={a.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${a.completed_at ? 'bg-emerald-950/30 border border-emerald-800/30' : 'bg-[#242424]'}`}>
                      <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${a.completed_at ? 'bg-emerald-600' : 'border-2 border-gray-600'}`}>
                        {a.completed_at && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm flex-1 truncate ${a.completed_at ? 'text-emerald-300' : 'text-white'}`}>
                        {a.tasks?.title}
                      </span>
                      {a.completed_at && (
                        <button
                          onClick={() => approveTask(a.id)}
                          disabled={loading}
                          className="shrink-0 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg transition-colors"
                        >
                          אשר ✓
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permanent enrollments */}
            {recurringClasses.length > 0 && (
              <div>
                <p className="text-gray-400 text-sm font-semibold mb-2">שיבוץ קבוע לאימונים</p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {recurringClasses.map(cls => {
                    const enrollment = (selectedUser.permanentEnrollments ?? []).find((e: any) => e.class_id === cls.id)
                    const isEnrolled = !!enrollment
                    return (
                      <div key={cls.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${isEnrolled ? 'bg-emerald-950/30 border-emerald-800/30' : 'bg-[#242424] border-transparent'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CLASS_TYPE_COLORS[cls.type as ClassType]}`}>{cls.type}</span>
                            <span className="text-gray-500 text-[10px]">{DAY_NAMES[cls.day_of_week]} · {formatTime(cls.start_time)}</span>
                          </div>
                          <p className="text-white text-sm font-medium truncate">{cls.name}</p>
                          {cls.branch && <p className="text-gray-600 text-xs">{cls.branch}</p>}
                        </div>
                        <button
                          onClick={() => isEnrolled
                            ? removePermanentEnrollment(enrollment.id)
                            : addPermanentEnrollment(selectedUser.id, cls.id)
                          }
                          disabled={loading}
                          className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            isEnrolled
                              ? 'bg-emerald-700/50 text-emerald-300 hover:bg-red-900/40 hover:text-red-400'
                              : 'bg-[#333] text-gray-400 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          {isEnrolled ? '✓ משובץ' : '+ שבץ'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => openSubModal(selectedUser)}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-sm"
              >
                {selectedUser.subscription ? 'עדכן מנוי' : 'הוסף מנוי'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Subscription modal */}
      <Modal open={subModal} onClose={() => setSubModal(false)} title="הגדרת מנוי">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">תלמיד: <span className="text-white font-medium">{selectedUser.full_name}</span></p>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">סוג מנוי</label>
              <select
                value={subForm.type}
                onChange={e => setSubForm(f => ({ ...f, type: e.target.value as SubscriptionType }))}
                className={inputClass}
              >
                <option value="8_per_month">8 אימונים בחודש</option>
                <option value="unlimited_monthly">חופשי חודשי</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">תאריך התחלה</label>
              <input
                type="date"
                value={subForm.start_date}
                onChange={e => setSubForm(f => ({ ...f, start_date: e.target.value }))}
                className={inputClass}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">תאריך סיום</label>
              <input
                type="date"
                value={subForm.end_date}
                onChange={e => setSubForm(f => ({ ...f, end_date: e.target.value }))}
                className={inputClass}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">קבוצת גיל</label>
              <div className="grid grid-cols-5 gap-1.5">
                {AGE_GROUPS.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSubForm(f => ({ ...f, age_group: g }))}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                      subForm.age_group === g ? 'bg-red-600 text-white' : 'bg-[#242424] text-gray-400 border border-[#3a3a3a]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveSub}
              disabled={loading || !subForm.end_date}
              className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
            >
              {loading ? 'שומר...' : 'שמור מנוי'}
            </button>
          </div>
        )}
      </Modal>

      {/* Task modal */}
      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="הוסף מטלה לתלמיד">
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">תלמיד: <span className="text-white font-medium">{selectedUser.full_name}</span></p>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">כותרת המטלה *</label>
              <input
                type="text"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                className={inputClass}
                placeholder="לדוג': תרגל Guard Passing"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">תיאור (אופציונלי)</label>
              <textarea
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className={`${inputClass} resize-none`}
                placeholder="פרטים נוספים..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">דדליין (אופציונלי)</label>
              <input
                type="date"
                value={taskForm.deadline}
                onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))}
                className={inputClass}
                dir="ltr"
              />
            </div>
            <button
              onClick={addTaskToUser}
              disabled={loading || !taskForm.title.trim()}
              className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl"
            >
              {loading ? 'שומר...' : 'הוסף מטלה'}
            </button>
          </div>
        )}
      </Modal>

      {toast && (
        <div className={`fixed top-20 right-4 left-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-center animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-800 text-emerald-100' : 'bg-red-900 text-red-100'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

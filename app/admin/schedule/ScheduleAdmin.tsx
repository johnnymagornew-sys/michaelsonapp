'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import { CLASS_TYPE_COLORS, ClassType, DAY_NAMES, DAY_NAMES_SHORT, BRANCHES, COACHES, AGE_GROUPS, Branch, Coach, AgeGroup } from '@/types'
import { formatTime, isToday } from '@/lib/utils/dates'

interface Props {
  classes: any[]
  occurrences: any[]
  upcomingOccurrences: any[]
  weekDates: string[]
  weekOffset: number
  allUsers: any[]
  permanentEnrollments: any[]
}

export default function ScheduleAdmin({ classes, occurrences, upcomingOccurrences, weekDates, weekOffset, allUsers, permanentEnrollments: initialEnrollments }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const [selectedDay, setSelectedDay] = useState(() => {
    if (weekOffset === 0) {
      const todayIdx = weekDates.findIndex(d => d === new Date().toISOString().split('T')[0])
      return todayIdx >= 0 ? todayIdx : 0
    }
    return 0
  })
  const [classModal, setClassModal] = useState(false)
  const [occModal, setOccModal] = useState<any>(null)
  const [classDetailModal, setClassDetailModal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [tab, setTab] = useState<'week' | 'classes'>('week')
  const [enrollments, setEnrollments] = useState<any[]>(initialEnrollments)
  const [enrollTab, setEnrollTab] = useState<'enrolled' | 'add'>('enrolled')

  const todayStr = new Date().toISOString().split('T')[0]
  const [classForm, setClassForm] = useState({
    name: '',
    type: 'MMA' as ClassType,
    branch: 'מרכז פיס' as Branch,
    coach: 'שוקי' as Coach,
    age_group: 'כולם' as AgeGroup,
    start_date: todayStr,
    start_time: '18:00',
    duration_minutes: 60,
    max_capacity: 25,
    is_recurring: true,
  })

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const dayOccs = occurrences
    .filter(o => o.date === weekDates[selectedDay])
    .sort((a: any, b: any) => {
      const aC = classes.find((c: any) => c.id === a.class_id)
      const bC = classes.find((c: any) => c.id === b.class_id)
      return (aC?.start_time ?? '').localeCompare(bC?.start_time ?? '')
    })

  async function addPermanentEnrollment(userId: string, classId: string) {
    const { data } = await supabase
      .from('permanent_enrollments')
      .insert({ user_id: userId, class_id: classId })
      .select()
      .single()
    if (data) {
      setEnrollments(prev => [...prev, data])
      // Also book all future occurrences for this user
      const today = new Date().toISOString().split('T')[0]
      const futureOccs = await supabase
        .from('class_occurrences')
        .select('id')
        .eq('class_id', classId)
        .eq('is_cancelled', false)
        .gte('date', today)
      if (futureOccs.data) {
        const bookings = futureOccs.data.map(o => ({ user_id: userId, occurrence_id: o.id }))
        await supabase.from('bookings').upsert(bookings, { onConflict: 'user_id,occurrence_id', ignoreDuplicates: true })
      }
      showToast('התלמיד שובץ קבוע', 'success')
    }
  }

  async function removePermanentEnrollment(userId: string, classId: string) {
    const enrollment = enrollments.find(e => e.user_id === userId && e.class_id === classId)
    if (!enrollment) return
    await supabase.from('permanent_enrollments').delete().eq('id', enrollment.id)
    setEnrollments(prev => prev.filter(e => e.id !== enrollment.id))
    showToast('השיבוץ הקבוע הוסר', 'success')
  }

  async function createClass() {
    setLoading(true)
    const startDate = new Date(classForm.start_date + 'T00:00:00')
    const day_of_week = startDate.getDay()

    const { data: cls, error } = await supabase.from('classes').insert({
      name: classForm.name,
      type: classForm.type,
      branch: classForm.branch,
      coach: classForm.coach,
      age_group: classForm.age_group,
      day_of_week,
      start_time: classForm.start_time,
      duration_minutes: classForm.duration_minutes,
      max_capacity: classForm.max_capacity,
      is_recurring: classForm.is_recurring,
    }).select().single()

    if (!error && cls) {
      if (classForm.is_recurring) {
        // Generate occurrences until January 1st of next year
        const nextJan1 = `${new Date().getFullYear() + 1}-01-01`
        await supabase.rpc('generate_occurrences_until', { p_class_id: cls.id, p_until_date: nextJan1 })
      } else {
        // Create single occurrence on the chosen date
        await supabase.from('class_occurrences').insert({
          class_id: cls.id,
          date: classForm.start_date,
        })
      }
    }
    setLoading(false)
    setClassModal(false)
    if (error) {
      showToast('שגיאה ביצירת שיעור', 'error')
    } else {
      showToast('השיעור נוצר בהצלחה', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function toggleCancelOccurrence(occ: any) {
    setLoading(true)
    const { error } = await supabase
      .from('class_occurrences')
      .update({ is_cancelled: !occ.is_cancelled })
      .eq('id', occ.id)
    setLoading(false)
    setOccModal(null)
    if (error) {
      showToast('שגיאה', 'error')
    } else {
      showToast(occ.is_cancelled ? 'האימון שוחזר' : 'האימון בוטל', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function cancelAllFutureOccurrences(occ: any) {
    setLoading(true)
    const { error } = await supabase
      .from('class_occurrences')
      .update({ is_cancelled: true })
      .eq('class_id', occ.class_id)
      .gte('date', occ.date)
    setLoading(false)
    setOccModal(null)
    if (error) {
      showToast('שגיאה', 'error')
    } else {
      showToast('כל השיעורים הקרובים בוטלו', 'success')
      startTransition(() => router.refresh())
    }
  }

  async function deleteClass(classId: string) {
    if (!confirm('למחוק את השיעור? כל ההזמנות יבוטלו.')) return
    setLoading(true)
    await supabase.from('classes').update({ is_active: false }).eq('id', classId)
    setLoading(false)
    setOccModal(null)
    showToast('השיעור נמחק', 'success')
    startTransition(() => router.refresh())
  }

  const inputClass = "w-full bg-[#242424] border border-[#3a3a3a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors text-sm"

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">מערכת שעות</h1>
        <button
          onClick={() => {
            setClassForm(f => ({ ...f, start_date: weekDates[selectedDay] }))
            setClassModal(true)
          }}
          className="bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1"
        >
          <span className="text-lg leading-none">+</span> שיעור
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 mb-4 gap-1">
        <button
          onClick={() => setTab('week')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'week' ? 'bg-red-600 text-white' : 'text-gray-500'}`}
        >
          תצוגת שבוע
        </button>
        <button
          onClick={() => setTab('classes')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'classes' ? 'bg-red-600 text-white' : 'text-gray-500'}`}
        >
          כל השיעורים
        </button>
      </div>

      {tab === 'week' ? (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push(`/admin/schedule?week=${weekOffset - 1}`)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors text-lg"
            >
              ›
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-white">
                {weekOffset === 0 ? 'השבוע' : weekOffset === 1 ? 'שבוע הבא' : weekOffset === -1 ? 'שבוע שעבר' : weekOffset > 0 ? `${weekOffset} שבועות קדימה` : `${Math.abs(weekOffset)} שבועות אחורה`}
              </p>
              <p className="text-[11px] text-gray-500">
                {new Date(weekDates[0] + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                {' — '}
                {new Date(weekDates[6] + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <button
              onClick={() => router.push(`/admin/schedule?week=${weekOffset + 1}`)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#2a2a2a] transition-colors text-lg"
            >
              ‹
            </button>
          </div>

          {/* Week selector */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDates.map((dateStr, i) => {
              const date = new Date(dateStr + 'T00:00:00')
              const active = selectedDay === i
              const today = isToday(dateStr)
              const hasDot = occurrences.some(o => o.date === dateStr)
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(i)}
                  className={`flex flex-col items-center py-2 rounded-xl transition-colors ${
                    active ? 'bg-red-600 text-white' : today ? 'bg-[#2a2a2a] text-white' : 'text-gray-500'
                  }`}
                >
                  <span className="text-[10px] font-medium">{DAY_NAMES_SHORT[i]}</span>
                  <span className="text-base font-bold">{date.getDate()}</span>
                  {hasDot && !active && <div className="w-1 h-1 rounded-full bg-gray-600 mt-0.5" />}
                </button>
              )
            })}
          </div>

          {/* Day classes */}
          {dayOccs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">אין אימונים ביום זה</p>
              <button onClick={() => { setClassForm(f => ({ ...f, start_date: weekDates[selectedDay] })); setClassModal(true) }} className="mt-3 text-red-500 text-sm font-medium">
                + הוסף שיעור
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayOccs.map(occ => {
                const cls = classes.find(c => c.id === occ.class_id)
                if (!cls) return null
                const bookingCount = (occ.bookings ?? []).filter((b: any) => !b.cancelled_at).length
                const capacity = occ.override_capacity ?? cls.max_capacity

                return (
                  <div
                    key={occ.id}
                    onClick={() => setOccModal({ occ, cls })}
                    className={`bg-[#1a1a1a] border ${occ.is_cancelled ? 'border-gray-800 opacity-60' : 'border-[#2a2a2a]'} rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CLASS_TYPE_COLORS[cls.type as ClassType]}`}>
                            {cls.type}
                          </span>
                          {occ.is_cancelled && (
                            <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">בוטל</span>
                          )}
                        </div>
                        <p className="text-white font-bold">{cls.name}</p>
                        <p className="text-gray-400 text-sm">{formatTime(cls.start_time)} · {cls.duration_minutes} דק'</p>
                        <p className="text-gray-600 text-xs mt-0.5">{cls.branch ?? ''}{cls.coach ? ` · ${cls.coach}` : ''}{cls.age_group && cls.age_group !== 'כולם' ? ` · גיל ${cls.age_group}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className={`text-2xl font-black ${bookingCount >= capacity ? 'text-red-500' : 'text-white'}`}>
                            {bookingCount}
                          </p>
                          <p className="text-gray-500 text-xs">/ {capacity}</p>
                        </div>
                        <span className="text-gray-600 text-lg">‹</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${bookingCount >= capacity ? 'bg-red-600' : 'bg-emerald-600'}`}
                        style={{ width: `${Math.min(100, (bookingCount / capacity) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {classes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">אין שיעורים</p>
            </div>
          ) : (
            classes.map(cls => {
              const clsOccs = upcomingOccurrences.filter(o => o.class_id === cls.id)
              const totalBooked = clsOccs.reduce((sum, o) => sum + (o.bookings ?? []).filter((b: any) => !b.cancelled_at).length, 0)
              return (
                <div
                  key={cls.id}
                  onClick={() => setClassDetailModal(cls)}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CLASS_TYPE_COLORS[cls.type as ClassType]}`}>
                          {cls.type}
                        </span>
                        <span className="text-xs text-gray-500">{DAY_NAMES[cls.day_of_week]}</span>
                      </div>
                      <p className="text-white font-bold">{cls.name}</p>
                      <p className="text-gray-400 text-sm">{formatTime(cls.start_time)} · {cls.max_capacity} מקומות</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {totalBooked > 0 && (
                        <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2 py-1 rounded-full font-bold">
                          {totalBooked} רשומים
                        </span>
                      )}
                      <span className="text-gray-600 text-lg">‹</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Create class modal */}
      <Modal open={classModal} onClose={() => setClassModal(false)} title="שיעור חדש">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">שם השיעור</label>
            <input type="text" value={classForm.name} onChange={e => setClassForm(f => ({ ...f, name: e.target.value }))}
              className={inputClass} placeholder="BJJ למתחילים" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">סוג</label>
            <select value={classForm.type} onChange={e => setClassForm(f => ({ ...f, type: e.target.value as ClassType }))} className={inputClass}>
              <option value="MMA">MMA</option>
              <option value="בוקסינג">בוקסינג</option>
              <option value="BJJ">BJJ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">סניף</label>
            <select value={classForm.branch} onChange={e => setClassForm(f => ({ ...f, branch: e.target.value as Branch }))} className={inputClass}>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">מאמן</label>
              <select value={classForm.coach} onChange={e => setClassForm(f => ({ ...f, coach: e.target.value as Coach }))} className={inputClass}>
                {COACHES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">קבוצת גיל</label>
              <select value={classForm.age_group} onChange={e => setClassForm(f => ({ ...f, age_group: e.target.value as AgeGroup }))} className={inputClass}>
                {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              {classForm.is_recurring ? 'תאריך התחלה (ממנו יווצרו כל המועדים)' : 'תאריך השיעור'}
            </label>
            <input
              type="date"
              value={classForm.start_date}
              onChange={e => setClassForm(f => ({ ...f, start_date: e.target.value }))}
              className={inputClass}
              dir="ltr"
            />
            {classForm.start_date && (
              <p className="text-xs text-gray-500 mt-1 pr-1">
                יום: {DAY_NAMES[new Date(classForm.start_date + 'T00:00:00').getDay()]}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">שעת התחלה</label>
              <input type="time" value={classForm.start_time} onChange={e => setClassForm(f => ({ ...f, start_time: e.target.value }))}
                className={inputClass} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">משך (דקות)</label>
              <input type="number" value={classForm.duration_minutes} onChange={e => setClassForm(f => ({ ...f, duration_minutes: +e.target.value }))}
                className={inputClass} min={30} max={180} dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">קיבולת מקסימלית</label>
            <input type="number" value={classForm.max_capacity} onChange={e => setClassForm(f => ({ ...f, max_capacity: +e.target.value }))}
              className={inputClass} min={1} max={100} dir="ltr" />
          </div>
          <div className="flex items-center gap-3 bg-[#242424] rounded-xl px-4 py-3">
            <input type="checkbox" id="recurring" checked={classForm.is_recurring}
              onChange={e => setClassForm(f => ({ ...f, is_recurring: e.target.checked }))}
              className="w-5 h-5 accent-red-600" />
            <label htmlFor="recurring" className="text-white text-sm font-medium">שיעור קבוע (חוזר כל שבוע)</label>
          </div>
          <button onClick={createClass} disabled={loading || !classForm.name}
            className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl">
            {loading ? 'יוצר...' : 'צור שיעור'}
          </button>
        </div>
      </Modal>

      {/* Occurrence detail modal */}
      {occModal && (() => {
        const attendees = (occModal.occ.bookings ?? []).filter((b: any) => !b.cancelled_at)
        const capacity = occModal.occ.override_capacity ?? occModal.cls.max_capacity
        return (
          <Modal open={!!occModal} onClose={() => setOccModal(null)} title="פרטי שיעור">
            <div className="space-y-4">
              {/* Class info */}
              <div className="bg-[#242424] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CLASS_TYPE_COLORS[occModal.cls.type as ClassType]}`}>
                    {occModal.cls.type}
                  </span>
                  {occModal.occ.is_cancelled && (
                    <span className="text-xs bg-red-950 text-red-400 px-2 py-0.5 rounded-full">בוטל</span>
                  )}
                </div>
                <p className="text-white font-bold text-lg">{occModal.cls.name}</p>
                <p className="text-gray-400 text-sm mt-1">
                  {new Date(occModal.occ.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}{formatTime(occModal.cls.start_time)}
                  {' · '}{occModal.cls.duration_minutes} דק'
                </p>
              </div>

              {/* Capacity summary */}
              <div className="flex items-center gap-3 bg-[#242424] rounded-xl px-4 py-3">
                <div className="flex-1">
                  <div className="h-2 bg-[#3a3a3a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${attendees.length >= capacity ? 'bg-red-600' : 'bg-emerald-600'}`}
                      style={{ width: `${Math.min(100, (attendees.length / capacity) * 100)}%` }}
                    />
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ${attendees.length >= capacity ? 'text-red-400' : 'text-emerald-400'}`}>
                  {attendees.length}/{capacity} רשומים
                </span>
              </div>

              {/* Attendees list */}
              <div>
                <p className="text-gray-400 text-sm font-semibold mb-2">
                  {attendees.length === 0 ? 'אין נרשמים' : `נרשמים (${attendees.length})`}
                </p>
                {attendees.length === 0 ? (
                  <div className="text-center py-6 bg-[#1e1e1e] rounded-xl">
                    <p className="text-gray-600 text-sm">טרם נרשמו לשיעור זה</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {attendees.map((b: any, idx: number) => (
                      <div key={b.id} className="flex items-center gap-3 bg-[#242424] rounded-xl px-3 py-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#3a3a3a] text-gray-400 text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{b.profiles?.full_name ?? '—'}</p>
                        </div>
                        <span className="text-gray-500 text-xs shrink-0" dir="ltr">{b.profiles?.phone ?? ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Permanent enrollments section – only for recurring classes */}
              {occModal.cls.is_recurring && (() => {
                const classEnrolled = enrollments.filter(e => e.class_id === occModal.cls.id)
                const enrolledIds = new Set(classEnrolled.map((e: any) => e.user_id))
                const notEnrolled = allUsers.filter(u => !enrolledIds.has(u.id))
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-sm font-semibold">שיבוץ קבוע ({classEnrolled.length})</p>
                      <div className="flex bg-[#1e1e1e] rounded-lg p-0.5 gap-0.5">
                        <button
                          onClick={() => setEnrollTab('enrolled')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${enrollTab === 'enrolled' ? 'bg-red-600 text-white' : 'text-gray-500'}`}
                        >
                          משובצים
                        </button>
                        <button
                          onClick={() => setEnrollTab('add')}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${enrollTab === 'add' ? 'bg-red-600 text-white' : 'text-gray-500'}`}
                        >
                          + הוסף
                        </button>
                      </div>
                    </div>
                    {enrollTab === 'enrolled' ? (
                      classEnrolled.length === 0 ? (
                        <div className="text-center py-4 bg-[#1e1e1e] rounded-xl">
                          <p className="text-gray-600 text-xs">אין תלמידים משובצים קבוע</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {classEnrolled.map((e: any) => {
                            const user = allUsers.find(u => u.id === e.user_id)
                            if (!user) return null
                            return (
                              <div key={e.id} className="flex items-center gap-3 bg-[#242424] rounded-xl px-3 py-2.5">
                                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                                  {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <span className="text-white text-sm flex-1 truncate">{user.full_name}</span>
                                <button
                                  onClick={() => removePermanentEnrollment(user.id, occModal.cls.id)}
                                  className="text-red-500 text-xs font-bold px-2 py-1 rounded-lg bg-red-950/30 hover:bg-red-950/50"
                                >
                                  הסר
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )
                    ) : (
                      notEnrolled.length === 0 ? (
                        <div className="text-center py-4 bg-[#1e1e1e] rounded-xl">
                          <p className="text-gray-600 text-xs">כל התלמידים כבר משובצים</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {notEnrolled.map((user: any) => (
                            <div key={user.id} className="flex items-center gap-3 bg-[#242424] rounded-xl px-3 py-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#3a3a3a] flex items-center justify-center text-gray-400 text-xs font-black shrink-0">
                                {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <span className="text-white text-sm flex-1 truncate">{user.full_name}</span>
                              <button
                                onClick={() => addPermanentEnrollment(user.id, occModal.cls.id)}
                                className="text-emerald-400 text-xs font-bold px-2 py-1 rounded-lg bg-emerald-900/20 hover:bg-emerald-900/40"
                              >
                                שבץ
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                )
              })()}

              {occModal.occ.is_cancelled ? (
                <button
                  onClick={() => toggleCancelOccurrence(occModal.occ)}
                  disabled={loading}
                  className="w-full py-3 font-bold rounded-xl text-sm bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  {loading ? '...' : 'שחזר שיעור'}
                </button>
              ) : occModal.cls.is_recurring ? (
                <div className="space-y-2">
                  <p className="text-gray-500 text-xs text-center">שיעור חוזר — מה לבטל?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => toggleCancelOccurrence(occModal.occ)}
                      disabled={loading}
                      className="py-3 font-bold rounded-xl text-sm bg-[#2a2a2a] hover:bg-[#333] text-amber-400 border border-amber-800/40"
                    >
                      {loading ? '...' : 'שיעור זה בלבד'}
                    </button>
                    <button
                      onClick={() => cancelAllFutureOccurrences(occModal.occ)}
                      disabled={loading}
                      className="py-3 font-bold rounded-xl text-sm bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-800/40"
                    >
                      {loading ? '...' : 'כל השיעורים'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => toggleCancelOccurrence(occModal.occ)}
                  disabled={loading}
                  className="w-full py-3 font-bold rounded-xl text-sm bg-[#2a2a2a] hover:bg-[#333] text-amber-400 border border-amber-800/40"
                >
                  {loading ? '...' : 'בטל שיעור זה'}
                </button>
              )}
            </div>
          </Modal>
        )
      })()}

      {/* Class detail modal (from "כל השיעורים" tab) */}
      {classDetailModal && (() => {
        const clsOccs = upcomingOccurrences
          .filter(o => o.class_id === classDetailModal.id && !o.is_cancelled)
          .slice(0, 8)
        return (
          <Modal open={!!classDetailModal} onClose={() => setClassDetailModal(null)} title="פרטי שיעור">
            <div className="space-y-4">
              <div className="bg-[#242424] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CLASS_TYPE_COLORS[classDetailModal.type as ClassType]}`}>
                    {classDetailModal.type}
                  </span>
                  <span className="text-xs text-gray-500">{DAY_NAMES[classDetailModal.day_of_week]} · {formatTime(classDetailModal.start_time)}</span>
                </div>
                <p className="text-white font-bold text-lg">{classDetailModal.name}</p>
                <p className="text-gray-500 text-sm mt-0.5">{classDetailModal.duration_minutes} דק' · {classDetailModal.max_capacity} מקומות</p>
              </div>

              <p className="text-gray-400 text-sm font-semibold">מועדים קרובים</p>

              {clsOccs.length === 0 ? (
                <div className="text-center py-6 bg-[#1e1e1e] rounded-xl">
                  <p className="text-gray-600 text-sm">אין מועדים קרובים</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {clsOccs.map(occ => {
                    const attendees = (occ.bookings ?? []).filter((b: any) => !b.cancelled_at)
                    const capacity = occ.override_capacity ?? classDetailModal.max_capacity
                    return (
                      <div key={occ.id} className="bg-[#242424] rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white text-sm font-semibold">
                            {new Date(occ.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </p>
                          <span className={`text-xs font-bold ${attendees.length >= capacity ? 'text-red-400' : 'text-emerald-400'}`}>
                            {attendees.length}/{capacity}
                          </span>
                        </div>
                        {attendees.length > 0 && (
                          <div className="space-y-1">
                            {attendees.map((b: any, idx: number) => (
                              <div key={b.id} className="flex items-center gap-2 bg-[#1e1e1e] rounded-lg px-2.5 py-1.5">
                                <span className="text-gray-600 text-xs w-4">{idx + 1}.</span>
                                <span className="text-white text-xs flex-1 truncate">{b.profiles?.full_name ?? '—'}</span>
                                <span className="text-gray-500 text-xs" dir="ltr">{b.profiles?.phone ?? ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {attendees.length === 0 && (
                          <p className="text-gray-600 text-xs">אין נרשמים</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => { deleteClass(classDetailModal.id); setClassDetailModal(null) }}
                className="w-full py-3 rounded-xl text-sm font-bold bg-[#2a2a2a] text-red-500 hover:bg-red-950/30 transition-colors"
              >
                מחק שיעור
              </button>
            </div>
          </Modal>
        )
      })()}

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

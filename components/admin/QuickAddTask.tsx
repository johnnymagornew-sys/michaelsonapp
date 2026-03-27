'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import BeltIcon from '@/components/ui/BeltIcon'
import { BELT_LABELS, BELT_ORDER, Belt } from '@/types'

interface Props {
  clients: { id: string; full_name: string; belt: string | null }[]
}

export default function QuickAddTask({ clients }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    assignMode: 'users' as 'users' | 'belt',
    selectedUsers: [] as string[],
    selectedBelt: '' as Belt | '',
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function toggleUser(id: string) {
    setForm(f => ({
      ...f,
      selectedUsers: f.selectedUsers.includes(id)
        ? f.selectedUsers.filter(u => u !== id)
        : [...f.selectedUsers, id],
    }))
  }

  function reset() {
    setForm({ title: '', description: '', deadline: '', assignMode: 'users', selectedUsers: [], selectedBelt: '' })
  }

  async function createTask() {
    if (!form.title.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ title: form.title.trim(), description: form.description.trim() || null, deadline: form.deadline || null, created_by: user?.id })
      .select().single()

    if (error || !task) {
      setLoading(false)
      showToast('שגיאה ביצירת המטלה')
      return
    }

    const targetIds = form.assignMode === 'users'
      ? form.selectedUsers
      : clients.filter(c => c.belt === form.selectedBelt).map(c => c.id)

    if (targetIds.length > 0) {
      await supabase.from('task_assignments').insert(
        targetIds.map(user_id => ({ task_id: task.id, user_id }))
      )
    }

    setLoading(false)
    setOpen(false)
    reset()
    showToast('המטלה נוצרה בהצלחה ✓')
    startTransition(() => router.refresh())
  }

  const inputClass = "w-full bg-[#242424] border border-[#3a3a3a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors text-sm"

  const canSubmit = form.title.trim() &&
    (form.assignMode === 'users' ? form.selectedUsers.length > 0 : !!form.selectedBelt)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-[#1a1a1a] border border-[#2a2a2a] hover:border-red-800/50 rounded-2xl px-4 py-4 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
            +
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-sm">הוסף מטלה לתלמידים</p>
            <p className="text-gray-500 text-xs">לפי שמות או לפי חגורה</p>
          </div>
        </div>
        <span className="text-gray-600 text-lg group-hover:text-gray-400 transition-colors">‹</span>
      </button>

      <Modal open={open} onClose={() => { setOpen(false); reset() }} title="מטלה חדשה">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">כותרת המטלה *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputClass}
              placeholder="לדוג': תרגל Guard Passing 30 דקות"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">תיאור (אופציונלי)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="פרטים נוספים..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">דדליין (אופציונלי)</label>
            <input
              type="date"
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              className={inputClass}
              dir="ltr"
            />
          </div>

          {/* Assign mode */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">שייך ל...</label>
            <div className="flex gap-2">
              <button
                onClick={() => setForm(f => ({ ...f, assignMode: 'users', selectedBelt: '' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${form.assignMode === 'users' ? 'bg-red-600 text-white' : 'bg-[#242424] text-gray-400'}`}
              >
                תלמידים ספציפיים
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, assignMode: 'belt', selectedUsers: [] }))}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${form.assignMode === 'belt' ? 'bg-red-600 text-white' : 'bg-[#242424] text-gray-400'}`}
              >
                לפי חגורה
              </button>
            </div>
          </div>

          {form.assignMode === 'users' ? (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">
                בחר תלמידים ({form.selectedUsers.length} נבחרו)
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {clients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleUser(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-right ${
                      form.selectedUsers.includes(c.id)
                        ? 'bg-red-900/30 border border-red-700/40'
                        : 'bg-[#242424] border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      form.selectedUsers.includes(c.id) ? 'bg-red-600 border-red-600' : 'border-gray-600'
                    }`}>
                      {form.selectedUsers.includes(c.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-white text-sm flex-1">{c.full_name}</span>
                    {c.belt && <BeltIcon belt={c.belt as Belt} size="sm" />}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">בחר דרגת חגורה</label>
              <div className="grid grid-cols-4 gap-2">
                {BELT_ORDER.map(belt => {
                  const count = clients.filter(c => c.belt === belt).length
                  const selected = form.selectedBelt === belt
                  return (
                    <button
                      key={belt}
                      onClick={() => setForm(f => ({ ...f, selectedBelt: f.selectedBelt === belt ? '' : belt }))}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                        selected ? 'border-white/30 bg-white/5' : 'border-[#3a3a3a] bg-[#242424]'
                      }`}
                    >
                      <BeltIcon belt={belt} size="sm" />
                      <span className={`text-[10px] font-bold ${selected ? 'text-white' : 'text-gray-500'}`}>
                        {BELT_LABELS[belt]}
                      </span>
                      <span className="text-[9px] text-gray-600">{count}</span>
                    </button>
                  )
                })}
              </div>
              {form.selectedBelt && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {clients.filter(c => c.belt === form.selectedBelt).length} תלמידים עם חגורה {BELT_LABELS[form.selectedBelt as Belt]}
                </p>
              )}
            </div>
          )}

          <button
            onClick={createTask}
            disabled={loading || !canSubmit}
            className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? 'יוצר...' : 'צור מטלה'}
          </button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed top-20 right-4 left-4 z-50 bg-emerald-800 text-emerald-100 px-4 py-3 rounded-xl text-sm font-medium text-center">
          {toast}
        </div>
      )}
    </>
  )
}

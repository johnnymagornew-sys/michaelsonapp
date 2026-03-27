'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import BeltIcon from '@/components/ui/BeltIcon'
import { BELT_LABELS, BELT_ORDER, BELT_COLORS, Belt } from '@/types'

interface Props {
  clients: any[]
  tasks: any[]
}

export default function TasksAdmin({ clients, tasks }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [tab, setTab] = useState<'create' | 'list'>('list')
  const [createModal, setCreateModal] = useState(false)
  const [taskDetailModal, setTaskDetailModal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    assignMode: 'users' as 'users' | 'belt',
    selectedUsers: [] as string[],
    selectedBelt: '' as Belt | '',
  })

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
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

  async function createTask() {
    if (!form.title.trim()) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ title: form.title.trim(), description: form.description.trim() || null, deadline: form.deadline || null, created_by: user?.id })
      .select()
      .single()

    if (error || !task) {
      showToast('שגיאה ביצירת המטלה', 'error')
      setLoading(false)
      return
    }

    // Determine target users
    let targetIds: string[] = []
    if (form.assignMode === 'users') {
      targetIds = form.selectedUsers
    } else if (form.assignMode === 'belt' && form.selectedBelt) {
      targetIds = clients.filter(c => c.belt === form.selectedBelt).map(c => c.id)
    }

    if (targetIds.length > 0) {
      await supabase.from('task_assignments').insert(
        targetIds.map(user_id => ({ task_id: task.id, user_id }))
      )
    }

    setLoading(false)
    setCreateModal(false)
    setForm({ title: '', description: '', deadline: '', assignMode: 'users', selectedUsers: [], selectedBelt: '' })
    showToast('המטלה נוצרה בהצלחה', 'success')
    startTransition(() => router.refresh())
  }

  async function deleteTask(taskId: string) {
    if (!confirm('למחוק את המטלה?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    setTaskDetailModal(null)
    startTransition(() => router.refresh())
  }

  const inputClass = "w-full bg-[#242424] border border-[#3a3a3a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors text-sm"

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-white">מטלות</h1>
        <button
          onClick={() => setCreateModal(true)}
          className="bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1"
        >
          <span className="text-lg leading-none">+</span> מטלה
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">📋</span>
          <p className="text-gray-500 font-medium">אין מטלות עדיין</p>
          <button onClick={() => setCreateModal(true)} className="mt-3 text-red-500 text-sm font-medium">
            + צור מטלה ראשונה
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const assignments = task.task_assignments ?? []
            const completed = assignments.filter((a: any) => a.completed_at).length
            const total = assignments.length
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0
            const today = new Date().toISOString().split('T')[0]
            const isOverdue = task.deadline && task.deadline < today
            const overdueCount = isOverdue ? assignments.filter((a: any) => !a.completed_at).length : 0

            return (
              <div
                key={task.id}
                onClick={() => setTaskDetailModal(task)}
                className={`bg-[#1a1a1a] border rounded-2xl p-4 cursor-pointer active:scale-[0.98] transition-transform ${isOverdue && overdueCount > 0 ? 'border-red-800/50' : 'border-[#2a2a2a]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.deadline && (
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                          {isOverdue ? '⚠️ עבר דדליין' : `עד ${task.deadline}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isOverdue && overdueCount > 0 && (
                      <span className="text-xs font-bold bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">
                        {overdueCount} לא ביצעו
                      </span>
                    )}
                    <span className={`text-sm font-bold ${completed === total && total > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {completed}/{total}
                    </span>
                    <span className="text-gray-600">‹</span>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${completed === total ? 'bg-emerald-600' : 'bg-red-600'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create task modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="מטלה חדשה">
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
                onClick={() => setForm(f => ({ ...f, assignMode: 'users' }))}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${form.assignMode === 'users' ? 'bg-red-600 text-white' : 'bg-[#242424] text-gray-400'}`}
              >
                תלמידים ספציפיים
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, assignMode: 'belt' }))}
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
                    {c.belt && <BeltIcon belt={c.belt} size="sm" />}
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
                        selected ? 'border-white/40 bg-white/5' : 'border-[#3a3a3a] bg-[#242424]'
                      }`}
                    >
                      <BeltIcon belt={belt} size="sm" />
                      <span className={`text-[10px] font-bold ${selected ? 'text-white' : 'text-gray-500'}`}>
                        {BELT_LABELS[belt]}
                      </span>
                      <span className="text-[9px] text-gray-600">{count} תלמידים</span>
                    </button>
                  )
                })}
              </div>
              {form.selectedBelt && (
                <p className="text-xs text-gray-400 mt-2 text-center">
                  המטלה תשויך ל-{clients.filter(c => c.belt === form.selectedBelt).length} תלמידים עם חגורה {BELT_LABELS[form.selectedBelt as Belt]}
                </p>
              )}
            </div>
          )}

          <button
            onClick={createTask}
            disabled={loading || !form.title.trim() || (form.assignMode === 'users' && form.selectedUsers.length === 0) || (form.assignMode === 'belt' && !form.selectedBelt)}
            className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl"
          >
            {loading ? 'יוצר...' : 'צור מטלה'}
          </button>
        </div>
      </Modal>

      {/* Task detail modal */}
      {taskDetailModal && (() => {
        const assignments = taskDetailModal.task_assignments ?? []
        const completed = assignments.filter((a: any) => a.completed_at)
        const pending = assignments.filter((a: any) => !a.completed_at)

        // Group by belt for stats
        const beltStats = BELT_ORDER.map(belt => {
          const beltAssignments = assignments.filter((a: any) => a.profiles?.belt === belt)
          const beltCompleted = beltAssignments.filter((a: any) => a.completed_at).length
          return { belt, total: beltAssignments.length, completed: beltCompleted }
        }).filter(s => s.total > 0)

        return (
          <Modal open={!!taskDetailModal} onClose={() => setTaskDetailModal(null)} title="פרטי מטלה">
            <div className="space-y-4">
              <div className="bg-[#242424] rounded-xl p-4">
                <p className="text-white font-bold text-lg">{taskDetailModal.title}</p>
                {taskDetailModal.description && (
                  <p className="text-gray-400 text-sm mt-1">{taskDetailModal.description}</p>
                )}
              </div>

              {/* Overall progress */}
              <div className="bg-[#242424] rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400 text-sm">התקדמות כללית</span>
                  <span className="text-white font-bold text-sm">{completed.length}/{assignments.length}</span>
                </div>
                <div className="h-2 bg-[#3a3a3a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: assignments.length ? `${(completed.length / assignments.length) * 100}%` : '0%' }}
                  />
                </div>
              </div>

              {/* Belt stats */}
              {beltStats.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm font-semibold mb-2">לפי חגורה</p>
                  <div className="space-y-2">
                    {beltStats.map(({ belt, total, completed: c }) => (
                      <div key={belt} className="flex items-center gap-3 bg-[#242424] rounded-xl px-3 py-2">
                        <BeltIcon belt={belt as Belt} size="sm" />
                        <span className="text-white text-sm flex-1">{BELT_LABELS[belt as Belt]}</span>
                        <span className={`text-sm font-bold ${c === total ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {c}/{total}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending */}
              {pending.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm font-semibold mb-2">טרם ביצעו ({pending.length})</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {pending.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2">
                        <div className="w-2 h-2 rounded-full bg-gray-600 shrink-0" />
                        <span className="text-white text-sm">{a.profiles?.full_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm font-semibold mb-2">ביצעו ({completed.length})</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {completed.map((a: any) => (
                      <div key={a.id} className="flex items-center gap-2 bg-[#242424] rounded-lg px-3 py-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-white text-sm">{a.profiles?.full_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => deleteTask(taskDetailModal.id)}
                className="w-full py-3 rounded-xl text-sm font-bold bg-[#2a2a2a] text-red-500 hover:bg-red-950/30 transition-colors"
              >
                מחק מטלה
              </button>
            </div>
          </Modal>
        )
      })()}

      {toast && (
        <div className={`fixed top-20 right-4 left-4 z-50 px-4 py-3 rounded-xl text-sm font-medium text-center ${
          toast.type === 'success' ? 'bg-emerald-800 text-emerald-100' : 'bg-red-900 text-red-100'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  assignments: any[]
  userId: string
}

export default function TasksView({ assignments, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function markComplete(assignmentId: string) {
    setLoading(assignmentId)
    const { error } = await supabase
      .from('task_assignments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', assignmentId)
    setLoading(null)
    if (!error) {
      showToast('כל הכבוד! המטלה סומנה כהושלמה 🎉')
      startTransition(() => router.refresh())
    }
  }

  async function markIncomplete(assignmentId: string) {
    setLoading(assignmentId)
    await supabase
      .from('task_assignments')
      .update({ completed_at: null })
      .eq('id', assignmentId)
    setLoading(null)
    startTransition(() => router.refresh())
  }

  const today = new Date().toISOString().split('T')[0]
  const pending = assignments.filter(a => !a.completed_at)
  const overdue = pending.filter(a => a.tasks?.deadline && a.tasks.deadline < today)
  const upcoming = pending.filter(a => !a.tasks?.deadline || a.tasks.deadline >= today)
  const completed = assignments.filter(a => a.completed_at)

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-black text-white mb-2">המטלות שלי</h1>
      <p className="text-gray-500 text-sm mb-5">
        {pending.length > 0 ? `${pending.length} מטלות ממתינות` : 'כל המטלות הושלמו 🎉'}
      </p>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">📋</span>
          <p className="text-gray-500 font-medium">אין מטלות כרגע</p>
          <p className="text-gray-600 text-sm mt-1">המאמן יוסיף מטלות בקרוב</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Overdue tasks */}
          {overdue.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">⚠️ פג דדליין</p>
              <div className="space-y-3">
                {overdue.map(a => (
                  <div key={a.id} className="bg-red-950/20 border border-red-800/40 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{a.tasks?.title}</p>
                        {a.tasks?.description && (
                          <p className="text-gray-500 text-sm mt-1">{a.tasks?.description}</p>
                        )}
                        <p className="text-red-400 text-xs mt-1 font-medium">דדליין: {a.tasks?.deadline}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => markComplete(a.id)}
                      disabled={loading === a.id}
                      className="w-full mt-3 py-3 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-700/30 text-emerald-400 font-bold rounded-xl text-sm transition-colors"
                    >
                      {loading === a.id ? 'שומר...' : '✓ סמן כהושלם'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming tasks */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">לביצוע</p>
              <div className="space-y-3">
                {upcoming.map(a => (
                  <div key={a.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => markComplete(a.id)}
                        disabled={loading === a.id}
                        className="w-6 h-6 rounded-full border-2 border-gray-600 flex items-center justify-center shrink-0 mt-0.5 hover:border-emerald-500 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{a.tasks?.title}</p>
                        {a.tasks?.description && (
                          <p className="text-gray-500 text-sm mt-1">{a.tasks?.description}</p>
                        )}
                        {a.tasks?.deadline && (
                          <p className="text-gray-500 text-xs mt-1">עד {a.tasks.deadline}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => markComplete(a.id)}
                      disabled={loading === a.id}
                      className="w-full mt-3 py-3 bg-emerald-700/30 hover:bg-emerald-700/50 border border-emerald-700/30 text-emerald-400 font-bold rounded-xl text-sm transition-colors"
                    >
                      {loading === a.id ? 'שומר...' : '✓ סמן כהושלם'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed tasks */}
          {completed.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">הושלמו ({completed.length})</p>
              <div className="space-y-2">
                {completed.map(a => (
                  <div key={a.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold line-through decoration-gray-600">{a.tasks?.title}</p>
                      </div>
                      <button
                        onClick={() => markIncomplete(a.id)}
                        disabled={loading === a.id}
                        className="text-gray-600 text-xs hover:text-gray-400"
                      >
                        בטל
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed top-20 right-4 left-4 z-50 bg-emerald-800 text-emerald-100 px-4 py-3 rounded-xl text-sm font-medium text-center">
          {toast}
        </div>
      )}
    </div>
  )
}

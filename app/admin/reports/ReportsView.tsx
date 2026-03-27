'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CLASS_TYPE_COLORS } from '@/types'
import { formatTime } from '@/lib/utils/dates'

interface Props {
  classes: { id: string; name: string; type: string }[]
  clients: { id: string; full_name: string }[]
}

export default function ReportsView({ classes, clients }: Props) {
  const supabase = createClient()
  const [reportType, setReportType] = useState<'class' | 'client'>('class')
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)

  async function runReport() {
    setLoading(true)
    setRan(true)

    if (reportType === 'class') {
      let query = supabase
        .from('class_occurrences')
        .select('id, date, class_id, classes(name, type, start_time), bookings(id, cancelled_at, profiles(full_name, phone))')
        .eq('is_cancelled', false)
        .order('date', { ascending: false })

      if (selectedClass) query = query.eq('class_id', selectedClass)
      if (dateFrom) query = query.gte('date', dateFrom)
      if (dateTo) query = query.lte('date', dateTo)

      const { data } = await query.limit(100)
      setResults(data ?? [])
    } else {
      let query = supabase
        .from('bookings')
        .select('id, booked_at, class_occurrences(id, date, classes(name, type, start_time))')
        .is('cancelled_at', null)
        .order('class_occurrences.date', { ascending: false })

      if (selectedClient) query = query.eq('user_id', selectedClient)

      const { data } = await query.limit(100)
      setResults((data ?? []).filter(b => b.class_occurrences))
    }

    setLoading(false)
  }

  function exportCSV() {
    let csv = ''
    if (reportType === 'class') {
      csv = 'תאריך,שם שיעור,סוג,שעה,מספר נוכחים\n'
      results.forEach(occ => {
        const attendees = (occ.bookings ?? []).filter((b: any) => !b.cancelled_at).length
        csv += `"${occ.date}","${occ.classes?.name}","${occ.classes?.type}","${formatTime(occ.classes?.start_time)}","${attendees}"\n`
      })
    } else {
      csv = 'שם תלמיד,שם שיעור,סוג,תאריך,שעה\n'
      results.forEach(b => {
        const occ = b.class_occurrences
        csv += `"${selectedClient}","${occ?.classes?.name}","${occ?.classes?.type}","${occ?.date}","${formatTime(occ?.classes?.start_time)}"\n`
      })
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputClass = "w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors text-sm"

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-2xl font-black text-white">דוחות</h1>

      {/* Report type toggle */}
      <div className="flex bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-1 gap-1">
        <button
          onClick={() => { setReportType('class'); setResults([]); setRan(false) }}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${reportType === 'class' ? 'bg-red-600 text-white' : 'text-gray-500'}`}
        >
          לפי שיעור
        </button>
        <button
          onClick={() => { setReportType('client'); setResults([]); setRan(false) }}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${reportType === 'client' ? 'bg-red-600 text-white' : 'text-gray-500'}`}
        >
          לפי תלמיד
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 space-y-3">
        {reportType === 'class' ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">שיעור (ריק = כולם)</label>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={inputClass}>
              <option value="">כל השיעורים</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">תלמיד</label>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className={inputClass}>
              <option value="">בחר תלמיד...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
        )}

        {reportType === 'class' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">מתאריך</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClass} dir="ltr" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">עד תאריך</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClass} dir="ltr" />
            </div>
          </div>
        )}

        <button
          onClick={runReport}
          disabled={loading || (reportType === 'client' && !selectedClient)}
          className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
        >
          {loading ? 'מחשב...' : 'הצג דוח'}
        </button>
      </div>

      {/* Results */}
      {ran && !loading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm">{results.length} תוצאות</p>
            {results.length > 0 && (
              <button
                onClick={exportCSV}
                className="text-sm text-red-500 font-medium flex items-center gap-1"
              >
                ⬇ ייצא CSV
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">לא נמצאו תוצאות</p>
            </div>
          ) : reportType === 'class' ? (
            <div className="space-y-3">
              {results.map(occ => {
                const attendees = (occ.bookings ?? []).filter((b: any) => !b.cancelled_at)
                return (
                  <div key={occ.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-[#2a2a2a]">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CLASS_TYPE_COLORS[occ.classes?.type as keyof typeof CLASS_TYPE_COLORS]}`}>
                              {occ.classes?.type}
                            </span>
                          </div>
                          <p className="text-white font-bold">{occ.classes?.name}</p>
                          <p className="text-gray-400 text-sm">
                            {new Date(occ.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {' · '}{formatTime(occ.classes?.start_time)}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-3xl font-black text-white">{attendees.length}</p>
                          <p className="text-gray-500 text-xs">נוכחים</p>
                        </div>
                      </div>
                    </div>
                    {attendees.length > 0 && (
                      <div className="px-4 py-3 space-y-1">
                        {attendees.map((b: any) => (
                          <div key={b.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{b.profiles?.full_name}</span>
                            <span className="text-gray-600" dir="ltr">{b.profiles?.phone}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(b => {
                const occ = b.class_occurrences
                if (!occ) return null
                return (
                  <div key={b.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold text-sm">{occ.classes?.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CLASS_TYPE_COLORS[occ.classes?.type as keyof typeof CLASS_TYPE_COLORS]}`}>
                          {occ.classes?.type}
                        </span>
                        <span className="text-gray-500 text-xs">{formatTime(occ.classes?.start_time)}</span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-gray-300 text-sm font-medium">
                        {new Date(occ.date + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-gray-600 text-xs">
                        {new Date(occ.date + 'T00:00:00').toLocaleDateString('he-IL', { weekday: 'short' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

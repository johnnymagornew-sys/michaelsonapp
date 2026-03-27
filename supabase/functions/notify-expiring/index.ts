import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Find subscriptions expiring tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: expiring, error } = await supabase
    .from('subscriptions')
    .select('*, profiles(full_name, phone)')
    .eq('end_date', tomorrowStr)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!expiring || expiring.length === 0) {
    return new Response(JSON.stringify({ message: 'אין מנויים שפגים מחר' }), { status: 200 })
  }

  const listHtml = expiring.map((sub: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#fff;font-weight:600">${sub.profiles?.full_name ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#9ca3af" dir="ltr">${sub.profiles?.phone ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#f87171">${sub.end_date}</td>
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head><meta charset="UTF-8"/></head>
    <body style="background:#0f0f0f;font-family:Arial,sans-serif;padding:32px;margin:0">
      <div style="max-width:560px;margin:0 auto">
        <div style="background:#dc2626;border-radius:12px;padding:20px 24px;margin-bottom:24px">
          <h1 style="color:#fff;margin:0;font-size:22px">🥊 MICHAELSON BROTHERS MMA</h1>
          <p style="color:#fca5a5;margin:6px 0 0;font-size:14px">התראת מנויים פגים</p>
        </div>

        <div style="background:#1a1a1a;border-radius:12px;padding:20px 24px;margin-bottom:16px">
          <p style="color:#d1d5db;margin:0 0 16px;font-size:15px">
            המנויים הבאים <strong style="color:#f87171">פגים מחר (${tomorrowStr})</strong>:
          </p>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#242424">
                <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:12px;font-weight:600">שם</th>
                <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:12px;font-weight:600">טלפון</th>
                <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:12px;font-weight:600">תאריך סיום</th>
              </tr>
            </thead>
            <tbody>${listHtml}</tbody>
          </table>
        </div>

        <p style="color:#4b5563;font-size:12px;text-align:center">
          נשלח אוטומטית על ידי מערכת Michaelson MMA
        </p>
      </div>
    </body>
    </html>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Michaelson MMA <onboarding@resend.dev>',
      to: [ADMIN_EMAIL],
      subject: `⚠️ ${expiring.length} מנוי/ים פגים מחר — Michaelson MMA`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  return new Response(JSON.stringify({ sent: expiring.length }), { status: 200 })
})

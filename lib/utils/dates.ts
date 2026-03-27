import { DAY_NAMES, DAY_NAMES_SHORT } from '@/types'

/**
 * Returns the Sunday of the current Israeli week (Sun–Sat)
 */
export function getWeekStart(date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the 7 dates (Sun–Sat) of the week containing `date`
 */
export function getWeekDates(date = new Date()): Date[] {
  const start = getWeekStart(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

/**
 * Format a date as "YYYY-MM-DD"
 */
export function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format time "HH:MM:SS" → "HH:MM"
 */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

/**
 * Format date for display (Hebrew friendly)
 */
export function formatDateHebrew(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Short date: "24 במרץ"
 */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Day name in Hebrew for a given day_of_week (0=Sunday)
 */
export function getDayName(day: number): string {
  return DAY_NAMES[day] ?? ''
}

export function getDayNameShort(day: number): string {
  return DAY_NAMES_SHORT[day] ?? ''
}

/**
 * Is a date today?
 */
export function isToday(dateStr: string): boolean {
  return dateStr === toDateString(new Date())
}

/**
 * Can a booking be cancelled? (must be > 24h before class)
 */
export function canCancelBooking(classDate: string, classTime: string): boolean {
  const classDateTime = new Date(`${classDate}T${classTime}`)
  const now = new Date()
  const diffMs = classDateTime.getTime() - now.getTime()
  return diffMs > 24 * 60 * 60 * 1000
}

/**
 * Is a subscription currently active?
 */
export function isSubscriptionActive(sub: { start_date: string; end_date: string }): boolean {
  const today = toDateString(new Date())
  return sub.start_date <= today && sub.end_date >= today
}

/**
 * Days remaining on subscription
 */
export function daysRemaining(endDate: string): number {
  const end = new Date(endDate + 'T00:00:00')
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

import { Subscription, Booking, ClassOccurrence, Class, QuotaInfo, BookingStatus } from '@/types'
import { toDateString, getWeekStart, canCancelBooking } from './dates'

/**
 * Calculate quota usage for a user
 */
export function getQuotaInfo(
  subscription: Subscription | null,
  bookings: Array<{ occurrence: { date: string } }>
): QuotaInfo {
  if (!subscription) {
    return { weeklyUsed: 0, weeklyLimit: 0, monthlyUsed: 0, monthlyLimit: 0 }
  }

  const now = new Date()
  const weekStart = getWeekStart(now)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const weeklyUsed = bookings.filter(b => {
    const d = new Date(b.occurrence.date + 'T00:00:00')
    return d >= weekStart && d <= weekEnd
  }).length

  const monthlyUsed = bookings.filter(b => {
    const d = new Date(b.occurrence.date + 'T00:00:00')
    return d >= monthStart && d <= monthEnd
  }).length

  if (subscription.type === 'unlimited_monthly') {
    return { weeklyUsed, weeklyLimit: null, monthlyUsed, monthlyLimit: null }
  }

  // 8_per_month: max 2/week, max 8/month
  return { weeklyUsed, weeklyLimit: 2, monthlyUsed, monthlyLimit: 8 }
}

/**
 * Determine if user can book a specific occurrence
 */
export function getBookingStatus(params: {
  occurrence: ClassOccurrence & { booking_count: number; classes: Class }
  subscription: Subscription | null
  quota: QuotaInfo
  existingBooking: Booking | null
  userId: string
}): BookingStatus {
  const { occurrence, subscription, quota, existingBooking } = params

  // Already booked
  if (existingBooking && !existingBooking.cancelled_at) {
    return { canBook: false, isBooked: true, isFull: false, isCancelled: occurrence.is_cancelled }
  }

  // Cancelled class
  if (occurrence.is_cancelled) {
    return { canBook: false, isBooked: false, isFull: false, isCancelled: true, reason: 'השיעור בוטל' }
  }

  // Class is in the past
  const classDateTime = new Date(`${occurrence.date}T${occurrence.classes.start_time}`)
  if (classDateTime < new Date()) {
    return { canBook: false, isBooked: false, isFull: false, isCancelled: false, reason: 'השיעור הסתיים' }
  }

  // No subscription
  if (!subscription) {
    return {
      canBook: false,
      isBooked: false,
      isFull: false,
      isCancelled: false,
      reason: 'לקביעת אימון יש ליצור קשר עם המאמן',
    }
  }

  // Subscription expired
  const today = toDateString(new Date())
  if (subscription.end_date < today) {
    return {
      canBook: false,
      isBooked: false,
      isFull: false,
      isCancelled: false,
      reason: 'המנוי שלך הסתיים, לחידוש יש ליצור קשר עם המאמן',
    }
  }

  // Class full
  const capacity = occurrence.override_capacity ?? occurrence.classes.max_capacity
  if (occurrence.booking_count >= capacity) {
    return { canBook: false, isBooked: false, isFull: true, isCancelled: false, reason: 'השיעור מלא' }
  }

  // Quota check for 8_per_month
  if (subscription.type === '8_per_month') {
    if (quota.weeklyLimit !== null && quota.weeklyUsed >= quota.weeklyLimit) {
      return {
        canBook: false,
        isBooked: false,
        isFull: false,
        isCancelled: false,
        reason: 'הגעת למכסה השבועית (2 אימונים)',
      }
    }
    if (quota.monthlyLimit !== null && quota.monthlyUsed >= quota.monthlyLimit) {
      return {
        canBook: false,
        isBooked: false,
        isFull: false,
        isCancelled: false,
        reason: 'הגעת למכסה החודשית (8 אימונים)',
      }
    }
  }

  return { canBook: true, isBooked: false, isFull: false, isCancelled: false }
}

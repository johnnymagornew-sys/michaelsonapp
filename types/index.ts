export type Role = 'client' | 'admin'

export type Belt = 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'brown' | 'black'

export const BELT_LABELS: Record<Belt, string> = {
  white: 'לבנה',
  yellow: 'צהובה',
  orange: 'כתומה',
  green: 'ירוקה',
  blue: 'כחולה',
  purple: 'סגולה',
  brown: 'חומה',
  black: 'שחורה',
}

export const BELT_COLORS: Record<Belt, { bg: string; bar: string; text: string }> = {
  white:  { bg: 'bg-gray-100',    bar: '#f3f4f6', text: 'text-gray-800' },
  yellow: { bg: 'bg-yellow-400',  bar: '#facc15', text: 'text-yellow-900' },
  orange: { bg: 'bg-orange-500',  bar: '#f97316', text: 'text-white' },
  green:  { bg: 'bg-emerald-600', bar: '#16a34a', text: 'text-white' },
  blue:   { bg: 'bg-blue-600',    bar: '#2563eb', text: 'text-white' },
  purple: { bg: 'bg-purple-600',  bar: '#9333ea', text: 'text-white' },
  brown:  { bg: 'bg-amber-800',   bar: '#92400e', text: 'text-white' },
  black:  { bg: 'bg-gray-950',    bar: '#0a0a0a', text: 'text-white' },
}

export const BELT_ORDER: Belt[] = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black']

export type SubscriptionType = '8_per_month' | 'unlimited_monthly' | 'single_class'

export type ClassType = 'MMA' | 'בוקסינג' | 'BJJ'

export type Branch = 'מרכז פיס' | 'קרית האומנים' | 'נאות שמיר'
export type Coach = 'שוקי' | 'דניאל'
export type AgeGroup = 'א-ד' | 'ה-ח' | 'ט-יב' | '18+' | 'כולם'

export const BRANCHES: Branch[] = ['מרכז פיס', 'קרית האומנים', 'נאות שמיר']
export const COACHES: Coach[] = ['שוקי', 'דניאל']
export const AGE_GROUPS: AgeGroup[] = ['א-ד', 'ה-ח', 'ט-יב', '18+', 'כולם']

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  date_of_birth: string | null
  medical_notes: string | null
  role: Role
  belt: Belt | null
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  type: SubscriptionType
  start_date: string
  end_date: string
  assigned_by: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string
  type: ClassType
  day_of_week: number // 0=Sunday ... 6=Saturday
  start_time: string  // "HH:MM:SS"
  duration_minutes: number
  max_capacity: number
  is_recurring: boolean
  is_active: boolean
  created_at: string
}

export interface ClassOccurrence {
  id: string
  class_id: string
  date: string // "YYYY-MM-DD"
  is_cancelled: boolean
  override_capacity: number | null
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  occurrence_id: string
  booked_at: string
  cancelled_at: string | null
}

// Enriched types
export interface OccurrenceWithClass extends ClassOccurrence {
  classes: Class
  booking_count: number
  user_booking?: Booking | null
}

export interface BookingWithOccurrence extends Booking {
  class_occurrences: ClassOccurrence & {
    classes: Class
  }
}

export interface ProfileWithSubscription extends Profile {
  subscription?: Subscription | null
}

// Form types
export interface RegisterFormData {
  full_name: string
  email: string
  password: string
  phone: string
  date_of_birth: string
  medical_notes: string
}

export interface ClassFormData {
  name: string
  type: ClassType
  day_of_week: number
  start_time: string
  duration_minutes: number
  max_capacity: number
  is_recurring: boolean
}

export interface SubscriptionFormData {
  user_id: string
  type: SubscriptionType
  start_date: string
  end_date: string
}

// UI state
export interface BookingStatus {
  canBook: boolean
  reason?: string
  isBooked: boolean
  isFull: boolean
  isCancelled: boolean
}

export interface QuotaInfo {
  weeklyUsed: number
  weeklyLimit: number | null  // null = unlimited
  monthlyUsed: number
  monthlyLimit: number | null
}

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  MMA: 'MMA',
  'בוקסינג': 'בוקסינג',
  BJJ: 'BJJ',
}

export const CLASS_TYPE_COLORS: Record<ClassType, string> = {
  MMA: 'bg-red-900/50 text-red-300',
  'בוקסינג': 'bg-blue-900/50 text-blue-300',
  BJJ: 'bg-emerald-900/50 text-emerald-300',
}

export const SUBSCRIPTION_LABELS: Record<SubscriptionType, string> = {
  '8_per_month': '8 אימונים בחודש',
  'unlimited_monthly': 'חופשי חודשי',
  'single_class': 'אימון בודד',
}

export const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
export const DAY_NAMES_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

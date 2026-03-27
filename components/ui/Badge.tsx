import { CLASS_TYPE_COLORS, ClassType } from '@/types'
import { cn } from '@/lib/utils/cn'

interface BadgeProps {
  label: string
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'muted'
  className?: string
}

const variantClasses = {
  default: 'bg-[#2e2e2e] text-gray-300',
  success: 'bg-emerald-900/40 text-emerald-400',
  error: 'bg-red-900/40 text-red-400',
  warning: 'bg-amber-900/40 text-amber-400',
  info: 'bg-blue-900/40 text-blue-400',
  muted: 'bg-[#1e1e1e] text-gray-500',
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
      variantClasses[variant],
      className
    )}>
      {label}
    </span>
  )
}

export function ClassTypeBadge({ type }: { type: ClassType }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold',
      CLASS_TYPE_COLORS[type]
    )}>
      {type}
    </span>
  )
}

import { Belt, BELT_COLORS, BELT_LABELS } from '@/types'

interface Props {
  belt: Belt
  size?: 'sm' | 'md' | 'lg'
}

export default function BeltIcon({ belt, size = 'md' }: Props) {
  const color = BELT_COLORS[belt]
  const label = BELT_LABELS[belt]

  const dims = {
    sm: { w: 56, h: 20, knot: 8, bar: 3 },
    md: { w: 88, h: 28, knot: 12, bar: 4 },
    lg: { w: 120, h: 38, knot: 16, bar: 5 },
  }[size]

  const beltColor = color.bar
  const isWhite = belt === 'white'
  const strokeColor = isWhite ? '#d1d5db' : beltColor
  const highlightColor = isWhite ? '#ffffff' : lighten(beltColor)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={dims.w}
        height={dims.h}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Left tail */}
        <rect
          x={0}
          y={(dims.h - dims.bar * 3) / 2}
          width={dims.w / 2 - dims.knot / 2 - 2}
          height={dims.bar * 3}
          rx={dims.bar / 2}
          fill={beltColor}
          stroke={strokeColor}
          strokeWidth={isWhite ? 1 : 0}
        />
        {/* Left highlight stripe */}
        <rect
          x={2}
          y={(dims.h - dims.bar * 3) / 2 + dims.bar * 0.5}
          width={dims.w / 2 - dims.knot / 2 - 4}
          height={dims.bar * 0.6}
          rx={dims.bar * 0.3}
          fill={highlightColor}
          opacity={0.3}
        />

        {/* Right tail */}
        <rect
          x={dims.w / 2 + dims.knot / 2 + 2}
          y={(dims.h - dims.bar * 3) / 2}
          width={dims.w / 2 - dims.knot / 2 - 2}
          height={dims.bar * 3}
          rx={dims.bar / 2}
          fill={beltColor}
          stroke={strokeColor}
          strokeWidth={isWhite ? 1 : 0}
        />
        {/* Right highlight stripe */}
        <rect
          x={dims.w / 2 + dims.knot / 2 + 4}
          y={(dims.h - dims.bar * 3) / 2 + dims.bar * 0.5}
          width={dims.w / 2 - dims.knot / 2 - 6}
          height={dims.bar * 0.6}
          rx={dims.bar * 0.3}
          fill={highlightColor}
          opacity={0.3}
        />

        {/* Knot */}
        <rect
          x={dims.w / 2 - dims.knot / 2}
          y={(dims.h - dims.knot) / 2}
          width={dims.knot}
          height={dims.knot}
          rx={dims.knot * 0.25}
          fill={beltColor}
          stroke={strokeColor}
          strokeWidth={isWhite ? 1 : 0.5}
        />
        {/* Knot cross lines */}
        <line
          x1={dims.w / 2 - dims.knot / 2 + dims.knot * 0.2}
          y1={dims.h / 2 - dims.knot * 0.05}
          x2={dims.w / 2 + dims.knot / 2 - dims.knot * 0.2}
          y2={dims.h / 2 - dims.knot * 0.05}
          stroke={highlightColor}
          strokeWidth={dims.bar * 0.4}
          opacity={0.4}
        />
        <line
          x1={dims.w / 2 - dims.knot / 2 + dims.knot * 0.2}
          y1={dims.h / 2 + dims.knot * 0.2}
          x2={dims.w / 2 + dims.knot / 2 - dims.knot * 0.2}
          y2={dims.h / 2 + dims.knot * 0.2}
          stroke={highlightColor}
          strokeWidth={dims.bar * 0.3}
          opacity={0.25}
        />
      </svg>
    </div>
  )
}

function lighten(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + 80)
  const g = Math.min(255, ((n >> 8) & 0xff) + 80)
  const b = Math.min(255, (n & 0xff) + 80)
  return `rgb(${r},${g},${b})`
}

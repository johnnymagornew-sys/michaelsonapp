export default function Loading() {
  return (
    <div className="px-4 py-4 animate-pulse">
      <div className="flex gap-1 mb-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="flex-1 h-14 bg-[#1a1a1a] rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-[#1a1a1a] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="px-4 py-5 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-[#1a1a1a] rounded-full" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-[#1a1a1a] rounded" />
          <div className="h-4 w-20 bg-[#1a1a1a] rounded" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-[#1a1a1a] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

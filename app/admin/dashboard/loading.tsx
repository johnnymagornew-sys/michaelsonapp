export default function Loading() {
  return (
    <div className="px-4 py-5 animate-pulse">
      <div className="h-8 w-32 bg-[#1a1a1a] rounded-lg mb-5" />
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[#1a1a1a] rounded-2xl" />
        ))}
      </div>
      <div className="h-16 bg-[#1a1a1a] rounded-2xl mb-5" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-[#1a1a1a] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

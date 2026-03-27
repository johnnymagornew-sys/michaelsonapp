export default function Loading() {
  return (
    <div className="px-4 py-5 animate-pulse">
      <div className="h-8 w-28 bg-[#1a1a1a] rounded-lg mb-5" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-[#1a1a1a] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

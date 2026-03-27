export default function Loading() {
  return (
    <div className="px-4 py-5 animate-pulse">
      <div className="h-8 w-32 bg-[#1a1a1a] rounded-lg mb-4" />
      <div className="h-10 bg-[#1a1a1a] rounded-xl mb-3" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-[#1a1a1a] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

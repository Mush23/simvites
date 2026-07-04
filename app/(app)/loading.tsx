// Skeleton for every app module — calm, on-token, no spinner anxiety.
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1060px] animate-pulse px-6 py-10" aria-busy="true" aria-label="Loading">
      <div className="mb-3 h-3 w-24 rounded bg-paper-2" />
      <div className="mb-8 h-10 w-72 rounded bg-paper-2" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-card border border-line bg-surface p-6">
            <div className="mb-4 h-2.5 w-16 rounded bg-paper-2" />
            <div className="h-9 w-20 rounded bg-paper-2" />
          </div>
        ))}
      </div>
      <div className="mt-8 h-40 rounded-card border border-line bg-surface" />
    </div>
  )
}

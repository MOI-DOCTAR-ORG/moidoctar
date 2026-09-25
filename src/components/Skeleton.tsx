/** A single shimmering placeholder bar. Use `w` for width (Tailwind width class or CSS value) and `h` for height. */
export function SkeletonLine({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) {
  return <div className={`${h} ${w} animate-pulse rounded-md bg-surface-container-high`} />
}

/**
 * Stands in for the AI reply + care-plan card while Liana is thinking, or while we're
 * waiting to hear back from the server. Keeps the screen looking alive instead of empty,
 * and previews the shape of what's coming so it doesn't feel like the app has stalled.
 */
export function TriageResultSkeleton() {
  return (
    <div className="flex items-start gap-3" role="status" aria-label="Liana is thinking">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-surface-container-high" />
      <div className="min-w-0 flex-1 space-y-3">
        {/* Reply bubble */}
        <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tl-sm border border-outline-variant bg-surface p-3">
          <SkeletonLine w="w-11/12" />
          <SkeletonLine w="w-2/3" />
        </div>
        {/* Care plan card */}
        <div className="overflow-hidden rounded-xl border border-outline-variant">
          <div className="border-b border-outline-variant bg-surface-container-low px-3 py-2">
            <SkeletonLine w="w-28" h="h-2.5" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 border-b border-outline-variant p-3 last:border-b-0">
              <SkeletonLine w="w-32" h="h-2.5" />
              <SkeletonLine w="w-full" />
              <SkeletonLine w="w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

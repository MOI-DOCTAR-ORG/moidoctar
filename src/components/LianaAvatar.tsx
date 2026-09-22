export default function LianaAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div className={`${dims[size]} rounded-full flex items-center justify-center shrink-0 relative`}>
      <span
        className="absolute inset-0 rounded-full animate-[pulse_3s_ease-in-out_infinite]"
        style={{
          background: 'linear-gradient(135deg, rgba(124,92,252,0.5) 0%, rgba(92,168,252,0.5) 50%, rgba(92,252,214,0.5) 100%)',
          filter: 'blur(8px)',
        }}
      />
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center shadow-[0_0_16px_rgba(148,197,253,0.3)] ring-2 ring-[var(--neon-primary)]/50"
        style={{
          background: 'linear-gradient(135deg, #7C5CFC 0%, #5CA8FC 50%, #5CFCD6 100%)',
        }}
      >
        <span className="text-white font-extrabold tracking-tight drop-shadow-sm select-none">L</span>
      </div>
    </div>
  )
}

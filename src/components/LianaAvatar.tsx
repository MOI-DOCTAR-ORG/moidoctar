export default function LianaAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  return (
    <div className={`${dims[size]} shrink-0 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md font-bold select-none`}>
      L
    </div>
  )
}

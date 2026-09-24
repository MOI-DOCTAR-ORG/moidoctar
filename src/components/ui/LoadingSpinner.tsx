export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-6 text-on-background">
      <div className="w-full max-w-xs rounded-2xl border border-outline-variant bg-surface p-8 text-center">
        <img src="/moidoctar-logo.svg" alt="MoiDoctar" className="mx-auto mb-5 h-16 w-16 object-contain" />
        <div className="relative mx-auto mb-4 h-8 w-8">
          <div className="absolute inset-0 rounded-full border-[3px] border-outline-variant" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary" />
        </div>
        <p className="font-body-md text-secondary">{text}</p>
      </div>
    </div>
  )
}

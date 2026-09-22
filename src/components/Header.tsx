import Icon from './Icon'

export default function Header() {
  return (
    <header className="flex justify-between items-center mb-8 h-12">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">
          Good morning
        </h2>
        <p className="font-body-md text-secondary">
          Here is what is happening with your health today.
        </p>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
          <Icon icon="notifications" size="lg" />
        </button>
      </div>
    </header>
  )
}

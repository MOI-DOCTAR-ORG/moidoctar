/** Time-of-day greeting, personalised when a first name is known: "Good morning, Korede" or just "Good morning". */
export function getGreeting(firstName?: string | null, now: Date = new Date()): string {
  const h = now.getHours()
  const base = h < 12 ? 'Good morning' : h < 16 ? 'Good afternoon' : 'Good evening'
  const name = firstName?.trim()
  return name ? `${base}, ${name}` : base
}

import type { KeyboardEvent } from 'react'

export type BodyView = 'front' | 'back'

type Region = {
  id: string
  label: string
  view: BodyView | 'both'
  x: number
  y: number
  w: number
  h: number
  r: number
}

// Ids match what the triage chat and older sessions already use.
export const BODY_REGIONS: Region[] = [
  { id: 'head', label: 'Head', view: 'both', x: 76, y: 8, w: 48, h: 56, r: 24 },
  { id: 'chest', label: 'Chest', view: 'front', x: 64, y: 80, w: 72, h: 62, r: 16 },
  { id: 'abdomen', label: 'Abdomen', view: 'front', x: 68, y: 146, w: 64, h: 58, r: 14 },
  { id: 'upper-back', label: 'Upper Back', view: 'back', x: 64, y: 80, w: 72, h: 62, r: 16 },
  { id: 'lower-back', label: 'Lower Back', view: 'back', x: 68, y: 146, w: 64, h: 58, r: 14 },
  // Person's right side is on the viewer's left when facing us.
  { id: 'right-arm', label: 'Right Arm', view: 'front', x: 34, y: 82, w: 24, h: 122, r: 12 },
  { id: 'left-arm', label: 'Left Arm', view: 'front', x: 142, y: 82, w: 24, h: 122, r: 12 },
  { id: 'left-arm', label: 'Left Arm', view: 'back', x: 34, y: 82, w: 24, h: 122, r: 12 },
  { id: 'right-arm', label: 'Right Arm', view: 'back', x: 142, y: 82, w: 24, h: 122, r: 12 },
  { id: 'right-leg', label: 'Right Leg', view: 'front', x: 68, y: 210, w: 30, h: 190, r: 15 },
  { id: 'left-leg', label: 'Left Leg', view: 'front', x: 102, y: 210, w: 30, h: 190, r: 15 },
  { id: 'left-leg-back', label: 'Left Leg', view: 'back', x: 68, y: 210, w: 30, h: 190, r: 15 },
  { id: 'right-leg-back', label: 'Right Leg', view: 'back', x: 102, y: 210, w: 30, h: 190, r: 15 },
]

export function regionLabel(id: string) {
  return BODY_REGIONS.find((r) => r.id === id)?.label ?? id
}

type Props = {
  view: BodyView
  selected: string[]
  onToggle: (id: string, label: string) => void
}

export default function BodyFigure({ view, selected, onToggle }: Props) {
  const regions = BODY_REGIONS.filter((r) => r.view === 'both' || r.view === view)

  const onKey = (e: KeyboardEvent<SVGGElement>, id: string, label: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(id, label)
    }
  }

  return (
    <svg
      viewBox="0 0 200 410"
      className="mx-auto block h-full max-h-[62dvh] w-auto max-w-full select-none"
      role="group"
      aria-label={view === 'front' ? 'Front of the body' : 'Back of the body'}
    >
      {/* connective tissue so the figure reads as one body */}
      <rect x="92" y="60" width="16" height="24" rx="6" className="fill-surface-container-highest" />
      <rect x="70" y="196" width="60" height="20" rx="8" className="fill-surface-container-highest" />

      {regions.map((r) => {
        const isOn = selected.includes(r.id)
        return (
          <g
            key={`${r.id}-${r.view}`}
            role="button"
            tabIndex={0}
            aria-pressed={isOn}
            aria-label={r.label}
            onClick={() => onToggle(r.id, r.label)}
            onKeyDown={(e) => onKey(e, r.id, r.label)}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-primary [&:focus-visible>rect]:stroke-[3]"
          >
            <rect
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={r.r}
              className={`transition-colors ${
                isOn
                  ? 'fill-primary stroke-primary'
                  : 'fill-surface-container-high stroke-outline hover:fill-primary-container'
              }`}
              strokeWidth={2}
            />
            {isOn && (
              <path
                d={`M${r.x + r.w / 2 - 7} ${r.y + r.h / 2} l5 5 l9 -10`}
                fill="none"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-on-primary"
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

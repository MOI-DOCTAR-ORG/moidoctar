import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'

const ageOptions = [
  { value: '0-17', label: '0 - 17 years' },
  { value: '18-35', label: '18 - 35 years' },
  { value: '36-55', label: '36 - 55 years' },
  { value: '55+', label: '55+ years' },
]

export default function AgeSelection() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string>('')

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <main className="w-full max-w-lg px-margin-mobile z-10 flex flex-col items-center">
        <div className="mb-stack-lg flex flex-col items-center gap-stack-sm">
          <Icon icon="medical_services" size="2xl" className="text-primary" />
          <h1 className="font-headline-md text-headline-md font-extrabold text-primary">MoiDoctar</h1>
        </div>

        <div className="bg-surface-container-lowest w-full rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-outline-variant p-stack-lg flex flex-col gap-stack-lg">
          <div className="text-center">
            <h2 className="font-headline-lg text-headline-lg md:font-headline-lg md:text-headline-lg text-on-surface">What's your age range?</h2>
            <p className="font-body-md text-body-md text-secondary mt-2">This helps us tailor symptom analysis.</p>
          </div>

          <div className="flex flex-col gap-stack-md">
            {ageOptions.map((opt) => {
              const isSelected = selected === opt.value
              return (
                <button
                  key={opt.value}
                  className={`w-full flex items-center justify-between p-4 rounded-full transition-colors duration-200 ${
                    isSelected
                      ? 'border-2 border-primary bg-surface-container-lowest'
                      : 'border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low group'
                  }`}
                  onClick={() => setSelected(opt.value)}
                >
                  <span className={`font-label-md text-label-md ${isSelected ? 'text-primary' : 'text-on-surface group-hover:text-primary transition-colors'}`}>
                    {opt.label}
                  </span>
                  {isSelected ? (
                    <Icon icon="check_circle" size="md" className="text-primary" />
                  ) : (
                    <Icon icon="radio_button_unchecked" size="md" className="text-outline-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-stack-md mt-4">
            <button className="flex-1 py-3 px-6 rounded-full border border-primary text-primary font-label-md text-label-md hover:bg-surface-container-low transition-colors duration-200 text-center" onClick={() => navigate('/sign-in')}>
              Back
            </button>
            <button className="flex-1 py-3 px-6 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:bg-primary/90 transition-colors duration-200 text-center shadow-sm" onClick={() => navigate('/body-map')}>
              Continue
            </button>
          </div>
        </div>

        <div className="mt-stack-lg flex items-center gap-2 text-secondary">
          <Icon icon="lock" size="sm" />
          <span className="font-caption text-caption uppercase tracking-widest">HIPAA Compliant</span>
        </div>
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

interface DateFieldProps {
  /** ISO-dato (yyyy-mm-dd) eller tom streng. */
  value: string
  onChange: (value: string) => void
}

function isoToDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}

/** Tolker dd.mm.yyyy (også med / eller -). Returnerer ISO-dato, '' for tomt felt, null for ugyldig. */
function displayToIso(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed === '') {
    return ''
  }

  const match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed)
  if (!match) {
    return null
  }

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Datofelt som alltid viser dd.mm.yyyy uavhengig av maskinens språkinnstillinger.
 * Kalenderknappen åpner den native datovelgeren via et skjult date-input.
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const [text, setText] = useState(() => isoToDisplay(value))
  const textInputRef = useRef<HTMLInputElement>(null)
  const pickerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText((current) => {
      if (document.activeElement === textInputRef.current) {
        return current
      }
      return displayToIso(current) === value ? current : isoToDisplay(value)
    })
  }, [value])

  const isInvalid = displayToIso(text) === null

  function handleTextChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextText = event.target.value
    setText(nextText)
    onChange(displayToIso(nextText) ?? '')
  }

  function handleBlur() {
    const iso = displayToIso(text)
    if (iso) {
      setText(isoToDisplay(iso))
    }
  }

  function openPicker() {
    const picker = pickerInputRef.current
    if (!picker) {
      return
    }

    try {
      picker.showPicker()
    } catch {
      picker.focus()
      picker.click()
    }
  }

  return (
    <span className="date-field">
      <input
        ref={textInputRef}
        type="text"
        className="date-field-text"
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder="dd.mm.åååå"
        inputMode="numeric"
        aria-label="Sluttdato (dd.mm.åååå)"
        aria-invalid={isInvalid || undefined}
        spellCheck={false}
      />
      <button
        type="button"
        className="date-field-picker-button"
        onClick={openPicker}
        aria-label="Åpne kalender"
        tabIndex={-1}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      <input
        ref={pickerInputRef}
        type="date"
        className="date-field-picker-input"
        value={displayToIso(text) || ''}
        onChange={(event) => onChange(event.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />
    </span>
  )
}

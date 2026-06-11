import type { ResolvedTheme } from '../hooks/useTheme'

interface ThemeToggleProps {
  resolved: ResolvedTheme
  onToggle: () => void
}

export function ThemeToggle({ resolved, onToggle }: ThemeToggleProps) {
  const isDark = resolved === 'dark'
  const label = isDark ? 'Bytt til lys modus' : 'Bytt til mørk modus'

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      {isDark ? (
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
        </svg>
      )}
    </button>
  )
}

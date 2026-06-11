import {
  formatDate,
  formatNumber,
  formatPreciseNumber,
  type EmployeeCalculation,
} from '../lib/phdCalculator'

interface CalculationStepsDetailsProps {
  calculation: EmployeeCalculation
  open?: boolean
  onToggle?: (open: boolean) => void
}

function getStepBasisText(step: EmployeeCalculation['steps'][number]): string {
  if (step.code === 'VACATION') {
    return `${formatPreciseNumber(step.baseDays)} d`
  }

  if (step.groupedSources?.length) {
    return `${step.groupedSources.length} rader`
  }

  if (step.sourceRows.length === 1) {
    return `${step.sourceSheet ? `${step.sourceSheet} ` : ''}r${step.sourceRows[0]}`
  }

  if (step.sourceRows.length > 1) {
    return `${step.sourceRows.length} rader`
  }

  return 'Beregnet'
}

function getStepTypeText(step: EmployeeCalculation['steps'][number]): string {
  if (step.code === 'VACATION') {
    return 'Ferie'
  }

  if (step.code.startsWith('SUM-')) {
    return 'Summering'
  }

  if (step.code.startsWith('STANDALONE-')) {
    return 'Frittstående'
  }

  return step.additionMode === 'working' ? 'Direkte (arb.)' : 'Direkte (kal.)'
}

export function CalculationStepsDetails({ calculation, open, onToggle }: CalculationStepsDetailsProps) {
  const calculationSteps = calculation.steps

  if (!calculationSteps.length) {
    return null
  }

  const totalAdded = calculationSteps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0)

  return (
    <details
      id="beregning-details"
      className="pc-cat"
      open={open}
      onToggle={(event) => onToggle?.((event.target as HTMLDetailsElement).open)}
    >
      <summary className="pc-cat-head">
        <span className="pc-caret" />
        <h3 style={{ fontWeight: 600 }}>
          {formatDate(calculation.initialEndDate)}{' '}
          <span style={{ color: 'var(--pc-text-dim)' }}>→</span>{' '}
          <b style={{ color: 'var(--pc-accent)' }}>{formatDate(calculation.finalEndDate)}</b>
        </h3>
        <div className="spacer" />
        <span className="pc-pill">
          <b>{calculationSteps.length}</b> steg
        </span>
        <span className="pc-pill">
          <b>+{formatNumber(totalAdded)}</b> d
        </span>
        <span className="pc-link">{open ? 'Skjul detaljer' : 'Vis detaljer'}</span>
      </summary>

      <div className="table-wrap">
        <table className="pc-table">
          <thead>
            <tr>
              <th>Steg</th>
              <th>Type</th>
              <th>Grunnlag</th>
              <th className="num">Rått bidrag</th>
              <th className="num">Lagt til</th>
              <th className="num">Feriegrunnlag</th>
              <th className="num">Sluttdato</th>
            </tr>
          </thead>
          <tbody>
            {calculationSteps.map((step) => (
              <tr key={step.id}>
                <td className="strong">{step.label}</td>
                <td className="dim">{getStepTypeText(step)}</td>
                <td>{getStepBasisText(step)}</td>
                <td className="num">{formatPreciseNumber(step.rawDaysToAdd)} d</td>
                <td className="num accent">+{formatNumber(step.appliedDaysToAdd)} d</td>
                <td className="num dim">
                  {step.code === 'VACATION' ? '—' : `${formatPreciseNumber(step.vacationBaseDays ?? 0)} d`}
                </td>
                <td className="num strong">{formatDate(step.nextEndDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

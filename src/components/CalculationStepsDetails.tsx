import {
  formatDate,
  formatNumber,
  formatPreciseNumber,
  type EmployeeCalculation,
} from '../lib/phdCalculator'

interface CalculationStepsDetailsProps {
  calculation: EmployeeCalculation
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

export function CalculationStepsDetails({ calculation }: CalculationStepsDetailsProps) {
  const calculationSteps = calculation.steps

  if (!calculationSteps.length) {
    return null
  }

  const totalAdded = calculationSteps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0)

  return (
    <div className="code-groups calc-steps-section">
      <details className="code-group-card">
        <summary className="code-group-summary">
          <div className="code-group-title">
            <span className="code-tag">Σ</span>
            <h3>Beregningssteg</h3>
          </div>

          <div className="summary-pills">
            <span className="pill">{calculationSteps.length} steg</span>
            <span className="pill">+{formatNumber(totalAdded)} d</span>
            <span className="pill rule">{formatDate(calculation.finalEndDate)}</span>
          </div>
        </summary>

        <div className="code-group-content">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Steg</th>
                  <th>Type</th>
                  <th>Grunnlag</th>
                  <th>Rått bidrag</th>
                  <th>Lagt til</th>
                  <th>Feriegrunnlag</th>
                  <th>Sluttdato</th>
                </tr>
              </thead>
              <tbody>
                {calculationSteps.map((step) => (
                  <tr className="derived-rule-row" key={step.id}>
                    <td className="cell-code">{step.label}</td>
                    <td>{getStepTypeText(step)}</td>
                    <td>{getStepBasisText(step)}</td>
                    <td>{formatPreciseNumber(step.rawDaysToAdd)} d</td>
                    <td className="cell-accent">{formatNumber(step.appliedDaysToAdd)} d</td>
                    <td>
                      {step.code === 'VACATION' ? '—' : `${formatPreciseNumber(step.vacationBaseDays ?? 0)} d`}
                    </td>
                    <td>{formatDate(step.nextEndDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </div>
  )
}

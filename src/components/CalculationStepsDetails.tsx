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
  if (step.groupedSources?.length) {
    return 'Grouped 470/091 total from the code sections above'
  }

  if (step.sourceRows.length === 1) {
    return `${step.sourceSheet ? `${step.sourceSheet} ` : ''}row ${step.sourceRows[0]}`
  }

  if (step.sourceRows.length > 1) {
    return 'Multiple rows from one code section'
  }

  return 'Calculated rule'
}

export function CalculationStepsDetails({ calculation }: CalculationStepsDetailsProps) {
  const calculationSteps = calculation.steps

  if (!calculationSteps.length) {
    return null
  }

  return (
    <div className="code-groups derived-rules">
      <details className="code-group-card">
        <summary className="code-group-summary">
          <div className="code-group-title">
            <p className="card-label">Applied calculation</p>
            <h3>Calculation steps</h3>
            <p>Only these rows directly change the calculated end date.</p>
          </div>

          <div className="summary-pill-row">
            <span className="summary-pill">Steps: {calculationSteps.length}</span>
            <span className="summary-pill">
              Total added: {formatNumber(
                calculationSteps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0),
              )} days
            </span>
            <span className="summary-pill">Final end date: {formatDate(calculation.finalEndDate)}</span>
          </div>
        </summary>

        <div className="code-group-content">
          <div className="step-table-wrapper">
            <table className="step-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Basis</th>
                  <th>Contribution before rounding</th>
                  <th>Added to end date</th>
                  <th>End date after step</th>
                </tr>
              </thead>
              <tbody>
                {calculationSteps.map((step) => (
                  <tr className="derived-rule-row" key={step.id}>
                    <td>{step.label}</td>
                    <td>{getStepBasisText(step)}</td>
                    <td>{formatPreciseNumber(step.rawDaysToAdd)} days</td>
                    <td>{formatNumber(step.appliedDaysToAdd)} days</td>
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
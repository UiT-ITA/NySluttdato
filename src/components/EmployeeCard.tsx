import { CalculationStepsDetails } from './CalculationStepsDetails'
import { CodeGroupDetails } from './CodeGroupDetails'
import {
  formatDate,
  formatNumber,
  type EmployeeCalculation,
  type ParsedWorkbook,
} from '../lib/phdCalculator'

type EmployeeReport = ParsedWorkbook['employees'][number]

interface EmployeeCardProps {
  employeeReport: EmployeeReport
  calculation?: EmployeeCalculation
}

export function EmployeeCard({ employeeReport, calculation }: EmployeeCardProps) {
  const rowsByCode = new Map<string, EmployeeReport['rows']>()

  for (const row of employeeReport.rows) {
    const existingRows = rowsByCode.get(row.code)
    if (existingRows) {
      existingRows.push(row)
    } else {
      rowsByCode.set(row.code, [row])
    }
  }

  return (
    <article className="employee-card">
      <header className="employee-header">
        <div className="employee-title-block">
          <p className="card-label">Employee</p>
          <div className="employee-title-row">
            <h2>{employeeReport.employeeId}</h2>
            <span className={`employee-badge${calculation?.skippedCodes.length ? ' warning' : ''}`}>
              {calculation?.skippedCodes.length ? 'Contains unsupported codes' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="final-date-box">
          <p className="card-label">New end date</p>
          <strong>{calculation ? formatDate(calculation.finalEndDate) : 'Not calculated'}</strong>
        </div>
      </header>

      <div className="employee-meta">
        <div>
          <span>Initial end date</span>
          <strong>{calculation ? formatDate(calculation.initialEndDate) : 'Not calculated'}</strong>
        </div>
        <div>
          <span>Rule steps</span>
          <strong>{calculation ? calculation.steps.length : '-'}</strong>
        </div>
        <div>
          <span>Vacation base days</span>
          <strong>{calculation ? formatNumber(calculation.vacationBaseDays) : '-'}</strong>
        </div>
        <div>
          <span>Vacation days added</span>
          <strong>{calculation ? formatNumber(calculation.vacationDays) : '-'}</strong>
        </div>
        <div>
          <span>Rows processed</span>
          <strong>{calculation ? calculation.processedRows : employeeReport.rows.length}</strong>
        </div>
      </div>

      {calculation?.skippedCodes.length ? (
        <p className="inline-warning">
          Unsupported absence codes skipped: {calculation.skippedCodes.join(', ')}
        </p>
      ) : null}

      <div className="code-groups">
        {Array.from(rowsByCode.entries()).map(([code, codeRows]) => (
          <CodeGroupDetails
            key={`${employeeReport.employeeId}-${code}`}
            code={code}
            rows={codeRows}
            calculationSteps={calculation?.steps ?? []}
          />
        ))}
      </div>

      {calculation ? <CalculationStepsDetails calculation={calculation} /> : null}
    </article>
  )
}

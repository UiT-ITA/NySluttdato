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

  const hasWarnings = Boolean(calculation?.skippedCodes.length)

  return (
    <article className="employee-card">
      <header className="employee-header">
        <div className="employee-title-block">
          <span className="employee-id">{employeeReport.employeeId}</span>
          <span className={`employee-badge ${hasWarnings ? 'warning' : 'ok'}`}>
            {hasWarnings ? 'Ikke-støttede koder' : 'Klar'}
          </span>
        </div>

        <div className="final-date-box">
          <span className="final-date-label">Ny sluttdato</span>
          <span className="final-date-value">
            {calculation ? formatDate(calculation.finalEndDate) : '—'}
          </span>
        </div>
      </header>

      <div className="employee-meta">
        <div className="meta-cell">
          <span className="meta-label">Opprinnelig sluttdato</span>
          <span className="meta-value">
            {calculation ? formatDate(calculation.initialEndDate) : '—'}
          </span>
        </div>
        <div className="meta-cell">
          <span className="meta-label">Regelsteg</span>
          <span className="meta-value">{calculation ? calculation.steps.length : '—'}</span>
        </div>
        <div className="meta-cell">
          <span className="meta-label">Feriegrunnlagsdager</span>
          <span className="meta-value">
            {calculation ? formatNumber(calculation.vacationBaseDays) : '—'}
          </span>
        </div>
        <div className="meta-cell">
          <span className="meta-label">Feriedager lagt til</span>
          <span className="meta-value">
            {calculation ? formatNumber(calculation.vacationDays) : '—'}
          </span>
        </div>
        <div className="meta-cell">
          <span className="meta-label">Behandlede rader</span>
          <span className="meta-value">
            {calculation ? calculation.processedRows : employeeReport.rows.length}
          </span>
        </div>
      </div>

      {calculation?.skippedCodes.length ? (
        <div className="inline-warning">
          ⚠ Ikke-støttede fraværskoder hoppet over: {calculation.skippedCodes.join(', ')}
        </div>
      ) : null}

      <div className="code-groups">
        {Array.from(rowsByCode.entries()).map(([code, codeRows]) => (
          <CodeGroupDetails key={`${employeeReport.employeeId}-${code}`} code={code} rows={codeRows} />
        ))}
      </div>

      {calculation ? <CalculationStepsDetails calculation={calculation} /> : null}
    </article>
  )
}

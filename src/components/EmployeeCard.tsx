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
  skippedRows?: ParsedWorkbook['skippedRows']
  calcDetailsOpen?: boolean
  onCalcDetailsToggle?: (open: boolean) => void
}

export function EmployeeCard({
  employeeReport,
  calculation,
  skippedRows,
  calcDetailsOpen,
  onCalcDetailsToggle,
}: EmployeeCardProps) {
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
    <>
      <dl className="pc-stats">
        <div className="pc-stat">
          <dt>Opprinnelig sluttdato</dt>
          <dd>{calculation ? formatDate(calculation.initialEndDate) : '—'}</dd>
        </div>
        <div className="pc-stat">
          <dt>Regelsteg</dt>
          <dd>{calculation ? calculation.steps.length : '—'}</dd>
        </div>
        <div className="pc-stat">
          <dt>Feriegrunnlagsdager</dt>
          <dd>{calculation ? formatNumber(calculation.vacationBaseDays) : '—'}</dd>
        </div>
        <div className="pc-stat">
          <dt>Feriedager lagt til</dt>
          <dd>{calculation ? formatNumber(calculation.vacationDays) : '—'}</dd>
        </div>
        <div className="pc-stat">
          <dt>Behandlede rader</dt>
          <dd>
            {calculation ? calculation.processedRows : employeeReport.rows.length}
            <small>av {employeeReport.rows.length}</small>
          </dd>
        </div>
      </dl>

      {calculation?.skippedCodes.length ? (
        <div className="inline-warning">
          ⚠ Ikke-støttede fraværskoder hoppet over: {calculation.skippedCodes.join(', ')}
        </div>
      ) : null}

      {skippedRows?.length ? (
        <details className="pc-cat warning-panel">
          <summary className="pc-cat-head">
            <span className="pc-caret" />
            <h3>{skippedRows.length} hoppet over rader</h3>
          </summary>
          <ul>
            {skippedRows.map((row) => (
              <li key={`${row.rowNumber}-${row.reason}`}>
                Rad {row.rowNumber}: {row.reason}
                <div className="skipped-row-cells">
                  {row.cells?.length
                    ? row.cells.map((cell) => cell || '(tom)').join(' · ')
                    : '(ingen celleverdier funnet)'}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="pc-section-title">Fravær etter kategori</div>

      {Array.from(rowsByCode.entries()).map(([code, codeRows]) => (
        <CodeGroupDetails key={`${employeeReport.employeeId}-${code}`} code={code} rows={codeRows} />
      ))}

      {calculation ? (
        <>
          <div className="pc-section-title">Beregning</div>
          <CalculationStepsDetails
            calculation={calculation}
            open={calcDetailsOpen}
            onToggle={onCalcDetailsToggle}
          />
        </>
      ) : null}
    </>
  )
}

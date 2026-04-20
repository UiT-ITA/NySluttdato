import {
  formatDate,
  formatNumber,
  formatPreciseNumber,
  previewRowCalculation,
  type CalculationStep,
  type ParsedAbsenceRow,
} from '../lib/phdCalculator'

interface CodeGroupDetailsProps {
  code: string
  rows: ParsedAbsenceRow[]
  calculationSteps: CalculationStep[]
}

export function CodeGroupDetails({ code, rows, calculationSteps }: CodeGroupDetailsProps) {
  const rowDetails = rows.map((row) => ({
    row,
    preview: previewRowCalculation(row),
  }))
  const firstPreview = rowDetails[0]?.preview
  const singleSourceSheet = rows.every((row) => row.sourceSheet === rows[0].sourceSheet)
    ? rows[0].sourceSheet
    : null
  const showWorkedPercent = rows.some((row) => typeof row.workPercent === 'number')
  const showPartTimePercent = rows.some((row) => typeof row.partTimePercent === 'number')
  const showExtraPercent = rows.some((row) => typeof row.extraPercent === 'number')
  const showHours = rows.some((row) => typeof row.hours === 'number')
  const totalHours = showHours ? rows.reduce((sum, row) => sum + (row.hours ?? 0), 0) : 0
  const totalContribution = rowDetails.reduce(
    (sum, detail) => sum + (detail.preview?.rawDaysToAdd ?? 0),
    0,
  )
  const directCodeSteps = calculationSteps.filter((step) => step.code === code)
  const groupedCodeSteps = calculationSteps.filter(
    (step) => step.groupedSources?.some((source) => source.code === code) ?? false,
  )
  const relevantSteps = directCodeSteps.length ? directCodeSteps : groupedCodeSteps
  const totalAppliedForCode = relevantSteps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0)
  const totalVacationBaseForCode = relevantSteps.reduce((sum, step) => sum + (step.vacationBaseDays ?? 0), 0)
  const isSummationCode = firstPreview?.summationRule != null

  return (
    <details className="code-group-card">
      <summary className="code-group-summary">
        <div className="code-group-title">
          <p className="card-label">Code</p>
          <h3>{code}</h3>
          <p>{firstPreview?.ruleLabel ?? rows[0].description ?? 'No rule found'}</p>
        </div>

        <div className="summary-pill-row">
          <span className="summary-pill">Rows: {rows.length}</span>
          <span className="summary-pill">Calculated total: {formatPreciseNumber(totalContribution)} days</span>
          {showHours ? (
            <span className="summary-pill">Total hours: {formatPreciseNumber(totalHours)} h</span>
          ) : null}
          <span className="summary-pill">Applied days: {formatNumber(totalAppliedForCode)}</span>
          {firstPreview?.vacationEligible ? (
            <span className="summary-pill">
              Vacation basis: {formatPreciseNumber(totalVacationBaseForCode)} days
            </span>
          ) : null}
          {singleSourceSheet && singleSourceSheet !== 'Leave' ? (
            <span className="summary-pill">Sheet: {singleSourceSheet}</span>
          ) : null}
        </div>
      </summary>

      <div className="code-group-content">
        <div className="code-summary-grid">
          <div>
            <span>Rows</span>
            <strong>{rows.length}</strong>
          </div>
          <div>
            <span>Calculated total</span>
            <strong>{formatPreciseNumber(totalContribution)} days</strong>
          </div>
          <div>
            <span>Applied days</span>
            <strong>{formatNumber(totalAppliedForCode)}</strong>
          </div>
          {firstPreview?.vacationEligible ? (
            <div>
              <span>Vacation basis</span>
              <strong>{formatPreciseNumber(totalVacationBaseForCode)} days</strong>
            </div>
          ) : null}
          {isSummationCode ? (
            <div>
              <span>Grouped by</span>
              <strong>Summeringsregel {firstPreview.summationRule}</strong>
            </div>
          ) : null}
        </div>

        <div className="step-table-wrapper">
          <table className="step-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>From</th>
                <th>To</th>
                {showWorkedPercent ? <th>Worked %</th> : null}
                {showPartTimePercent ? <th>Part-time %</th> : null}
                {showExtraPercent ? <th>Ignored %</th> : null}
                {showHours ? <th>Hours</th> : null}
                <th>Base days</th>
                <th>Absence fraction</th>
                <th>Calculated days</th>
                <th>Rounding preview</th>
              </tr>
            </thead>
            <tbody>
              {rowDetails.map(({ row, preview }) => (
                <tr
                  key={`${row.sourceSheet}-${row.sourceRowNumber}-${row.code}-${row.startDate.toISOString()}`}
                  className="source-main-row"
                >
                  <td>{row.sourceRowNumber}</td>
                  <td>{formatDate(row.startDate)}</td>
                  <td>{formatDate(row.endDate)}</td>
                  {showWorkedPercent ? (
                    <td>
                      {typeof row.workPercent === 'number' ? `${formatNumber(row.workPercent)}%` : '-'}
                    </td>
                  ) : null}
                  {showPartTimePercent ? (
                    <td>
                      {typeof row.partTimePercent === 'number'
                        ? `${formatNumber(row.partTimePercent)}%`
                        : '-'}
                    </td>
                  ) : null}
                  {showExtraPercent ? (
                    <td>
                      {typeof row.extraPercent === 'number' ? `${formatNumber(row.extraPercent)}%` : '-'}
                    </td>
                  ) : null}
                  {showHours ? (
                    <td>{typeof row.hours === 'number' ? `${formatPreciseNumber(row.hours)} h` : '-'}</td>
                  ) : null}
                  <td>{preview ? formatPreciseNumber(preview.baseDays) : '-'}</td>
                  <td>{preview ? formatPreciseNumber(preview.absenceFraction) : '-'}</td>
                  <td>{preview ? formatPreciseNumber(preview.rawDaysToAdd) : '-'}</td>
                  <td>{preview ? formatPreciseNumber(preview.roundedDaysToAdd) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}

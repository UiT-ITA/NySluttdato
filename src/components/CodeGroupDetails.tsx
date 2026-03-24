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
  const showHours = code !== '091' && rows.some((row) => typeof row.hours === 'number')
  const totalHours = showHours ? rows.reduce((sum, row) => sum + (row.hours ?? 0), 0) : 0
  const totalContribution = rowDetails.reduce(
    (sum, detail) => sum + (detail.preview?.rawDaysToAdd ?? 0),
    0,
  )
  const directCodeSteps = calculationSteps.filter((step) => step.code === code)
  const totalAppliedForCode = directCodeSteps.reduce(
    (sum, step) => sum + step.appliedDaysToAdd,
    0,
  )
  const isGroupedRule = Boolean(firstPreview?.isGroupedRule)
  const showAppliedSummary = !isGroupedRule
  const showAppliedDaysColumn = !isGroupedRule
  const showContributionSummary = isGroupedRule

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
          {showContributionSummary ? (
            <span className="summary-pill">
              Total contribution: {formatPreciseNumber(totalContribution)} days
            </span>
          ) : null}
          {showHours ? (
            <span className="summary-pill">Total hours: {formatPreciseNumber(totalHours)} h</span>
          ) : null}
          {showAppliedSummary ? (
            <span className="summary-pill">Applied days: {formatNumber(totalAppliedForCode)}</span>
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
          {showContributionSummary ? (
            <div>
              <span>Total contribution</span>
              <strong>{formatPreciseNumber(totalContribution)} days</strong>
            </div>
          ) : null}
          {showHours ? (
            <div>
              <span>Total hours</span>
              <strong>{formatPreciseNumber(totalHours)} h</strong>
            </div>
          ) : null}
          {showAppliedSummary ? (
            <div>
              <span>Applied days</span>
              <strong>{formatNumber(totalAppliedForCode)}</strong>
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
                {showExtraPercent ? <th>Leave basis %</th> : null}
                {showHours ? <th>Hours</th> : null}
                <th>Base days</th>
                <th>Calculated days</th>
                {showAppliedDaysColumn ? <th>Applied days</th> : null}
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
                  <td>{preview ? formatPreciseNumber(preview.rawDaysToAdd) : '-'}</td>
                  {showAppliedDaysColumn ? (
                    <td>{preview ? formatPreciseNumber(preview.roundedDaysToAdd) : '-'}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}
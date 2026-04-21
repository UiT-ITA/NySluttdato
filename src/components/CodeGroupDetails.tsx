import { getAbsenceRule } from '../lib/rules'
import {
  getCodeDisplayConfig,
  getCodeDisplayType,
  getCodeGroupColumnHeader,
} from '../lib/codeGroupDisplay'
import {
  formatDate,
  formatNumber,
  formatPreciseNumber,
  previewRowCalculation,
  type ParsedAbsenceRow,
} from '../lib/phdCalculator'

interface CodeGroupDetailsProps {
  code: string
  rows: ParsedAbsenceRow[]
}

export function CodeGroupDetails({ code, rows }: CodeGroupDetailsProps) {
  const rowDetails = rows.map((row) => ({
    row,
    preview: previewRowCalculation(row),
  }))
  const firstPreview = rowDetails[0]?.preview
  const rule = getAbsenceRule(code)
  const displayType = getCodeDisplayType(code, rule?.countingBasis ?? 'days')
  const displayConfig = getCodeDisplayConfig(displayType)
  const totalContribution = rowDetails.reduce(
    (sum, detail) => sum + (detail.preview?.rawDaysToAdd ?? 0),
    0,
  )

  return (
    <details className="code-group-card">
      <summary className="code-group-summary">
        <div className="code-group-title">
          <span className="code-tag">{code}</span>
          <h3>{firstPreview?.ruleLabel ?? rows[0].description ?? 'Ingen regel funnet'}</h3>
        </div>

        <div className="summary-pills">
          <span className="pill">{rows.length} rader</span>
          <span className="pill">{formatPreciseNumber(totalContribution)} d</span>
          {displayConfig.groupedByLabel ? (
            <span className="pill rule">{displayConfig.groupedByLabel}</span>
          ) : null}
        </div>
      </summary>

      <div className="code-group-content">
        <div className="code-summary-grid">
          <div className="code-stat">
            <span className="code-stat-label">Rader:</span>
            <span className="code-stat-value">{rows.length}</span>
          </div>
          <div className="code-stat">
            <span className="code-stat-label">{displayConfig.headerTotalLabel}:</span>
            <span className="code-stat-value">{formatPreciseNumber(totalContribution)} dager</span>
          </div>
          {displayConfig.groupedByLabel ? (
            <div className="code-stat">
              <span className="code-stat-label">Gruppert:</span>
              <span className="code-stat-value">{displayConfig.groupedByLabel}</span>
            </div>
          ) : null}
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {displayConfig.tableColumns.map((column) => (
                  <th key={column}>{getCodeGroupColumnHeader(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowDetails.map(({ row, preview }) => (
                <tr
                  key={`${row.sourceSheet}-${row.sourceRowNumber}-${row.code}-${row.startDate.toISOString()}`}
                >
                  {displayConfig.tableColumns.map((column) => {
                    switch (column) {
                      case 'row':
                        return <td key={column}>{row.sourceRowNumber}</td>
                      case 'from':
                        return <td key={column}>{formatDate(row.startDate)}</td>
                      case 'to':
                        return <td key={column}>{formatDate(row.endDate)}</td>
                      case 'workPercent':
                        return (
                          <td key={column}>
                            {typeof row.workPercent === 'number' ? `${formatNumber(row.workPercent)}%` : '—'}
                          </td>
                        )
                      case 'partTimePercent':
                        return (
                          <td key={column}>
                            {typeof row.partTimePercent === 'number'
                              ? `${formatNumber(row.partTimePercent)}%`
                              : '—'}
                          </td>
                        )
                      case 'baseDays':
                        return <td key={column}>{preview ? formatPreciseNumber(preview.baseDays) : '—'}</td>
                      case 'absenceFraction':
                        return (
                          <td key={column}>{preview ? formatPreciseNumber(preview.absenceFraction) : '—'}</td>
                        )
                      case 'calculatedDays':
                        return (
                          <td key={column} className="cell-accent">
                            {preview ? formatPreciseNumber(preview.rawDaysToAdd) : '—'}
                          </td>
                        )
                      case 'hours':
                        return (
                          <td key={column}>
                            {typeof row.hours === 'number' ? `${formatPreciseNumber(row.hours)} t` : '—'}
                          </td>
                        )
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}

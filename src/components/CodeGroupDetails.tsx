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

const NUMERIC_COLUMNS = [
  'workPercent',
  'partTimePercent',
  'baseDays',
  'absenceFraction',
  'calculatedDays',
  'hours',
]

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
  const columnCount = displayConfig.tableColumns.length

  return (
    <details className="pc-cat">
      <summary className="pc-cat-head">
        <span className="pc-caret" />
        <span className="pc-code">{code}</span>
        <h3>{firstPreview?.ruleLabel ?? rows[0].description ?? 'Ingen regel funnet'}</h3>
        <div className="spacer" />
        <span className="pc-pill">
          <b>{rows.length}</b> {rows.length === 1 ? 'rad' : 'rader'}
        </span>
        <span className="pc-pill">
          <b>{formatPreciseNumber(totalContribution)}</b> d
        </span>
        {displayConfig.groupedByLabel ? (
          <span className="pc-pill">{displayConfig.groupedByLabel}</span>
        ) : null}
      </summary>

      <div className="table-wrap">
        <table className="pc-table">
          <thead>
            <tr>
              {displayConfig.tableColumns.map((column) => (
                <th key={column} className={NUMERIC_COLUMNS.includes(column) ? 'num' : undefined}>
                  {getCodeGroupColumnHeader(column)}
                </th>
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
                      return <td key={column} className="dim">{row.sourceRowNumber}</td>
                    case 'from':
                      return <td key={column}>{formatDate(row.startDate)}</td>
                    case 'to':
                      return <td key={column}>{formatDate(row.endDate)}</td>
                    case 'workPercent':
                      return (
                        <td key={column} className="num">
                          {typeof row.workPercent === 'number' ? `${formatNumber(row.workPercent)}%` : '—'}
                        </td>
                      )
                    case 'partTimePercent':
                      return (
                        <td key={column} className="num dim">
                          {typeof row.partTimePercent === 'number'
                            ? `${formatNumber(row.partTimePercent)}%`
                            : '—'}
                        </td>
                      )
                    case 'baseDays':
                      return (
                        <td key={column} className="num">
                          {preview ? formatPreciseNumber(preview.baseDays) : '—'}
                        </td>
                      )
                    case 'absenceFraction':
                      return (
                        <td key={column} className="num dim">
                          {preview ? formatPreciseNumber(preview.absenceFraction) : '—'}
                        </td>
                      )
                    case 'calculatedDays':
                      return (
                        <td key={column} className="num accent">
                          {preview ? formatPreciseNumber(preview.rawDaysToAdd) : '—'}
                        </td>
                      )
                    case 'hours':
                      return (
                        <td key={column} className="num">
                          {typeof row.hours === 'number' ? `${formatPreciseNumber(row.hours)} t` : '—'}
                        </td>
                      )
                  }
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={Math.max(1, columnCount - 2)}>
                Delsum{displayConfig.groupedByLabel ? ` · ${displayConfig.groupedByLabel}` : ''}
              </td>
              <td className="num dim">
                {rows.length} {rows.length === 1 ? 'rad' : 'rader'}
              </td>
              <td className="num">{formatPreciseNumber(totalContribution)} d</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </details>
  )
}

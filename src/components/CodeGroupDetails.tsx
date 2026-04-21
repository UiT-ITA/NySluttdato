import { getAbsenceRule, type CountingBasis } from '../lib/rules'
import {
  formatDate,
  formatNumber,
  formatPreciseNumber,
  previewRowCalculation,
  type ParsedAbsenceRow,
} from '../lib/phdCalculator'

type CodeDisplayType =
  | 'direct-calendar'
  | 'direct-working'
  | 'summation-rule-1'
  | 'summation-rule-2'
  | 'summation-rule-3-days'
  | 'summation-rule-3-hours'

interface CodeGroupDetailsProps {
  code: string
  rows: ParsedAbsenceRow[]
}

interface DisplayConfig {
  headerTotalLabel: string
  groupedByLabel: string | null
  tableColumns: Array<
    | 'row'
    | 'from'
    | 'to'
    | 'workPercent'
    | 'partTimePercent'
    | 'baseDays'
    | 'absenceFraction'
    | 'calculatedDays'
    | 'hours'
  >
}

function getDisplayType(code: string, countingBasis: CountingBasis): CodeDisplayType {
  const rule = getAbsenceRule(code)

  if (!rule) {
    return 'direct-calendar'
  }

  if (rule.summationRule == null) {
    return rule.additionMode === 'working' ? 'direct-working' : 'direct-calendar'
  }

  if (rule.summationRule === 1) {
    return 'summation-rule-1'
  }

  if (rule.summationRule === 2) {
    return 'summation-rule-2'
  }

  return countingBasis === 'hours-divided-by-7.5' ? 'summation-rule-3-hours' : 'summation-rule-3-days'
}

function getDisplayConfig(displayType: CodeDisplayType): DisplayConfig {
  switch (displayType) {
    case 'direct-calendar':
      return {
        headerTotalLabel: 'Kalenderdager',
        groupedByLabel: null,
        tableColumns: ['row', 'from', 'to', 'baseDays'],
      }
    case 'direct-working':
      return {
        headerTotalLabel: 'Arbeidsdager',
        groupedByLabel: null,
        tableColumns: ['row', 'from', 'to', 'baseDays'],
      }
    case 'summation-rule-1':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 1',
        tableColumns: ['row', 'from', 'to', 'workPercent', 'partTimePercent', 'baseDays', 'absenceFraction', 'calculatedDays'],
      }
    case 'summation-rule-2':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 2',
        tableColumns: ['row', 'from', 'to', 'baseDays', 'calculatedDays'],
      }
    case 'summation-rule-3-days':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 3',
        tableColumns: ['row', 'from', 'to', 'baseDays', 'calculatedDays'],
      }
    case 'summation-rule-3-hours':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 3',
        tableColumns: ['row', 'from', 'to', 'hours', 'calculatedDays'],
      }
  }
}

function getColumnHeader(column: DisplayConfig['tableColumns'][number]): string {
  switch (column) {
    case 'row':
      return 'Rad'
    case 'from':
      return 'Fra'
    case 'to':
      return 'Til'
    case 'workPercent':
      return '% før'
    case 'partTimePercent':
      return 'Deltid %'
    case 'baseDays':
      return 'Grunndager'
    case 'absenceFraction':
      return 'Brøk'
    case 'calculatedDays':
      return 'Beregnet'
    case 'hours':
      return 'Timer'
  }
}

export function CodeGroupDetails({ code, rows }: CodeGroupDetailsProps) {
  const rowDetails = rows.map((row) => ({
    row,
    preview: previewRowCalculation(row),
  }))
  const firstPreview = rowDetails[0]?.preview
  const rule = getAbsenceRule(code)
  const displayType = getDisplayType(code, rule?.countingBasis ?? 'days')
  const displayConfig = getDisplayConfig(displayType)
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
                  <th key={column}>{getColumnHeader(column)}</th>
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

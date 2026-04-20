import { useMemo, useState } from 'react'
import readXlsxFile, { readSheetNames } from 'read-excel-file/browser'
import './App.css'
import { EmployeeCard } from './components/EmployeeCard'
import {
  calculateEmployeeResult,
  formatDate,
  formatNumber,
  parseDateInput,
  parseWorkbook,
  toDateInputValue,
  type EmployeeCalculation,
  type ParsedWorkbook,
} from './lib/phdCalculator'

function App() {
  const [report, setReport] = useState<ParsedWorkbook | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [dateOverride, setDateOverride] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const effectiveStartDate = dateOverride ? parseDateInput(dateOverride) : report?.currentEndDate ?? null
  const activeEmployeeId = selectedEmployeeId || report?.employees[0]?.employeeId || ''

  const selectedEmployee = useMemo(
    () => report?.employees.find((employee) => employee.employeeId === activeEmployeeId) ?? null,
    [activeEmployeeId, report],
  )

  const calculation: EmployeeCalculation | null =
    selectedEmployee && effectiveStartDate
      ? calculateEmployeeResult(selectedEmployee.employeeId, selectedEmployee.rows, effectiveStartDate)
      : null

  const totalEmployees = report?.employees.length ?? 0
  const totalRows = report?.employees.reduce((sum, employee) => sum + employee.rows.length, 0) ?? 0
  const totalAppliedDays = calculation
    ? calculation.steps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0)
    : 0
  const warningCount = (report?.skippedRows.length ?? 0) + (calculation?.skippedCodes.length ?? 0)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const sheetNames = await readSheetNames(file)
      const leaveSheetName = sheetNames.includes('Leave') ? 'Leave' : sheetNames[0]
      const breastfeedingSheetName = sheetNames.includes('Ammefri') ? 'Ammefri' : undefined
      const leaveRows = await readXlsxFile(file, { sheet: leaveSheetName })
      const breastfeedingRows = breastfeedingSheetName
        ? await readXlsxFile(file, { sheet: breastfeedingSheetName })
        : undefined
      const parsedReport = parseWorkbook({
        leaveRows,
        breastfeedingRows,
      })
      setReport(parsedReport)
      setSelectedFileName(file.name)
      setDateOverride(parsedReport.currentEndDate ? toDateInputValue(parsedReport.currentEndDate) : '')
      setSelectedEmployeeId(parsedReport.employees[0]?.employeeId ?? '')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read the Excel file.'
      setErrorMessage(message)
      setReport(null)
      setSelectedEmployeeId('')
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  return (
    <main className="shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">PhDChecker</p>
          <h1>Absence extension calculator</h1>
        </div>
        <div className="header-meta">
          <span className="header-chip">Internal review tool</span>
          <span className="header-chip">Workbook-driven calculation</span>
        </div>
      </header>

      <section className="workspace-layout">
        <aside className="control-rail">
          <section className="rail-section">
            <div className="section-heading-block">
              <p className="eyebrow">Input</p>
              <h2>Workbook source</h2>
            </div>

            <label className="file-picker" htmlFor="report-upload">
              <span>Excel workbook</span>
              <strong>{selectedFileName || 'Select .xlsx file'}</strong>
            </label>
            <input
              id="report-upload"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
            />

            <label className="date-field">
              <span>Current end date</span>
              <input
                type="date"
                value={dateOverride}
                onChange={(event) => setDateOverride(event.target.value)}
              />
            </label>

            {report?.employees.length && report.employees.length > 1 ? (
              <label className="date-field">
                <span>Employee selector</span>
                <select
                  value={activeEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                >
                  {report.employees.map((employee) => (
                    <option key={employee.employeeId} value={employee.employeeId}>
                      {employee.employeeId}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {isLoading ? <p className="status">Reading workbook...</p> : null}
            {errorMessage ? <p className="status error">{errorMessage}</p> : null}
            {!effectiveStartDate && report ? (
              <p className="status error">Set a valid current end date to run the calculation.</p>
            ) : null}
          </section>

          <section className="rail-section metric-rail">
            <div className="section-heading-block">
              <p className="eyebrow">Overview</p>
              <h2>Run status</h2>
            </div>

            <div className="metric-list">
              <div className="metric-row">
                <span>Employees</span>
                <strong>{totalEmployees}</strong>
              </div>
              <div className="metric-row">
                <span>Parsed rows</span>
                <strong>{totalRows}</strong>
              </div>
              <div className="metric-row">
                <span>Applied days</span>
                <strong>{formatNumber(totalAppliedDays)}</strong>
              </div>
              <div className="metric-row">
                <span>Warnings</span>
                <strong>{warningCount}</strong>
              </div>
              <div className="metric-row">
                <span>Basis date</span>
                <strong>{effectiveStartDate ? formatDate(effectiveStartDate) : 'Not set'}</strong>
              </div>
            </div>
          </section>

          <section className="rail-section rules-panel">
            <div className="section-heading-block">
              <p className="eyebrow">Rules</p>
              <h2>Calculation behavior</h2>
            </div>

            <ul className="rule-list">
              <li>Direct rules are applied in chronological order for the selected employee.</li>
              <li>Summeringsregel 1 and 2 are aggregated once across the employee report.</li>
              <li>Summeringsregel 3 is aggregated and added after all other non-vacation absence.</li>
              <li>Only codes marked with Ferieregel contribute to vacation.</li>
            </ul>
          </section>
        </aside>

        <section className="main-panel">
          <div className="workspace-toolbar">
            <div className="section-heading-block">
              <p className="eyebrow">Analysis</p>
              <h2>Employee results</h2>
            </div>

            <div className="toolbar-stats">
              <div>
                <span>Workbook</span>
                <strong>{selectedFileName || 'None loaded'}</strong>
              </div>
              <div>
                <span>Selected employee</span>
                <strong>{selectedEmployee?.employeeId ?? 'None'}</strong>
              </div>
            </div>
          </div>

          {report?.skippedRows.length ? (
            <section className="warning-panel">
              <div className="warning-panel-header">
                <p className="eyebrow">Data issues</p>
                <strong>{report.skippedRows.length} skipped rows</strong>
              </div>
              <ul>
                {report.skippedRows.map((row) => (
                  <li key={`${row.rowNumber}-${row.reason}`}>
                    Row {row.rowNumber}: {row.reason}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="results-stack">
            {selectedEmployee ? (
              <EmployeeCard employeeReport={selectedEmployee} calculation={calculation ?? undefined} />
            ) : (
              <section className="empty-state">
                <p className="eyebrow">No dataset loaded</p>
                <h2>Upload a workbook to populate the review workspace.</h2>
                <p>
                  The results area will show a single selected employee calculation, source-code
                  groupings, and the applied extension steps.
                </p>
              </section>
            )}
          </section>
        </section>
      </section>
    </main>
  )
}

export default App

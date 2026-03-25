import { useState } from 'react'
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
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const effectiveStartDate = dateOverride ? parseDateInput(dateOverride) : report?.currentEndDate ?? null
  const calculations: EmployeeCalculation[] =
    report && effectiveStartDate
      ? report.employees.map((employee) =>
          calculateEmployeeResult(employee.employeeId, employee.rows, effectiveStartDate),
        )
      : []
  const calculationByEmployeeId = new Map(
    calculations.map((calculation) => [calculation.employeeId, calculation]),
  )
  const totalEmployees = report?.employees.length ?? 0
  const totalRows = report?.employees.reduce((sum, employee) => sum + employee.rows.length, 0) ?? 0
  const totalAppliedDays = calculations.reduce(
    (sum, calculation) =>
      sum + calculation.steps.reduce((stepTotal, step) => stepTotal + step.appliedDaysToAdd, 0),
    0,
  )
  const warningCount =
    (report?.skippedRows.length ?? 0) +
    calculations.reduce((sum, calculation) => sum + calculation.skippedCodes.length, 0)

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read the Excel file.'
      setErrorMessage(message)
      setReport(null)
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
              <li>Calendar-day codes extend by consecutive dates.</li>
              <li>Working-day codes skip weekends and Norwegian public holidays.</li>
              <li>Codes 470 and 091 are grouped before the vacation-day pass.</li>
              <li>Code 091 can be read from the Ammefri sheet.</li>
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
                <span>Records</span>
                <strong>{totalEmployees}</strong>
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
            {report?.employees.length ? (
              report.employees.map((employeeReport) => (
                <EmployeeCard
                  key={employeeReport.employeeId}
                  employeeReport={employeeReport}
                  calculation={calculationByEmployeeId.get(employeeReport.employeeId)}
                />
              ))
            ) : (
              <section className="empty-state">
                <p className="eyebrow">No dataset loaded</p>
                <h2>Upload a workbook to populate the review workspace.</h2>
                <p>
                  The results area will show employee-level calculations, source-code groupings,
                  and the applied extension steps.
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

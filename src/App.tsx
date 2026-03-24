import { useState } from 'react'
import readXlsxFile, { readSheetNames } from 'read-excel-file/browser'
import './App.css'
import { EmployeeCard } from './components/EmployeeCard'
import {
  calculateEmployeeResult,
  formatDate,
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
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">PhD absence extension checker</p>
          <h1>Upload an absence report and get the recalculated end date.</h1>
          <p className="lede">
            The calculator reads the Excel report, applies the leave-code rules from the
            uploaded guideline, and shows the new end date with a step-by-step breakdown.
          </p>
        </div>

        <div className="upload-card">
          <label className="file-picker" htmlFor="report-upload">
            <span>Choose absence report</span>
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

          <div className="rule-strip">
            <span>Calendar-day codes extend by consecutive dates.</span>
            <span>Working-day codes skip weekends and Norwegian public holidays.</span>
            <span>Codes 470 and 091 are grouped before the final vacation-day pass, and 091 can be read from the Ammefri sheet.</span>
          </div>

          {isLoading ? <p className="status">Reading workbook…</p> : null}
          {errorMessage ? <p className="status error">{errorMessage}</p> : null}
          {!effectiveStartDate && report ? (
            <p className="status error">Set a valid current end date to run the calculation.</p>
          ) : null}
        </div>
      </section>

      <section className="summary-grid">
        <article className="info-card">
          <p className="card-label">Detected employees</p>
          <strong>{report?.employees.length ?? 0}</strong>
        </article>
        <article className="info-card">
          <p className="card-label">Parsed rows</p>
          <strong>
            {report?.employees.reduce((sum, employee) => sum + employee.rows.length, 0) ?? 0}
          </strong>
        </article>
        <article className="info-card">
          <p className="card-label">Start from</p>
          <strong>{effectiveStartDate ? formatDate(effectiveStartDate) : 'Not set'}</strong>
        </article>
      </section>

      {report?.skippedRows.length ? (
        <section className="warning-card">
          <h2>Skipped rows</h2>
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
        {report?.employees.map((employeeReport) => (
          <EmployeeCard
            key={employeeReport.employeeId}
            employeeReport={employeeReport}
            calculation={calculationByEmployeeId.get(employeeReport.employeeId)}
          />
        ))}
      </section>
    </main>
  )
}

export default App

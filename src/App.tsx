import { useMemo, useState } from 'react'
import readXlsxFile, { readSheetNames } from 'read-excel-file/browser'
import './App.css'
import { EmployeeCard } from './components/EmployeeCard'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'
import {
  calculateEmployeeResult,
  formatNumber,
  parseDateInput,
  parseWorkbook,
  toDateInputValue,
  type EmployeeCalculation,
  type ParsedWorkbook,
} from './lib/phdCalculator'
import { generateEmployeePdfReport } from './lib/pdfReport'

function App() {
  const [report, setReport] = useState<ParsedWorkbook | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [dateOverride, setDateOverride] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { resolved: resolvedTheme, toggle: toggleTheme } = useTheme()

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
      const message = error instanceof Error ? error.message : 'Kunne ikke lese Excel-filen.'
      setErrorMessage(message)
      setReport(null)
      setSelectedEmployeeId('')
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  function handleDownloadReport() {
    if (!selectedEmployee || !calculation) {
      return
    }

    generateEmployeePdfReport({
      employeeReport: selectedEmployee,
      calculation,
      sourceFileName: selectedFileName || undefined,
      skippedRows: report?.skippedRows,
    })
  }

  const canDownloadReport = Boolean(selectedEmployee && calculation)

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-brand">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L14.5 8L8 15L1.5 8L8 1Z" fill="currentColor" opacity="0.9" />
          </svg>
          PhDChecker
        </div>

        <div className="toolbar-controls">
          <label className="file-trigger" htmlFor="report-upload">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {selectedFileName ? (
              <span className="filename">{selectedFileName}</span>
            ) : (
              <span>Velg .xlsx-fil</span>
            )}
          </label>
          <input
            id="report-upload"
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
          />

          <div className="toolbar-divider" />

          <div className="tool-input">
            <span className="tool-input-label">Sluttdato</span>
            <input
              type="date"
              value={dateOverride}
              onChange={(event) => setDateOverride(event.target.value)}
            />
          </div>

          {report?.employees.length && report.employees.length > 1 ? (
            <>
              <div className="toolbar-divider" />
              <div className="tool-input">
                <span className="tool-input-label">Ansatt</span>
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
              </div>
            </>
          ) : null}
        </div>

        <div className="toolbar-stats">
          <div className="toolbar-stat">
            <span>Ansatte</span>
            <strong>{totalEmployees}</strong>
          </div>
          <div className="toolbar-divider" />
          <div className="toolbar-stat">
            <span>Rader</span>
            <strong>{totalRows}</strong>
          </div>
          <div className="toolbar-divider" />
          <div className="toolbar-stat">
            <span>Dager</span>
            <strong>{formatNumber(totalAppliedDays)}</strong>
          </div>
          {warningCount > 0 ? (
            <>
              <div className="toolbar-divider" />
              <div className="toolbar-stat warn">
                <span>⚠</span>
                <strong>{warningCount}</strong>
              </div>
            </>
          ) : null}

          <div className="toolbar-divider" />

          <button
            type="button"
            className="toolbar-action"
            onClick={handleDownloadReport}
            disabled={!canDownloadReport}
            title={canDownloadReport ? 'Last ned PDF-rapport' : 'Last opp fil og velg sluttdato først'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Last ned PDF</span>
          </button>

          <div className="toolbar-divider" />

          <ThemeToggle resolved={resolvedTheme} onToggle={toggleTheme} />
        </div>
      </header>

      {isLoading ? <div className="status-bar loading">Leser arbeidsbok…</div> : null}
      {errorMessage ? <div className="status-bar error">{errorMessage}</div> : null}
      {!effectiveStartDate && report ? (
        <div className="status-bar error">Sett en gyldig nåværende sluttdato for å kjøre beregningen.</div>
      ) : null}

      <main className="content">
        {report?.skippedRows.length ? (
          <details className="warning-panel">
            <summary className="warning-panel-header">
              <strong>{report.skippedRows.length} hoppet over rader</strong>
              <span>▸</span>
            </summary>
            <ul>
              {report.skippedRows.map((row) => (
                <li key={`${row.rowNumber}-${row.reason}`}>
                  Rad {row.rowNumber}: {row.reason}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {selectedEmployee ? (
          <EmployeeCard employeeReport={selectedEmployee} calculation={calculation ?? undefined} />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            <h2>Last opp en arbeidsbok</h2>
            <p>Beregningsresultater, kodegrupperinger og forlengelsessteg vises her.</p>
          </div>
        )}

        <div className="rules-section">
          <details>
            <summary className="rules-toggle">
              <h3>Regelkategorier</h3>
              <span className="chevron">▸</span>
            </summary>
            <div className="rules-content">
              <ul className="rule-list">
                <li className="rule-item">
                  <h4>Grunnregler</h4>
                  <p>
                    Beregningen følger norsk kalender, inkludert helger og norske helligdager.
                    Fraværsprosent beregnes som differansen mellom kolonne F (<code>%arbFør2001</code>)
                    og kolonne G (<code>Deltids-%0007</code>). Kolonne H og I brukes ikke.
                  </p>
                </li>
                <li className="rule-item">
                  <h4>Direkte lagt inn – kalenderdager</h4>
                  <p>Ingen summeringsregel. Hver rad legges til sluttdatoen i kalenderdager.</p>
                  <div className="rule-codes">
                    {['110', '410', '415', '440', '462', '660', '670'].map((c) => (
                      <span key={c} className="rule-code-tag">{c}</span>
                    ))}
                  </div>
                </li>
                <li className="rule-item">
                  <h4>Direkte lagt inn – arbeidsdager</h4>
                  <p>Ingen summeringsregel. Hver rad legges til sluttdatoen i arbeidsdager.</p>
                  <div className="rule-codes">
                    <span className="rule-code-tag">325</span>
                  </div>
                </li>
                <li className="rule-item">
                  <h4>Summeringsregel 1</h4>
                  <p>
                    Alle rader summeres. Summen legges til i kalenderdager.
                    Desimaldel ≥ 0,5 rundes opp, ellers ned.
                  </p>
                  <div className="rule-codes">
                    {['166', '167', '168', '169', '170', '199', '420', '425', '490'].map((c) => (
                      <span key={c} className="rule-code-tag">{c}</span>
                    ))}
                  </div>
                </li>
                <li className="rule-item">
                  <h4>Summeringsregel 2</h4>
                  <p>
                    Alle rader summeres. Summen legges til i kalenderdager.
                    Desimaler rundes alltid opp.
                  </p>
                  <div className="rule-codes">
                    {['435', '460', '461'].map((c) => (
                      <span key={c} className="rule-code-tag">{c}</span>
                    ))}
                  </div>
                </li>
                <li className="rule-item">
                  <h4>Summeringsregel 3</h4>
                  <p>
                    Alle rader summeres. Desimaler rundes opp til nærmeste hele arbeidsdag.
                    Legges til etter alt annet fravær (unntatt ferie).
                  </p>
                  <div className="rule-codes">
                    {['091', '120', '470'].map((c) => (
                      <span key={c} className="rule-code-tag">{c}</span>
                    ))}
                  </div>
                </li>
                <li className="rule-item">
                  <h4>Ferieregel</h4>
                  <p>
                    Beregnes som <code>dager / 30 × 2,916</code>. Desimaler rundes til nærmeste hele dag
                    (0,5 og over rundes opp, under 0,5 rundes ned). Legges til helt til slutt i kalenderdager.
                  </p>
                  <div className="rule-codes">
                    {['091', '110', '120', '170', '199', '410', '415', '420', '425', '440', '470'].map((c) => (
                      <span key={c} className="rule-code-tag">{c}</span>
                    ))}
                  </div>
                </li>
              </ul>
            </div>
          </details>

          <details>
            <summary className="rules-toggle">
              <h3>Forklaring per kode</h3>
              <span className="chevron">▸</span>
            </summary>
            <div className="rules-content">
              <ul className="rule-list">
                {[
                  { code: '091', name: 'Ammefri', desc: 'Timer hentes fra eget ammefriark, deles på 7,5 for å omregnes til dager. Summeringsregel 3 + ferieregel.' },
                  { code: '110', name: 'Sykemelding', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '120', name: 'Egenmelding', desc: 'Summeres i arbeidsdager. Summeringsregel 3 + ferieregel.' },
                  { code: '166', name: 'Sykepermisjon m/AAP, m/uførepensjon SPK', desc: 'Summeringsregel 1.' },
                  { code: '167', name: 'Sykepermisjon m/AAP, u/uførepensjon SPK', desc: 'Summeringsregel 1.' },
                  { code: '168', name: 'Sykepermisjon u/AAP, m/uførepensjon SPK', desc: 'Summeringsregel 1.' },
                  { code: '169', name: 'Sykepermisjon u/AAP, u/uførepensjon SPK', desc: 'Summeringsregel 1.' },
                  { code: '170', name: 'Delvis sykemelding', desc: 'Summeringsregel 1 + ferieregel.' },
                  { code: '199', name: 'Lønn ut over trygdeperiode', desc: 'Summeringsregel 1 + ferieregel.' },
                  { code: '325', name: 'Militær repetisjonstjeneste', desc: 'Direkte i arbeidsdager.' },
                  { code: '410', name: 'Foreldrepermisjon 100 %', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '415', name: 'Foreldrepermisjon 80 %', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '420', name: 'Gradert foreldreperm 100 %', desc: 'Summeringsregel 1 + ferieregel.' },
                  { code: '425', name: 'Gradert foreldreperm 80 %', desc: 'Summeringsregel 1 + ferieregel.' },
                  { code: '435', name: 'Omsorgspermisjon u/lønn', desc: 'Summeringsregel 2.' },
                  { code: '440', name: 'Omsorg fødsel 2 uker m/lønn', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '460', name: 'Pleiepenger barn', desc: 'Summeringsregel 2.' },
                  { code: '461', name: 'Opplæringspenger', desc: 'Summeringsregel 2.' },
                  { code: '462', name: 'Pleiepenger nærstående', desc: 'Direkte i kalenderdager.' },
                  { code: '470', name: 'Sykt barn', desc: 'Summeringsregel 3 + ferieregel.' },
                  { code: '490', name: 'Permisjon iht. AML § 10-2', desc: 'Summeringsregel 1.' },
                  { code: '660', name: 'Hovedavtalen § 40', desc: 'Direkte i kalenderdager.' },
                  { code: '670', name: 'Hovedavtalen § 41', desc: 'Direkte i kalenderdager.' },
                ].map((item) => (
                  <li key={item.code} className="rule-item">
                    <h4>
                      <span className="rule-code-tag" style={{ marginRight: 6 }}>{item.code}</span>
                      {item.name}
                    </h4>
                    <p>{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>
      </main>
    </div>
  )
}

export default App

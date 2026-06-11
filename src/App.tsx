import { useMemo, useState } from 'react'
import readXlsxFile, { readSheetNames } from 'read-excel-file/browser'
import './App.css'
import uitLogo from './assets/uit-logo-hvit.png'
import { DateField } from './components/DateField'
import { EmployeeCard } from './components/EmployeeCard'
import { PasteDataModal } from './components/PasteDataModal'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'
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
import { generateEmployeePdfReport } from './lib/pdfReport'

function App() {
  const [report, setReport] = useState<ParsedWorkbook | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [dateOverride, setDateOverride] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false)
  const [calcDetailsOpen, setCalcDetailsOpen] = useState(false)
  const { resolved: resolvedTheme, toggle: toggleTheme } = useTheme()

  const effectiveStartDate = dateOverride ? parseDateInput(dateOverride) : report?.currentEndDate ?? null
  const hasMultipleEmployees = (report?.employees.length ?? 0) > 1

  const selectedEmployee = useMemo(
    () => (hasMultipleEmployees ? null : report?.employees[0] ?? null),
    [hasMultipleEmployees, report],
  )
  const activeEmployeeId = selectedEmployee?.employeeId ?? ''

  const calculation: EmployeeCalculation | null =
    selectedEmployee && effectiveStartDate
      ? calculateEmployeeResult(selectedEmployee.employeeId, selectedEmployee.rows, effectiveStartDate)
      : null

  const totalAppliedDays = calculation
    ? calculation.steps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0)
    : 0
  const vacationAppliedDays =
    calculation?.steps.find((step) => step.code === 'VACATION')?.appliedDaysToAdd ?? 0
  const absenceAppliedDays = totalAppliedDays - vacationAppliedDays
  const hasWarnings = Boolean(calculation?.skippedCodes.length)

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
      const message = error instanceof Error ? error.message : 'Kunne ikke lese Excel-filen.'
      setErrorMessage(message)
      setReport(null)
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  function handlePasteApply(parsed: ParsedWorkbook) {
    setReport(parsed)
    setSelectedFileName('Innlimte rader')
    setDateOverride(parsed.currentEndDate ? toDateInputValue(parsed.currentEndDate) : '')
    setErrorMessage('')
    setIsPasteModalOpen(false)
  }

  function handleClearFile() {
    setReport(null)
    setSelectedFileName('')
    setDateOverride('')
    setErrorMessage('')
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

  function handleShowCalcDetails() {
    setCalcDetailsOpen(true)
    requestAnimationFrame(() => {
      document.getElementById('beregning-details')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const canDownloadReport = Boolean(selectedEmployee && calculation)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <img className="topbar-logo" src={uitLogo} alt="UiT Norges arktiske universitet" />
          <div className="topbar-sep" />
          <div className="topbar-appname">
            PhD Checker
            <small>Fastsettelse av sluttdato</small>
          </div>
        </div>
        <div className="spacer" />
        <div className="topbar-result">
          <div className="topbar-result-label">Ny sluttdato</div>
          <div className="topbar-result-value">
            {calculation ? formatDate(calculation.finalEndDate) : '—'}
          </div>
        </div>
        <ThemeToggle resolved={resolvedTheme} onToggle={toggleTheme} />
      </header>

      {isLoading ? <div className="status-bar loading">Leser arbeidsbok…</div> : null}
      {errorMessage ? <div className="status-bar error">{errorMessage}</div> : null}
      {!effectiveStartDate && report ? (
        <div className="status-bar error">Sett en gyldig nåværende sluttdato for å kjøre beregningen.</div>
      ) : null}
      {hasMultipleEmployees ? (
        <div className="status-bar error">
          Datagrunnlaget inneholder {report?.employees.length} ansatte (
          {report?.employees.map((employee) => employee.employeeId).join(', ')}). Verktøyet støtter kun
          én ansatt om gangen — last inn data for én ansatt.
        </div>
      ) : null}

      <div className="layout">
        <aside className="sidebar">
          {selectedEmployee ? (
            <div className="card result-card">
              <div className="result-card-id-row">
                <span className="result-card-id">{selectedEmployee.employeeId}</span>
                <span className={`pc-status ${hasWarnings ? 'pc-status--warn' : 'pc-status--ok'}`}>
                  {hasWarnings ? 'Ikke-støttede koder' : 'Klar'}
                </span>
              </div>
              <div className="result-card-dates">
                <span className="result-card-old">
                  {calculation ? formatDate(calculation.initialEndDate) : '—'}
                </span>
                <span className="result-card-arrow">→</span>
              </div>
              <div className="result-card-new">
                {calculation ? formatDate(calculation.finalEndDate) : '—'}
              </div>
              <div className="result-card-sub">
                Ny sluttdato · {formatNumber(absenceAppliedDays)} fraværsdager +{' '}
                {formatNumber(vacationAppliedDays)} feriedager
              </div>
              <button
                type="button"
                className="pc-btn pc-btn-primary"
                style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                onClick={handleDownloadReport}
                disabled={!canDownloadReport}
                title={canDownloadReport ? 'Last ned PDF-rapport' : 'Last opp fil og velg sluttdato først'}
              >
                ↓ Last ned PDF-rapport
              </button>
            </div>
          ) : null}

          <div className="card">
            <span className="card-heading">Datagrunnlag</span>
            <div className="data-card-buttons">
              <label className="pc-btn file-trigger" htmlFor="report-upload">
                <span className="file-trigger-icon">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {selectedFileName ? (
                    <span className="filename">{selectedFileName}</span>
                  ) : (
                    <span>Velg .xlsx-fil</span>
                  )}
                </span>
                {selectedFileName ? (
                  <button
                    type="button"
                    className="file-clear"
                    title="Fjern data"
                    aria-label="Fjern data"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      handleClearFile()
                    }}
                  >
                    ✕
                  </button>
                ) : null}
              </label>
              <input id="report-upload" type="file" accept=".xlsx" onChange={handleFileChange} />
              <button
                type="button"
                className="pc-btn pc-btn-ghost"
                onClick={() => setIsPasteModalOpen(true)}
              >
                Lim inn rader
              </button>
            </div>
            <div className="data-card-divider" />
            <div className="data-card-fields">
              <span className="pc-field">
                <label>Sluttdato</label>
                <DateField value={dateOverride} onChange={setDateOverride} />
              </span>
              <span className="pc-field">
                <label>Ansatt</label>
                <b>{activeEmployeeId || '—'}</b>
              </span>
            </div>
          </div>

          {calculation?.steps.length ? (
            <div className="card">
              <div className="steps-card-head">
                <span className="card-heading">Beregning · {calculation.steps.length} steg</span>
                <div className="spacer" />
                <button type="button" className="pc-link" onClick={handleShowCalcDetails}>
                  Vis detaljer
                </button>
              </div>
              <div>
                <div className="step-row step-start">
                  <div className="step-marker">
                    <span className="step-dot" />
                    <span className="step-line" />
                  </div>
                  <div className="step-label">Start</div>
                  <div className="step-date">{formatDate(calculation.initialEndDate)}</div>
                </div>
                {calculation.steps.map((step, index) => (
                  <div className="step-row" key={step.id}>
                    <div className="step-marker">
                      <span className="step-dot" />
                      {index < calculation.steps.length - 1 ? <span className="step-line" /> : null}
                    </div>
                    <div className="step-label">
                      {step.label}{' '}
                      <span className="step-added">+{formatNumber(step.appliedDaysToAdd)} d</span>
                    </div>
                    <div className="step-date">{formatDate(step.nextEndDate)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <main className="main">
          {selectedEmployee ? (
            <EmployeeCard
              employeeReport={selectedEmployee}
              calculation={calculation ?? undefined}
              skippedRows={report?.skippedRows}
              calcDetailsOpen={calcDetailsOpen}
              onCalcDetailsToggle={setCalcDetailsOpen}
            />
          ) : (
            <div className="card empty-state">
              <div className="empty-icon">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <polyline points="9 15 12 12 15 15" />
                </svg>
              </div>
              <h2>Last opp en arbeidsbok eller lim inn rader</h2>
              <p>Beregningsresultater, kodegrupperinger og forlengelsessteg vises her.</p>
            </div>
          )}

          {!selectedEmployee && report?.skippedRows.length ? (
            <details className="pc-cat warning-panel">
              <summary className="pc-cat-head">
                <span className="pc-caret" />
                <h3>{report.skippedRows.length} hoppet over rader</h3>
              </summary>
              <ul>
                {report.skippedRows.map((row) => (
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

          <div className="pc-section-title">Regler</div>
          <details className="pc-cat">
            <summary className="pc-cat-head">
              <span className="pc-caret" />
              <h3>Regelkategorier</h3>
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
                  <h4>Frittstående regel</h4>
                  <p>
                    Alle rader summeres separat. Summen legges til i kalenderdager.
                    Desimaldel ≥ 0,5 rundes opp, ellers ned. Inngår ikke i ferieregel
                    eller summeringsregel 1, 2 eller 3.
                  </p>
                  <div className="rule-codes">
                    <span className="rule-code-tag">100</span>
                  </div>
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
                  <h4>Summering 1</h4>
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
                  <h4>Summering 2</h4>
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
                  <h4>Summering 3</h4>
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

          <details className="pc-cat">
            <summary className="pc-cat-head">
              <span className="pc-caret" />
              <h3>Forklaring per kode</h3>
            </summary>
            <div className="rules-content">
              <ul className="rule-list">
                {[
                  { code: '091', name: 'Ammefri', desc: 'Timer hentes fra eget ammefriark, deles på 7,5 for å omregnes til dager. Summering 3 + ferieregel.' },
                  { code: '100', name: 'Intern permisjon', desc: 'Frittstående regel i kalenderdager. Rundes samlet til nærmeste hele dag med 0,5 opp. Ingen ferieregel.' },
                  { code: '110', name: 'Sykemelding', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '120', name: 'Egenmelding', desc: 'Summeres i arbeidsdager. Summering 3 + ferieregel.' },
                  { code: '166', name: 'Sykepermisjon m/AAP, m/uførepensjon SPK', desc: 'Summering 1.' },
                  { code: '167', name: 'Sykepermisjon m/AAP, u/uførepensjon SPK', desc: 'Summering 1.' },
                  { code: '168', name: 'Sykepermisjon u/AAP, m/uførepensjon SPK', desc: 'Summering 1.' },
                  { code: '169', name: 'Sykepermisjon u/AAP, u/uførepensjon SPK', desc: 'Summering 1.' },
                  { code: '170', name: 'Delvis sykemelding', desc: 'Summering 1 + ferieregel.' },
                  { code: '199', name: 'Lønn ut over trygdeperiode', desc: 'Summering 1 + ferieregel.' },
                  { code: '325', name: 'Militær repetisjonstjeneste', desc: 'Direkte i arbeidsdager.' },
                  { code: '410', name: 'Foreldrepermisjon 100 %', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '415', name: 'Foreldrepermisjon 80 %', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '420', name: 'Gradert foreldreperm 100 %', desc: 'Summering 1 + ferieregel.' },
                  { code: '425', name: 'Gradert foreldreperm 80 %', desc: 'Summering 1 + ferieregel.' },
                  { code: '435', name: 'Omsorgspermisjon u/lønn', desc: 'Summering 2.' },
                  { code: '440', name: 'Omsorg fødsel 2 uker m/lønn', desc: 'Direkte i kalenderdager. Ferieregel.' },
                  { code: '460', name: 'Pleiepenger barn', desc: 'Summering 2.' },
                  { code: '461', name: 'Opplæringspenger', desc: 'Summering 2.' },
                  { code: '462', name: 'Pleiepenger nærstående', desc: 'Direkte i kalenderdager.' },
                  { code: '470', name: 'Sykt barn', desc: 'Summering 3 + ferieregel.' },
                  { code: '490', name: 'Permisjon iht. AML § 10-2', desc: 'Summering 1.' },
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
        </main>
      </div>

      <PasteDataModal
        open={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onApply={handlePasteApply}
      />
    </div>
  )
}

export default App

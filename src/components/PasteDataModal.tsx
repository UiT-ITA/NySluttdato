import { useEffect, useMemo, useState } from 'react'
import {
  formatDate,
  formatNumber,
  parseWorkbook,
  type ParsedWorkbook,
} from '../lib/phdCalculator'
import { prepareBreastfeedingGrid, prepareLeaveGrid, textToGrid } from '../lib/pasteParser'

interface PasteDataModalProps {
  open: boolean
  onClose: () => void
  onApply: (parsed: ParsedWorkbook) => void
}

export function PasteDataModal({ open, onClose, onApply }: PasteDataModalProps) {
  const [leaveText, setLeaveText] = useState('')
  const [ammefriText, setAmmefriText] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const preview = useMemo(() => {
    if (!leaveText.trim() && !ammefriText.trim()) {
      return null
    }

    const breastfeedingGrid = prepareBreastfeedingGrid(textToGrid(ammefriText))
    return parseWorkbook({
      leaveRows: prepareLeaveGrid(textToGrid(leaveText)),
      breastfeedingRows: breastfeedingGrid.length > 0 ? breastfeedingGrid : undefined,
    })
  }, [leaveText, ammefriText])

  if (!open) {
    return null
  }

  const previewRows = preview?.employees.flatMap((employee) => employee.rows) ?? []
  const canApply = previewRows.length > 0

  function handleApply() {
    if (preview && canApply) {
      onApply(preview)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="paste-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="paste-modal-title">Lim inn rader</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Lukk">
            ×
          </button>
        </header>

        <div className="modal-body">
          <p className="modal-hint">
            Kopier radene fra Excel og lim dem inn under – med eller uten overskriftsrad.
            Kolonnene må stå i samme rekkefølge som i arbeidsboken.
          </p>

          <label className="paste-field">
            <span className="paste-field-label">Fravær (Leave-arket)</span>
            <textarea
              value={leaveText}
              onChange={(event) => setLeaveText(event.target.value)}
              placeholder={'Lim inn rader fra Leave-arket…\nAnsattnr\tFra dato\tTil dato\tKode\tBeskrivelse\t%arbFør2001\tDeltids-%0007'}
              rows={7}
              autoFocus
              spellCheck={false}
            />
          </label>

          <label className="paste-field">
            <span className="paste-field-label">Ammefri (valgfritt)</span>
            <textarea
              value={ammefriText}
              onChange={(event) => setAmmefriText(event.target.value)}
              placeholder={'Lim inn rader fra Ammefri-arket…\nAnsattnr\tFra dato\tTil dato\tKode\tBeskrivelse\tTimer'}
              rows={4}
              spellCheck={false}
            />
          </label>

          {preview ? (
            <div className="paste-preview">
              <div className="paste-stats">
                <span>
                  <strong>{preview.employees.length}</strong> ansatte
                </span>
                <span>
                  <strong>{previewRows.length}</strong> rader
                </span>
                {preview.skippedRows.length > 0 ? (
                  <span className="warn">
                    <strong>{preview.skippedRows.length}</strong> hoppet over
                  </span>
                ) : null}
                <span>
                  Sluttdato:{' '}
                  <strong>{preview.currentEndDate ? formatDate(preview.currentEndDate) : 'ikke funnet'}</strong>
                </span>
              </div>

              {previewRows.length > 0 ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rad</th>
                        <th>Ansatt</th>
                        <th>Fra</th>
                        <th>Til</th>
                        <th>Kode</th>
                        <th>Beskrivelse</th>
                        <th>%arb</th>
                        <th>Deltids-%</th>
                        <th>Timer</th>
                        <th>Ark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row) => (
                        <tr key={`${row.sourceSheet}-${row.sourceRowNumber}`}>
                          <td>{row.sourceRowNumber}</td>
                          <td>{row.employeeId}</td>
                          <td>{formatDate(row.startDate)}</td>
                          <td>{formatDate(row.endDate)}</td>
                          <td className="cell-code">{row.code}</td>
                          <td>{row.description || '—'}</td>
                          <td>{row.workPercent != null ? formatNumber(row.workPercent) : '—'}</td>
                          <td>{row.partTimePercent != null ? formatNumber(row.partTimePercent) : '—'}</td>
                          <td>{row.hours != null ? formatNumber(row.hours) : '—'}</td>
                          <td>{row.sourceSheet}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="paste-empty">Ingen gyldige rader funnet i innlimt tekst.</p>
              )}

              {preview.skippedRows.length > 0 ? (
                <div className="paste-skipped">
                  <strong>{preview.skippedRows.length} rader hoppes over</strong>
                  <ul>
                    {preview.skippedRows.map((row) => (
                      <li key={`${row.rowNumber}-${row.reason}`}>
                        Rad {row.rowNumber}: {row.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <footer className="modal-footer">
          <button type="button" className="modal-button" onClick={onClose}>
            Avbryt
          </button>
          <button
            type="button"
            className="modal-button primary"
            onClick={handleApply}
            disabled={!canApply}
            title={canApply ? undefined : 'Lim inn minst én gyldig rad først'}
          >
            Bruk data
          </button>
        </footer>
      </div>
    </div>
  )
}

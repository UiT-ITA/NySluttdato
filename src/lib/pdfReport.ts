import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { getAbsenceRule } from './rules'
import {
  getCodeDisplayConfig,
  getCodeDisplayType,
  getCodeGroupColumnHeader,
  type CodeGroupColumn,
} from './codeGroupDisplay'
import {
  formatDate,
  formatNumber,
  formatPreciseNumber,
  previewRowCalculation,
  type EmployeeCalculation,
  type ParsedAbsenceRow,
  type ParsedWorkbook,
} from './phdCalculator'

type EmployeeReport = ParsedWorkbook['employees'][number]

export interface GeneratePdfReportOptions {
  employeeReport: EmployeeReport
  calculation: EmployeeCalculation
  sourceFileName?: string
  skippedRows?: ParsedWorkbook['skippedRows']
}

const PAGE_MARGIN_X = 14
const PAGE_MARGIN_Y = 16
const APP_NAME = 'PhDChecker'
const COLOR_ACCENT: [number, number, number] = [91, 156, 245]
const COLOR_TEXT: [number, number, number] = [30, 32, 36]
const COLOR_MUTED: [number, number, number] = [110, 114, 124]
const COLOR_WARNING: [number, number, number] = [175, 130, 30]
const COLOR_HEADER_BG: [number, number, number] = [240, 243, 248]
const COLOR_BORDER: [number, number, number] = [210, 215, 222]

/**
 * jsPDF's default Helvetica uses WinAnsi (CP1252) encoding. Any character
 * outside that range renders as garbage and disrupts glyph spacing. This
 * maps the most common Unicode characters we might emit to safe equivalents.
 */
const WINANSI_REPLACEMENTS: Record<string, string> = {
  '\u2265': '>=', // ≥
  '\u2264': '<=', // ≤
  '\u2260': '!=', // ≠
  '\u00B1': '+/-', // ±
  '\u00D7': 'x', // ×
  '\u00F7': '/', // ÷
  '\u2212': '-', // −
  '\u2013': '-', // –
  '\u2014': '-', // —
  '\u2022': '*', // •
  '\u2026': '...', // …
  '\u2192': '->', // →
  '\u2190': '<-', // ←
  '\u21D2': '=>', // ⇒
  '\u21D0': '<=', // ⇐
  '\u00A0': ' ', // nbsp
}

function sanitizeForWinAnsi(text: string): string {
  return text.replace(/[\u00A0\u2013\u2014\u2022\u2026\u2190\u2192\u21D0\u21D2\u2212\u2260\u2264\u2265]/g, (match) => {
    return WINANSI_REPLACEMENTS[match] ?? match
  })
}

interface PdfBuilder {
  doc: jsPDF
  cursorY: number
  pageWidth: number
  pageHeight: number
  contentWidth: number
}

function createBuilder(): PdfBuilder {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  })

  // Wrap doc.text so all rendered text is safe for the default WinAnsi encoding.
  const originalText = doc.text.bind(doc)
  doc.text = ((...args: unknown[]) => {
    if (typeof args[0] === 'string') {
      args[0] = sanitizeForWinAnsi(args[0])
    } else if (Array.isArray(args[0])) {
      args[0] = (args[0] as string[]).map((line) =>
        typeof line === 'string' ? sanitizeForWinAnsi(line) : line,
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalText as any)(...args)
  }) as typeof doc.text

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  return {
    doc,
    cursorY: PAGE_MARGIN_Y,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - PAGE_MARGIN_X * 2,
  }
}

function sanitizeCells(cells: string[][]): string[][] {
  return cells.map((row) => row.map((cell) => sanitizeForWinAnsi(String(cell))))
}

function ensureSpace(builder: PdfBuilder, requiredHeight: number): void {
  if (builder.cursorY + requiredHeight <= builder.pageHeight - PAGE_MARGIN_Y) {
    return
  }

  builder.doc.addPage()
  builder.cursorY = PAGE_MARGIN_Y
}

function drawSectionHeading(builder: PdfBuilder, text: string): void {
  ensureSpace(builder, 12)
  const { doc } = builder
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLOR_TEXT)
  doc.text(text, PAGE_MARGIN_X, builder.cursorY)
  builder.cursorY += 2
  doc.setDrawColor(...COLOR_ACCENT)
  doc.setLineWidth(0.4)
  doc.line(PAGE_MARGIN_X, builder.cursorY, PAGE_MARGIN_X + 28, builder.cursorY)
  builder.cursorY += 5
}

function drawHeader(
  builder: PdfBuilder,
  employeeId: string,
  calculation: EmployeeCalculation,
  sourceFileName?: string,
): void {
  const { doc } = builder

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...COLOR_TEXT)
  doc.text(`Beregningsrapport for stipendiater og postdoktorer`, PAGE_MARGIN_X, builder.cursorY)
  builder.cursorY += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_MUTED)
  const timestamp = new Date().toLocaleString('no-NO', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
  const metaLineLeft = `Generert: ${timestamp}`
  const metaLineRight = sourceFileName ? `Kilde: ${sourceFileName}` : ''
  doc.text(metaLineLeft, PAGE_MARGIN_X, builder.cursorY)
  if (metaLineRight) {
    doc.text(metaLineRight, builder.pageWidth - PAGE_MARGIN_X, builder.cursorY, { align: 'right' })
  }
  builder.cursorY += 6

  // Hero box with final end date
  const boxHeight = 20
  ensureSpace(builder, boxHeight + 4)
  doc.setFillColor(245, 249, 255)
  doc.setDrawColor(...COLOR_ACCENT)
  doc.setLineWidth(0.3)
  doc.roundedRect(PAGE_MARGIN_X, builder.cursorY, builder.contentWidth, boxHeight, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR_ACCENT)
  doc.text('ANSATT', PAGE_MARGIN_X + 5, builder.cursorY + 6)
  doc.text('OPPRINNELIG SLUTTDATO', PAGE_MARGIN_X + 55, builder.cursorY + 6)
  doc.text('NY SLUTTDATO', builder.pageWidth - PAGE_MARGIN_X - 5, builder.cursorY + 6, {
    align: 'right',
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...COLOR_TEXT)
  doc.text(employeeId, PAGE_MARGIN_X + 5, builder.cursorY + 14)
  doc.text(formatDate(calculation.initialEndDate), PAGE_MARGIN_X + 55, builder.cursorY + 14)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...COLOR_ACCENT)
  doc.text(formatDate(calculation.finalEndDate), builder.pageWidth - PAGE_MARGIN_X - 5, builder.cursorY + 14, {
    align: 'right',
  })

  builder.cursorY += boxHeight + 6
}

function drawMetaGrid(builder: PdfBuilder, calculation: EmployeeCalculation): void {
  const totalAppliedDays = calculation.steps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0)
  const cells: Array<{ label: string; value: string }> = [
    { label: 'Regelsteg', value: String(calculation.steps.length) },
    { label: 'Behandlede rader', value: String(calculation.processedRows) },
    { label: 'Sum dager lagt til', value: formatNumber(totalAppliedDays) },
    { label: 'Feriegrunnlag', value: `${formatNumber(calculation.vacationBaseDays)} d` },
    { label: 'Feriedager', value: `${formatNumber(calculation.vacationDays)} d` },
    {
      label: 'Ikke-støttede koder',
      value: calculation.skippedCodes.length ? calculation.skippedCodes.join(', ') : '—',
    },
  ]

  const columns = 3
  const rows = Math.ceil(cells.length / columns)
  const cellWidth = builder.contentWidth / columns
  const cellHeight = 12
  const totalHeight = rows * cellHeight

  ensureSpace(builder, totalHeight + 4)

  const { doc } = builder

  for (let index = 0; index < cells.length; index += 1) {
    const row = Math.floor(index / columns)
    const col = index % columns
    const x = PAGE_MARGIN_X + col * cellWidth
    const y = builder.cursorY + row * cellHeight

    doc.setDrawColor(...COLOR_BORDER)
    doc.setLineWidth(0.1)
    doc.rect(x, y, cellWidth, cellHeight)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(cells[index].label.toUpperCase(), x + 3, y + 4)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...COLOR_TEXT)
    doc.text(cells[index].value, x + 3, y + 9)
  }

  builder.cursorY += totalHeight + 6
}

function drawWarnings(
  builder: PdfBuilder,
  skippedRows: ParsedWorkbook['skippedRows'] | undefined,
  skippedCodes: string[],
): void {
  if ((!skippedRows || skippedRows.length === 0) && skippedCodes.length === 0) {
    return
  }

  drawSectionHeading(builder, 'Advarsler')

  const { doc } = builder
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLOR_WARNING)

  if (skippedCodes.length) {
    const line = `Ikke-støttede fraværskoder hoppet over: ${skippedCodes.join(', ')}`
    const lines = doc.splitTextToSize(line, builder.contentWidth) as string[]
    ensureSpace(builder, lines.length * 4.5 + 2)
    doc.text(lines, PAGE_MARGIN_X, builder.cursorY)
    builder.cursorY += lines.length * 4.5 + 2
  }

  if (skippedRows?.length) {
    ensureSpace(builder, 6)
    doc.text(`${skippedRows.length} hoppet over rader fra arbeidsboken:`, PAGE_MARGIN_X, builder.cursorY)
    builder.cursorY += 4.5
    doc.setTextColor(...COLOR_TEXT)
    doc.setFontSize(8.5)
    for (const skipped of skippedRows) {
      const text = `• Rad ${skipped.rowNumber}${skipped.code ? ` (kode ${skipped.code})` : ''}: ${skipped.reason}`
      const lines = doc.splitTextToSize(text, builder.contentWidth - 2) as string[]
      ensureSpace(builder, lines.length * 4)
      doc.text(lines, PAGE_MARGIN_X + 2, builder.cursorY)
      builder.cursorY += lines.length * 4
    }
    builder.cursorY += 2
  }

  builder.cursorY += 2
}

function formatCellValue(
  column: CodeGroupColumn,
  row: ParsedAbsenceRow,
  preview: ReturnType<typeof previewRowCalculation>,
): string {
  switch (column) {
    case 'row':
      return String(row.sourceRowNumber)
    case 'from':
      return formatDate(row.startDate)
    case 'to':
      return formatDate(row.endDate)
    case 'workPercent':
      return typeof row.workPercent === 'number' ? `${formatNumber(row.workPercent)}%` : '—'
    case 'partTimePercent':
      return typeof row.partTimePercent === 'number' ? `${formatNumber(row.partTimePercent)}%` : '—'
    case 'baseDays':
      return preview ? formatPreciseNumber(preview.baseDays) : '—'
    case 'absenceFraction':
      return preview ? formatPreciseNumber(preview.absenceFraction) : '—'
    case 'calculatedDays':
      return preview ? formatPreciseNumber(preview.rawDaysToAdd) : '—'
    case 'hours':
      return typeof row.hours === 'number' ? `${formatPreciseNumber(row.hours)} t` : '—'
  }
}

function drawCodeGroup(builder: PdfBuilder, code: string, rows: ParsedAbsenceRow[]): void {
  if (!rows.length) {
    return
  }

  const rule = getAbsenceRule(code)
  const firstPreview = previewRowCalculation(rows[0])
  const displayType = getCodeDisplayType(code, rule?.countingBasis ?? 'days')
  const displayConfig = getCodeDisplayConfig(displayType)
  const ruleLabel = firstPreview?.ruleLabel ?? rows[0].description ?? 'Ingen regel funnet'
  const totalContribution = rows.reduce((sum, row) => {
    const preview = previewRowCalculation(row)
    return sum + (preview?.rawDaysToAdd ?? 0)
  }, 0)

  ensureSpace(builder, 24)
  const { doc } = builder

  // Subsection heading: code tag + label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLOR_ACCENT)
  doc.text(`Kode ${code}`, PAGE_MARGIN_X, builder.cursorY)
  doc.setTextColor(...COLOR_TEXT)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const labelX = PAGE_MARGIN_X + doc.getTextWidth(`Kode ${code}`) + 3
  const labelLines = doc.splitTextToSize(ruleLabel, builder.contentWidth - (labelX - PAGE_MARGIN_X)) as string[]
  doc.text(labelLines[0] ?? '', labelX, builder.cursorY)
  builder.cursorY += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR_MUTED)
  const statParts = [
    `${rows.length} rader`,
    `${displayConfig.headerTotalLabel}: ${formatPreciseNumber(totalContribution)} d`,
  ]
  if (displayConfig.groupedByLabel) {
    statParts.push(displayConfig.groupedByLabel)
  }
  doc.text(statParts.join('   •   '), PAGE_MARGIN_X, builder.cursorY)
  builder.cursorY += 3

  const head = sanitizeCells([displayConfig.tableColumns.map((column) => getCodeGroupColumnHeader(column))])
  const body = sanitizeCells(
    rows.map((row) => {
      const preview = previewRowCalculation(row)
      return displayConfig.tableColumns.map((column) => formatCellValue(column, row, preview))
    }),
  )

  autoTable(doc, {
    head,
    body,
    startY: builder.cursorY,
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 1.6, right: 2, bottom: 1.6, left: 2 },
      textColor: COLOR_TEXT,
      lineColor: COLOR_BORDER,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLOR_HEADER_BG,
      textColor: COLOR_MUTED,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [250, 251, 253],
    },
    theme: 'grid',
  })

  const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  builder.cursorY = (lastAutoTable?.finalY ?? builder.cursorY) + 6
}

function getStepTypeText(step: EmployeeCalculation['steps'][number]): string {
  if (step.code === 'VACATION') {
    return 'Ferie'
  }

  if (step.code.startsWith('SUM-')) {
    return 'Summering'
  }

  return step.additionMode === 'working' ? 'Direkte (arb.)' : 'Direkte (kal.)'
}

function getStepBasisText(step: EmployeeCalculation['steps'][number]): string {
  if (step.code === 'VACATION') {
    return `${formatPreciseNumber(step.baseDays)} d`
  }

  if (step.groupedSources?.length) {
    return `${step.groupedSources.length} rader`
  }

  if (step.sourceRows.length === 1) {
    return `${step.sourceSheet ? `${step.sourceSheet} ` : ''}r${step.sourceRows[0]}`
  }

  if (step.sourceRows.length > 1) {
    return `${step.sourceRows.length} rader`
  }

  return 'Beregnet'
}

function drawCalculationSteps(builder: PdfBuilder, calculation: EmployeeCalculation): void {
  if (!calculation.steps.length) {
    return
  }

  drawSectionHeading(builder, 'Beregningssteg')

  const totalApplied = calculation.steps.reduce((sum, step) => sum + step.appliedDaysToAdd, 0)

  const head = sanitizeCells([
    ['Steg', 'Type', 'Grunnlag', 'Rått bidrag', 'Lagt til', 'Feriegrunnlag', 'Sluttdato'],
  ])
  const body = sanitizeCells(
    calculation.steps.map((step) => [
      step.label,
      getStepTypeText(step),
      getStepBasisText(step),
      `${formatPreciseNumber(step.rawDaysToAdd)} d`,
      `${formatNumber(step.appliedDaysToAdd)} d`,
      step.code === 'VACATION' ? '-' : `${formatPreciseNumber(step.vacationBaseDays ?? 0)} d`,
      formatDate(step.nextEndDate),
    ]),
  )

  const foot = sanitizeCells([
    [
      'Totalt',
      '',
      '',
      '',
      `${formatNumber(totalApplied)} d`,
      '',
      formatDate(calculation.finalEndDate),
    ],
  ])

  autoTable(builder.doc, {
    head,
    body,
    foot,
    startY: builder.cursorY,
    margin: { left: PAGE_MARGIN_X, right: PAGE_MARGIN_X },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
      textColor: COLOR_TEXT,
      lineColor: COLOR_BORDER,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: COLOR_HEADER_BG,
      textColor: COLOR_MUTED,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [245, 249, 255],
      textColor: COLOR_ACCENT,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [250, 251, 253],
    },
    theme: 'grid',
  })

  const lastAutoTable = (builder.doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
  builder.cursorY = (lastAutoTable?.finalY ?? builder.cursorY) + 6
}

function drawPageFooters(builder: PdfBuilder): void {
  const { doc } = builder
  const pageCount = doc.getNumberOfPages()

  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    doc.setPage(pageIndex)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLOR_MUTED)
    doc.text(APP_NAME, PAGE_MARGIN_X, builder.pageHeight - 8)
    doc.text(
      `Side ${pageIndex} / ${pageCount}`,
      builder.pageWidth - PAGE_MARGIN_X,
      builder.pageHeight - 8,
      { align: 'right' },
    )
  }
}

function buildFileName(employeeId: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const safeEmployeeId = employeeId.replace(/[^\w.-]+/g, '_') || 'ansatt'
  return `phdchecker_${safeEmployeeId}_${year}-${month}-${day}.pdf`
}

export function generateEmployeePdfReport(options: GeneratePdfReportOptions): void {
  const { employeeReport, calculation, sourceFileName, skippedRows } = options
  const builder = createBuilder()

  drawHeader(builder, employeeReport.employeeId, calculation, sourceFileName)
  drawMetaGrid(builder, calculation)
  drawWarnings(builder, skippedRows, calculation.skippedCodes)

  // Per-code tables
  const rowsByCode = new Map<string, ParsedAbsenceRow[]>()
  for (const row of employeeReport.rows) {
    const existing = rowsByCode.get(row.code)
    if (existing) {
      existing.push(row)
    } else {
      rowsByCode.set(row.code, [row])
    }
  }

  if (rowsByCode.size > 0) {
    drawSectionHeading(builder, 'Per kode')
    for (const [code, rows] of rowsByCode.entries()) {
      drawCodeGroup(builder, code, rows)
    }
  }

  drawCalculationSteps(builder, calculation)
  drawPageFooters(builder)

  builder.doc.save(buildFileName(employeeReport.employeeId))
}

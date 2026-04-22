import {
  SUMMATION_RULES,
  VACATION_RULE,
  getAbsenceRule,
  type AbsenceCodeRule,
  type AdditionMode,
  type CountingBasis,
  type RoundingMode,
  type SummationRule,
} from './rules'

type SpreadsheetCell = string | number | boolean | Date | typeof Date | null

export interface ParsedAbsenceRow {
  employeeId: string
  startDate: Date
  endDate: Date
  code: string
  description: string
  workPercent: number | null
  partTimePercent: number | null
  extraPercent: number | null
  hours: number | null
  sourceRowNumber: number
  sourceSheet: string
}

export interface WorkbookSheetRows {
  leaveRows: SpreadsheetCell[][]
  breastfeedingRows?: SpreadsheetCell[][]
}

export interface ParsedWorkbook {
  currentEndDate: Date | null
  employees: Array<{
    employeeId: string
    rows: ParsedAbsenceRow[]
  }>
  skippedRows: Array<{
    rowNumber: number
    reason: string
    code?: string
  }>
}

export interface CalculationStep {
  id: string
  label: string
  code: string
  sourceRows: number[]
  sourceSheet?: string
  startDate?: Date
  endDate?: Date
  workPercent?: number | null
  partTimePercent?: number | null
  extraPercent?: number | null
  hours?: number | null
  groupedSources?: ParsedAbsenceRow[]
  additionMode: AdditionMode | 'vacation'
  baseDays: number
  absenceFraction: number
  rawDaysToAdd: number
  appliedDaysToAdd: number
  previousEndDate: Date
  nextEndDate: Date
  vacationBaseDays?: number
  notes: string[]
}

export interface CodeCalculationSummary {
  code: string
  rawDays: number
  displayedDays: number
  vacationBaseDays: number
  sourceRows: number[]
  hasDirectEffect: boolean
  hasRowLevelRounding: boolean
  vacationEligible: boolean
}

export interface EmployeeCalculation {
  employeeId: string
  initialEndDate: Date
  finalEndDate: Date
  processedRows: number
  vacationBaseDays: number
  vacationDays: number
  steps: CalculationStep[]
  skippedCodes: string[]
  codeSummaries: Record<string, CodeCalculationSummary>
}

export interface RowCalculationPreview {
  ruleLabel: string
  summationRule: SummationRule | null
  additionMode: AdditionMode
  baseDays: number
  absenceFraction: number
  rawDaysToAdd: number
  roundedDaysToAdd: number
  vacationEligible: boolean
}

interface RowContribution {
  row: ParsedAbsenceRow
  rule: AbsenceCodeRule
  baseDays: number
  absenceFraction: number
  rawDaysToAdd: number
}

function createEmptyCodeSummary(code: string): CodeCalculationSummary {
  const rule = getAbsenceRule(code)

  return {
    code,
    rawDays: 0,
    displayedDays: 0,
    vacationBaseDays: 0,
    sourceRows: [],
    hasDirectEffect: rule?.summationRule == null,
    hasRowLevelRounding: false,
    vacationEligible: rule?.vacationEligible ?? false,
  }
}

export function parseWorkbook({
  leaveRows,
  breastfeedingRows,
}: WorkbookSheetRows): ParsedWorkbook {
  const currentEndDate = extractCurrentEndDate(leaveRows[0]?.[0])
  const leaveDataStartRow = getLeaveDataStartRow(leaveRows)
  const employeeMap = new Map<string, ParsedAbsenceRow[]>()
  const skippedRows: ParsedWorkbook['skippedRows'] = []

  leaveRows.slice(leaveDataStartRow - 1).forEach((row, index) => {
    const rowNumber = index + leaveDataStartRow

    if (isEmptyRow(row)) {
      return
    }

    const employeeId = toCleanString(row[0])
    const startDate = toDate(row[1])
    const endDate = toDate(row[2])
    const code = normalizeCode(row[3])
    const description = toCleanString(row[4])

    if (!employeeId || !startDate || !endDate || !code) {
      skippedRows.push({
        rowNumber,
        reason: 'Mangler ansatt-, kode- eller datoverdier.',
        code: code || undefined,
      })
      return
    }

    const parsedRow: ParsedAbsenceRow = {
      employeeId,
      startDate,
      endDate,
      code,
      description,
      workPercent: toNumber(row[5]),
      partTimePercent: toNumber(row[6]),
      extraPercent: toNumber(row[7]),
      hours: null,
      sourceRowNumber: rowNumber,
      sourceSheet: 'Leave',
    }

    addEmployeeRow(employeeMap, parsedRow)
  })

  if (breastfeedingRows) {
    breastfeedingRows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2

      if (isEmptyRow(row)) {
        return
      }

      const employeeId = toCleanString(row[0])
      const startDate = toDate(row[1])
      const endDate = toDate(row[2])
      const code = normalizeCode(row[3])
      const description = toCleanString(row[4])
      const hours = toNumber(row[5])

      if (!employeeId || !startDate || !endDate || !code || hours == null) {
        skippedRows.push({
          rowNumber,
          reason: 'Mangler ansatt-, kode-, dato- eller timeverdier i Ammefri-arket.',
          code: code || undefined,
        })
        return
      }

      const parsedRow: ParsedAbsenceRow = {
        employeeId,
        startDate,
        endDate,
        code,
        description,
        workPercent: null,
        partTimePercent: toNumber(row[6]),
        extraPercent: toNumber(row[7]),
        hours,
        sourceRowNumber: rowNumber,
        sourceSheet: 'Ammefri',
      }

      addEmployeeRow(employeeMap, parsedRow)
    })
  }

  const employees = Array.from(employeeMap.entries())
    .map(([employeeId, employeeRows]) => ({
      employeeId,
      rows: employeeRows.sort(compareRows),
    }))
    .sort((left, right) => left.employeeId.localeCompare(right.employeeId))

  return {
    currentEndDate,
    employees,
    skippedRows,
  }
}

export function calculateEmployeeResult(
  employeeId: string,
  rows: ParsedAbsenceRow[],
  initialEndDate: Date,
): EmployeeCalculation {
  let currentEndDate = atUtcMidnight(initialEndDate)
  let vacationBaseDays = 0
  const steps: CalculationStep[] = []
  const skippedCodes = new Set<string>()
  const directRows: RowContribution[] = []
  const summationRows = new Map<SummationRule, RowContribution[]>()
  const codeSummaries = new Map<string, CodeCalculationSummary>()

  for (const row of rows) {
    const rule = getAbsenceRule(row.code)

    if (!rule) {
      skippedCodes.add(row.code)
      continue
    }

    const contribution = createRowContribution(row, rule)

    if (rule.summationRule) {
      const existingRows = summationRows.get(rule.summationRule) ?? []
      existingRows.push(contribution)
      summationRows.set(rule.summationRule, existingRows)
      continue
    }

    directRows.push(contribution)
  }

  for (const contribution of directRows) {
    const step = createDirectStep(contribution, currentEndDate)
    currentEndDate = step.nextEndDate
    steps.push(step)

    const existingSummary = codeSummaries.get(contribution.row.code) ?? createEmptyCodeSummary(contribution.row.code)
    existingSummary.rawDays += contribution.rawDaysToAdd
    existingSummary.displayedDays += step.appliedDaysToAdd
    existingSummary.vacationBaseDays += step.vacationBaseDays ?? 0
    existingSummary.sourceRows.push(contribution.row.sourceRowNumber)
    codeSummaries.set(contribution.row.code, existingSummary)

    if (contribution.rule.vacationEligible) {
      vacationBaseDays += step.appliedDaysToAdd
    }
  }

  for (const ruleNumber of [1, 2] as const) {
    const aggregateRows = summationRows.get(ruleNumber)
    if (!aggregateRows?.length) {
      continue
    }

    const rowsByCode = new Map<string, RowContribution[]>()
    for (const contribution of aggregateRows) {
      const existingRows = rowsByCode.get(contribution.row.code) ?? []
      existingRows.push(contribution)
      rowsByCode.set(contribution.row.code, existingRows)
    }

    for (const [code, codeRows] of rowsByCode.entries()) {
      const rawDays = codeRows.reduce((sum, contribution) => sum + contribution.rawDaysToAdd, 0)
      const { appliedDaysToAdd } = normalizeDaysToAdd(rawDays, SUMMATION_RULES[ruleNumber].roundingMode)
      const vacationBase = codeRows.reduce(
        (sum, contribution) => sum + getVacationBaseForContribution(contribution),
        0,
      )
      const existingSummary = codeSummaries.get(code) ?? createEmptyCodeSummary(code)
      existingSummary.rawDays += rawDays
      existingSummary.displayedDays += appliedDaysToAdd
      existingSummary.hasRowLevelRounding = true
      existingSummary.vacationBaseDays += vacationBase
      existingSummary.sourceRows.push(...codeRows.map((contribution) => contribution.row.sourceRowNumber))
      codeSummaries.set(code, existingSummary)
    }

    const step = createSummationStep(ruleNumber, aggregateRows, currentEndDate)
    currentEndDate = step.nextEndDate
    steps.push(step)
    vacationBaseDays += step.vacationBaseDays ?? 0
  }

  const ruleThreeRows = summationRows.get(3)
  if (ruleThreeRows?.length) {
    const rowsByCode = new Map<string, RowContribution[]>()
    for (const contribution of ruleThreeRows) {
      const existingRows = rowsByCode.get(contribution.row.code) ?? []
      existingRows.push(contribution)
      rowsByCode.set(contribution.row.code, existingRows)
    }

    const step = createSummationStep(3, ruleThreeRows, currentEndDate)

    for (const [code, codeRows] of rowsByCode.entries()) {
      const rawDays = codeRows.reduce((sum, contribution) => sum + contribution.rawDaysToAdd, 0)
      const existingSummary = codeSummaries.get(code) ?? createEmptyCodeSummary(code)
      existingSummary.rawDays += rawDays
      existingSummary.displayedDays += rawDays
      existingSummary.sourceRows.push(...codeRows.map((contribution) => contribution.row.sourceRowNumber))
      codeSummaries.set(code, existingSummary)
    }

    currentEndDate = step.nextEndDate
    steps.push(step)
    vacationBaseDays += step.vacationBaseDays ?? 0
  }

  const vacationRawDays = (vacationBaseDays / VACATION_RULE.divisor) * VACATION_RULE.multiplier
  const vacationDays = vacationRawDays > 0 ? roundVacationDays(vacationRawDays) : 0

  if (vacationDays > 0) {
    const nextEndDate = addCalendarDays(currentEndDate, vacationDays)
    steps.push({
      id: `${employeeId}-vacation`,
      label: 'Ferieregel',
      code: 'VACATION',
      sourceRows: [],
      additionMode: 'vacation',
      baseDays: vacationBaseDays,
      absenceFraction: 1,
      rawDaysToAdd: vacationRawDays,
      appliedDaysToAdd: vacationDays,
      previousEndDate: currentEndDate,
      nextEndDate,
      vacationBaseDays,
      notes: VACATION_RULE.verificationNotes,
    })
    currentEndDate = nextEndDate
  }

  return {
    employeeId,
    initialEndDate: atUtcMidnight(initialEndDate),
    finalEndDate: currentEndDate,
    processedRows: rows.length,
    vacationBaseDays,
    vacationDays,
    steps,
    skippedCodes: Array.from(skippedCodes).sort(),
    codeSummaries: Object.fromEntries(codeSummaries.entries()),
  }
}

export function formatDate(date: Date): string {
  const utcDate = atUtcMidnight(date)
  const day = String(utcDate.getUTCDate()).padStart(2, '0')
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const year = utcDate.getUTCFullYear()
  return `${day}.${month}.${year}`
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(1).replace(/\.0$/, '')
}

export function formatPreciseNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

export function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const [, year, month, day] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

export function toDateInputValue(date: Date): string {
  const utcDate = atUtcMidnight(date)
  const year = utcDate.getUTCFullYear()
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utcDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function previewRowCalculation(row: ParsedAbsenceRow): RowCalculationPreview | null {
  const rule = getAbsenceRule(row.code)

  if (!rule) {
    return null
  }

  const contribution = createRowContribution(row, rule)
  const roundingMode = rule.summationRule
    ? SUMMATION_RULES[rule.summationRule].roundingMode
    : 'none'
  const { appliedDaysToAdd } = normalizeDaysToAdd(contribution.rawDaysToAdd, roundingMode)

  return {
    ruleLabel: rule.label,
    summationRule: rule.summationRule,
    additionMode: rule.additionMode,
    baseDays: contribution.baseDays,
    absenceFraction: contribution.absenceFraction,
    rawDaysToAdd: contribution.rawDaysToAdd,
    roundedDaysToAdd: appliedDaysToAdd,
    vacationEligible: rule.vacationEligible,
  }
}

function createRowContribution(row: ParsedAbsenceRow, rule: AbsenceCodeRule): RowContribution {
  const baseDays = getBaseDays(row, rule.countingBasis, rule.additionMode)
  const absenceFraction =
    rule.countingBasis === 'hours-divided-by-7.5' || rule.summationRule == null
      ? 1
      : getAbsenceFraction(row)

  return {
    row,
    rule,
    baseDays,
    absenceFraction,
    rawDaysToAdd: baseDays * absenceFraction,
  }
}

function createDirectStep(contribution: RowContribution, previousEndDate: Date): CalculationStep {
  const nextEndDate =
    contribution.rule.additionMode === 'working'
      ? addWorkingDays(previousEndDate, contribution.rawDaysToAdd)
      : addCalendarDays(previousEndDate, contribution.rawDaysToAdd)

  return {
    id: `${contribution.row.employeeId}-${contribution.row.sourceSheet}-${contribution.row.sourceRowNumber}`,
    label: contribution.rule.label,
    code: contribution.row.code,
    sourceRows: [contribution.row.sourceRowNumber],
    sourceSheet: contribution.row.sourceSheet,
    startDate: contribution.row.startDate,
    endDate: contribution.row.endDate,
    workPercent: contribution.row.workPercent,
    partTimePercent: contribution.row.partTimePercent,
    extraPercent: contribution.row.extraPercent,
    hours: contribution.row.hours,
    additionMode: contribution.rule.additionMode,
    baseDays: contribution.baseDays,
    absenceFraction: contribution.absenceFraction,
    rawDaysToAdd: contribution.rawDaysToAdd,
    appliedDaysToAdd: contribution.rawDaysToAdd,
    previousEndDate,
    nextEndDate,
    vacationBaseDays: contribution.rule.vacationEligible ? contribution.rawDaysToAdd : 0,
    notes: contribution.rule.verificationNotes,
  }
}

function createSummationStep(
  ruleNumber: SummationRule,
  rows: RowContribution[],
  previousEndDate: Date,
): CalculationStep {
  const summationRule = SUMMATION_RULES[ruleNumber]
  const rawDaysToAdd = rows.reduce((sum, contribution) => sum + contribution.rawDaysToAdd, 0)
  const { appliedDaysToAdd, notes } = normalizeDaysToAdd(rawDaysToAdd, summationRule.roundingMode)
  const nextEndDate =
    summationRule.additionMode === 'working'
      ? addWorkingDays(previousEndDate, appliedDaysToAdd)
      : addCalendarDays(previousEndDate, appliedDaysToAdd)
  const vacationBaseDays = calculateVacationBaseForSummationRule(
    ruleNumber,
    rows,
    previousEndDate,
    nextEndDate,
  )

  return {
    id: `${rows[0].row.employeeId}-summation-${ruleNumber}`,
    label: summationRule.label,
    code: `SUM-${ruleNumber}`,
    sourceRows: rows.map((contribution) => contribution.row.sourceRowNumber),
    sourceSheet: getCombinedSourceSheet(rows.map((contribution) => contribution.row)),
    startDate: rows[0]?.row.startDate,
    endDate: rows[rows.length - 1]?.row.endDate,
    groupedSources: rows.map((contribution) => contribution.row),
    additionMode: summationRule.additionMode,
    baseDays: rawDaysToAdd,
    absenceFraction: 1,
    rawDaysToAdd,
    appliedDaysToAdd,
    previousEndDate,
    nextEndDate,
    vacationBaseDays,
    notes: [...summationRule.verificationNotes, ...notes],
  }
}

function calculateVacationBaseForSummationRule(
  ruleNumber: SummationRule,
  rows: RowContribution[],
  previousEndDate: Date,
  nextEndDate: Date,
): number {
  const hasVacationEligibleRows = rows.some((contribution) => contribution.rule.vacationEligible)
  if (!hasVacationEligibleRows) {
    return 0
  }

  if (ruleNumber === 3) {
    return countCalendarDaysExclusive(previousEndDate, nextEndDate)
  }

  return rows
    .filter((contribution) => contribution.rule.vacationEligible)
    .reduce((sum, contribution) => sum + getVacationBaseForContribution(contribution), 0)
}

function getVacationBaseForContribution(contribution: RowContribution): number {
  if (!contribution.rule.vacationEligible) {
    return 0
  }

  return contribution.rawDaysToAdd
}

function getCombinedSourceSheet(rows: ParsedAbsenceRow[]): string {
  const uniqueSheets = Array.from(new Set(rows.map((row) => row.sourceSheet)))
  return uniqueSheets.join(' + ')
}

function getBaseDays(
  row: ParsedAbsenceRow,
  countingBasis: CountingBasis,
  mode: AdditionMode,
): number {
  if (countingBasis === 'hours-divided-by-7.5') {
    return (row.hours ?? 0) / 7.5
  }

  return mode === 'working'
    ? countWorkingDaysInclusive(row.startDate, row.endDate)
    : countCalendarDaysInclusive(row.startDate, row.endDate)
}

function getAbsenceFraction(row: ParsedAbsenceRow): number {
  const workBefore = row.workPercent
  const partTimePercent = row.partTimePercent

  if (typeof workBefore === 'number' && typeof partTimePercent === 'number') {
    return clamp(Math.abs(workBefore - partTimePercent) / 100, 0, 1)
  }

  return 1
}

function normalizeDaysToAdd(
  rawValue: number,
  roundingMode: RoundingMode,
): { appliedDaysToAdd: number; notes: string[] } {
  const notes: string[] = []
  const roundedToThreeDecimals = Math.round(rawValue * 1000) / 1000

  if (Number.isInteger(roundedToThreeDecimals)) {
    return {
      appliedDaysToAdd: roundedToThreeDecimals,
      notes,
    }
  }

  if (roundingMode === 'any-up') {
    notes.push('Rundet opp fordi denne regelen bruker hele dager når det finnes desimaler.')
    return {
      appliedDaysToAdd: Math.ceil(roundedToThreeDecimals),
      notes,
    }
  }

  if (roundingMode === 'nearest-whole-half-up') {
    const roundedValue = Math.round(roundedToThreeDecimals)
    if (roundedValue !== roundedToThreeDecimals) {
      notes.push('Rundet til nærmeste hele dag, der verdier som ender på 0,5 rundes opp.')
    }
    return {
      appliedDaysToAdd: roundedValue,
      notes,
    }
  }

  return {
    appliedDaysToAdd: roundedToThreeDecimals,
    notes,
  }
}

function roundVacationDays(value: number): number {
  if (Number.isInteger(value)) {
    return value
  }

  // Half-up: values with a fractional part >= 0.5 round up, otherwise down.
  return Math.round(value)
}

function countCalendarDaysInclusive(startDate: Date, endDate: Date): number {
  const start = atUtcMidnight(startDate)
  const end = atUtcMidnight(endDate)
  const difference = end.getTime() - start.getTime()
  return Math.floor(difference / DAY_IN_MS) + 1
}

function countCalendarDaysExclusive(startDate: Date, endDate: Date): number {
  const start = atUtcMidnight(startDate)
  const end = atUtcMidnight(endDate)
  const difference = end.getTime() - start.getTime()
  return Math.max(0, Math.floor(difference / DAY_IN_MS))
}

function countWorkingDaysInclusive(startDate: Date, endDate: Date): number {
  let cursor = atUtcMidnight(startDate)
  const end = atUtcMidnight(endDate)
  let count = 0

  while (cursor.getTime() <= end.getTime()) {
    if (isWorkingDay(cursor)) {
      count += 1
    }
    cursor = addUtcDays(cursor, 1)
  }

  return count
}

function addCalendarDays(date: Date, days: number): Date {
  const utcDate = atUtcMidnight(date)
  return new Date(utcDate.getTime() + days * DAY_IN_MS)
}

function addWorkingDays(date: Date, days: number): Date {
  let cursor = atUtcMidnight(date)
  let added = 0
  const wholeDays = Math.floor(days)
  const remainder = days - wholeDays

  while (added < wholeDays) {
    cursor = addUtcDays(cursor, 1)
    if (isWorkingDay(cursor)) {
      added += 1
    }
  }

  if (remainder > 0) {
    cursor = addUtcDays(cursor, 1)
    while (!isWorkingDay(cursor)) {
      cursor = addUtcDays(cursor, 1)
    }

    return new Date(cursor.getTime() + remainder * DAY_IN_MS)
  }

  return cursor
}

function isWorkingDay(date: Date): boolean {
  const day = atUtcMidnight(date).getUTCDay()
  if (day === 0 || day === 6) {
    return false
  }

  return !isNorwegianPublicHoliday(date)
}

function isNorwegianPublicHoliday(date: Date): boolean {
  const utcDate = atUtcMidnight(date)
  const month = utcDate.getUTCMonth() + 1
  const day = utcDate.getUTCDate()
  const easterSunday = getEasterSunday(utcDate.getUTCFullYear())
  const movableHolidays = new Set([
    formatIso(addUtcDays(easterSunday, -3)),
    formatIso(addUtcDays(easterSunday, -2)),
    formatIso(addUtcDays(easterSunday, 1)),
    formatIso(addUtcDays(easterSunday, 39)),
    formatIso(addUtcDays(easterSunday, 50)),
  ])
  const fixedHolidayKey = `${month}-${day}`

  if (
    fixedHolidayKey === '1-1' ||
    fixedHolidayKey === '5-1' ||
    fixedHolidayKey === '5-17' ||
    fixedHolidayKey === '12-25' ||
    fixedHolidayKey === '12-26'
  ) {
    return true
  }

  return movableHolidays.has(formatIso(utcDate))
}

function getEasterSunday(year: number): Date {
  const century = Math.floor(year / 100)
  const yearOfCentury = year % 100
  const skippedLeapYears = Math.floor(century / 4)
  const leapYearAdjustment = century - skippedLeapYears
  const correction = Math.floor((8 * century + 13) / 25)
  const moonCycle = (19 * (year % 19) + century - skippedLeapYears - correction + 15) % 30
  const yearQuarter = Math.floor(yearOfCentury / 4)
  const remainder = yearOfCentury % 4
  const weekdayOffset =
    (32 + 2 * leapYearAdjustment + 2 * yearQuarter - moonCycle - remainder) % 7
  const monthFactor = Math.floor((year % 19 + 11 * moonCycle + 22 * weekdayOffset) / 451)
  const month = Math.floor((moonCycle + weekdayOffset - 7 * monthFactor + 114) / 31)
  const day = ((moonCycle + weekdayOffset - 7 * monthFactor + 114) % 31) + 1

  return new Date(Date.UTC(year, month - 1, day))
}

function extractCurrentEndDate(value: SpreadsheetCell): Date | null {
  const text = toCleanString(value)
  if (!text) {
    return null
  }

  const match = /(\d{2})\.(\d{2})\.(\d{4})/.exec(text)
  if (!match) {
    return null
  }

  const [, day, month, year] = match
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
}

function getLeaveDataStartRow(leaveRows: SpreadsheetCell[][]): number {
  const firstRowHasEndDate = extractCurrentEndDate(leaveRows[0]?.[0]) != null
  return firstRowHasEndDate ? 3 : 2
}

function normalizeCode(value: SpreadsheetCell): string {
  const text = toCleanString(value)
  if (!text) {
    return ''
  }

  const digits = text.replace(/\D/g, '')
  return digits ? digits.padStart(3, '0').slice(-3) : text
}

function addEmployeeRow(
  employeeMap: Map<string, ParsedAbsenceRow[]>,
  parsedRow: ParsedAbsenceRow,
): void {
  const existing = employeeMap.get(parsedRow.employeeId)

  if (existing) {
    existing.push(parsedRow)
  } else {
    employeeMap.set(parsedRow.employeeId, [parsedRow])
  }
}

function compareRows(left: ParsedAbsenceRow, right: ParsedAbsenceRow): number {
  const startDelta = left.startDate.getTime() - right.startDate.getTime()
  if (startDelta !== 0) {
    return startDelta
  }

  const endDelta = left.endDate.getTime() - right.endDate.getTime()
  if (endDelta !== 0) {
    return endDelta
  }

  return left.sourceRowNumber - right.sourceRowNumber
}

function toDate(value: SpreadsheetCell): Date | null {
  if (value === Date) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return atUtcMidnight(value)
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return atUtcMidnight(parsed)
    }
  }

  return null
}

function toNumber(value: SpreadsheetCell): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').replace(/\s|%/g, '')
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function toCleanString(value: SpreadsheetCell): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

function isEmptyRow(row: SpreadsheetCell[]): boolean {
  return row.every((cell) => cell == null || toCleanString(cell) === '')
}

function atUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function addUtcDays(date: Date, days: number): Date {
  const utcDate = atUtcMidnight(date)
  return new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate() + days))
}

function formatIso(date: Date): string {
  return atUtcMidnight(date).toISOString().slice(0, 10)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

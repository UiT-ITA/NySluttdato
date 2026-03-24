import {
  VACATION_RULE,
  getAbsenceRule,
  type AbsenceCodeRule,
  type AdditionMode,
  type CountingBasis,
  type RoundingMode,
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
  notes: string[]
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
}

export interface RowCalculationPreview {
  ruleLabel: string
  isGroupedRule: boolean
  baseDays: number
  absenceFraction: number
  rawDaysToAdd: number
  roundedDaysToAdd: number
}

export function parseWorkbook({
  leaveRows,
  breastfeedingRows,
}: WorkbookSheetRows): ParsedWorkbook {
  const currentEndDate = extractCurrentEndDate(leaveRows[0]?.[0])
  const employeeMap = new Map<string, ParsedAbsenceRow[]>()
  const skippedRows: ParsedWorkbook['skippedRows'] = []

  leaveRows.slice(2).forEach((row, index) => {
    const rowNumber = index + 3

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
        reason: 'Missing employee, code, or date values.',
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
          reason: 'Missing employee, code, date, or hour values in Ammefri sheet.',
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
  const groupedRows = new Map<string, { label: string; rows: ParsedAbsenceRow[] }>()
  const skippedCodes = new Set<string>()

  for (const row of rows) {
    const rule = getAbsenceRule(row.code)

    if (!rule) {
      skippedCodes.add(row.code)
      continue
    }

    if (rule.additionMode === 'grouped-working') {
      const groupKey = rule.aggregationGroup ?? row.code
      const existingGroup = groupedRows.get(groupKey)
      if (existingGroup) {
        existingGroup.rows.push(row)
      } else {
        groupedRows.set(groupKey, {
          label: rule.aggregationLabel ?? rule.label,
          rows: [row],
        })
      }
      if (rule.vacationEligible) {
        vacationBaseDays += getRawDaysToAdd(row, rule.countingBasis, rule.additionMode)
      }
      continue
    }

    const step = createRowStep(row, rule, currentEndDate)
    currentEndDate = step.nextEndDate
    steps.push(step)

    if (rule.vacationEligible) {
      vacationBaseDays += step.rawDaysToAdd
    }
  }

  for (const group of groupedRows.values()) {
    const groupedStep = createGroupedWorkingStep(group.label, group.rows, currentEndDate)
    currentEndDate = groupedStep.nextEndDate
    steps.push(groupedStep)
  }

  const vacationRawDays = vacationBaseDays / VACATION_RULE.divisor * VACATION_RULE.multiplier
  const vacationDays = vacationRawDays > 0 ? roundVacationDays(vacationRawDays) : 0

  if (vacationDays > 0) {
    const nextEndDate = addCalendarDays(currentEndDate, vacationDays)
    steps.push({
      id: `${employeeId}-vacation`,
      label: 'Vacation day rule',
      code: 'VACATION',
      sourceRows: [],
      additionMode: 'vacation',
      baseDays: vacationBaseDays,
      absenceFraction: 1,
      rawDaysToAdd: vacationRawDays,
      appliedDaysToAdd: vacationDays,
      previousEndDate: currentEndDate,
      nextEndDate,
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

  const baseDays = getBaseDays(row, rule.countingBasis, rule.additionMode)
  const absenceFraction =
    rule.countingBasis === 'hours-divided-by-7.5' ? 1 : getAbsenceFraction(row)
  const rawDaysToAdd = baseDays * absenceFraction
  const { appliedDaysToAdd } = normalizeDaysToAdd(rawDaysToAdd, rule.roundingMode)

  return {
    ruleLabel: rule.label,
    isGroupedRule: rule.additionMode === 'grouped-working',
    baseDays,
    absenceFraction,
    rawDaysToAdd,
    roundedDaysToAdd: appliedDaysToAdd,
  }
}

function createRowStep(
  row: ParsedAbsenceRow,
  rule: AbsenceCodeRule,
  previousEndDate: Date,
): CalculationStep {
  const baseDays = getBaseDays(row, rule.countingBasis, rule.additionMode)
  const absenceFraction =
    rule.countingBasis === 'hours-divided-by-7.5' ? 1 : getAbsenceFraction(row)
  const rawDaysToAdd = baseDays * absenceFraction
  const { appliedDaysToAdd, notes } = normalizeDaysToAdd(rawDaysToAdd, rule.roundingMode)
  const nextEndDate =
    rule.additionMode === 'working'
      ? addWorkingDays(previousEndDate, appliedDaysToAdd)
      : addCalendarDays(previousEndDate, appliedDaysToAdd)

  return {
    id: `${row.employeeId}-${row.sourceRowNumber}`,
    label: rule.label,
    code: row.code,
    sourceRows: [row.sourceRowNumber],
    sourceSheet: row.sourceSheet,
    startDate: row.startDate,
    endDate: row.endDate,
    workPercent: row.workPercent,
    partTimePercent: row.partTimePercent,
    extraPercent: row.extraPercent,
    hours: row.hours,
    additionMode: rule.additionMode,
    baseDays,
    absenceFraction,
    rawDaysToAdd,
    appliedDaysToAdd,
    previousEndDate,
    nextEndDate,
    notes: [...rule.verificationNotes, ...notes],
  }
}

function createGroupedWorkingStep(
  label: string,
  rows: ParsedAbsenceRow[],
  previousEndDate: Date,
): CalculationStep {
  const firstRule = getAbsenceRule(rows[0].code)
  const rawDaysToAdd = rows.reduce(
    (sum, row) =>
      sum +
      getRawDaysToAdd(
        row,
        getAbsenceRule(row.code)?.countingBasis ?? 'days',
        'grouped-working',
      ),
    0,
  )
  const { appliedDaysToAdd, notes } = normalizeDaysToAdd(rawDaysToAdd, 'any-up')
  const nextEndDate = addWorkingDays(previousEndDate, appliedDaysToAdd)

  return {
    id: `${rows[0].employeeId}-grouped-working`,
    label,
    code: '470/091',
    sourceRows: rows.map((row) => row.sourceRowNumber),
    sourceSheet: 'Leave + Ammefri',
    startDate: rows[0]?.startDate,
    endDate: rows[rows.length - 1]?.endDate,
    groupedSources: rows,
    additionMode: 'grouped-working',
    baseDays: rawDaysToAdd,
    absenceFraction: 1,
    rawDaysToAdd,
    appliedDaysToAdd,
    previousEndDate,
    nextEndDate,
    notes: [...(firstRule?.verificationNotes ?? []), ...notes],
  }
}

function getRawDaysToAdd(
  row: ParsedAbsenceRow,
  countingBasis: CountingBasis,
  mode: AdditionMode,
): number {
  const baseDays = getBaseDays(row, countingBasis, mode)
  if (countingBasis === 'hours-divided-by-7.5') {
    return baseDays
  }

  return baseDays * getAbsenceFraction(row)
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
  const workedPercent = row.workPercent ?? 0
  const leaveCeiling = row.extraPercent ?? row.partTimePercent ?? 100
  const denominator = row.partTimePercent ?? leaveCeiling ?? 100
  const calculatedPercent = Math.max(leaveCeiling - workedPercent, 0)

  if (denominator > 0 && calculatedPercent > 0) {
    return clamp(calculatedPercent / denominator, 0, 1)
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
    notes.push('Rounded up because this rule uses full working days when a decimal remains.')
    return {
      appliedDaysToAdd: Math.ceil(roundedToThreeDecimals),
      notes,
    }
  }

  if (roundingMode === 'nearest-whole-half-up') {
    const roundedValue = Math.round(roundedToThreeDecimals)
    if (roundedValue !== roundedToThreeDecimals) {
      notes.push('Rounded to the nearest whole day, with values ending in 0.5 rounding up.')
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
  return Number.isInteger(value) ? value : Math.ceil(value)
}

function countCalendarDaysInclusive(startDate: Date, endDate: Date): number {
  const start = atUtcMidnight(startDate)
  const end = atUtcMidnight(endDate)
  const difference = end.getTime() - start.getTime()
  return Math.floor(difference / DAY_IN_MS) + 1
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
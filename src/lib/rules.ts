export type AdditionMode = 'calendar' | 'working' | 'grouped-working'
export type RoundingMode = 'none' | 'nearest-whole-half-up' | 'any-up'
export type CountingBasis = 'days' | 'hours-divided-by-7.5'

export interface AbsenceCodeRule {
  code: string
  label: string
  additionMode: AdditionMode
  roundingMode: RoundingMode
  countingBasis: CountingBasis
  vacationEligible: boolean
  aggregationGroup?: string
  aggregationLabel?: string
  verificationNotes: string[]
}

export interface VacationRuleDefinition {
  divisor: number
  multiplier: number
  roundingMode: 'any-up'
  verificationNotes: string[]
}

export const ABSENCE_RULES: Record<string, AbsenceCodeRule> = {
  '091': {
    code: '091',
    label: 'Breastfeeding paid leave',
    additionMode: 'grouped-working',
    roundingMode: 'any-up',
    countingBasis: 'hours-divided-by-7.5',
    vacationEligible: true,
    aggregationGroup: '470-091',
    aggregationLabel: 'Grouped sick-child and breastfeeding leave',
    verificationNotes: [
      'Rule text: sum hours in the separate report, divide by 7.5, then add by working days.',
      'Rounding: always round up to the closest full working day when a decimal remains.',
      'This code must be read from the separate Ammefri sheet when present.',
    ],
  },
  '110': {
    code: '110',
    label: 'Doctor certified sick leave',
    additionMode: 'calendar',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count number of absence days.',
      'Add the counted days consecutively by calendar days.',
      'Vacation day rule applies.',
    ],
  },
  '120': {
    code: '120',
    label: 'Self-certified sick leave',
    additionMode: 'working',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count number of absence days.',
      'Add the counted days by working days.',
      'Vacation day rule applies.',
    ],
  },
  '166': {
    code: '166',
    label: 'Sick leave after doctor certified sick leave (with disability pension)',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if the total ends with 0.5, round up to the closest full working day.',
    ],
  },
  '167': {
    code: '167',
    label: 'Sick leave after doctor certified sick leave (without disability pension)',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if the total ends with 0.5, round up to the closest full working day.',
    ],
  },
  '168': {
    code: '168',
    label: 'Sick leave without work verification money (with disability pension)',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if the total ends with 0.5, round up to the closest full working day.',
    ],
  },
  '169': {
    code: '169',
    label: 'Sick leave without work verification money (without disability pension)',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if the total ends with 0.5, round up to the closest full working day.',
    ],
  },
  '170': {
    code: '170',
    label: 'Doctor certified partial sick leave',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count number of absence days.',
      'Add the counted days consecutively by calendar days.',
      'Rounding: round to the nearest whole day. Values ending with 0.5 round up.',
      'Vacation day rule applies.',
    ],
  },
  '325': {
    code: '325',
    label: 'Obligatory military repetition',
    additionMode: 'working',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count number of absence days.',
      'Add the counted days by working days.',
    ],
  },
  '410': {
    code: '410',
    label: 'Parental leave 100% salary',
    additionMode: 'calendar',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Vacation day rule applies.',
    ],
  },
  '415': {
    code: '415',
    label: 'Parental leave 80% salary',
    additionMode: 'calendar',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Vacation day rule applies.',
    ],
  },
  '420': {
    code: '420',
    label: 'Graduated parental leave 100%',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: normal mathematical rounding to the nearest whole day, with 0.5 rounding up.',
      'Vacation day rule applies by your clarification.',
    ],
  },
  '425': {
    code: '425',
    label: 'Graduated parental leave 80%',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: normal mathematical rounding to the nearest whole day, with 0.5 rounding up.',
      'Vacation day rule applies by your clarification.',
    ],
  },
  '435': {
    code: '435',
    label: 'Caring leave without pay',
    additionMode: 'calendar',
    roundingMode: 'any-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if any decimal remains, always round up to the closest full working day.',
    ],
  },
  '440': {
    code: '440',
    label: 'Paid birth care leave 2 weeks',
    additionMode: 'calendar',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: true,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Vacation day rule applies by your clarification.',
    ],
  },
  '460': {
    code: '460',
    label: 'Child care allowance',
    additionMode: 'calendar',
    roundingMode: 'any-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if any decimal remains, always round up to the closest full working day.',
    ],
  },
  '461': {
    code: '461',
    label: 'Training money',
    additionMode: 'calendar',
    roundingMode: 'any-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if any decimal remains, always round up to the closest full working day.',
    ],
  },
  '462': {
    code: '462',
    label: 'Caring allowance for close relatives',
    additionMode: 'calendar',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
    ],
  },
  '470': {
    code: '470',
    label: 'Sick child leave',
    additionMode: 'grouped-working',
    roundingMode: 'any-up',
    countingBasis: 'days',
    vacationEligible: true,
    aggregationGroup: '470-091',
    aggregationLabel: 'Grouped sick-child and breastfeeding leave',
    verificationNotes: [
      'Rule text: sum number of absence days in codes 470 and 091.',
      'Add the total by working days.',
      'Rounding: always round up to the closest full working day when a decimal remains.',
      'Vacation day rule applies.',
    ],
  },
  '490': {
    code: '490',
    label: 'Leave according to Working Environment Act section 10-2',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
      'Rounding: if the total ends with 0.5, round up to the closest full working day.',
    ],
  },
  '660': {
    code: '660',
    label: 'Union representatives section 40',
    additionMode: 'calendar',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
    ],
  },
  '670': {
    code: '670',
    label: 'Union representatives section 41',
    additionMode: 'calendar',
    roundingMode: 'none',
    countingBasis: 'days',
    vacationEligible: false,
    verificationNotes: [
      'Rule text: count absence days and add them consecutively by calendar days.',
    ],
  },
}

export const VACATION_RULE: VacationRuleDefinition = {
  divisor: 30,
  multiplier: 2.916,
  roundingMode: 'any-up',
  verificationNotes: [
    'Global rule: sum vacation-eligible absence days.',
    'Formula: total days / 30 * 2.916.',
    'Rounding: if the result has a decimal, round up to the closest full day.',
    'Add the vacation days to the last end date calculated by calendar days.',
  ],
}

export function getAbsenceRule(code: string): AbsenceCodeRule | null {
  return ABSENCE_RULES[code] ?? null
}
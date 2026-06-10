import { getAbsenceRule, type CountingBasis } from './rules'

export type CodeDisplayType =
  | 'direct-calendar'
  | 'direct-working'
  | 'standalone-calendar'
  | 'summation-rule-1'
  | 'summation-rule-2'
  | 'summation-rule-3-days'
  | 'summation-rule-3-hours'

export type CodeGroupColumn =
  | 'row'
  | 'from'
  | 'to'
  | 'workPercent'
  | 'partTimePercent'
  | 'baseDays'
  | 'absenceFraction'
  | 'calculatedDays'
  | 'hours'

export interface CodeGroupDisplayConfig {
  headerTotalLabel: string
  groupedByLabel: string | null
  tableColumns: CodeGroupColumn[]
}

export function getCodeDisplayType(code: string, countingBasis: CountingBasis): CodeDisplayType {
  const rule = getAbsenceRule(code)

  if (!rule) {
    return 'direct-calendar'
  }

  if (rule.standaloneRoundingMode) {
    return 'standalone-calendar'
  }

  if (rule.summationRule == null) {
    return rule.additionMode === 'working' ? 'direct-working' : 'direct-calendar'
  }

  if (rule.summationRule === 1) {
    return 'summation-rule-1'
  }

  if (rule.summationRule === 2) {
    return 'summation-rule-2'
  }

  return countingBasis === 'hours-divided-by-7.5' ? 'summation-rule-3-hours' : 'summation-rule-3-days'
}

export function getCodeDisplayConfig(displayType: CodeDisplayType): CodeGroupDisplayConfig {
  switch (displayType) {
    case 'direct-calendar':
      return {
        headerTotalLabel: 'Kalenderdager',
        groupedByLabel: null,
        tableColumns: ['row', 'from', 'to', 'baseDays'],
      }
    case 'direct-working':
      return {
        headerTotalLabel: 'Arbeidsdager',
        groupedByLabel: null,
        tableColumns: ['row', 'from', 'to', 'baseDays'],
      }
    case 'standalone-calendar':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Frittstående regel',
        tableColumns: ['row', 'from', 'to', 'workPercent', 'partTimePercent', 'baseDays', 'absenceFraction', 'calculatedDays'],
      }
    case 'summation-rule-1':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 1',
        tableColumns: ['row', 'from', 'to', 'workPercent', 'partTimePercent', 'baseDays', 'absenceFraction', 'calculatedDays'],
      }
    case 'summation-rule-2':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 2',
        tableColumns: ['row', 'from', 'to', 'baseDays', 'calculatedDays'],
      }
    case 'summation-rule-3-days':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 3',
        tableColumns: ['row', 'from', 'to', 'baseDays', 'calculatedDays'],
      }
    case 'summation-rule-3-hours':
      return {
        headerTotalLabel: 'Delsum',
        groupedByLabel: 'Sumregel 3',
        tableColumns: ['row', 'from', 'to', 'hours', 'calculatedDays'],
      }
  }
}

export function getCodeGroupColumnHeader(column: CodeGroupColumn): string {
  switch (column) {
    case 'row':
      return 'Rad'
    case 'from':
      return 'Fra'
    case 'to':
      return 'Til'
    case 'workPercent':
      return '% før'
    case 'partTimePercent':
      return 'Deltid %'
    case 'baseDays':
      return 'Grunndager'
    case 'absenceFraction':
      return 'Brøk'
    case 'calculatedDays':
      return 'Beregnet'
    case 'hours':
      return 'Timer'
  }
}

export interface RuleCategoryDescription {
  heading: string
  description: string
  codes?: string[]
}

export const RULE_CATEGORY_DESCRIPTIONS: RuleCategoryDescription[] = [
  {
    heading: 'Grunnregler',
    description:
      'Beregningen følger norsk kalender, inkludert helger og norske helligdager. Fraværsprosent beregnes som differansen mellom kolonne F (%arbFør2001) og kolonne G (Deltids-%0007). Kolonne H og I brukes ikke.',
  },
  {
    heading: 'Frittstående regel',
    description:
      'Alle rader summeres separat. Summen legges til i kalenderdager. Desimaldel lik eller over 0,5 rundes opp, ellers ned. Inngår ikke i ferieregel eller summeringsregel 1, 2 eller 3.',
    codes: ['100'],
  },
  {
    heading: 'Direkte lagt inn – kalenderdager',
    description: 'Ingen summeringsregel. Hver rad legges til sluttdatoen i kalenderdager.',
    codes: ['110', '410', '415', '440', '462', '660', '670'],
  },
  {
    heading: 'Direkte lagt inn – arbeidsdager',
    description: 'Ingen summeringsregel. Hver rad legges til sluttdatoen i arbeidsdager.',
    codes: ['325'],
  },
  {
    heading: 'Summering 1',
    description:
      'Alle rader summeres. Summen legges til i kalenderdager. Desimaldel lik eller over 0,5 rundes opp, ellers ned.',
    codes: ['166', '167', '168', '169', '170', '199', '420', '425', '490'],
  },
  {
    heading: 'Summering 2',
    description:
      'Alle rader summeres. Summen legges til i kalenderdager. Desimaler rundes alltid opp.',
    codes: ['435', '460', '461'],
  },
  {
    heading: 'Summering 3',
    description:
      'Alle rader summeres. Desimaler rundes opp til nærmeste hele arbeidsdag. Legges til etter alt annet fravær (unntatt ferie).',
    codes: ['091', '120', '470'],
  },
  {
    heading: 'Ferieregel',
    description:
      'Beregnes som dager / 30 × 2,916. Desimaler rundes til nærmeste hele dag (0,5 og over rundes opp, under 0,5 rundes ned). Legges til helt til slutt i kalenderdager.',
    codes: ['091', '110', '120', '170', '199', '410', '415', '420', '425', '440', '470'],
  },
]

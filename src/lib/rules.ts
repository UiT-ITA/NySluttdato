export type AdditionMode = 'calendar' | 'working'
export type RoundingMode = 'none' | 'nearest-whole-half-up' | 'any-up'
export type CountingBasis = 'days' | 'hours-divided-by-7.5'
export type SummationRule = 1 | 2 | 3

export interface AbsenceCodeRule {
  code: string
  label: string
  additionMode: AdditionMode
  countingBasis: CountingBasis
  summationRule: SummationRule | null
  vacationEligible: boolean
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
    label: 'Ammefri',
    additionMode: 'working',
    countingBasis: 'hours-divided-by-7.5',
    summationRule: 3,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall timer ammefravær fra separat rapport.',
      'Del de summerte timene med 7,5 for å få antall dager.',
      'Legg til totalt antall fraværsdager i arbeidsdager.',
      'Koden følger summeringsregel 3.',
      'Ferieregel gjelder.',
    ],
  },
  '110': {
    code: '110',
    label: 'Sykemelding',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Ferieregel gjelder.',
    ],
  },
  '120': {
    code: '120',
    label: 'Egenmelding',
    additionMode: 'working',
    countingBasis: 'days',
    summationRule: 3,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til totalt antall fraværsdager i arbeidsdager.',
      'Koden følger summeringsregel 3.',
      'Ferieregel gjelder.',
    ],
  },
  '166': {
    code: '166',
    label: 'Sykepermisjon med arbeidsavklaringspenger, med uførepensjon i Statens Pensjonskasse',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
    ],
  },
  '167': {
    code: '167',
    label: 'Sykepermisjon med arbeidsavklaringspenger, uten uførepensjon i Statens Pensjonskasse',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
    ],
  },
  '168': {
    code: '168',
    label: 'Sykepermisjon uten arbeidsavklaringspenger, med uførepensjon i Statens Pensjonskasse',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
    ],
  },
  '169': {
    code: '169',
    label: 'Sykepermisjon uten arbeidsavklaringspenger, uten uførepensjon i Statens Pensjonskasse',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
    ],
  },
  '170': {
    code: '170',
    label: 'Delvis sykemelding',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
      'Ferieregel gjelder.',
    ],
  },
  '199': {
    code: '199',
    label: 'Lønn ut over trygdeperiode',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
      'Ferieregel gjelder.',
    ],
  },
  '325': {
    code: '325',
    label: 'Militær repetisjonstjeneste med full lønn',
    additionMode: 'working',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til totalt antall fraværsdager i arbeidsdager.',
    ],
  },
  '410': {
    code: '410',
    label: 'Foreldrepermisjon 100 % lønn',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Ferieregel gjelder.',
    ],
  },
  '415': {
    code: '415',
    label: 'Foreldrepermisjon 80 % lønn',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Ferieregel gjelder.',
    ],
  },
  '420': {
    code: '420',
    label: 'Gradert foreldrepermisjon 100 %',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
      'Ferieregel gjelder.',
    ],
  },
  '425': {
    code: '425',
    label: 'Gradert foreldrepermisjon 80 %',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
      'Ferieregel gjelder.',
    ],
  },
  '435': {
    code: '435',
    label: 'Omsorgspermisjon uten lønn iht. Fellesbestemmelsens § 20',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 2,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 2.',
    ],
  },
  '440': {
    code: '440',
    label: 'Omsorg føds 2 uker m/lønn',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Ferieregel gjelder.',
    ],
  },
  '460': {
    code: '460',
    label: 'Pleiepenger barn',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 2,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 2.',
    ],
  },
  '461': {
    code: '461',
    label: 'Opplæringspenger',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 2,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 2.',
    ],
  },
  '462': {
    code: '462',
    label: 'Pleiepenger nærstående',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
    ],
  },
  '470': {
    code: '470',
    label: 'Sykt barn',
    additionMode: 'working',
    countingBasis: 'days',
    summationRule: 3,
    vacationEligible: true,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til totalt antall fraværsdager i arbeidsdager.',
      'Koden følger summeringsregel 3.',
      'Ferieregel gjelder.',
    ],
  },
  '490': {
    code: '490',
    label: 'Permisjon i henhold til arbeidsmiljølovens § 10-2',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: 1,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
      'Koden følger summeringsregel 1.',
    ],
  },
  '660': {
    code: '660',
    label: 'Hovedavtalen § 40',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
    ],
  },
  '670': {
    code: '670',
    label: 'Hovedavtalen § 41',
    additionMode: 'calendar',
    countingBasis: 'days',
    summationRule: null,
    vacationEligible: false,
    verificationNotes: [
      'Summer antall dager fravær.',
      'Legg til antall fraværsdager summert i kalenderdager.',
    ],
  },
}

export const SUMMATION_RULES: Record<
  SummationRule,
  {
    label: string
    additionMode: AdditionMode
    roundingMode: RoundingMode
    appliesAfterDirectSteps: boolean
    verificationNotes: string[]
  }
> = {
  1: {
    label: 'Summeringsregel 1',
    additionMode: 'calendar',
    roundingMode: 'nearest-whole-half-up',
    appliesAfterDirectSteps: false,
    verificationNotes: [
      'Summer antall dager fravær i hele rapporten for alle kolonner som har summeringsregel 1.',
      'Hvis det summerte antallet dager blir 0,5 eller mer, rundes det opp til nærmeste hele dag. Er det under 0,5 rundes det ned til nærmeste hele dag.',
    ],
  },
  2: {
    label: 'Summeringsregel 2',
    additionMode: 'calendar',
    roundingMode: 'any-up',
    appliesAfterDirectSteps: false,
    verificationNotes: [
      'Summer antall dager fravær i hele rapporten for alle kolonner som har summeringsregel 2.',
      'Hvis totalt antall dager summert innehar desimaltegn, rund opp til nærmeste hele arbeidsdag.',
    ],
  },
  3: {
    label: 'Summeringsregel 3',
    additionMode: 'working',
    roundingMode: 'any-up',
    appliesAfterDirectSteps: true,
    verificationNotes: [
      'Summer antall dager fravær i hele rapporten for alle kolonner som har summeringsregel 3.',
      'Hvis totalt antall dager summert innehar desimaltegn, rund opp til nærmeste hele arbeidsdag.',
      'Legg summert antall dager til sluttdatoen når alt annet fravær, bortsett fra ferieregel, er lagt til.',
    ],
  },
}

export const VACATION_RULE: VacationRuleDefinition = {
  divisor: 30,
  multiplier: 2.916,
  roundingMode: 'any-up',
  verificationNotes: [
    'Summer opp antall dager forskyvelse i kodene som innehar ferieregelen.',
    'For summeringsregel 3 skal feriegrunnlaget bruke totale kalenderdager forskyvelse, ikke bare faktiske arbeidsdager fraværende.',
    'Antall dager summert / 30 * 2,916 = antall dager ferie.',
    'Hvis feriedager ender med 0,5 eller mer, rund opp til nærmeste hele dag.',
    'Legg feriedager til sluttdatoen kalkulert i kalenderdager, helt til slutt.',
  ],
}

export function getAbsenceRule(code: string): AbsenceCodeRule | null {
  return ABSENCE_RULES[code] ?? null
}

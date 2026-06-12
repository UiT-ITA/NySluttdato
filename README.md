# NySluttdato

NySluttdato er et verktøy for å beregne forlengelse av ansettelsesperioder ved fravær for stipendiater og postdoktorer.

## Teknologistakk

- React
- TypeScript
- Vite
- ESLint

## Kom i gang

Installer avhengigheter:

```bash
npm install
```

Start utviklingsserveren:

```bash
npm run dev
```

Bygg prosjektet for produksjon:

```bash
npm run build
```

Forhåndsvis produksjonsbygget lokalt:

```bash
npm run preview
```

## Hva appen gjør

Appen lar deg:

- laste opp en Excel-arbeidsbok med fraværsdata
- lese inn ark for fravær og ammefri
- beregne ny sluttdato for valgt ansatt
- vise summeringsregler, ferieregel og anvendte beregningssteg
- varsle om rader eller koder som blir hoppet over

## Viktige filer

- [`src/App.tsx`](src/App.tsx) – hovedgrensesnitt og flyt for innlasting av arbeidsbok
- [`src/components/EmployeeCard.tsx`](src/components/EmployeeCard.tsx) – visning av resultat for valgt ansatt
- [`src/components/CodeGroupDetails.tsx`](src/components/CodeGroupDetails.tsx) – detaljvisning per fraværskode
- [`src/components/CalculationStepsDetails.tsx`](src/components/CalculationStepsDetails.tsx) – detaljvisning av beregningssteg
- [`src/lib/phdCalculator.ts`](src/lib/phdCalculator.ts) – parsing, regler og beregningslogikk
- [`src/lib/rules.ts`](src/lib/rules.ts) – definisjon av fraværskoder, summeringsregler og ferieregel

## Merknader

- Appen forventer at arbeidsboken inneholder et fraværsark og eventuelt et eget ark for ammefri.
- Fravær behandles etter reglene som er definert i [`src/lib/rules.ts`](src/lib/rules.ts).
- Arbeidsdager beregnes med hensyn til helger og norske helligdager.

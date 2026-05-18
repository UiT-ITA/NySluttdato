# Plan: 14-dagers-regel for fravær før 01.07.2023

## TL;DR
Innfør en preprosesseringsregel som — før vanlig beregning kjøres — vurderer kvalifiserende fraværsperioder som starter før 01.07.2023. Rader/perioder splittes ved cutoff. Den sammenhengende perioden (kalenderdager der kvalifiserende koder berører hverandre) måles inkludert eventuell post-cutoff-fortsettelse. Hvis ≥14 dager: pre-cutoff-delen tas med i normal beregning. Hvis <14 dager: pre-cutoff-delen forkastes og rapporteres i "hoppet over"-listen. Post-cutoff-deler beregnes alltid normalt. Ikke-kvalifiserende koder beregnes alltid normalt og påvirker ikke kontinuitetsmålingen.

## Spesifikasjon (avklart med bruker)
- **Cutoff-dato**: 01.07.2023 (UTC midnatt).
- **Kvalifiserende koder** (default-liste, konfigurerbar): 110, 120, 170, 199, 166, 167, 168, 169, 410, 415, 420, 425, 440. Lagres som en separat konstant `PRE_2023_CONTINUITY_QUALIFYING_CODES` øverst i `rules.ts` slik at det er enkelt å endre.
- **Terskel**: ≥14 kalenderdager (14 er nok, ikke strengt >14).
- **Kontinuitet**: kalenderdager må berøre eller overlappe hverandre (helger teller). Ikke-kvalifiserende koder verken bryter eller bidrar til lengden — de ignoreres i denne målingen.
- **Spennlengde**: hele den sammenhengende kvalifiserende perioden måles, inkludert dager som ligger på/etter cutoff hvis disse fortsetter sammenhengende.
- **Krysning av cutoff**: rader som krysser 01.07.2023 splittes internt i en pre-del (≤30.06.2023) og en post-del (≥01.07.2023). Hver del beregnes etter sin opprinnelige kode-regel.
- **Post-cutoff**: alltid med, uavhengig av 14-dagers-vurderingen.
- **Ikke-kvalifiserende koder med startdato før cutoff**: beregnes alltid normalt; aldri forkastet av denne regelen.
- **Synlighet**: forkastede pre-cutoff-deler legges til i `ParsedWorkbook.skippedRows` med begrunnelse. Ingen nytt steg i beregningsoversikten.

## Steg

### Fase 1 — Regler og konstanter
1. I [src/lib/rules.ts](src/lib/rules.ts), eksporter:
   - `PRE_2023_CUTOFF_DATE` (Date, UTC 2023-07-01).
   - `PRE_2023_CONTINUITY_THRESHOLD_DAYS = 14`.
   - `PRE_2023_CONTINUITY_QUALIFYING_CODES: ReadonlySet<string>` med default-koder listet over.
   - Liten doc-kommentar over konstanten som forklarer regelen og hvordan man legger til/fjerner koder.

### Fase 2 — Preprosessering i kalkulatoren
2. I [src/lib/phdCalculator.ts](src/lib/phdCalculator.ts), legg til en hjelpefunksjon `applyPre2023ContinuityRule(rows, employeeId)` som returnerer `{ rows: ParsedAbsenceRow[], skippedRows: SkippedRowEntry[] }`. Den må:
   - Steg a: For hver rad med `startDate < cutoff` og `endDate >= cutoff`, splitt i to nye `ParsedAbsenceRow`-objekter (pre-del med endDate = 30.06.2023, post-del med startDate = 01.07.2023). Bevar opprinnelig `sourceRowNumber`/`sourceSheet`; merk splittede deler internt (f.eks. via nytt valgfritt felt `splitFromOriginal: 'pre' | 'post' | undefined`, eller bare via dato — vurder enklest variant).
   - Steg b: Identifiser alle rader (etter splitt) der `endDate < cutoff` OG koden er i `PRE_2023_CONTINUITY_QUALIFYING_CODES`. Disse er "kandidater".
   - Steg c: Bygg sammenhengende spenn på tvers av ALLE kvalifiserende kode-rader (også post-cutoff-deler av splittede rader, og helt-post-cutoff-rader med kvalifiserende kode) — sortér på startDate, slå sammen intervaller hvis `nextStart <= prevEnd + 1 kalenderdag`. Lengden = `endDate - startDate + 1` kalenderdager.
   - Steg d: For hver kandidat-rad (pre-cutoff, kvalifiserende), finn spennet den tilhører. Hvis spennets totale lengde < 14 dager → fjern raden fra resultatet og legg en oppføring i `skippedRows` med `reason: "Sammenhengende fravær før 01.07.2023 var under 14 dager (regel for stipendiater)"`, samt opprinnelig `sourceRowNumber` og `code`.
   - Returner den oppdaterte rad-listen og evt. nye skipped-oppføringer.
3. Kall `applyPre2023ContinuityRule` øverst i `calculateEmployeeResult` før eksisterende contribution-loop. **Designvalg**: Siden `calculateEmployeeResult` ikke returnerer skippedRows i dag, må enten signaturen utvides eller skipped-oppføringene returneres via `EmployeeCalculation` (legg til `extraSkippedRows: SkippedRowEntry[]`). Anbefalt: legg til felt på `EmployeeCalculation`.
4. I `parseWorkbook` / kallstedet i [src/App.tsx](src/App.tsx), slå sammen `extraSkippedRows` fra alle ansatte inn i `report.skippedRows` slik at de vises i den eksisterende "hoppet over rader"-listen.

### Fase 3 — Tester / verifisering
5. Hvis det finnes en eksisterende testfil for kalkulatoren, legg til scenarier. Hvis ikke, dokumentér manuelle testtilfeller i denne planen og verifiser via UI.

## Relevante filer
- [src/lib/rules.ts](src/lib/rules.ts) — konstanter for cutoff, terskel og kvalifiserende koder.
- [src/lib/phdCalculator.ts](src/lib/phdCalculator.ts) — `parseWorkbook`, `calculateEmployeeResult`; ny `applyPre2023ContinuityRule`-funksjon. Eksisterende `ParsedAbsenceRow`, `addCalendarDays`, og dato-hjelpere kan gjenbrukes.
- [src/App.tsx](src/App.tsx) — fletter `extraSkippedRows` inn i `report.skippedRows` (rundt linje 45/93/214 der `skippedRows` brukes/vises).
- [src/lib/pdfReport.ts](src/lib/pdfReport.ts) — ingen endring nødvendig hvis `skippedRows` flettes på App-nivå; verifiser at PDF-rapporten viser de nye oppføringene.
- [src/components/EmployeeCard.tsx](src/components/EmployeeCard.tsx) — vurder om forkastede pre-cutoff-rader bør telles inn i `hasWarnings`; sannsynligvis håndtert via global `skippedRows` allerede.

## Verifisering
1. Manuelt testtilfelle A — kort fravær før cutoff forkastes:
   - 1 rad: 110 Sykemelding, 01.06.2023–05.06.2023 (5 dager). Forventet: forkastet, vises i skipped med begrunnelse, sluttdato endres ikke av denne raden.
2. Testtilfelle B — lang sammenhengende periode kvalifiserer:
   - 110 Sykemelding 01.06.2023–10.06.2023 + 120 Egenmelding 11.06.2023–16.06.2023 (16 sammenhengende dager). Forventet: begge rader inkluderes normalt; sluttdato forskyves som vanlig.
3. Testtilfelle C — periode krysser cutoff:
   - 110 Sykemelding 25.06.2023–20.07.2023 (26 dager). Forventet: raden splittes internt; spennet er 26 dager (≥14), så pre-del (25.06–30.06, 6 dager) inkluderes; post-del (01.07–20.07, 20 dager) inkluderes alltid. Total effekt: 26 kalenderdagers forskyvning (samme som uten regelen for denne raden).
4. Testtilfelle D — kort pre-cutoff-fravær med ikke-kvalifiserende kode mellom:
   - 110 01.06–05.06 + 470 Sykt barn 06.06 + 110 07.06–10.06. Forventet: ammefri/sykt barn ignoreres i kontinuitetsmålingen; de to 110-radene berører ikke hverandre direkte (gap 06.06) — IKKE sammenhengende. Begge 110-rader er <14 → forkastes. 470-raden beregnes som normalt. **Bekreft tolkning med bruker hvis usikkert.**
5. Testtilfelle E — ikke-kvalifiserende kode med startdato før cutoff:
   - 470 Sykt barn 01.06.2023–03.06.2023 (3 dager). Forventet: beregnes normalt, ikke forkastet.
6. Test at endring av `PRE_2023_CONTINUITY_QUALIFYING_CODES` (f.eks. ved å fjerne 410) endrer adferden tilsvarende.
7. Kjør `npm run lint` og `npm run build` for å sikre type- og lint-renhet.

## Beslutninger og scope
- **Inkludert**: ny preprosesseringsregel, splitt av rader, default kvalifiserende koder, rapportering via skipped-list.
- **Ekskludert**: nytt UI-steg/visualisering i beregningsoversikten; konfigurasjons-UI for å endre kvalifiserende koder i runtime (kun kode-konstant); endring av eksisterende rules.txt-tekstdokumentet.
- **Antakelse**: "datoene fra og med 01.07.23 blir beregnet uavhengig av lengden" tolkes som at splittede post-deler alltid teller, og rader som er helt på/etter cutoff aldri påvirkes av regelen.
- **Antakelse**: ikke-kvalifiserende koder ignoreres helt i kontinuitetsmålingen — de bryter ikke et spenn, men bidrar heller ikke til lengden (bruker har bekreftet).

## Videre vurderinger
1. Skal default-listen utvides? Listen er ufullstendig — bruker bekreftet at koder kan legges til/fjernes enkelt. Default starter med kodene bruker bekreftet (110, 120, 170, 199, 166–169, 410, 415, 420, 425, 440). Anbefales å la README eller en kommentar i rules.ts peke til hvordan listen oppdateres.
2. Tolkning av testtilfelle D (ikke-kvalifiserende kode i "midten"): siden ikke-kvalifiserende koder ignoreres helt i målingen, men det fortsatt er et reelt gap mellom de kvalifiserende dagene — er gapet "ikke berørt", altså ikke sammenhengende. Bekreft at dette stemmer; alternativt kan ikke-kvalifiserende dager regnes som "bro" mellom kvalifiserende segmenter.

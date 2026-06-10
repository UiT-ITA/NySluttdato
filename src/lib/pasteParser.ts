const DATE_LIKE = /^(?:\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2})(?:\s|$)/

const HEADER_PLACEHOLDER = ['Ansattnr', 'Fra dato', 'Til dato', 'Kode', 'Beskrivelse']

export function textToGrid(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split('\t').map((cell) => cell.trim()))
    .filter((cells) => cells.some((cell) => cell !== ''))
}

function isDateLike(cell: string | undefined): boolean {
  return cell != null && DATE_LIKE.test(cell)
}

function looksLikeDataRow(row: string[] | undefined): boolean {
  return row != null && isDateLike(row[1]) && isDateLike(row[2])
}

/**
 * parseWorkbook forventer arkets struktur: eventuelt en sluttdatorad øverst,
 * deretter en overskriftsrad, så datarader. Innlimt tekst mangler ofte
 * overskriftsraden – da skytes en plassholder inn slik at dataradene
 * havner der parseWorkbook leter etter dem.
 */
export function prepareLeaveGrid(grid: string[][]): string[][] {
  if (grid.length === 0) {
    return grid
  }

  if (looksLikeDataRow(grid[0])) {
    return [HEADER_PLACEHOLDER, ...grid]
  }

  const firstRowHasEndDate = /\d{2}\.\d{2}\.\d{4}/.test(grid[0][0] ?? '')
  if (firstRowHasEndDate && looksLikeDataRow(grid[1])) {
    return [grid[0], HEADER_PLACEHOLDER, ...grid.slice(1)]
  }

  return grid
}

export function prepareBreastfeedingGrid(grid: string[][]): string[][] {
  if (grid.length > 0 && looksLikeDataRow(grid[0])) {
    return [HEADER_PLACEHOLDER, ...grid]
  }

  return grid
}

/**
 * Parser CSV mínimo y sin dependencias.
 *
 * Soporta comillas dobles y comas escapadas dentro de campos entrecomillados.
 * Pensado para la ingesta de archivos de muestra; el resultado se normaliza
 * después a las entidades del dominio.
 */
export function parseCsv(content: string): Record<string, string>[] {
  const lines = content.replace(/^\uFEFF/, '').trim().split(/\r?\n/)
  if (lines.length <= 1) return []

  const headers = splitCsvLine(lines[0]!)

  return lines.slice(1).filter(line => line.trim().length > 0).map((line) => {
    const cells = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? '').trim()
    })
    return row
  })
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }

    current += char
  }

  result.push(current)
  return result
}

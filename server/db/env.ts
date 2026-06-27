/**
 * Carga mínima de `.env` para scripts que corren fuera de Nitro (migrate, seed).
 *
 * Nitro expande variables `${VAR}` automáticamente; estos scripts no, así que
 * replicamos esa expansión para soportar un `.env` con interpolación como:
 *
 *   DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/db
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const raw: Record<string, string> = {}
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match) {
      raw[match[1]!] = match[2]!.replace(/^["']|["']$/g, '').trim()
    }
  }

  for (const [key, value] of Object.entries(raw)) {
    if (process.env[key] === undefined) process.env[key] = value
  }

  // Segunda pasada: expande ${VAR} usando lo ya cargado.
  const expand = (value: string): string =>
    value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name: string) => process.env[name] ?? raw[name] ?? '')

  for (const key of Object.keys(raw)) {
    const current = process.env[key]
    if (current && current.includes('${')) {
      process.env[key] = expand(current)
    }
  }
}

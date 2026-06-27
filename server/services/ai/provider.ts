/**
 * Proveedor de IA (enriquecimiento).
 *
 * La IA NUNCA decide la conciliación; solo enriquece (embeddings para recuperar
 * candidatos, explicaciones en lenguaje natural, interpretación de notas).
 *
 * Dos implementaciones intercambiables tras la interfaz `AIProvider`:
 * - `OpenAIProvider`: usa la API de OpenAI vía `fetch` (requiere `OPENAI_API_KEY`).
 * - `MockProvider`: determinístico y sin red; garantiza que la app corra sin key.
 *
 * `useAI()` elige el proveedor según la configuración y lo cachea en `globalThis`
 * para sobrevivir al hot-reload de Nitro.
 */

import { EMBEDDING_DIMENSIONS } from '../../db/types'
import { readAIConfig, type AIConfig } from './config'

export interface CompleteOptions {
  /** Mensaje de sistema opcional para guiar el tono/rol del modelo. */
  system?: string
  /** Límite de tokens de salida. */
  maxTokens?: number
  temperature?: number
}

export interface AIProvider {
  /** Nombre legible del proveedor activo (para logs y auditoría). */
  readonly name: string
  /** `true` si las respuestas provienen de un modelo real (no mock). */
  readonly isLive: boolean
  /** Devuelve un embedding por cada texto de entrada, en el mismo orden. */
  embed(texts: string[]): Promise<number[][]>
  /** Genera texto a partir de un prompt. */
  complete(prompt: string, options?: CompleteOptions): Promise<string>
}

const OPENAI_BASE_URL = 'https://api.openai.com/v1'

class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly isLive = true

  constructor(private readonly config: AIConfig & { apiKey: string }) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: texts
      })
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenAI embeddings ${response.status}: ${detail}`)
    }

    const json = await response.json() as { data: { embedding: number[], index: number }[] }
    return json.data
      .slice()
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding)
  }

  async complete(prompt: string, options: CompleteOptions = {}): Promise<string> {
    const messages: { role: string, content: string }[] = []
    if (options.system) messages.push({ role: 'system', content: options.system })
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.chatModel,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 300
      })
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenAI chat ${response.status}: ${detail}`)
    }

    const json = await response.json() as { choices: { message: { content: string } }[] }
    return json.choices[0]?.message?.content?.trim() ?? ''
  }
}

/**
 * Proveedor mock determinístico.
 *
 * - `embed`: genera un vector estable a partir de un hash del texto, normalizado
 *   a longitud unitaria para que la distancia coseno (`<=>`) sea significativa.
 *   El mismo texto produce siempre el mismo vector → resultados reproducibles.
 * - `complete`: devuelve el prompt resumido; suficiente para no romper el flujo
 *   cuando no hay credenciales. La explicación real degrada a la plantilla del
 *   motor determinístico (ver `enrich.ts`).
 */
class MockProvider implements AIProvider {
  readonly name = 'mock'
  readonly isLive = false

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(text => pseudoEmbedding(text, EMBEDDING_DIMENSIONS))
  }

  async complete(prompt: string): Promise<string> {
    return prompt.length > 280 ? `${prompt.slice(0, 277)}...` : prompt
  }
}

/** Hash determinístico de 32 bits (FNV-1a) usado como semilla del PRNG. */
function hashSeed(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** PRNG determinístico (mulberry32) a partir de una semilla. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Vector pseudo-aleatorio estable y normalizado (norma 1) para un texto. */
function pseudoEmbedding(text: string, dimensions: number): number[] {
  const random = mulberry32(hashSeed(text || 'empty'))
  const vector = new Array<number>(dimensions)
  let norm = 0
  for (let i = 0; i < dimensions; i++) {
    const value = random() * 2 - 1
    vector[i] = value
    norm += value * value
  }
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < dimensions; i++) vector[i] = vector[i]! / norm
  return vector
}

const AI_KEY = Symbol.for('reconciliation.ai.provider')

type GlobalWithAI = typeof globalThis & {
  [AI_KEY]?: { provider: AIProvider, apiKey: string | null }
}

/**
 * Devuelve el proveedor de IA activo (singleton). Se recrea automáticamente si
 * cambia la presencia de `OPENAI_API_KEY` (útil en dev al editar `.env`).
 */
export function useAI(): AIProvider {
  const scope = globalThis as GlobalWithAI
  const config = readAIConfig()

  if (!scope[AI_KEY] || scope[AI_KEY]!.apiKey !== config.apiKey) {
    const provider: AIProvider = config.apiKey
      ? new OpenAIProvider({ ...config, apiKey: config.apiKey })
      : new MockProvider()
    scope[AI_KEY] = { provider, apiKey: config.apiKey }
  }

  return scope[AI_KEY]!.provider
}

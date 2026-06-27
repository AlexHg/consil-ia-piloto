/**
 * Configuración de la capa de IA.
 *
 * La IA es opcional: si no hay `OPENAI_API_KEY` se usa un proveedor mock
 * determinístico (ver `provider.ts`). Centralizar la lectura de env aquí evita
 * strings mágicos dispersos y facilita el fallback.
 */

export interface AIConfig {
  apiKey: string | null
  chatModel: string
  embeddingModel: string
}

export function readAIConfig(): AIConfig {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  return {
    apiKey: apiKey.length > 0 ? apiKey : null,
    chatModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
    embeddingModel: (process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small').trim()
  }
}

/** Indica si hay credenciales para usar el proveedor real de OpenAI. */
export function hasOpenAI(): boolean {
  return readAIConfig().apiKey !== null
}

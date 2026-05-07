import OpenAI from 'openai'

let cached: OpenAI | null = null

/** Inicialización perezosa: evita fallar el build de Next si falta OPENAI_API_KEY. */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada')
  if (!cached) cached = new OpenAI({ apiKey })
  return cached
}

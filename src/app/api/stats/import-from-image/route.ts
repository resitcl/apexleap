import { auth } from '@clerk/nextjs/server'
import { getOpenAI } from '@/lib/openai-client'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: 'OPENAI_API_KEY no configurada.' }, { status: 503 })
  }

  const { imageBase64, athletes, statCols, sport } = await req.json() as {
    imageBase64: string
    athletes: Array<{ id: string; name: string }>
    statCols: Array<{ key: string; label: string; abbr: string }>
    sport: string | null
  }

  if (!imageBase64 || !athletes?.length) {
    return Response.json({ error: 'Imagen y lista de jugadores requeridas.' }, { status: 400 })
  }

  // Límite de tamaño de la imagen (~8 MB de base64) para evitar abuso de costo/DoS contra OpenAI.
  const MAX_IMAGE_BASE64_LEN = 8 * 1024 * 1024
  if (typeof imageBase64 !== 'string' || imageBase64.length > MAX_IMAGE_BASE64_LEN) {
    return Response.json({ error: 'Imagen inválida o demasiado grande.' }, { status: 413 })
  }

  const athleteList = athletes.map((a) => `- ${a.name}`).join('\n')
  const statList    = statCols.map((s) => `${s.abbr} (${s.label})`).join(', ')

  const prompt = `Eres un asistente experto en análisis deportivo. Se te muestra una imagen con estadísticas de un partido de ${sport ?? 'deporte'}.

Tu tarea es extraer las estadísticas de cada jugador visible en la imagen y mapearlos a esta lista de jugadores del club:
${athleteList}

Las estadísticas a buscar son: ${statList}

Reglas:
1. Usa coincidencia aproximada de nombres (ignora tildes, mayúsculas, apellidos parciales).
2. Solo incluye jugadores cuyo nombre puedas identificar razonablemente en la imagen.
3. Omite jugadores con todas las estadísticas en 0.
4. Si ves nombres que no coinciden con la lista, ignóralos.

Responde SOLO con JSON válido en este formato exacto, sin explicaciones adicionales:
{
  "matched": [
    {
      "athlete_id": "ID del atleta de la lista",
      "name": "nombre como aparece en la imagen",
      "stats": {
        "clave_stat": valor_numerico
      }
    }
  ],
  "unmatched": ["nombres que no pudiste mapear"],
  "notes": "observaciones opcionales en español"
}`

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''

    // Extract JSON from markdown code blocks if present
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/(\{[\s\S]*\})/)
    const jsonStr   = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : raw

    const parsed = JSON.parse(jsonStr.trim())
    return Response.json(parsed)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al procesar imagen'
    return Response.json({ error: `Error al analizar imagen: ${msg}` }, { status: 500 })
  }
}

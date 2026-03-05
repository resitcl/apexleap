import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

type SupabaseClient = ReturnType<typeof createAdminClient>

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_clubs',
      description: 'Lista todos los clubes registrados en ApexLeap con sus datos básicos',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_club_details',
      description: 'Obtiene detalles completos de un club: atletas, pagos recientes, suscripciones, horarios y estadísticas',
      parameters: {
        type: 'object',
        properties: {
          club_id: { type: 'string', description: 'UUID del club' },
        },
        required: ['club_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_club',
      description: 'Crea un nuevo club en ApexLeap. Pide al usuario toda la info antes de llamar esta función.',
      parameters: {
        type: 'object',
        properties: {
          name:        { type: 'string', description: 'Nombre del club (ej: "Club Deportivo Shohoku")' },
          slug:        { type: 'string', description: 'Identificador URL único: solo letras minúsculas, números y guiones (ej: "shohoku")' },
          sport_type:  { type: 'string', description: 'Deporte principal (ej: Baloncesto, Fútbol, Judo, Yoga)' },
          city:        { type: 'string', description: 'Ciudad donde opera el club' },
          country:     { type: 'string', description: 'País (default: Chile)', default: 'Chile' },
          timezone:    { type: 'string', description: 'Zona horaria (default: America/Santiago)', default: 'America/Santiago' },
          description: { type: 'string', description: 'Descripción breve del club (opcional)' },
        },
        required: ['name', 'slug'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_club',
      description: 'Actualiza campos de un club existente',
      parameters: {
        type: 'object',
        properties: {
          club_id:     { type: 'string', description: 'UUID del club a actualizar' },
          name:        { type: 'string', description: 'Nuevo nombre' },
          sport_type:  { type: 'string', description: 'Nuevo deporte' },
          city:        { type: 'string', description: 'Nueva ciudad' },
          country:     { type: 'string', description: 'Nuevo país' },
          description: { type: 'string', description: 'Nueva descripción' },
          primary_color: { type: 'string', description: 'Color primario en hex (ej: #FF0000)' },
        },
        required: ['club_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'toggle_club_status',
      description: 'Activa o desactiva un club',
      parameters: {
        type: 'object',
        properties: {
          club_id:   { type: 'string', description: 'UUID del club' },
          is_active: { type: 'boolean', description: 'true = activar, false = desactivar' },
        },
        required: ['club_id', 'is_active'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_athlete',
      description: 'Agrega un nuevo atleta a un club específico',
      parameters: {
        type: 'object',
        properties: {
          club_id:    { type: 'string', description: 'UUID del club' },
          name:       { type: 'string', description: 'Nombre completo del atleta' },
          email:      { type: 'string', description: 'Email del atleta (opcional)' },
          phone:      { type: 'string', description: 'Teléfono (opcional)' },
          birth_date: { type: 'string', description: 'Fecha nacimiento YYYY-MM-DD (opcional)' },
          rut:        { type: 'string', description: 'RUT chileno sin puntos, con guión (opcional)' },
          category:   { type: 'string', description: 'Categoría del atleta (opcional)' },
        },
        required: ['club_id', 'name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'link_user_to_club',
      description: 'Vincula un usuario existente de Clerk a un club con un rol específico usando su Clerk User ID',
      parameters: {
        type: 'object',
        properties: {
          club_id:      { type: 'string', description: 'UUID del club' },
          clerk_user_id:{ type: 'string', description: 'Clerk User ID del usuario (empieza con user_)' },
          role:         { type: 'string', enum: ['admin', 'coach', 'athlete'], description: 'Rol en el club' },
        },
        required: ['club_id', 'clerk_user_id', 'role'],
      },
    },
  },
]

// ── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(name: string, args: Record<string, unknown>, supabase: SupabaseClient): Promise<string> {
  try {
    switch (name) {

      case 'list_clubs': {
        const { data } = await supabase
          .from('clubs')
          .select('id, name, slug, sport_type, city, country, is_active, created_at')
          .order('created_at', { ascending: false })
        if (!data?.length) return 'No hay clubes registrados.'
        return data.map(c =>
          `• ${c.name} (ID: ${c.id}) | slug: ${c.slug} | ${c.sport_type ?? 'Sin deporte'} | ${c.city ?? 'Sin ciudad'} | ${c.is_active ? '✅ Activo' : '❌ Inactivo'}`
        ).join('\n')
      }

      case 'get_club_details': {
        const clubId = args.club_id as string
        const [clubRes, athletesRes, paymentsRes, subsRes] = await Promise.all([
          supabase.from('clubs').select('*').eq('id', clubId).single(),
          supabase.from('athletes').select('id, name, status, health_status').eq('club_id', clubId).limit(50),
          supabase.from('payments').select('id, amount, status, due_date, concept').eq('club_id', clubId).order('created_at', { ascending: false }).limit(20),
          supabase.from('subscriptions').select('id, status, plan_name, end_date').eq('club_id', clubId).eq('status', 'active').limit(20),
        ])
        const club = clubRes.data
        if (!club) return 'Club no encontrado.'
        const athletes = athletesRes.data ?? []
        const payments = paymentsRes.data ?? []
        const subs = subsRes.data ?? []
        const overdue = payments.filter(p => p.status === 'overdue')
        return [
          `CLUB: ${club.name} (${club.sport_type ?? 'N/A'})`,
          `Ciudad: ${club.city ?? 'N/A'} | País: ${club.country ?? 'N/A'}`,
          `Estado: ${club.is_active ? 'Activo' : 'Inactivo'}`,
          `Atletas: ${athletes.length} (${athletes.filter(a => a.status === 'active').length} activos, ${athletes.filter(a => a.health_status === 'injured').length} lesionados)`,
          `Pagos vencidos: ${overdue.length}`,
          `Suscripciones activas: ${subs.length}`,
          athletes.length > 0 ? `\nAtletas:\n${athletes.slice(0, 20).map(a => `  - ${a.name} (${a.status}, ${a.health_status ?? 'sin lesión'})`).join('\n')}` : '',
          overdue.length > 0 ? `\nPagos vencidos:\n${overdue.map(p => `  - $${p.amount} | ${p.concept ?? 'N/A'} | vence: ${p.due_date ?? 'N/A'}`).join('\n')}` : '',
        ].filter(Boolean).join('\n')
      }

      case 'create_club': {
        const { name, slug, sport_type, city, country, timezone, description } = args as Record<string, string>
        const { data, error } = await supabase
          .from('clubs')
          .insert({
            name,
            slug: slug.toLowerCase().replace(/\s+/g, '-'),
            sport_type: sport_type ?? null,
            city: city ?? null,
            country: country ?? 'Chile',
            timezone: timezone ?? 'America/Santiago',
            description: description ?? null,
            is_active: true,
          })
          .select('id, name, slug')
          .single()
        if (error) {
          if (error.code === '23505') return `❌ Ya existe un club con el slug "${slug}". Elige otro identificador.`
          return `❌ Error al crear el club: ${error.message}`
        }
        return `✅ Club "${data.name}" creado exitosamente.\nID: ${data.id}\nSlug: ${data.slug}\nYa puedes configurarlo desde /super-admin/clubs/${data.id}`
      }

      case 'update_club': {
        const { club_id, ...fields } = args as Record<string, string>
        const allowedFields = ['name', 'sport_type', 'city', 'country', 'description', 'primary_color']
        const updates: Record<string, unknown> = {}
        for (const f of allowedFields) {
          if (fields[f] !== undefined) updates[f] = fields[f]
        }
        if (!Object.keys(updates).length) return '❌ No se especificaron campos a actualizar.'
        const { error } = await supabase.from('clubs').update(updates).eq('id', club_id)
        if (error) return `❌ Error al actualizar: ${error.message}`
        return `✅ Club actualizado correctamente. Campos modificados: ${Object.keys(updates).join(', ')}`
      }

      case 'toggle_club_status': {
        const clubId = args.club_id as string
        const isActive = args.is_active as boolean
        const { error } = await supabase.from('clubs').update({ is_active: isActive }).eq('id', clubId)
        if (error) return `❌ Error: ${error.message}`
        return `✅ Club ${isActive ? 'activado' : 'desactivado'} correctamente.`
      }

      case 'add_athlete': {
        const { club_id, name, email, phone, birth_date, rut, category } = args as Record<string, string>
        const { data, error } = await supabase
          .from('athletes')
          .insert({
            club_id,
            name,
            email: email ?? null,
            phone: phone ?? null,
            birth_date: birth_date ?? null,
            rut: rut ?? null,
            category: category ?? null,
            status: 'active',
            health_status: 'healthy',
          })
          .select('id, name')
          .single()
        if (error) return `❌ Error al agregar atleta: ${error.message}`
        return `✅ Atleta "${data.name}" agregado al club.\nID: ${data.id}`
      }

      case 'link_user_to_club': {
        const { club_id, clerk_user_id, role } = args as Record<string, string>
        const { data: existing } = await supabase
          .from('user_clubs')
          .select('id, is_active')
          .eq('user_id', clerk_user_id)
          .eq('club_id', club_id)
          .maybeSingle()
        if (existing) {
          await supabase.from('user_clubs').update({ is_active: true, role }).eq('id', existing.id)
          return `✅ Usuario ya estaba vinculado. Rol actualizado a "${role}".`
        }
        const { error } = await supabase
          .from('user_clubs')
          .insert({ user_id: clerk_user_id, club_id, role, is_active: true })
        if (error) return `❌ Error al vincular usuario: ${error.message}`
        return `✅ Usuario vinculado al club como "${role}".`
      }

      default:
        return `❌ Herramienta desconocida: ${name}`
    }
  } catch (err) {
    return `❌ Error inesperado: ${err instanceof Error ? err.message : String(err)}`
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  // Verify super admin
  const supabase = createAdminClient()
  const { data: sa } = await supabase
    .from('super_admins')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!sa) return new Response('Forbidden — Solo super admins', { status: 403 })

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      'La clave OPENAI_API_KEY no está configurada. Agrégala en .env.local para activar el asistente.',
      { status: 503 }
    )
  }

  const { message, history } = await req.json() as {
    message: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  // Load all clubs for context
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, slug, sport_type, city, country, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const today = new Date().toISOString().split('T')[0]
  const clubsSummary = clubs?.map(c =>
    `• ${c.name} | ID: ${c.id} | slug: ${c.slug} | ${c.sport_type ?? 'N/A'} | ${c.city ?? 'N/A'} | ${c.is_active ? 'Activo' : 'Inactivo'}`
  ).join('\n') ?? 'Sin clubes registrados'

  const systemPrompt = `Eres el asistente IA de ApexLeap con acceso SUPER ADMIN. Puedes consultar y modificar CUALQUIER club de la plataforma.

FECHA HOY: ${today}
TOTAL CLUBES: ${clubs?.length ?? 0}

═══ DIRECTORIO DE CLUBES ═══
${clubsSummary}

═══ CAPACIDADES ═══
1. CONSULTAR — Listar clubes, ver detalles completos de un club específico
2. CREAR CLUB — Crear un nuevo club con la información mínima
3. EDITAR CLUB — Modificar nombre, deporte, ciudad, color, descripción
4. GESTIONAR ESTADO — Activar o desactivar clubes
5. AGREGAR ATLETAS — Añadir atletas directamente a cualquier club
6. VINCULAR USUARIOS — Asignar un usuario existente a un club con un rol

═══ FLUJO CONVERSACIONAL ═══
Cuando el usuario quiera CREAR un club:
  1. Pide el nombre si no lo tiene
  2. Sugiere un slug basado en el nombre (minúsculas, sin espacios)
  3. Pregunta deporte y ciudad
  4. Llama a create_club cuando tengas nombre + slug (mínimo)

Cuando quiera EDITAR un club:
  1. Identifica el club (usa el directorio arriba)
  2. Pregunta qué campo quiere cambiar
  3. Llama a update_club con los cambios

Cuando quiera AGREGAR un atleta:
  1. Identifica el club
  2. Pide nombre completo (obligatorio)
  3. Pregunta email/teléfono/fecha de nacimiento (opcionales)
  4. Llama a add_athlete

═══ INSTRUCCIONES ═══
- Responde SIEMPRE en español, de forma concisa
- Usa los IDs exactos del directorio al llamar herramientas
- Después de ejecutar una acción, confirma el resultado con ✅ o ❌
- Si el usuario menciona un club por nombre, búscalo en el directorio
- Para acciones importantes, confirma los datos antes de ejecutar
- Máximo 250 palabras por respuesta (excepto cuando se listan muchos datos)`

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Phase 1: streaming call with tools
        const stream1 = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          stream: true,
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: 700,
          temperature: 0.5,
        })

        // Accumulate tool calls and text from stream
        const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {}
        let accumulatedContent = ''
        let finishReason = ''
        const formattedToolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] = []

        for await (const chunk of stream1) {
          const delta = chunk.choices[0]?.delta
          const fr = chunk.choices[0]?.finish_reason
          if (fr) finishReason = fr

          if (delta?.content) {
            accumulatedContent += delta.content
            controller.enqueue(encoder.encode(delta.content))
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCallsMap[tc.index]) {
                toolCallsMap[tc.index] = { id: '', name: '', arguments: '' }
              }
              if (tc.id) toolCallsMap[tc.index].id = tc.id
              if (tc.function?.name) toolCallsMap[tc.index].name = tc.function.name
              if (tc.function?.arguments) toolCallsMap[tc.index].arguments += tc.function.arguments
            }
          }
        }

        if (finishReason === 'tool_calls') {
          // Build formatted tool calls for assistant message
          const toolCalls = Object.values(toolCallsMap)
          for (const tc of toolCalls) {
            formattedToolCalls.push({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })
          }

          // Execute each tool
          const toolResultMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
          for (const tc of toolCalls) {
            let result: string
            try {
              const args = JSON.parse(tc.arguments || '{}')
              result = await executeTool(tc.name, args, supabase)
            } catch (err) {
              result = `Error al ejecutar herramienta: ${err instanceof Error ? err.message : String(err)}`
            }
            toolResultMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: result,
            })
          }

          // Phase 2: get final response with tool results, stream it
          const stream2 = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            stream: true,
            messages: [
              ...messages,
              {
                role: 'assistant',
                content: accumulatedContent || null,
                tool_calls: formattedToolCalls,
              },
              ...toolResultMessages,
            ],
            max_tokens: 500,
            temperature: 0.5,
          })

          for await (const chunk of stream2) {
            const text = chunk.choices[0]?.delta?.content ?? ''
            if (text) controller.enqueue(encoder.encode(text))
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        controller.enqueue(encoder.encode(`\n\n❌ Error: ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

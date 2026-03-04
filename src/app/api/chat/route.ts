import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':              'Panel principal (resumen general del club)',
  '/dashboard/athletes':     'Listado de alumnos',
  '/dashboard/payments':     'Gestión de pagos',
  '/dashboard/subscriptions':'Suscripciones y planes',
  '/dashboard/attendance':   'Control de asistencia',
  '/dashboard/calendar':     'Calendario y horarios',
  '/dashboard/documents':    'Documentos del club',
  '/dashboard/finances':     'Finanzas y egresos',
  '/dashboard/inventory':    'Inventario',
  '/dashboard/coach':        'Vista del entrenador',
  '/dashboard/rosters':      'Nóminas y convocatorias',
  '/dashboard/stats':        'Estadísticas y rendimiento',
  '/dashboard/competitions': 'Competencias y torneos',
  '/dashboard/media':        'Media Hub',
  '/dashboard/rules':        'Motor de reglas',
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return new Response('Unauthorized', { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return new Response(
      'La clave OPENAI_API_KEY no está configurada. Agrégala en tu archivo .env.local para activar el asistente.',
      { status: 503 }
    )
  }

  const { message, pagePath, history } = await req.json() as {
    message: string
    pagePath: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  const supabase = createAdminClient()

  const { data: userClub } = await supabase
    .from('user_clubs')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!userClub?.club_id) return new Response('Club no encontrado', { status: 404 })

  const clubId = userClub.club_id

  const today = new Date().toISOString().split('T')[0]
  const todayStart = `${today}T00:00:00`
  const todayEnd   = `${today}T23:59:59`

  const [clubRes, athletesRes, paymentsRes, competitionsRes, subsRes, attendanceTodayRes, financesRes, schedulesRes] = await Promise.all([
    supabase.from('clubs').select('name, sport_type, description').eq('id', clubId).single(),
    supabase.from('athletes').select('id, name, status, health_status').eq('club_id', clubId).limit(200),
    supabase.from('payments').select('id, amount, status, due_date, paid_at, concept, athletes(name)').eq('club_id', clubId).order('created_at', { ascending: false }).limit(300),
    supabase.from('competitions').select('id, name, date, result, opponent, type, status').eq('club_id', clubId).order('date', { ascending: false }).limit(30),
    supabase.from('subscriptions').select('id, status, end_date, plan_name, athletes(name)').eq('club_id', clubId).order('end_date', { ascending: true }).limit(100),
    supabase.from('attendance').select('id, checked_in_at, athletes(name)').eq('club_id', clubId).gte('checked_in_at', todayStart).lte('checked_in_at', todayEnd).limit(100),
    supabase.from('expenses').select('id, amount, category, description, date').eq('club_id', clubId).order('date', { ascending: false }).limit(50),
    supabase.from('schedules').select('id, name, day_of_week, start_time, end_time, capacity').eq('club_id', clubId).eq('is_active', true).limit(30),
  ])

  const clubName   = clubRes.data?.name ?? 'el club'
  const sportType  = clubRes.data?.sport_type ?? null
  const athletes   = athletesRes.data ?? []
  const payments   = paymentsRes.data ?? []
  const competitions = competitionsRes.data ?? []
  const subs       = subsRes.data ?? []
  const checkedInToday = attendanceTodayRes.data ?? []
  const expenses   = financesRes.data ?? []
  const schedules  = schedulesRes.data ?? []

  // Vocabulary from sport type
  const sportLabel = sportType ?? 'club deportivo'
  const athleteWord = ['Básquetbol','Fútbol','Futsal','Vóley','Handball'].includes(sportType ?? '') ? 'jugadores' : 'alumnos'

  const overduePayments = payments.filter((p) => p.status === 'overdue')
  const activeAthletes  = athletes.filter((a) => a.status === 'active')
  const expiringSubs    = subs.filter((s) => s.status === 'active' && s.end_date && s.end_date <= new Date(Date.now() + 7*86400000).toISOString().split('T')[0])
  const activeSubs      = subs.filter((s) => s.status === 'active')

  const athletesSummary = athletes.map((a) => `- ${a.name} (${a.status}, salud: ${a.health_status ?? 'N/A'})`).join('\n')

  const paymentsSummary = payments.slice(0, 100).map((p) => {
    const name = (p.athletes as { name?: string } | null)?.name ?? 'Desconocido'
    let daysOverdue = ''
    if (p.status === 'overdue' && p.due_date) {
      const diff = Math.floor((Date.now() - new Date(p.due_date).getTime()) / 86400000)
      daysOverdue = ` (${diff} días mora)`
    }
    return `- ${name}: $${p.amount} [${p.status}${daysOverdue}] vence:${p.due_date ?? '-'} pagado:${p.paid_at ? p.paid_at.slice(0,10) : 'no'} concepto:${p.concept ?? '-'}`
  }).join('\n')

  const competitionsSummary = competitions.length > 0
    ? competitions.map((c) => `- ${c.name} | tipo:${c.type ?? '-'} | estado:${c.status ?? '-'} | fecha:${c.date ?? '-'} | resultado:${c.result ?? 'N/A'} | vs:${c.opponent ?? '-'}`).join('\n')
    : 'Sin competencias registradas'

  const subsSummary = activeSubs.length > 0
    ? activeSubs.slice(0, 50).map((s) => {
        const name = (s.athletes as { name?: string } | null)?.name ?? 'Desconocido'
        return `- ${name}: plan "${s.plan_name ?? '-'}" vence:${s.end_date ?? '-'}`
      }).join('\n')
    : 'Sin suscripciones activas'

  const attendanceSummary = checkedInToday.length > 0
    ? checkedInToday.map((a) => {
        const name = (a.athletes as { name?: string } | null)?.name ?? 'Desconocido'
        return `- ${name} (${a.checked_in_at?.slice(11,16) ?? '-'})`
      }).join('\n')
    : 'Nadie se ha chequeado hoy aún'

  const expensesSummary = expenses.length > 0
    ? expenses.map((e) => `- $${e.amount} | ${e.category ?? '-'} | ${e.description ?? '-'} | ${e.date ?? '-'}`).join('\n')
    : 'Sin egresos registrados'

  const schedulesSummary = schedules.length > 0
    ? schedules.map((s) => `- ${s.name ?? 'Sesión'} | día ${s.day_of_week ?? '-'} | ${s.start_time ?? '-'}–${s.end_time ?? '-'} | capacidad:${s.capacity ?? 'ilimitada'}`).join('\n')
    : 'Sin horarios configurados'

  const pageLabel = PAGE_LABELS[pagePath] ?? pagePath

  const systemPrompt = `Eres el asistente de IA de "${clubName}", un ${sportLabel}.
Ayudas a administradores y entrenadores a gestionar el club. Responde SIEMPRE en español, de forma concisa y directa.
Usa el lenguaje apropiado para el deporte: en lugar de "alumnos" usa "${athleteWord}" cuando sea relevante.

FECHA HOY: ${today}
DEPORTE DEL CLUB: ${sportLabel}
PÁGINA ACTUAL: ${pageLabel}

═══ ${athleteWord.toUpperCase()} (${athletes.length} total · ${activeAthletes.length} activos) ═══
${athletesSummary}

═══ CHECK-INS HOY (${checkedInToday.length} presentes) ═══
${attendanceSummary}

═══ PAGOS (${payments.length} registros · ${overduePayments.length} vencidos) ═══
${paymentsSummary}

═══ SUSCRIPCIONES (${activeSubs.length} activas · ${expiringSubs.length} vencen esta semana) ═══
${subsSummary}

═══ COMPETENCIAS / CAMPEONATOS (${competitions.length}) ═══
${competitionsSummary}

═══ EGRESOS RECIENTES ═══
${expensesSummary}

═══ HORARIOS / SESIONES ═══
${schedulesSummary}

INSTRUCCIONES:
- Sé preciso con nombres, montos y fechas de los datos reales del club
- Para pagos vencidos siempre indica monto exacto y días de mora
- Para la página actual (${pageLabel}), explica cómo funciona si te lo piden
- Si no tienes el dato exacto, dilo claramente
- Respuestas breves (máx 200 palabras salvo que pidan resumen completo)`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
    max_tokens: 400,
    temperature: 0.6,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) controller.enqueue(encoder.encode(text))
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

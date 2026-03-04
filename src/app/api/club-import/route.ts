import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@clerk/nextjs/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/actions/super-admin'

type Row = Record<string, string | number | null | undefined>

function sheetToRows(wb: XLSX.WorkBook, sheetName: string): Row[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: null })
}

function str(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  return String(v).trim()
}
function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
function bool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase().trim()
  return s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'yes'
}
function parseIntArray(v: unknown): number[] {
  if (!v) return []
  return String(v).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
}

export async function POST(req: NextRequest) {
  // Auth guard
  try { await requireSuperAdmin() } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })

  const supabase = createAdminClient()
  const log: string[] = []
  const errors: string[] = []

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    // ── 1. CONFIG ───────────────────────────────────────────────
    const configRows = sheetToRows(wb, 'CONFIG')
    if (configRows.length === 0) return NextResponse.json({ error: 'Hoja CONFIG vacía' }, { status: 400 })
    const cfg = configRows[0]

    const clubName = str(cfg['name'])
    if (!clubName) return NextResponse.json({ error: 'El campo "name" en CONFIG es obligatorio' }, { status: 400 })

    let slug = str(cfg['slug']) ?? clubName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    // Ensure unique slug
    const { data: existing } = await supabase.from('clubs').select('id').eq('slug', slug).single()
    if (existing) slug = `${slug}-${Date.now()}`

    const { data: club, error: clubErr } = await supabase
      .from('clubs')
      .insert({
        name:            clubName,
        slug,
        sport_type:      str(cfg['sport_type']),
        description:     str(cfg['description']),
        city:            str(cfg['city']),
        country:         str(cfg['country']) ?? 'Chile',
        timezone:        str(cfg['timezone']) ?? 'America/Santiago',
        primary_color:   str(cfg['primary_color']) ?? '#000000',
        secondary_color: str(cfg['secondary_color']) ?? '#ffffff',
        phone:           str(cfg['phone']),
        email:           str(cfg['email']),
        website:         str(cfg['website']),
        address:         str(cfg['address']),
        is_active:       true,
      })
      .select('id')
      .single()

    if (clubErr || !club) return NextResponse.json({ error: `Error creando club: ${clubErr?.message}` }, { status: 500 })
    const clubId = club.id
    log.push(`✅ Club creado: ${clubName} (${clubId})`)

    // Link importing super admin as club admin
    await supabase.from('user_clubs').upsert({ user_id: userId, club_id: clubId, role: 'admin', is_active: true }, { onConflict: 'user_id,club_id' })
    log.push(`✅ Usuario ${userId} vinculado como admin`)

    // ── 2. CATEGORIAS ────────────────────────────────────────────
    const catRows = sheetToRows(wb, 'CATEGORIAS')
    const catMap: Record<string, string> = {}
    for (const row of catRows) {
      const name = str(row['name'])
      if (!name) continue
      const { data: cat } = await supabase
        .from('club_categories')
        .insert({ club_id: clubId, name, color: str(row['color']), description: str(row['description']) })
        .select('id').single()
      if (cat) { catMap[name] = cat.id; log.push(`✅ Categoría: ${name}`) }
      else errors.push(`⚠️ Categoría duplicada/error: ${name}`)
    }

    // ── 3. PLANES ────────────────────────────────────────────────
    const planRows = sheetToRows(wb, 'PLANES')
    const planMap: Record<string, string> = {}
    for (const row of planRows) {
      const name = str(row['name'])
      if (!name) continue
      const { data: plan } = await supabase
        .from('plans')
        .insert({
          club_id:          clubId,
          name,
          description:      str(row['description']),
          price:            num(row['price']) ?? 0,
          enrollment_fee:   num(row['enrollment_fee']) ?? 0,
          billing_cycle:    str(row['billing_cycle']) ?? 'monthly',
          session_limit:    num(row['session_limit']),
          multi_sede:       bool(row['multi_sede']),
          grace_period_days: num(row['grace_period_days']) ?? 3,
          is_visible:       bool(row['is_visible'] ?? true),
          is_active:        true,
        })
        .select('id').single()
      if (plan) { planMap[name] = plan.id; log.push(`✅ Plan: ${name}`) }
      else errors.push(`⚠️ Error plan: ${name}`)
    }

    // ── 4. SEDES ─────────────────────────────────────────────────
    const venueRows = sheetToRows(wb, 'SEDES')
    const venueMap: Record<string, string> = {}
    for (const row of venueRows) {
      const name = str(row['name'])
      if (!name) continue
      const { data: venue } = await supabase
        .from('venues')
        .insert({
          club_id:         clubId,
          name,
          address:         str(row['address']),
          city:            str(row['city']),
          lat:             num(row['lat']),
          lng:             num(row['lng']),
          geofence_radius: num(row['geofence_radius']) ?? 50,
          capacity:        num(row['capacity']),
          is_home_venue:   bool(row['is_home_venue']),
          is_active:       true,
        })
        .select('id').single()
      if (venue) { venueMap[name] = venue.id; log.push(`✅ Sede: ${name}`) }
      else errors.push(`⚠️ Error sede: ${name}`)
    }

    // ── 5. ENTRENADORES ──────────────────────────────────────────
    const coachRows = sheetToRows(wb, 'ENTRENADORES')
    for (const row of coachRows) {
      const name = str(row['name'])
      if (!name) continue
      const { error: coachErr } = await supabase
        .from('coaches')
        .insert({
          club_id:       clubId,
          name,
          email:         str(row['email']),
          phone:         str(row['phone']),
          specialty:     str(row['specialty']),
          bio:           str(row['bio']),
          salary_type:   str(row['salary_type']) ?? 'fixed',
          salary_amount: num(row['salary_amount']) ?? 0,
          is_active:     true,
        })
      if (!coachErr) log.push(`✅ Entrenador: ${name}`)
      else errors.push(`⚠️ Error entrenador ${name}: ${coachErr.message}`)
    }

    // ── 6. HORARIOS ──────────────────────────────────────────────
    const schedRows = sheetToRows(wb, 'HORARIOS')
    for (const row of schedRows) {
      const name = str(row['name'])
      if (!name) continue
      const venueKey = str(row['sede_name'])
      const venueId  = venueKey ? (venueMap[venueKey] ?? null) : null
      if (venueKey && !venueId) errors.push(`⚠️ Sede "${venueKey}" no encontrada para horario "${name}"`)

      const { error: schedErr } = await supabase
        .from('schedules')
        .insert({
          club_id:     clubId,
          venue_id:    venueId,
          name,
          description: str(row['description']),
          day_of_week: parseIntArray(row['day_of_week']),
          start_time:  str(row['start_time']) ?? '09:00',
          end_time:    str(row['end_time'])   ?? '10:00',
          start_date:  new Date().toISOString().slice(0, 10),
          capacity:    num(row['capacity']),
          access_rule: 'subscription',
          is_active:   true,
        })
      if (!schedErr) log.push(`✅ Horario: ${name}`)
      else errors.push(`⚠️ Error horario ${name}: ${schedErr.message}`)
    }

    // ── 7. ATLETAS ───────────────────────────────────────────────
    const athleteRows = sheetToRows(wb, 'ATLETAS')
    for (const row of athleteRows) {
      const name = str(row['name'])
      if (!name) continue
      const catName  = str(row['category_name'])
      const catId    = catName ? (catMap[catName] ?? null) : null

      const { data: ath, error: athErr } = await supabase
        .from('athletes')
        .insert({
          club_id:           clubId,
          name,
          email:             str(row['email']),
          phone:             str(row['phone']),
          document_number:   str(row['document_number']),
          birth_date:        str(row['birth_date']),
          status:            str(row['status']) ?? 'active',
          health_status:     str(row['health_status']) ?? 'healthy',
          category:          catName ?? 'General',
          category_id:       catId,
          jersey_number:     num(row['jersey_number']),
          emergency_contact: str(row['emergency_contact']),
          emergency_phone:   str(row['emergency_phone']),
          notes:             str(row['notes']),
          performance_meta:  {},
          technical_meta:    {},
        })
        .select('id').single()

      if (athErr) { errors.push(`⚠️ Error atleta ${name}: ${athErr.message}`); continue }
      log.push(`✅ Atleta: ${name}`)

      // Create subscription if plan_name provided
      const planName = str(row['plan_name'])
      const planId   = planName ? (planMap[planName] ?? null) : null
      if (ath && planId) {
        const today = new Date().toISOString().slice(0, 10)
        await supabase.from('subscriptions').insert({
          club_id:    clubId,
          athlete_id: ath.id,
          plan_id:    planId,
          status:     'active',
          start_date: today,
          auto_renew: true,
        })
      }
    }

    // ── 8. COMPETENCIAS ──────────────────────────────────────────
    const compRows = sheetToRows(wb, 'COMPETENCIAS')
    for (const row of compRows) {
      const name = str(row['name'])
      if (!name) continue
      const catName = str(row['category_name'])
      const catId   = catName ? (catMap[catName] ?? null) : null
      const { error: compErr } = await supabase
        .from('competitions')
        .insert({
          club_id:     clubId,
          name,
          type:        str(row['type']) ?? 'tournament',
          sport:       str(row['sport']),
          location:    str(row['location']),
          city:        str(row['city']),
          start_date:  str(row['start_date']),
          end_date:    str(row['end_date']),
          category_id: catId,
          description: str(row['description']),
          status:      'upcoming',
        })
      if (!compErr) log.push(`✅ Competencia: ${name}`)
      else errors.push(`⚠️ Error competencia ${name}: ${compErr.message}`)
    }

    // ── 9. REGLAS ────────────────────────────────────────────────
    const ruleRows = sheetToRows(wb, 'REGLAS')
    for (const row of ruleRows) {
      const name = str(row['name'])
      if (!name) continue
      const triggerDays = num(row['trigger_days'])
      const triggerPct  = num(row['trigger_pct'])
      const config: Record<string, number> = {}
      if (triggerDays !== null) config['window_days'] = triggerDays
      if (triggerPct  !== null) config['min_attendance_pct'] = triggerPct

      const { error: ruleErr } = await supabase
        .from('rules')
        .insert({
          club_id:           clubId,
          name,
          type:              str(row['type']) ?? 'financial',
          description:       str(row['description']),
          severity:          str(row['severity']) ?? 'medium',
          action:            str(row['action']) ?? 'notify',
          trigger_condition: config,
          config,
          is_active:         true,
        })
      if (!ruleErr) log.push(`✅ Regla: ${name}`)
      else errors.push(`⚠️ Error regla ${name}: ${ruleErr.message}`)
    }

    return NextResponse.json({
      ok:     true,
      clubId,
      clubName,
      slug,
      log,
      errors,
      summary: {
        categories:   Object.keys(catMap).length,
        plans:        Object.keys(planMap).length,
        venues:       Object.keys(venueMap).length,
        athletes:     athleteRows.length,
        coaches:      coachRows.length,
        schedules:    schedRows.length,
        competitions: compRows.length,
        rules:        ruleRows.length,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado', log, errors }, { status: 500 })
  }
}

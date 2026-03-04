import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { requireSuperAdmin } from '@/lib/actions/super-admin'

/* ──────────────────────────────────────────────────────────────
   Helper: create a styled header row + example rows
────────────────────────────────────────────────────────────── */
function makeSheet(headers: string[], examples: (string | number | null)[][]): XLSX.WorkSheet {
  const data = [headers, ...examples]
  const ws = XLSX.utils.aoa_to_sheet(data)

  // Column widths: max(header, 18)
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }))

  // Bold header row
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c })
    if (!ws[addr]) continue
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E293B' } },
      alignment: { horizontal: 'center' },
    }
  }
  return ws
}

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const wb = XLSX.utils.book_new()

  /* ── 1. INSTRUCCIONES ─────────────────────────────────── */
  const instructions = [
    ['PLANTILLA DE IMPORTACIÓN — ApexLeap'],
    [''],
    ['📋 INSTRUCCIONES'],
    ['1. No cambies los nombres de las hojas ni las cabeceras de columna.'],
    ['2. La hoja CONFIG debe tener exactamente UNA fila de datos (la de tu club).'],
    ['3. En HORARIOS usa el nombre exacto de la sede tal como lo escribiste en SEDES.'],
    ['4. En ATLETAS usa el nombre exacto de la categoría (CATEGORIAS) y del plan (PLANES).'],
    ['5. En COMPETENCIAS usa el nombre exacto de la categoría.'],
    ['6. Campos opcionales pueden dejarse vacíos.'],
    ['7. Fechas en formato YYYY-MM-DD (ej: 2025-03-15).'],
    ['8. Colores en formato HEX (ej: #dc2626).'],
    [''],
    ['📌 VALORES VÁLIDOS'],
    ['status (atletas):', 'active | inactive | suspended'],
    ['health_status:', 'healthy | injured | observation'],
    ['billing_cycle (planes):', 'monthly | quarterly | semiannual | annual | single'],
    ['day_of_week (horarios):', 'números separados por coma: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb, 7=Dom'],
    ['type (competencias):', 'league | tournament | cup | friendly | championship'],
    ['salary_type (entrenadores):', 'fixed | per_session | commission'],
    ['type (reglas):', 'financial | attendance | discipline | documentation'],
    ['severity (reglas):', 'low | medium | high'],
    ['action (reglas):', 'notify | warn | block'],
    [''],
    ['⚠️  Al importar se creará un club NUEVO. El usuario que importa queda como Admin del club.'],
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instructions)
  wsInstr['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'INSTRUCCIONES')

  /* ── 2. CONFIG ────────────────────────────────────────── */
  const wsConfig = makeSheet(
    ['name','slug','sport_type','description','city','country','timezone','primary_color','secondary_color','phone','email','website','address'],
    [['Academia Ejemplo','academia-ejemplo','Artes Marciales','Descripción del club','Santiago','Chile','America/Santiago','#dc2626','#ffffff','+56 9 9999 0000','admin@ejemplo.cl','https://ejemplo.cl','Av. Principal 123']]
  )
  XLSX.utils.book_append_sheet(wb, wsConfig, 'CONFIG')

  /* ── 3. CATEGORIAS ────────────────────────────────────── */
  const wsCats = makeSheet(
    ['name','color','description'],
    [
      ['Senior',      '#3b82f6', 'Mayores de 18 años'],
      ['Sub-20',      '#10b981', 'Entre 15 y 20 años'],
      ['Infantil',    '#f59e0b', 'Menores de 15 años'],
      ['Avanzado',    '#8b5cf6', 'Nivel avanzado'],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsCats, 'CATEGORIAS')

  /* ── 4. PLANES ────────────────────────────────────────── */
  const wsPlans = makeSheet(
    ['name','description','price','enrollment_fee','billing_cycle','session_limit','multi_sede','grace_period_days','is_visible'],
    [
      ['Plan Básico',     'Acceso 2 veces/semana',         35000, 15000, 'monthly',    8,    'false', 3, 'true'],
      ['Plan Intermedio', 'Acceso 4 veces/semana',         55000, 15000, 'monthly',    16,   'false', 3, 'true'],
      ['Plan Elite',      'Acceso ilimitado a todas las clases', 85000, 20000, 'monthly', null, 'true',  5, 'true'],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsPlans, 'PLANES')

  /* ── 5. SEDES ─────────────────────────────────────────── */
  const wsVenues = makeSheet(
    ['name','address','city','lat','lng','geofence_radius','capacity','is_home_venue'],
    [
      ['Sede Principal', 'Av. Principal 123', 'Santiago', -33.4317, -70.6093, 50, 40, 'true'],
      ['Sede Norte',     'Av. Norte 456',     'Santiago', -33.3971, -70.6355, 50, 25, 'false'],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsVenues, 'SEDES')

  /* ── 6. ENTRENADORES ─────────────────────────────────── */
  const wsCoaches = makeSheet(
    ['name','email','phone','specialty','bio','salary_type','salary_amount'],
    [
      ['Carlos Mendoza', 'carlos@ejemplo.cl', '+56 9 8111 2222', 'Karate / Judo',      null,  'fixed', 800000],
      ['Ana Torres',     'ana@ejemplo.cl',    '+56 9 8333 4444', 'Taekwondo',           null,  'fixed', 650000],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsCoaches, 'ENTRENADORES')

  /* ── 7. HORARIOS ─────────────────────────────────────── */
  const wsScheds = makeSheet(
    ['name','sede_name','day_of_week','start_time','end_time','capacity','description'],
    [
      ['Entrenamiento General', 'Sede Principal', '1,3,5', '18:00', '19:30', 30, 'Técnica y acondicionamiento'],
      ['Técnica Avanzada',      'Sede Principal', '2,4',   '19:30', '21:00', 15, 'Cinturones avanzados'],
      ['Infantil',              'Sede Norte',     '2,4,6', '16:00', '17:00', 20, 'Menores de 14 años'],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsScheds, 'HORARIOS')

  /* ── 8. ATLETAS ──────────────────────────────────────── */
  const wsAthletes = makeSheet(
    ['name','email','phone','document_number','birth_date','status','health_status','category_name','plan_name','jersey_number','emergency_contact','emergency_phone','notes'],
    [
      ['Juan Pérez',     'juan@email.com',  '+56 9 7111 0001', '12.345.678-9', '1995-03-15', 'active',   'healthy',     'Senior',   'Plan Elite',       10, 'María Pérez',    '+56 9 7200 0001', null],
      ['Ana González',   'ana@email.com',   '+56 9 7111 0002', '13.456.789-0', '1998-07-22', 'active',   'healthy',     'Senior',   'Plan Intermedio',  7,  'Pedro González', '+56 9 7200 0002', null],
      ['Carlos López',   'carlos@email.com','+56 9 7111 0003', '14.567.890-1', '2001-05-30', 'active',   'observation', 'Sub-20',   'Plan Básico',      null, 'Rosa López',   '+56 9 7200 0003', 'Control médico pendiente'],
      ['Sofía Martínez', 'sofia@email.com', '+56 9 7111 0004', '15.678.901-2', '2003-12-03', 'active',   'healthy',     'Infantil', 'Plan Básico',      null, 'Luis Martínez','+56 9 7200 0004', null],
      ['Diego Rojas',    'diego@email.com', '+56 9 7111 0005', '16.789.012-3', '1993-11-08', 'inactive', 'healthy',     'Senior',   'Plan Elite',       4,  'Carmen Rojas',   '+56 9 7200 0005', 'Inactivo desde octubre'],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsAthletes, 'ATLETAS')

  /* ── 9. COMPETENCIAS ─────────────────────────────────── */
  const wsComps = makeSheet(
    ['name','type','sport','location','city','start_date','end_date','category_name','description'],
    [
      ['Campeonato Regional 2025', 'championship', null,           'Estadio Municipal',  'Santiago', '2025-08-15', '2025-08-17', 'Senior',  'Campeonato regional anual'],
      ['Copa Infantil Primavera',  'cup',          null,           'Sede Principal',     'Santiago', '2025-10-05', '2025-10-05', 'Infantil','Copa de temporada'],
      ['Liga Sub-20 2025',         'league',       null,           'Complejo Deportivo', 'Santiago', '2025-04-01', '2025-11-30', 'Sub-20',  'Liga regular temporada'],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsComps, 'COMPETENCIAS')

  /* ── 10. REGLAS ──────────────────────────────────────── */
  const wsRules = makeSheet(
    ['name','type','description','severity','action','trigger_days','trigger_pct'],
    [
      ['Bloqueo por deuda',          'financial',      'Bloquea si tiene 1+ cuotas vencidas',                    'high',   'block',  null, null],
      ['Advertencia baja asistencia','attendance',     'Advertencia si asistencia < 60% en 30 días',             'medium', 'warn',   30,   60],
      ['Bloqueo por inasistencia',   'attendance',     'Bloquea si no asiste en más de 21 días consecutivos',    'high',   'block',  21,   null],
      ['Documentos por vencer',      'documentation',  'Notifica cuando un documento vence en los próximos 30 días','low', 'notify', 30,   null],
    ]
  )
  XLSX.utils.book_append_sheet(wb, wsRules, 'REGLAS')

  /* ── Serialize ───────────────────────────────────────── */
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="apexleap-club-template.xlsx"',
    },
  })
}

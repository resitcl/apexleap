# 🧪 Guía de Pruebas — ApexLeap Demo

**URL:** `http://localhost:3001`  
**Club demo:** Academia Dragón - Demo  
**Login:** Tu cuenta de Clerk (misma con la que registraste el `user_3AOX9Z0...`)

---

## Preparación previa

1. Ir a [Supabase SQL Editor](https://supabase.com/dashboard)
2. Ejecutar `009_reset_all_data.sql`
3. Ejecutar `010_seed_demo_club.sql`
4. Entrar a `http://localhost:3001` con tu cuenta

---

## Módulo 1 — Dashboard `/dashboard`

**Qué probar:**
- [ ] Verifica que aparezcan los KPIs: atletas activos, ingresos del mes, alertas de morosos
- [ ] Revisa el "Semáforo de disponibilidad": deben aparecer atletas en 🔴 (Diego Muñoz y Rodrigo Fuentes con pagos vencidos/lesionados), 🟡 (Sebastián López, Constanza Ramos en observación) y 🟢 (resto)
- [ ] Confirma que se ven las alertas de pagos vencidos (6 morosos)

---

## Módulo 2 — Atletas `/dashboard/athletes`

**Qué probar:**
- [ ] Lista completa: 18 atletas con distintos estados
- [ ] Filtrar por estado: `active`, `inactive`, `suspended`
- [ ] Filtrar por salud: `healthy`, `injured`, `observation`
- [ ] Hacer click en **Marco Rodríguez** → ver Ficha 360° (Administrativa, Salud, Rendimiento, Técnico)
- [ ] Ver **Diego Muñoz** → debe mostrar lesión activa en rodilla
- [ ] Hacer click en **Tomás Vargas** → estado `suspended`, ver candado 🔒
- [ ] Crear un atleta nuevo desde el botón "Nuevo Atleta"

---

## Módulo 3 — Planes `/dashboard/subscriptions`

**Qué probar:**
- [ ] Ver los 4 planes: Básico $35K, Intermedio $55K, Elite $85K, Semestral $430K
- [ ] Verificar que cada plan muestra cantidad de atletas suscritos
- [ ] Crear un plan nuevo y luego eliminarlo

---

## Módulo 4 — Pagos `/dashboard/payments`

**Qué probar:**
- [ ] Ver resumen KPI: total cobrado / pendiente / vencido
- [ ] Filtrar por estado **Vencido** → deben aparecer 6 pagos (morosos)
- [ ] Filtrar por estado **Pendiente** → 8 pagos del mes actual
- [ ] Usar "Más filtros" → filtrar por método `transfer`
- [ ] Buscar alumno: escribir "Marco" → muestra solo sus pagos
- [ ] Ver el gráfico "Cobrado vs Vencido por Mes" (6 meses de historial)
- [ ] Seleccionar pagos pendientes y usar "Marcar como pagados" (bulk action)
- [ ] Registrar un pago nuevo desde el botón "Registrar Pago"

---

## Módulo 5 — Finanzas `/dashboard/finances`

**Qué probar:**
- [ ] KPIs: ingresos vs egresos, margen del mes
- [ ] Ver egresos por categoría: `rent`, `salary`, `marketing`, `supplies`
- [ ] Verificar gráfico de donut con distribución de categorías
- [ ] Agregar un egreso nuevo (ej: "Compra equipo", categoría `supplies`, $50.000)
- [ ] Ver nómina de entrenadores: Carlos Mendoza $800K, Ana Torres $650K, Pedro Silva $500K

---

## Módulo 6 — Horarios `/dashboard/calendar`

**Qué probar:**
- [ ] Ver los 5 horarios creados (Entrenamiento General, Técnica Avanzada, Sparring, Infantil Sede Norte, Preparación Física)
- [ ] Cambiar entre vista Día / Semana / Mes
- [ ] Filtrar por sede: "Dojo Principal" vs "Sede Norte"
- [ ] Crear un nuevo horario/sesión

---

## Módulo 7 — Asistencia `/dashboard/attendance`

**Qué probar:**
- [ ] Ver registros de los últimos 45 días (~55 check-ins)
- [ ] Filtrar por atleta: buscar "Marco" → ver sus asistencias
- [ ] Filtrar por horario
- [ ] Ver tasa de asistencia por atleta
- [ ] Registrar asistencia manual desde el panel admin

---

## Módulo 8 — Reglas `/dashboard/rules`

**Qué probar:**
- [ ] Ver las 5 reglas configuradas
- [ ] Verificar tipos: `financial`, `attendance`, `documentation`, `discipline`
- [ ] Revisar severidades: high (bloqueo), medium (advertencia), low (notificación)
- [ ] Crear una regla nueva
- [ ] Activar/desactivar una regla con el toggle

---

## Módulo 9 — Nóminas `/dashboard/coach`

**Qué probar:**
- [ ] Ver nómina "Copa Santiago MMA" (próxima, 3 días)
- [ ] Ver nómina "Torneo Regional" (finalizada)
- [ ] Revisar atletas citados: Marco, Fernanda, Matías, Felipe, Cristóbal
- [ ] Confirmar que Diego Muñoz aparece como `absent` (lesionado)
- [ ] Crear una nueva nómina
- [ ] Exportar nómina como PDF

---

## Módulo 10 — Competencias `/dashboard/competitions`

**Qué probar:**
- [ ] Ver 3 competencias con estados distintos: `finished`, `upcoming`
- [ ] Filtrar por estado `upcoming` → mostrar Copa Santiago + Campeonato Nacional
- [ ] Hacer click en "Copa Santiago MMA" → ver detalle y atletas inscritos
- [ ] Agregar una competencia nueva

---

## Módulo 11 — Documentos `/dashboard/documents`

**Qué probar:**
- [ ] Ver 15 documentos con estados: `approved`, `pending`, `expired`
- [ ] Filtrar por estado `expired` → debe aparecer la ficha médica vencida de Constanza Ramos
- [ ] Filtrar por categoría `medical`
- [ ] Ver el documento de Camila Herrera (autorización de apoderado, menor de edad)
- [ ] Subir un documento nuevo

---

## Módulo 12 — Media `/dashboard/media`

**Qué probar:**
- [ ] Ver los 6 items: videos, fotos, documentos
- [ ] Filtrar por tipo `video`
- [ ] Filtrar por categoría `highlight`
- [ ] Buscar por título: "Torneo"
- [ ] Toggle `is_public` en un item

---

## Módulo 13 — Inventario `/dashboard/inventory`

**Qué probar:**
- [ ] Ver 12 items de inventario
- [ ] Filtrar por categoría `equipment`
- [ ] Ver item con condición `poor` (Escudo de golpeo) → debe destacar en rojo
- [ ] Filtrar por `fair` condition
- [ ] Agregar un item nuevo

---

## Módulo 14 — Sedes `/dashboard/venues`

**Qué probar:**
- [ ] Ver las 2 sedes: Dojo Principal y Sede Norte
- [ ] Verificar radio de geofencing (50m)
- [ ] Editar capacidad o dirección de una sede

---

## Flujos Críticos de Negocio

### 🔴 Semáforo Rojo (atleta bloqueado)
1. Ir a **Diego Muñoz** en `/dashboard/athletes`
2. Tiene 2 pagos vencidos + lesión activa → debe aparecer en rojo
3. Intentar citarlo en una nómina → debe mostrar advertencia

### 💳 Cobro vencido → bloqueo automático
1. Ir a `/dashboard/payments?status=overdue`
2. Ver los 6 morosos
3. Marcar uno como pagado → verificar que el semáforo cambia a verde

### 📋 QR Check-in (solo si hay token activo)
1. Ir a un horario activo
2. Generar token QR desde el panel del coach
3. Escanear con celular → registra asistencia

---

## Datos de referencia rápida

| Atleta | Estado | Salud | Plan |
|--------|--------|-------|------|
| Marco Rodríguez | active | healthy | Elite $85K |
| Diego Muñoz | active | **injured** | Elite $85K |
| Sebastián López | active | **observation** | Intermedio $55K |
| Alejandro García | **inactive** | healthy | — |
| Tomás Vargas | **suspended** | healthy | — |
| Constanza Ramos | active | **observation** | Básico $35K |
| Rodrigo Fuentes | active | **injured** | Elite $85K |


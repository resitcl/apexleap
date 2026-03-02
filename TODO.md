# ApexLeap — Estado del Proyecto

> Última actualización: Marzo 2026  
> Para ver cambios en local: `pnpm dev` → http://localhost:3000

---

## Cómo revisar en local

```bash
pnpm dev          # Levanta el servidor en http://localhost:3000
pnpm build        # Verifica que todo compila sin errores
git log --oneline # Ver historial de cambios recientes
```

Páginas principales del dashboard:
| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Panel principal |
| `/dashboard/athletes` | Gestión de alumnos |
| `/dashboard/payments` | Pagos |
| `/dashboard/subscriptions` | Suscripciones |
| `/dashboard/inventory` | Inventario |
| `/dashboard/calendar` | Calendario |
| `/dashboard/attendance` | Asistencia |
| `/dashboard/competitions` | Competencias |
| `/dashboard/documents` | Documentos |
| `/dashboard/finances` | Finanzas |
| `/dashboard/plans` | Planes |
| `/dashboard/rules` | Motor de reglas |
| `/dashboard/venues` | Sedes |

---

## FASE 1 — MVP Core ✅ (Construido)

### Dashboard Admin
- [x] KPIs financieros (MRR, ingresos mes, pendiente, vencido)
- [x] Semáforo de disponibilidad (verde/amarillo/rojo)
- [x] Top 3 atletas por asistencia del mes
- [x] Top 3 morosos
- [x] Alerta atletas sin plan
- [x] Alerta atletas inactivos +30 días
- [x] Alerta documentos vencidos
- [x] Alerta items rotos en inventario
- [x] Alerta items sin stock
- [x] Gráfico ingresos últimos 6 meses
- [x] KPI tasa de retención mensual
- [x] KPI churn rate
- [x] Alerta check-in hoy = 0 (con sesiones programadas)
- [x] Alerta >30% atletas sin check-in en 14 días
- [x] KPI ingresos por atleta activo
- [x] Comparativa vs mes anterior (▲/▼%)
- [ ] Dashboard Entrenador ("War Room") — `/coach/` VACÍO
- [ ] Dashboard Alumno (portal personal) — `/athlete/` VACÍO

### Alumnos / Atletas
- [x] Listado paginado con filtros
- [x] Filtro por estado, salud, plan, suscripción
- [x] Filtro por rango de edad
- [x] Filtro por deuda mínima/máxima
- [x] Filtro documentos vencidos
- [x] Filtro atletas inactivos (+30 días sin check-in)
- [x] Filtro deuda vencida >60 días
- [x] Badge deuda, check-ins, documentos vencidos
- [x] Badge competencias próximas
- [x] Badge plan activo con precio
- [x] Badge sin email registrado
- [x] Badge cumpleaños del mes
- [x] KPI atletas nuevos este mes
- [x] Alerta atletas sin suscripción activa
- [x] Alerta sin teléfono de emergencia
- [x] Ficha Atleta 360° (Admin + Salud + Rendimiento + Técnico)
- [ ] Acciones masivas (recordatorios WhatsApp/Email grupales)
- [ ] Exportación CSV/Excel de atletas

### Planes y Suscripciones
- [x] CRUD de planes
- [x] Listado de suscripciones con filtros
- [x] Filtro por precio de plan (min/max)
- [x] KPI MRR filtrado, tasa de renovación, churn
- [x] KPI duración promedio canceladas
- [x] KPI suscripciones pausadas este mes
- [x] Alerta suscripciones expirando esta semana
- [x] Alerta atletas activos sin suscripción
- [x] Alerta suscripciones con start_date en el futuro
- [ ] Renovación automática (card-on-file) — requiere pasarela
- [ ] Cupones de descuento
- [ ] Planes familiares/grupales

### Pagos
- [x] Listado de pagos con filtros
- [x] KPIs: cobrado mes, vencido, pendiente, pagos hoy
- [x] KPI tasa de cobro
- [x] KPI tasa de recuperación (moras recuperadas)
- [x] Top 3 morosos
- [x] Top 3 pagadores
- [x] Alerta total vencido > MRR
- [x] Alerta pagos pending con due_date pasada
- [x] Alerta pagos sin método de pago
- [x] Alerta pagos vencidos >60 días
- [x] Alerta pagos duplicados posibles
- [x] Gráfico cobrado vs vencido por mes (últimos 6 meses)
- [x] Heatmap pagos por día de semana
- [x] Desglose por método de pago
- [ ] Cobro automático recurrente (webhook pasarelas)
- [ ] Emisión de comprobantes/recibos digitales
- [ ] Multas y recargos automáticos por mora
- [ ] Recordatorios automáticos Email/WhatsApp

### Calendario y Horarios
- [x] Vista semanal de sesiones
- [x] Sesiones recurrentes
- [x] Eventos especiales
- [x] Asignación de coach
- [ ] Gestión de aforos (máx. alumnos por bloque)
- [ ] Reserva de espacios físicos

### Asistencia
- [x] Check-in QR
- [x] Validación geofencing (GPS 50m)
- [x] Dashboard asistencia diaria
- [x] Historial por atleta
- [ ] Justificaciones (panel aprobación)
- [ ] Filtro "Matchday Ready" (>80-90% asistencia)
- [ ] Filtro "Graduation Ready"

### Motor de Reglas
- [x] Configuración de reglas por club
- [x] Tipos: financiero, asistencia, documentación
- [x] Bloqueos automáticos
- [ ] Notificaciones de advertencia 3 días antes de bloqueo
- [ ] Excepciones manuales ("indulto" del admin)

---

## FASE 2 — Competición 🔄 (Parcialmente construido)

### Competencias y Torneos
- [x] CRUD competencias
- [x] Listado con filtros
- [x] Badge en ficha atleta (próximas competencias)
- [ ] Jerarquía Campeonato → Etapas → Partidos
- [ ] Fixture automatizado
- [ ] Live Score (mesa de control digital)
- [ ] Ranking y tablas de posiciones automáticas
- [ ] Líderes de estadísticas

### Nóminas y Citaciones
- [ ] Módulo completo — NO CONSTRUIDO
- [ ] Armado con validación Motor de Reglas
- [ ] Exportación PDF "Matchday Ready"
- [ ] Imagen para RRSS/WhatsApp
- [ ] Push notifications a jugadores citados

### Estadísticas y Analytics
- [ ] Módulo completo — NO CONSTRUIDO
- [ ] Importador CSV/Excel universal
- [ ] Gráficos de radar por jugador
- [ ] Vista por partido (box score)
- [ ] Tablas de líderes

---

## FASE 3 — Contenido y Comunicación ❌ (No construido)

- [ ] Media Hub (Videos, Fotos) — NO CONSTRUIDO
- [ ] Biblioteca de videos con categorización
- [ ] Galería de fotos por campeonato
- [ ] Generador de Matchday Assets (Instagram Stories)
- [ ] Social Share (WhatsApp, Instagram)
- [ ] Contenido exclusivo por plan
- [ ] Panel del Entrenador completo
  - [ ] Pizarra táctica digital
  - [ ] RPE (esfuerzo percibido 1-10)
  - [ ] Scouting de rivales
  - [ ] Cuaderno de notas privadas
- [ ] Notificaciones WhatsApp automáticas
- [ ] Player Cards estilo FIFA

---

## FASE 4 — Operaciones 🔄 (Parcialmente construido)

### Documentos
- [x] Listado y CRUD documentos
- [x] Estados (pendiente, aprobado, vencido)
- [x] Alerta documentos vencidos en dashboard y atletas
- [ ] Firma digital integrada
- [ ] Buscador global por categoría/palabra clave
- [ ] Historial de versiones
- [ ] Permisos por rol (minutas privadas)

### Inventario
- [x] CRUD ítems
- [x] Filtros por categoría, condición, precio, stock
- [x] Asignación a atleta/responsable
- [x] KPIs: % asignados, costo total, stock mínimo
- [x] Alertas: sin stock, sin precio, items rotos, alto valor sin asignar
- [ ] Préstamos temporales con fecha retorno
- [ ] Auditoría por QR
- [ ] Vinculación con pagos (costo reposición)

### Sedes
- [x] CRUD sedes
- [x] Geolocalización básica
- [ ] Calendario de ocupación tipo Google Calendar
- [ ] Bloqueos por mantenimiento con notificación
- [ ] Inventario de sub-espacios (Cancha 1, Gimnasio, etc.)
- [ ] Check-in de sede por QR

### Administración Financiera
- [x] Gestión de egresos
- [x] Nómina de profesores básica
- [x] KPIs ingresos vs egresos
- [ ] Tokenización y cobro recurrente completo
- [ ] Conciliación de transferencias
- [ ] Reportes de rentabilidad exportables (PDF)
- [ ] Proyección de caja próximo mes

---

## Módulos Vacíos (Páginas sin implementar)

| Ruta | Módulo | Prioridad |
|------|--------|-----------|
| `/dashboard/admin/` | Portal Super Admin | Alta |
| `/dashboard/coach/` | Dashboard Entrenador | Alta |
| `/dashboard/athlete/` | Portal Alumno | Alta |

---

## Resumen Ejecutivo

| Fase | Estado | Tareas hechas | Tareas pendientes |
|------|--------|---------------|-------------------|
| Fase 1 — MVP Core | 🟡 ~75% | ~45 | ~15 |
| Fase 2 — Competición | 🔴 ~20% | ~5 | ~20 |
| Fase 3 — Contenido | 🔴 0% | 0 | ~25 |
| Fase 4 — Operaciones | 🟡 ~60% | ~20 | ~15 |
| **TOTAL** | **~40%** | **~70** | **~75** |

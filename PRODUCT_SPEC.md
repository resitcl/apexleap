# Product Spec: ApexLeap

## Visión General

ApexLeap es una plataforma SaaS **multi-tenant** de gestión integral diseñada específicamente para el mercado de **academias de artes marciales y clubes deportivos** (Fútbol, Básquetbol, Yoga, etc.). A diferencia de los administradores tradicionales que solo gestionan cobros, ApexLeap nace para ser un **"Performance Hub"** que fusiona la administración de negocio con el alto rendimiento deportivo.

---

## Problemas que Resolvemos

| Problema | Solución ApexLeap |
|----------|-------------------|
| **Fuga de Ingresos** | Motor de suscripciones autónomo con pagos recurrentes (card-on-file), eliminando dependencia de procesos manuales |
| **Caos Administrativo** | Ficha 360° centralizada con historial financiero, técnico y de salud del atleta |
| **Falta de Inteligencia Deportiva** | "Semáforo de Disponibilidad" que valida en tiempo real elegibilidad para entrenar/competir |

---

## Diferenciadores "Killer Features"

1. **Marcaje de Asistencia Inteligente**: Check-in vía QR fijo con Geolocalización (GPS) para validar presencia física, eliminando fraude
2. **Identidad Propia**: Portal personalizado con branding (logos, colores) y subdominio propio por institución
3. **Elegibilidad y Táctica**: Nóminas automáticas para partidos y reportes de "listo para graduación" basados en umbrales
4. **Gestión Financiera de Doble Capa**: Separación entre Pagos (transaccional) y Administración Financiera (estratégica)

---

## Roles del Sistema

| Rol | Descripción | Acceso Principal |
|-----|-------------|------------------|
| **Super Admin** | Dueños del SaaS | Gestión global de todos los clubs, configuración del sistema |
| **Admin de Club** | Tesorero/Presidente | Dashboard financiero, gestión de socios, pagos, reportes, configuración del club |
| **Entrenador/Coach** | Staff técnico | Semáforo de disponibilidad, nóminas, pizarra táctica, tracking de jugadores |
| **Alumno/Jugador** | Miembros del club | Portal de progreso, check-in QR, calendario, pagos, contenido |

---

## Módulos del Sistema

### 1. Dashboard (Panel de Control)

#### 1.1 Dashboard del Administrador (Visión de Negocio)
- **KPIs Financieros**: MRR, Churn Rate, Cuentas por Cobrar
- **Gráfico de Crecimiento**: Comparativa de inscritos vs mes anterior
- **Alertas de Gestión**: Membresías por vencer, documentos pendientes
- **Ocupación de Sedes**: Mapa de calor de horarios/clases al 100%

#### 1.2 Dashboard del Entrenador ("War Room" Táctico)
- **Semáforo de Disponibilidad (Live)**:
  - 🔴 Rojo: Bloqueado (Moroso o Lesión grave)
  - 🟡 Amarillo: Observación (Fatiga alta RPE o documentos por vencer)
  - 🟢 Verde: Apto para entrenamiento/partido
- **Próxima Sesión**: Acceso rápido a Pizarra Táctica
- **Alerta de Fatiga (RPE)**: Notificación si jugador reportó esfuerzo 9/10
- **Notas Pro del Día**: Observaciones post-clase

#### 1.3 Dashboard del Alumno (Portal de Progreso)
- **Status de Membresía**: Vencimiento + botón de pago rápido
- **Mi Próxima Cita**: Cuenta regresiva para siguiente clase/partido
- **Widget de Progreso**: Gráfico de radar (Fuerza, Técnica, Asistencia, Táctica)
- **Check-in QR Central**: Código siempre visible
- **Contenido Recomendado**: Videos según nivel/cinturón

#### UX Features
- **Modo "Estadio/Dojo"**: Alto contraste para sol/luces fuertes
- **Branding Dinámico**: Colores según configuración de la academia
- **Widgets Colapsables**: Personalización de vista

---

### 2. Alumnos / Integrantes / Jugadores

#### 2.1 KPI Cards Dinámicos
- Disponibilidad Total: % de atletas aptos vs lesionados/suspendidos
- Asistencia Promedio: % de participación del mes

#### 2.2 Filtros Inteligentes
- Por Estado de Salud: Lesionados, En observación, Aptos
- Por Estatus Administrativo: Morosos, Al día, Suspendidos

#### 2.3 Ficha Atleta 360°

| Pestaña | Información |
|---------|-------------|
| **Administrativa** | Plan actual, historial de pagos, documentos legales, estado de suscripción |
| **Salud y Bienestar** | Registro de lesiones, alergias, contacto emergencia, justificativos médicos |
| **Rendimiento** | Estadísticas acumuladas, historial de asistencia, gráfico RPE (fatiga) |
| **Técnico (Metadata)** | Cinturón/Grado (Artes Marciales) o Posición/Camiseta (Clubes) |

#### 2.4 Funcionalidades de Gestión
- **Validación de Documentos**: Estados (Pendiente, Aprobado, Vencido)
- **Historial de Lesiones**: Fecha inicio, diagnóstico, fecha estimada de alta
- **Acciones Masivas**: Recordatorios WhatsApp/Email, convocatorias grupales

---

### 3. Planes

#### 3.1 Reglas de Acceso (Business Rules)
- **Límite de Sesiones**: Ilimitado o limitado (2-3 veces/semana)
- **Multisede**: Entrenar en cualquier sucursal o solo sede origen
- **Nivel de Contenido**: Vincular plan a niveles de biblioteca de videos
- **Pase Diario**: Clase o entrenamiento suelto

#### 3.2 Estructura Financiera
- **Costo de Inscripción (Matrícula)**: Cobro único inicial
- **Ciclos de Facturación Flexibles**: Mensual, trimestral, semestral, anual
- **Renovación Automática**: Cobro recurrente con tarjeta inscrita

#### 3.3 Descuentos y Promociones
- **Cupones de Descuento**: Códigos para campañas específicas
- **Planes Familiares/Grupales**: % descuento automático para 2+ personas

#### Atributos Clave

| Atributo | Propósito |
|----------|-----------|
| Créditos de Clase | Número de reservas permitidas al mes/semana |
| Período de Gracia | Días de acceso tras vencimiento antes de bloquear |
| Visible en Catálogo | Si el plan se puede comprar online |
| Seguro Obligatorio | Cargo adicional anual |

---

### 4. Pagos

#### 4.1 Centro de Procesamiento Multicanal
- **Pasarelas Automáticas**: Webpay, Reveniu, Flow, Khipu, MercadoPago
- **Suscripciones Recurrentes (Card-on-file)**: Cobros automáticos mensuales
- **Gestión de Transferencias**: Repositorio para comprobantes con aprobación
- **Recaudación Presencial (Caja)**: Registro de pagos en efectivo

#### 4.2 Control y Trazabilidad
- **Historial Auditable**: Cliente, plan, monto, estado, método, fecha
- **Logs de Webhooks**: Respuestas de pasarelas externas
- **Buscador y Filtros**: Por estado, fecha, método, plan

#### 4.3 Automatización de Cobranza
- **Recordatorios Inteligentes**: Email/WhatsApp 3 días antes y diarios en mora
- **Motor de Reintentos**: Nuevos intentos en horarios estratégicos
- **Emisión de Comprobantes**: Recibos digitales automáticos

#### 4.4 Integración Operativa
- **Sincronización con QR**: Pago fallido bloquea código QR
- **Alerta al Entrenador**: Semáforo rojo para atletas con deudas
- **Multas y Recargos**: Cargos automáticos por mora

---

### 5. Administración Financiera

#### 5.1 Motor de Recaudación (Ingresos)
- **Tokenización y Recurrencia**: Cobro automático día 1 de cada mes
- **Conciliación de Transferencias**: Aprobación con un clic
- **Gestión de Efectivo (Caja Chica)**: Pagos presenciales
- **Recargos y Multas**: Sistema automático post-vencimiento

#### 5.2 Administración (Egresos y Flujo)
- **Gestión de Gastos**: Arriendo, implementos, servicios
- **Módulo de Nómina (Payroll)**:
  - Sueldo fijo
  - Pago por clase dictada
  - Comisión por alumno asistente
- **Reportes de Rentabilidad**: Ingresos vs Egresos = Utilidad real

#### 5.3 Inteligencia Financiera (KPIs)
- **MRR**: Ingresos asegurados por suscripciones activas
- **Cuentas por Cobrar**: Listado de morosos con cobro masivo
- **Proyección de Caja**: Estimación de ingresos próximo mes

#### User Journey del Cobro Automático
1. **Día -3**: Email/push preventivo de renovación
2. **Día 0**: Intento de cobro automático
3. **Día +1 (falla)**: Reintento + estado "Pendiente"
4. **Día +3 (persiste)**: Estado "Moroso" + bloqueo QR + notificación entrenador

---

### 6. Horarios / Calendario

#### 6.1 Gestión de Horarios Recurrentes
- **Configurador de Sesiones Maestras**: Bloques con repetición automática
- **Asignación de Recursos**: Profesor + lugar físico
- **Gestión de Aforos**: Máximo de alumnos por bloque
- Vista de calendario semanal

#### 6.2 Calendario de Eventos Especiales
- **Agendamiento de Eventos**: Campeonatos, exámenes, seminarios
- **Eventos de Pago Adicional**: Ticket extra independiente de mensualidad
- Vista mensual

#### 6.3 Configuración de Acceso QR
Reglas de acceso por evento:
1. **Abierto a Todo Público**: Cualquier usuario registrado
2. **Restringido por Suscripción**: Solo con Plan Activo de esa disciplina
3. **Restringido por Perfil Técnico**: Solo perfiles específicos

---

### 7. Asistencia

#### 7.1 Métodos de Check-in
- **Self-Check-in vía QR Fijo**: Escaneo con Web App
- **Validación Geográfica (Geofencing)**: GPS dentro del radio del club (50m)
- **Validación Administrativa**: Bloqueo si moroso o lesión crítica

#### 7.2 Dashboard de Asistencia Diaria
- **Métricas de Hoy**: Asistencia total, % ocupación, drop-ins
- **Monitor de Clase Activa**: Lista con foto y estado de salud
- **Alertas de Inasistencia**: No-shows con reserva

#### 7.3 Analítica de Elegibilidad
- **Score de Asistencia Individual**: % acumulado por período
- **Filtro "Matchday Ready"**: Jugadores con >80-90% asistencia
- **Filtro "Graduation Ready"**: Alumnos con mínimo de clases para cambio de grado
- **Reporte de Asistencia Perfecta**: 100% cumplimiento para gamificación

#### 7.4 Gestión de Excepciones
- **Justificaciones**: Panel de aprobación sin afectar elegibilidad
- **Medical Hub**: Registro de lesiones con fecha de alta

#### 7.5 Integración con Finanzas
- **Reporte de Horas/Clase**: Para cálculo de comisiones a profesores

---

### 8. Reglas y Bloqueos Automáticos

#### 8.1 Configuración de Reglas (Por Club)
- **Financieras**: Máximo cuotas impagas → Bloqueo de nómina y contenido
- **Asistencia**: % mínimo en últimos 15-30 días → Inhabilitación para partidos
- **Rendimiento/Disciplina**: Nota mínima → Veto manual del coach
- **Documentación**: Ficha médica vencida → Bloqueo total

#### 8.2 El "Muro de Bloqueo"
1. **En Nóminas**: Nombre en gris con candado 🔒 + explicación
2. **En Contenido**: Videos/fotos bloqueados con mensaje de regularización
3. **En Inscripción**: Cambio de "Activo" a "Suspendido"

#### 8.3 Panel de Cumplimiento
- **Semáforo de Jugadores**: Verde (al día), Amarillo (riesgo), Rojo (bloqueado)
- **Notificaciones de Advertencia**: Alerta 3 días antes del bloqueo

#### Integración con IA
La IA cita directamente la regla: *"No puedes ser citado porque el Club ha configurado que con más de 1 mes de deuda se bloquean las nóminas. Actualmente presentas un atraso de 45 días."*

#### Flexibilidad
- **Excepciones**: Admin puede "indultar" manualmente a un jugador

---

### 9. Nóminas y Citaciones

#### 9.1 Armado con Validación Automática
- Consulta al Motor de Reglas en milisegundos
- Jugadores bloqueados con candado 🔒 y explicación

#### 9.2 Ficha Completa del Partido
- Sede (con link a mapa), Rival, Fecha/Hora, Local/Visitante

#### 9.3 Exportación "Matchday Ready"
- **PDF Profesional**: Escudo, lista de jugadores, dorsales, espacios para firmas
- **Compartir en RRSS/WhatsApp**: Imagen atractiva estilo deportivo

#### 9.4 Notificaciones Proactivas
- Push a jugadores seleccionados: *"Has sido convocado para el partido vs [Rival]"*

---

### 10. Estadísticas

#### 10.1 Importador Universal (Easy-Load)
- **Mapeador Inteligente**: Arrastrar y soltar columnas de Excel/CSV
- **Carga Masiva por Lote**: Todos los partidos de un campeonato
- **API Abierta**: Integraciones con otras plataformas

#### 10.2 Visualización Multinivel
- **Vista Jugador**: Gráficos de radar/líneas de evolución
- **Vista Partido (Box Score)**: Resumen técnico con comparativa
- **Vista Campeonato**: Tablas de líderes automáticas
- **Filtros Temporales**: Temporada, últimos 5 partidos, local/visitante

#### 10.3 Insights Automáticos
- **Comparativa de Categoría**: Métricas vs promedio de liga
- **Detección de Fortalezas/Debilidades**: Resumen automático

#### Integraciones
- **Chat IA**: Responde preguntas analíticas
- **Contenido**: Botón "Generar Highlight"
- **Nómina**: Armar basándose en "Estado de Forma"

#### Ideas Extra
- **Certificados de Rendimiento (PDF)**: Reporte de temporada profesional
- **Dream Team de la Semana**: Equipo ideal automático
- **Mapas de Calor**: Posición de contacto con balón

---

### 11. Competencias (Ligas y Torneos)

#### 11.1 Estructura del Campeonato
- **Jerarquía**: Campeonato → Etapas → Partidos
- **Directorio de Clubes**: Rivales con logos, colores, sedes
- **Bases y Reglamentos**: Vínculo con Documentos

#### 11.2 Fixture e Inteligencia Logística
- **Calendario Automatizado**: Sincronización con calendario general
- **Localía Inteligente**: Reserva automática de cancha si es local
- **Gestión de Horarios**: Alertas de solapamiento

#### 11.3 Live Score
- **Mesa de Control Digital**: Carga de puntos/goles/faltas en vivo
- **Actualización Instantánea**: Marcador en tiempo real
- **Ranking y Tablas**: Posiciones automáticas
- **Líderes de Estadísticas**: Máximos anotadores, asistidores

#### 11.4 Vinculación con Jugador
- **Convocatoria por Partido**: Desde Módulo de Nómina
- **Ficha de Partido**: Estadísticas asociadas al perfil individual

---

### 12. Contenido (Media Hub)

#### 12.1 Gestión de Video
- **Biblioteca de Video**: Carga directa o embed (YouTube, Vimeo, Twitch)
- **Categorización**: Partidos, Highlights, Tutoriales
- **Video-Análisis**: Comentarios con marca de tiempo

#### 12.2 Galería de Fotos
- **Álbumes por Campeonato**: Organización cronológica
- **Etiquetado de Jugadores**: Face Tagging o manual

#### 12.3 Centro de Marketing
- **Generador de Matchday Assets**: Plantillas para Instagram Stories
- **Social Share Directo**: Compartir en WhatsApp, Instagram, Facebook
- **Muro de Comunidad (Feed)**: Red social interna

#### Integraciones
- **Vínculo con Campeonatos**: Videos etiquetados aparecen en torneos
- **Sponsors & Ads**: Banners de patrocinadores
- **Contenido Exclusivo**: Solo para Socios Activos

#### Player Card Viral
Generación automática de tarjeta estilo FIFA/EA Sports cuando jugador alcanza estadística alta

---

### 13. Panel del Entrenador

#### 13.1 Planificador de Sesiones
- **Biblioteca de Ejercicios**: Rutinas guardadas
- **Diseñador de Jugadas (Playbook)**: Herramienta gráfica
- **Sincronización de Estadísticas**: Sugerencias basadas en datos

#### 13.2 Dashboard de Inteligencia 360°
- **Ficha de Rendimiento**: Gráficos de evolución
- **Semáforo de Disponibilidad**: Asistencia, Pagos, Salud
- **Cuaderno de Notas Pro**: Comentarios privados del coach

#### 13.3 Pizarra Digital "Live"
- **Modo Rápido**: Limpieza con un toque
- **Plantillas Predeterminadas**: Media cancha, cancha completa
- **Guardado Instantáneo**: Para análisis post-partido

#### 13.4 Video-Análisis
- **Carga de Partidos**: Subida al módulo de Contenido
- **Etiquetado (Tagging)**: Marcar momentos específicos

#### Ideas Extra
- **RPE (Esfuerzo Percibido)**: Jugador marca 1-10 post-entrenamiento
- **Scouting de Rivales**: Notas de debilidades del contrario
- **MVP del Mes**: Ranking automático gamificado
- **Modo Draft**: Repartir jugadores equilibradamente para torneos internos

---

### 14. Documentos

#### 14.1 Categorización Inteligente
- **Alumnos/Socios**: Fichas médicas, autorizaciones, seguros, DNI
- **Competencia**: Reglamentos, bases, fixtures, tablas
- **Institucional**: Estatutos, T&C, contratos
- **Gobierno/Dirigencia**: Minutas, actas, resoluciones

#### 14.2 Control de Acceso
- **Permisos por Rol**: Minutas privadas, reglamentos públicos
- **Documentos Solo Lectura**: Ver pero no editar

#### 14.3 Herramientas de Gestión
- **Firma Digital Integrada**: Firmar desde celular
- **Buscador Global**: Filtros por deporte, categoría, palabra clave
- **Historial de Versiones**: Guardar versiones anteriores

---

### 15. Inventario

#### 15.1 Catálogo de Artículos
- **Tipificación**: Indumentaria, Balones, Protecciones, Material de entrenamiento
- **Atributos**: Talles, pesos, marcas
- **Estado de Conservación**: Nuevo, Buen estado, Desgastado, Para Reparar

#### 15.2 Trazabilidad y Ubicación
- **Asignación por Sede**: Vínculo a sede física
- **Asignación a Responsable**: Material asignado a entrenador específico
- **Préstamos Temporales**: Registro de salida con fecha de retorno

#### 15.3 Control de Stock
- **Alertas de Stock Mínimo**: Notificación automática
- **Registro de Bajas**: Justificación de pérdida/rotura

#### 15.4 Integración con Operaciones
- **Auditoría mediante QR**: Escaneo para confirmar ubicación
- **Vinculación con Cuotas**: Cargar costo de reposición a ficha de pagos

---

### 16. Sedes

#### 16.1 Perfil Técnico
- **Geolocalización**: Integración Google Maps/Waze
- **Capacidad Operativa**: Aforo máximo de público y deportistas
- **Inventario de Espacios**: Múltiples sub-espacios (Cancha 1, Gimnasio, etc.)

#### 16.2 Estatus de Localía
- **Certificación de Ligas**: Cumplimiento de medidas reglamentarias
- **Configuración de Localía**: Identificación automática de local/visitante

#### 16.3 Gestión de Disponibilidad
- **Calendario de Ocupación**: Vista tipo Google Calendar
- **Bloqueos por Mantenimiento**: Inhabilitar sede con notificación automática

#### 16.4 Control de Accesos
- **Ficha de Servicios**: Vestuarios, Cafetería, Estacionamiento, Desfibrilador
- **Check-in de Sede**: QR asociado a ubicación física

#### Integración con Entrenador
- **Asignación Inteligente**: Solo sedes con equipamiento necesario
- **Logística de Partido**: PDF de nómina con link de sede e instrucciones

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| Frontend | Next.js 14+ (App Router) | SSR, RSC, excelente DX |
| Base de Datos | PostgreSQL via Supabase | RLS nativo, tiempo real |
| Autenticación | Clerk | Multi-tenant friendly |
| Estilos | TailwindCSS | Utility-first |
| Componentes | shadcn/ui | Accesibles, personalizables |
| Iconos | Lucide React | Consistentes, ligeros |
| Validación | Zod + React Hook Form | Type-safe |
| Pasarelas de Pago | Webpay, Flow, Khipu, MercadoPago, Reveniu | Mercado chileno |

---

## Reglas de Negocio Críticas

### Multi-Tenancy
- **CRÍTICO**: Todo dato pertenece a un `club_id`
- Row Level Security (RLS) obligatorio
- Nunca exponer datos entre clubs

### Modelo de Datos Agnóstico
- Usar `metadata` JSONB para campos específicos por disciplina
- No crear tablas específicas por deporte

### Elegibilidad
- Sistema de reglas configurable por club
- Bloqueos automáticos basados en pagos, asistencia, documentación

---

## Roadmap

### Fase 1: MVP Core
- [ ] Dashboard (Admin, Entrenador, Alumno)
- [ ] Gestión de Alumnos (Ficha 360°)
- [ ] Planes y Suscripciones
- [ ] Sistema de Pagos
- [ ] Calendario y Horarios
- [ ] Control de Asistencia (QR + Geofencing)
- [ ] Motor de Reglas y Bloqueos

### Fase 2: Competición
- [ ] Módulo de Nóminas
- [ ] Competencias y Torneos
- [ ] Estadísticas y Analytics
- [ ] Live Score

### Fase 3: Contenido y Comunicación
- [ ] Media Hub (Videos, Fotos)
- [ ] Panel del Entrenador completo
- [ ] Notificaciones WhatsApp
- [ ] Player Cards virales

### Fase 4: Operaciones
- [ ] Gestión de Documentos
- [ ] Inventario
- [ ] Sedes
- [ ] Administración Financiera avanzada

---

## Métricas de Éxito (KPIs)

- **Adopción**: Número de clubs activos
- **Retención**: % de clubs que renuevan mensualmente
- **Engagement**: Frecuencia de uso del dashboard
- **Morosidad**: Reducción del % de cuotas vencidas
- **Asistencia**: Incremento en % de asistencia promedio

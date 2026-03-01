# Documento de Requerimientos Funcionales (DRF): ApexLeap

## 1. Introducción
Este Documento de Requerimientos Funcionales (DRF) detalla de manera exhaustiva las funcionalidades y características del sistema **ApexLeap**, una plataforma SaaS multi-tenant diseñada para la gestión integral de clubes deportivos amateur y academias. El objetivo principal es fusionar la administración de negocio con el alto rendimiento deportivo, resolviendo los desafíos administrativos y potenciando la disciplina y rentabilidad de las instituciones [1].

## 2. Visión General del Sistema
ApexLeap se concibe como un "Performance Hub" que centraliza la gestión de socios, pagos, asistencia, horarios, competencias y contenido. Su arquitectura multi-tenant permite que cada club opere de forma independiente, con su propia configuración y branding, manteniendo la privacidad de sus datos. El sistema está diseñado para ser agnóstico a la disciplina deportiva, permitiendo la adaptación a diferentes necesidades (fútbol, básquetbol, artes marciales, natación, etc.) [1].

### 2.1 Objetivos del Sistema
*   Automatizar la recaudación de ingresos y reducir la fuga de los mismos mediante un motor de suscripciones autónomo.
*   Centralizar la información de los atletas en una "Ficha 360°" que integre historial financiero, técnico y de salud.
*   Proveer herramientas de inteligencia deportiva, como el "Semáforo de Disponibilidad", para optimizar la elegibilidad y el rendimiento de los deportistas.
*   Profesionalizar la gestión administrativa y financiera de los clubes, ofreciendo visibilidad sobre la rentabilidad y el flujo de caja.

### 2.2 Alcance del Sistema
El sistema abarcará módulos clave que cubren desde la administración de socios hasta la analítica de rendimiento, pasando por la gestión de pagos, horarios, asistencia, competencias y contenido multimedia. Se enfocará en la simplicidad de uso y en la resolución de "dolores" administrativos comunes en clubes amateur [1].

## 3. Roles de Usuario y Permisos
ApexLeap define cuatro roles principales, cada uno con un conjunto específico de permisos y responsabilidades para garantizar la seguridad y la coherencia operativa [1].

| Rol | Descripción | Permisos Clave | Responsabilidades | Interacciones Principales |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Propietarios del SaaS. | Gestión de tenants, configuración global, acceso a logs de sistema, gestión de licencias. | Mantenimiento de la plataforma, soporte técnico a clubes, facturación del SaaS. | Panel de administración de tenants, herramientas de monitoreo. |
| **Admin de Club** | Tesorero, presidente o dueño del club/academia. | Configuración completa del club (planes, reglas, branding), gestión financiera, gestión de socios y staff, aprobación de pagos manuales. | Asegurar la salud financiera del club, gestionar la base de socios, configurar la oferta deportiva. | Dashboards financieros, módulo de socios, módulo de planes, módulo de pagos. |
| **Staff / Coach** | Entrenadores, profesores, personal de apoyo. | Toma de asistencia, acceso a fichas de atletas (salud, rendimiento), creación de horarios y pizarras tácticas, gestión de nóminas. | Planificación y ejecución de entrenamientos, seguimiento del rendimiento y salud de atletas, comunicación con jugadores. | Dashboard del entrenador, módulo de asistencia, módulo de tracking, módulo de nóminas. |
| **Socio / Jugador** | Atletas, alumnos o padres de familia. | Acceso a su perfil, historial de pagos, calendario personal, check-in QR, reporte de fatiga (RPE), visualización de contenido. | Cumplimiento de pagos, registro de asistencia, seguimiento de progreso, comunicación con el club. | Dashboard del alumno, portal de pagos, módulo de asistencia, módulo de contenido. |

## 4. Módulo: Dashboard (Panel de Control)
El Dashboard es la interfaz principal para cada rol, ofreciendo una visión consolidada y accionable de la información más relevante. Será "Data-Driven", sugiriendo acciones (Insights) en lugar de solo mostrar datos [1].

### 4.1 Dashboard del Administrador
*   **RF-01: KPIs Financieros:** Visualización de MRR (Monthly Recurring Revenue), Churn Rate (porcentaje de alumnos que se fueron vs. los que entraron) y Cuentas por Cobrar (monto total de deudas activas). Estos KPIs deben ser presentados en "Cards" de fácil lectura [1].
*   **RF-02: Gráfico de Crecimiento:** Comparativa visual del número de inscritos respecto al mes anterior, permitiendo identificar tendencias de crecimiento o decrecimiento [1].
*   **RF-03: Alertas de Gestión:** Notificaciones proactivas sobre:
    *   Lista de alumnos con membresía por vencer (próximos 3 días).
    *   Notificaciones de "Documentos Pendientes" (ej: certificados médicos por validar) [1].
*   **RF-04: Ocupación de Sedes:** Mapa de calor o representación visual que muestre qué horarios o clases están al 100% de capacidad, facilitando la gestión de recursos [1].

### 4.2 Dashboard del Entrenador
*   **RF-05: Semáforo de Disponibilidad (Live):** Una cuadrícula con las fotos de los alumnos citados, indicando su estado de elegibilidad en tiempo real:
    *   🔴 **Rojo:** Bloqueado (Moroso o Lesión grave).
    *   🟡 **Amarillo:** Observación (Fatiga alta RPE o documentos por vencer).
    *   🟢 **Verde:** Apto para entrenamiento/partido [1].
*   **RF-06: Próxima Sesión:** Acceso rápido a la Pizarra Táctica del entrenamiento del día y lista de objetivos técnicos a trabajar [1].
*   **RF-07: Alerta de Fatiga (RPE):** Notificación inmediata si un jugador reportó un esfuerzo de 9/10 el día anterior, indicando un riesgo de lesión [1].
*   **RF-08: Notas Pro del Día:** Espacio para que el entrenador anote observaciones rápidas post-clase, que luego alimentarán el historial 360° del atleta [1].

### 4.3 Dashboard del Alumno
*   **RF-09: Status de Membresía:** Información clara sobre el estado de su plan ("Tu plan vence en X días") con un botón de pago rápido [1].
*   **RF-10: Mi Próxima Cita:** Cuenta regresiva para la siguiente clase o partido convocado [1].
*   **RF-11: Widget de Progreso (Performance):** Gráfico de radar con habilidades (Fuerza, Técnica, Asistencia, Táctica) e insignias/logros ("¡Has asistido 10 veces seguidas!") [1].
*   **RF-12: Check-in QR Central:** El código QR siempre visible o a un toque para facilitar el acceso rápido a la academia [1].
*   **RF-13: Contenido Recomendado:** Video corto de la técnica que le corresponde aprender según su nivel/cinturón [1].

## 5. Módulo: Gestión de Alumnos e Integrantes
Este módulo es el corazón del sistema, centralizando toda la información de los atletas y permitiendo una gestión proactiva. La "Ficha Atleta 360°" es el elemento clave [1].

### 5.1 Ficha Atleta 360°
*   **RF-14: Perfil Centralizado:** Cada alumno tendrá un perfil dividido en cuatro pestañas lógicas:
    *   **Administrativa:** Plan actual, historial de pagos, documentos legales (RUT, contratos) y estado de suscripción [1].
    *   **Salud y Bienestar:** Registro de lesiones, alergias, contacto de emergencia y justificativos médicos cargados [1].
    *   **Rendimiento:** Estadísticas acumuladas (goles, asistencias, técnicas dominadas), historial de asistencia y Gráfico RPE (fatiga) [1].
    *   **Técnico (Metadata):** Campos específicos como Cinturón/Grado (Artes Marciales) o Posición/Camiseta (Clubes), configurables por disciplina [1].
*   **RF-15: Validación de Documentos:** Sistema de estados para certificados médicos o autorizaciones parentales (Pendiente, Aprobado, Vencido) [1].
*   **RF-16: Historial de Lesiones:** Registro detallado con fecha de inicio, diagnóstico y fecha estimada de alta, alimentando el Semáforo del Entrenador [1].

### 5.2 Funcionalidades de Gestión Crítica
*   **RF-17: Acciones Masivas:**
    *   Envío de recordatorios de pago por WhatsApp/Email a todos los "Atrasados" [1].
    *   Convocatoria a un grupo de jugadores a un partido desde la lista filtrada [1].
*   **RF-18: Filtros Inteligentes:** Capacidad de filtrar la lista de alumnos por estado de salud ("Lesionados", "En observación", "Aptos") y estatus administrativo (morosos) [1].

### 5.3 Especificación para el Desarrollador (Modelo de Datos)
*   **RF-19: Entidad `Athlete`:** Debe extender el modelo de `User` y tener una relación `Athlete belongs to Academy (tenant_id)` [1].
*   **RF-20: Atributo `health_status`:** Enum (healthy, injured, observation) [1].
*   **RF-21: Atributo `performance_meta`:** JSONB para guardar métricas específicas de cada disciplina (Basket vs BJJ) sin alterar la estructura de la tabla [1].

## 6. Módulo: Planes, Pagos y Finanzas
Este módulo gestiona la complejidad de los cobros, suscripciones y la administración financiera del club, buscando la autonomía y la transparencia [1].

### 6.1 Configuración de Planes
*   **RF-22: Reglas de Acceso:** Cada plan debe permitir configurar:
    *   **Límite de Sesiones:** Definir si es ilimitado o limitado (ej: 2 o 3 veces por semana), bloqueando accesos excedidos vía Check-in QR [1].
    *   **Multisede:** Marcar si el plan permite entrenar en cualquier sucursal o solo en la "Sede Origen" [1].
    *   **Nivel de Contenido:** Vincular el plan a niveles de la biblioteca de videos (ej: Plan Básico solo ve "Fundamentos") [1].
*   **RF-23: Estructura Financiera Autónoma:**
    *   **Costo de Inscripción (Matrícula):** Cobro único inicial que se suma a la primera mensualidad [1].
    *   **Ciclos de Facturación Flexibles:** Planes trimestrales, semestrales o anuales con descuentos por pago adelantado [1].
    *   **Renovación Automática:** Opción para activar el cobro recurrente automático (Suscripción) mediante la tarjeta inscrita del alumno [1].
*   **RF-24: Gestión de Descuentos y Promociones:**
    *   **Cupones de Descuento:** Creación de códigos (ej: "BASKET2026") para campañas específicas [1].
    *   **Planes Familiares/Grupales:** Lógica para aplicar un % de descuento automático si se inscriben 2 o más personas bajo un mismo "Pagador" [1].

### 6.2 Centro de Procesamiento Multicanal (Pagos)
*   **RF-25: Pasarelas de Pago Automáticas:** Integración con servicios locales (Webpay, Reveniu, Flow, Khipu, MercadoPago) para procesar pagos con tarjetas de débito y crédito [1].
*   **RF-26: Suscripciones Recurrentes (Card-on-file):** Capacidad de enrolar tarjetas para cobros automáticos mensuales [1].
*   **RF-27: Gestión de Transferencias Bancarias:** Repositorio centralizado donde los alumnos cargan sus comprobantes, y el administrador aprueba/rechaza la transacción [1].
*   **RF-28: Recaudación Presencial (Caja):** Interfaz rápida para registrar pagos en efectivo directamente en la recepción [1].

### 6.3 Control y Trazabilidad de Transacciones
*   **RF-29: Historial de Pagos Auditables:** Listado detallado con cliente, plan, monto, estado (Pagado, Pendiente, Fallido), método y fecha [1].
*   **RF-30: Logs de Comunicación (Webhooks):** Registro de respuestas de pasarelas externas para asegurar la coherencia del estado de pago [1].
*   **RF-31: Buscador y Filtros Operativos:** Segmentación por estado de pago, rangos de fecha, método o planes [1].

### 6.4 Automatización de Cobranza y Recuperación
*   **RF-32: Recordatorios Inteligentes:** Envío de notificaciones automáticas vía email y WhatsApp 3 días antes del vencimiento y recordatorios diarios en caso de mora [1].
*   **RF-33: Motor de Reintentos:** En pagos automáticos fallidos, el sistema programa nuevos intentos de cobro en horarios estratégicos [1].
*   **RF-34: Emisión de Comprobantes:** Generación y envío automático de recibos digitales con logo y colores del club [1].

### 6.5 Integración Operativa Crítica
*   **RF-35: Sincronización con Acceso (QR):** El estado de pago impacta directamente en el permiso de entrada, bloqueando el QR si el pago falla [1].
*   **RF-36: Alerta al Entrenador (Semáforo Administrativo):** El módulo de pagos alimenta el tablero del coach, marcando en rojo a los atletas con deudas pendientes [1].
*   **RF-37: Gestión de Multas y Recargos:** Capacidad de configurar el sistema para aplicar automáticamente cargos por mora [1].

### 6.6 Administración Financiera (Egresos y Flujo)
*   **RF-38: Gestión de Gastos:** Registro de costos operativos (arriendo, implementos, servicios básicos) [1].
*   **RF-39: Módulo de Nómina (Payroll):** Cálculo de pago a profesores según sueldo fijo, pago por clase dictada y comisión por alumno asistente [1].
*   **RF-40: Reportes de Rentabilidad:** Comparativa entre Ingresos (Membresías) vs. Egresos (Gastos + Nómina) para calcular la utilidad real [1].

### 6.7 Inteligencia Financiera (KPIs)
*   **RF-41: MRR (Monthly Recurring Revenue):** Visualización de ingresos asegurados por suscripciones activas [1].
*   **RF-42: Cuentas por Cobrar (Deuda):** Listado automático de alumnos morosos con botón de "Cobro masivo vía WhatsApp" [1].
*   **RF-43: Proyección de Caja:** Estimación de ingresos futuros basada en fechas de vencimiento de planes [1].

### 6.8 User Journey del Cobro Automático
El sistema debe seguir el siguiente flujo lógico para la gestión de cobros automáticos [1]:
1.  **Día -3:** Envío de email/push preventivo: "Tu membresía se renovará en 3 días".
2.  **Día 0:** Intento de cobro automático con el token de la tarjeta.
3.  **Día +1 (Si falla):** Reintento de cobro y cambio de estado del alumno a "Pendiente".
4.  **Día +3 (Si persiste el fallo):** Cambio de estado a "Moroso", bloqueo del acceso por QR y notificación al entrenador mediante el "Semáforo Rojo".

## 7. Módulo: Horarios, Calendario y Asistencia
Este módulo organiza las actividades del club y controla la presencia de los integrantes, transformando los datos de asistencia en métricas de elegibilidad [1].

### 7.1 Gestión de Horarios Recurrentes (Clases y Entrenamientos)
*   **RF-44: Configurador de Sesiones Maestras:** Creación de bloques horarios con repetición automática (ej: "BJJ Niños - Lun/Mie/Vie 17:00") [1].
*   **RF-45: Asignación de Recursos:** Definición de profesor responsable y lugar físico (Cancha, Sala, Tatami) para evitar conflictos de espacio [1].
*   **RF-46: Gestión de Aforos:** Establecimiento de un número máximo de alumnos por bloque [1].

### 7.2 Calendario de Eventos Especiales (Hitos y Competencias)
*   **RF-47: Agendamiento de Eventos:** Registro de campeonatos, exámenes de grado, seminarios o reuniones de socios [1].
*   **RF-48: Eventos de Pago Adicional:** Capacidad de configurar eventos que requieren un ticket extra, independiente de la mensualidad [1].

### 7.3 Configuración de Acceso y Validación QR
*   **RF-49: Definición de Privacidad por Evento:** Al crear un horario o evento, el administrador debe seleccionar una de estas reglas de acceso:
    1.  **Abierto a Todo Público:** Cualquier usuario registrado puede marcar asistencia.
    2.  **Restringido por Suscripción:** Acceso solo si el alumno tiene un Plan de Pago Activo que incluya esa disciplina.
    3.  **Restringido por Perfil Técnico:** Acceso solo para perfiles específicos [1].
*   **RF-50: Métodos de Registro y Validación (Check-in):**
    *   **Self-Check-in vía QR Fijo:** El alumno escanea un código impreso en el recinto usando la Web App [1].
    *   **Validación Geográfica (Geofencing):** Utiliza la Geolocation API para confirmar que el alumno está dentro del radio del club [1].
    *   **Validación Administrativa:** Bloqueo del marcaje si el alumno está "Moroso" o posee una "Lesión Crítica" [1].

### 7.4 Analítica de Rendimiento y Elegibilidad
*   **RF-51: Score de Asistencia Individual:** Porcentaje de asistencia acumulado por alumno en periodos configurables [1].
*   **RF-52: Filtro "Matchday Ready":** Vista que destaca a los jugadores con asistencia superior al 80-90% para facilitar la creación de Nóminas [1].
*   **RF-53: Filtro "Graduation Ready":** Identificación automática de alumnos que han cumplido con el mínimo de clases requeridas para optar a un cambio de cinturón o grado [1].

### 7.5 Gestión de Excepciones
*   **RF-54: Justificaciones:** Panel de aprobación para inasistencias por estudio o trabajo que no afecten el porcentaje de elegibilidad [1].
*   **RF-55: Medical Hub:** Registro de lesiones con fecha estimada de alta, justificando automáticamente las faltas durante el periodo de recuperación [1].

## 8. Módulo: Reglas y Bloqueos Automáticos
Este módulo funciona como un "portero" que revisa el estatus de cada jugador antes de permitir acciones clave, basándose en reglas configurables por el club [1].

### 8.1 Configuración de Reglas (Personalizables por Club)
El Administrador puede activar, desactivar o editar los parámetros de cumplimiento [1]:
*   **RF-56: Reglas Financieras:** Máximo de cuotas impagas permitidas (ej. 1 mes de atraso). Acción: Bloqueo de nómina y acceso a contenido premium [1].
*   **RF-57: Reglas de Asistencia:** % mínimo de asistencia a entrenamientos en los últimos 15 o 30 días (ej. 70%). Acción: Inhabilitación para ser citado a partidos oficiales [1].
*   **RF-58: Reglas de Rendimiento/Disciplina:** Nota mínima de comportamiento o cumplimiento de objetivos. Acción: El coach puede poner un "veto manual" justificado [1].
*   **RF-59: Reglas de Documentación:** Ficha médica vencida. Acción: Bloqueo total de actividad física por seguridad legal [1].

### 8.2 El "Muro de Bloqueo" (Impacto en la App)
Cuando un jugador no cumple una regla, la app reacciona de tres formas [1]:
*   **RF-60: En las Nóminas (Para el Entrenador):** Al intentar seleccionar a un jugador, su nombre aparece en gris o con un candado 🔒, explicando el motivo del bloqueo [1].
*   **RF-61: En el Contenido (Para el Jugador):** El módulo de Contenido se bloquea, mostrando un mensaje que incentiva a regularizar la situación [1].
*   **RF-62: En la Inscripción (Estatus de Socio):** Si el incumplimiento es grave, el estatus cambia de "Activo" a "Suspendido", impidiendo ver calendario o estadísticas [1].

### 8.3 Panel de Control de Cumplimiento
*   **RF-63: Semáforo de Jugadores:** Lista donde el Admin ve rápidamente quiénes están en "Verde" (al día), "Amarillo" (en riesgo) y "Rojo" (bloqueados) [1].
*   **RF-64: Notificaciones de Advertencia:** Alerta automática 3 días antes de que un jugador caiga en "bloqueo" por inasistencias o pagos [1].
*   **RF-65: Excepciones Manuales:** El Administrador debe poder "indultar" a un jugador manualmente para anular un bloqueo [1].

## 9. Módulo: Nómina y Citaciones Inteligentes
Este módulo facilita la creación y gestión de nóminas para partidos o eventos, integrando las reglas de elegibilidad del sistema [1].

*   **RF-66: Armado con Validación Automática:** Al seleccionar jugadores, el sistema consulta el Motor de Reglas en milisegundos, mostrando bloqueos con candado 🔒 y el motivo [1].
*   **RF-67: Ficha Completa del Partido:** La nómina incluye automáticamente Sede (con link a mapa), Rival, Fecha/Hora y si el club juega como Local o Visitante [1].
*   **RF-68: Exportación e Impresión "Matchday Ready":** Generación de PDF profesional con escudo del club, lista de jugadores, dorsales y espacios para firmas [1].
*   **RF-69: Compartir en RRSS/WhatsApp:** Creación de imagen atractiva para enviar por grupos del equipo [1].
*   **RF-70: Notificaciones Proactivas:** Los jugadores seleccionados reciben una notificación Push: "Has sido convocado para el partido vs [Rival]" [1].

## 10. Módulo: Estadísticas y Analítica Avanzada
Este módulo permite la ingesta, visualización y análisis de datos de rendimiento, ofreciendo insights valiosos para jugadores y entrenadores [1].

### 10.1 Importador Universal (Easy-Load)
*   **RF-71: Mapeador Inteligente (Data Mapper):** Al subir un archivo (CSV o Excel), el usuario puede "arrastrar y soltar" para emparejar columnas con métricas del sistema [1].
*   **RF-72: Carga Masiva por Lote:** Capacidad de subir todos los partidos de un campeonato en un solo clic [1].
*   **RF-73: API Abierta (Integraciones):** Posibilidad de conectar directamente con otras plataformas para que los datos viajen solos [1].

### 10.2 Visualización Multinivel (Dashboard Dinámico)
*   **RF-74: Vista Jugador (Evolución):** Gráficos de radar o de líneas para ver el progreso individual [1].
*   **RF-75: Vista Partido (Box Score):** Resumen técnico detallado de un encuentro específico, con comparativa directa contra el rival [1].
*   **RF-76: Vista Campeonato:** Tablas de líderes automáticas (Pichichi, máximo reboteador, etc.) [1].
*   **RF-77: Filtros Temporales:** Segmentación por "Esta Temporada", "Últimos 5 partidos", "Partidos de Local", etc. [1].

### 10.3 El "Valor Agregado": Insights Automáticos
*   **RF-78: Comparativa de Categoría:** El jugador puede ver cómo están sus métricas respecto al promedio de su liga o categoría [1].
*   **RF-79: Detección de Fortalezas y Debilidades:** Generación de un resumen de texto automático (ej: "Tu rendimiento sube un 20% cuando juegas de local") [1].

## 11. Módulo: Competencias
Este módulo gestiona la estructura y el desarrollo de ligas y torneos, desde la configuración del fixture hasta la publicación de resultados en tiempo real [1].

### 11.1 Estructura del Campeonato
*   **RF-80: Jerarquía de Eventos:** Un "Campeonato" puede contener múltiples "Etapas" (Fase de grupos, Playoffs) y cientos de "Partidos" [1].
*   **RF-81: Gestión de Rivales (Directorio de Clubes):** Base de datos de equipos contrarios con sus logos, colores y sedes [1].
*   **RF-82: Bases y Reglamentos:** Vínculo directo con el Módulo de Documentos para que cada jugador tenga a mano el PDF de las reglas [1].

### 11.2 Fixture e Inteligencia Logística
*   **RF-83: Calendario Automatizado:** Sincronización con el calendario general del club [1].
*   **RF-84: Localía Inteligente:** Si el club es Local, el sistema reserva automáticamente la cancha; si es Visitante, habilita "Instrucciones de Viaje" [1].
*   **RF-85: Gestión de Horarios:** Alertas automáticas si hay solapamiento de partidos en una misma sede o si un entrenador tiene dos partidos a la misma hora [1].

### 11.3 Estadísticas y Resultados en Tiempo Real (Live Score)
*   **RF-86: Mesa de Control Digital:** Interfaz simplificada para cargar puntos, goles, faltas o tarjetas en vivo [1].
*   **RF-87: Actualización Instantánea:** Los padres y fans ven el marcador cambiar en tiempo real desde su app [1].
*   **RF-88: Ranking y Tablas:** Tabla de posiciones automática y líderes de estadísticas (máximos anotadores, asistidores) [1].

## 12. Módulo: Contenido
Este módulo centraliza la gestión de medios y facilita la comunicación y el marketing del club a través de contenido multimedia [1].

### 12.1 Gestión de Video y Streaming
*   **RF-89: Biblioteca de Video:** Soporte para carga directa (MP4) e integración vía Embed (YouTube, Vimeo, Twitch) [1].
*   **RF-90: Categorización por Contexto:** Videos vinculados a partidos, highlights, tutoriales/entrenamientos [1].
*   **RF-91: Video-Análisis Público o Privado:** Posibilidad de dejar comentarios con marca de tiempo [1].

### 12.2 Galería de Fotos y Eventos
*   **RF-92: Álbumes por Campeonato:** Carpetas organizadas cronológicamente para que los padres descarguen fotos [1].
*   **RF-93: Etiquetado de Jugadores:** Al subir una foto, el admin puede etiquetar al jugador para que aparezca en su Dashboard [1].

### 12.3 Centro de Marketing y Redes Sociales
*   **RF-94: Generador de "Matchday Assets":** Plantillas automáticas para crear imágenes listas para Instagram Stories [1].
*   **RF-95: Social Share Directo:** Botón para compartir cualquier contenido directamente en WhatsApp, Instagram o Facebook [1].
*   **RF-96: Muro de Comunidad (Feed):** Flujo de noticias estilo "red social interna" donde solo el staff sube contenido [1].

## 13. Módulo: Tracking/Entrenador
Este módulo es el "cerebro" táctico para los entrenadores, centralizando la planificación, el seguimiento y la comunicación con los jugadores [1].

### 13.1 Planificador de Sesiones y Pizarra Táctica
*   **RF-97: Biblioteca de Ejercicios:** Espacio para crear y guardar rutinas (calentamiento, técnica, táctica) [1].
*   **RF-98: Diseñador de Jugadas (Playbook):** Herramienta gráfica para dibujar movimientos sobre el campo/cancha [1].
*   **RF-99: Sincronización de Estadísticas:** El sistema sugiere qué jugadores necesitan reforzar ciertas áreas según sus datos previos [1].

### 13.2 Dashboard de Inteligencia del Jugador (360°)
*   **RF-100: Ficha de Rendimiento:** Gráficos de evolución en partidos y entrenamientos [1].
*   **RF-101: Semáforo de Disponibilidad:** Visualización rápida de Asistencia, Pagos y Salud [1].
*   **RF-102: Cuaderno de Notas Pro:** Comentarios privados del coach sobre actitud, disciplina o puntos a mejorar [1].

### 13.3 Pizarra Digital "Live" (Modo Tiempo Muerto)
*   **RF-103: Optimizado para Tablets:** Con alto contraste para visibilidad bajo el sol o luces de estadio [1].
*   **RF-104: Plantillas Predeterminadas:** Fondos de media cancha, cancha completa o zonas específicas [1].
*   **RF-105: Guardado Instantáneo:** Posibilidad de guardar lo dibujado para repasarlo luego [1].

### 13.4 Gestión de Contenido y Video-Análisis
*   **RF-106: Carga de Partidos:** Subida directa al módulo de CONTENIDO [1].
*   **RF-107: Etiquetado (Tagging):** Capacidad de marcar momentos específicos del video (ej: "Minuto 12:40 - Error en salida") [1].

## 14. Módulo: Documentos
Este módulo centraliza la gestión de la documentación del club, permitiendo una categorización inteligente y un control de acceso estricto [1].

*   **RF-108: Categorización Inteligente:** Documentos clasificados por Alumnos/Socios (fichas médicas), Competencia (reglamentos), Institucional (estatutos) y Gobierno/Dirigencia (minutas) [1].
*   **RF-109: Control de Acceso y Privacidad:** Permisos por rol para asegurar que no todos vean todo (ej: minutas privadas, reglamentos públicos) [1].
*   **RF-110: Documentos "Solo Lectura":** Para que los padres puedan ver el reglamento pero no editarlo [1].
*   **RF-111: Firma Digital Integrada:** Permite que un padre firme documentos directamente desde su celular en la app [1].
*   **RF-112: Buscador Global:** Filtros por deporte, categoría o palabra clave [1].
*   **RF-113: Historial de Versiones:** Si las "Bases del Campeonato" cambian, el sistema guarda la versión anterior [1].

## 15. Módulo: Inventario
Este módulo permite un control exhaustivo de los activos y materiales del club, desde indumentaria hasta equipamiento deportivo [1].

*   **RF-114: Catálogo de Artículos y Categorización:** Tipificación por tipo de material (Indumentaria, Balones), atributos específicos (Talles, pesos) y estado de conservación (Nuevo, Desgastado) [1].
*   **RF-115: Trazabilidad y Ubicación:** Asignación por sede y a responsable, con registro de préstamos temporales [1].
*   **RF-116: Control de Stock e Inteligencia:** Alertas de stock mínimo y registro de bajas [1].
*   **RF-117: Auditoría mediante QR:** Cada bolsa de material o equipo grande puede tener un código QR para confirmar su ubicación o reportar daños [1].
*   **RF-118: Vinculación con Cuotas:** Si un jugador pierde su indumentaria, el costo de reposición puede cargarse a su ficha de pagos [1].

## 16. Módulo: Sedes
Este módulo gestiona la infraestructura física del club, optimizando la asignación de espacios y facilitando la logística [1].

*   **RF-119: Perfil Técnico de la Sede:** Geolocalización, capacidad operativa (aforo máximo) e inventario de canchas/espacios [1].
*   **RF-120: Estatus de "Localía" y Competición:** Certificación de ligas y configuración de localía para identificar cuándo el club juega en casa [1].
*   **RF-121: Gestión de Disponibilidad y Reservas:** Calendario de ocupación y bloqueos por mantenimiento con notificación a entrenadores [1].
*   **RF-122: Control de Accesos y Amenidades:** Ficha de servicios (Vestuarios, Cafetería) y Check-in de Sede mediante QR [1].

## 17. Referencias
[1] Apexleap.pdf (Documento proporcionado por el usuario)

## 18. Historias de Usuario

Las siguientes historias de usuario describen las funcionalidades del sistema desde la perspectiva de cada rol, detallando sus necesidades y expectativas. Cada historia sigue el formato "Como [Rol], quiero [acción] para [beneficio]".

### 18.1 Historias de Usuario para el Super Admin
*   **HU-SA-01:** Como Super Admin, quiero poder crear y gestionar nuevos clubes (tenants) para expandir la base de usuarios del SaaS.
*   **HU-SA-02:** Como Super Admin, quiero tener acceso a logs de actividad y métricas de uso de la plataforma para monitorear el rendimiento y la salud del sistema.
*   **HU-SA-03:** Como Super Admin, quiero poder configurar planes de suscripción para los clubes (ej. Basic, Pro, Enterprise) para ofrecer diferentes niveles de servicio.
*   **HU-SA-04:** Como Super Admin, quiero poder enviar notificaciones masivas a todos los clubes para comunicar actualizaciones importantes o mantenimientos programados.

### 18.2 Historias de Usuario para el Admin de Club
*   **HU-AC-01:** Como Admin de Club, quiero cargar masivamente socios desde un archivo Excel para no perder tiempo en la migración inicial de datos.
*   **HU-AC-02:** Como Admin de Club, quiero ver un dashboard con el MRR (Ingresos Recurrentes Mensuales) y el Churn Rate para entender la salud financiera de mi club.
*   **HU-AC-03:** Como Admin de Club, quiero poder configurar diferentes planes de membresía con límites de sesiones y precios variados para adaptarme a las necesidades de mis socios.
*   **HU-AC-04:** Como Admin de Club, quiero recibir alertas automáticas cuando las membresías de mis socios estén por vencer para poder contactarlos proactivamente.
*   **HU-AC-05:** Como Admin de Club, quiero poder aprobar o rechazar comprobantes de transferencia bancaria subidos por los socios para conciliar pagos manuales.
*   **HU-AC-06:** Como Admin de Club, quiero poder enviar recordatorios de pago por WhatsApp/Email a los socios morosos para agilizar la recaudación.
*   **HU-AC-07:** Como Admin de Club, quiero poder configurar reglas de bloqueo automático (ej. por morosidad o documentos vencidos) para asegurar el cumplimiento de las políticas del club.
*   **HU-AC-08:** Como Admin de Club, quiero poder "indultar" manualmente a un socio bloqueado por el sistema para permitir excepciones justificadas.
*   **HU-AC-09:** Como Admin de Club, quiero registrar los gastos operativos de mi club para tener una visión clara de la rentabilidad.
*   **HU-AC-10:** Como Admin de Club, quiero generar reportes de rentabilidad que comparen ingresos y egresos para evaluar la salud financiera del club.

### 18.3 Historias de Usuario para el Staff / Coach
*   **HU-SC-01:** Como Coach, quiero ver el "Semáforo de Disponibilidad" de mis jugadores antes de un partido para no citar a aquellos que estén lesionados o morosos.
*   **HU-SC-02:** Como Coach, quiero registrar la asistencia de mis alumnos mediante un sistema de Check-in QR para tener un control preciso de su presencia.
*   **HU-SC-03:** Como Coach, quiero poder crear y guardar pizarras tácticas para planificar mis entrenamientos y partidos.
*   **HU-SC-04:** Como Coach, quiero recibir alertas si un jugador reportó un nivel de fatiga (RPE) alto para prevenir sobreentrenamiento o lesiones.
*   **HU-SC-05:** Como Coach, quiero tener acceso a la "Ficha 360°" de cada jugador para revisar su historial de rendimiento, salud y asistencia.
*   **HU-SC-06:** Como Coach, quiero poder armar nóminas para partidos, y que el sistema me alerte si algún jugador no es elegible según las reglas del club.
*   **HU-SC-07:** Como Coach, quiero poder registrar lesiones de mis jugadores con fecha de inicio y estimada de alta para un seguimiento adecuado.
*   **HU-SC-08:** Como Coach, quiero poder subir videos de partidos o entrenamientos y etiquetar momentos específicos para análisis posterior con los jugadores.
*   **HU-SC-09:** Como Coach, quiero ver reportes de asistencia de mis jugadores para identificar patrones y fomentar la disciplina.

### 18.4 Historias de Usuario para el Socio / Jugador
*   **HU-SJ-01:** Como Socio, quiero recibir un recordatorio de pago por WhatsApp 3 días antes del vencimiento de mi membresía para no olvidarme de la cuota.
*   **HU-SJ-02:** Como Socio, quiero poder escanear un código QR para registrar mi asistencia al club de forma rápida y sencilla.
*   **HU-SJ-03:** Como Socio, quiero ver mi calendario personal con mis próximas clases y partidos convocados.
*   **HU-SJ-04:** Como Socio, quiero poder ver mi progreso de rendimiento a través de gráficos y estadísticas en mi perfil.
*   **HU-SJ-05:** Como Socio, quiero poder reportar mi nivel de esfuerzo percibido (RPE) después de cada entrenamiento para que mi coach tenga información sobre mi fatiga.
*   **HU-SJ-06:** Como Socio, quiero tener acceso a una biblioteca de videos con tutoriales y highlights de mi deporte.
*   **HU-SJ-07:** Como Socio, quiero poder subir comprobantes de transferencia bancaria para pagar mi membresía.
*   **HU-SJ-08:** Como Socio, quiero recibir notificaciones push cuando sea convocado para un partido o evento.
*   **HU-SJ-09:** Como Socio, quiero poder ver mi estado de membresía y la fecha de vencimiento para estar al tanto de mi situación.

## ApexLeap: Plataforma SaaS Multi-Tenant de Gestión Integral

ApexLeap es una plataforma SaaS multi-tenant de gestión integral diseñada específicamente para el mercado de academias de artes marciales y clubes deportivos (Fútbol, Básquetbol, Yoga, etc.) en Chile. A diferencia de los administradores tradicionales que solo gestionan cobros, ApexLeap nace para ser un "Performance Hub" que fusiona la administración de negocio con el alto rendimiento deportivo.

### Problemas que resolvemos
*   **Fuga de Ingresos:** Automatizamos la recaudación mediante un motor de suscripciones autónomo con pagos recurrentes (card-on-file), eliminando la dependencia de procesos manuales o ERPs externos.
*   **Caos Administrativo:** Centralizamos en una sola Ficha 360° el historial financiero, técnico y de salud del atleta (incluyendo seguimiento de lesiones y justificaciones).
*   **Falta de Inteligencia Deportiva:** Entregamos a los entrenadores un "Semáforo de Disponibilidad" que valida en tiempo real si un deportista es elegible para entrenar o competir basándose en su estado de salud, asistencia y cumplimiento de pagos.

### Diferenciadores "Killer Features"
*   **Marcaje de Asistencia Inteligente:** Implementamos un sistema de Check-in vía QR fijo que utiliza Geolocalización (GPS) para validar que el alumno está físicamente en el recinto, eliminando el fraude y la necesidad de costosos tótems o tablets en la entrada.
*   **Identidad Propia:** Cada institución cuenta con un portal totalmente personalizado con su branding (logos y colores) y subdominio propio.
*   **Elegibilidad y Táctica:** Generamos automáticamente nóminas para partidos y reportes de "listo para graduación" basados en umbrales de asistencia y desempeño técnico.
*   **Gestión Financiera de Doble Capa:** Separamos el módulo de Pagos (transaccional/recaudación) de la Administración Financiera (estratégica con flujos de caja y nómina de profesores), permitiendo una visión clara de la rentabilidad por clase o disciplina.

ApexLeap no solo administra un club; potencia la disciplina de los atletas y profesionaliza la rentabilidad de los dueños, convirtiéndose en el cerebro operativo y deportivo de cualquier institución.

---

## 1. Módulo: Dashboard (Panel de Control)
El Dashboard será "Data-Driven". No solo muestra datos, sino que sugiere acciones (Insights).

### 1.1 Dashboard del Administrador (Visión de Negocio)
Foco: Salud financiera y crecimiento de la academia.
*   **KPIs Financieros (Cards):**
    *   MRR (Ingresos Recurrentes Mensuales): Cuánto dinero "piso" hay este mes.
    *   Churn Rate: % de alumnos que se fueron vs. los que entraron.
    *   Cuentas por Cobrar: Monto total de deudas activas (basado en el motor de pagos).
*   **Gráfico de Crecimiento:** Comparativa de inscritos vs. mes anterior.
*   **Alertas de Gestión:**
    *   Lista de alumnos con membresía por vencer (próximos 3 días).
    *   Notificaciones de "Documentos Pendientes" (ej: certificados médicos por validar).
*   **Ocupación de Sedes:** Mapa de calor de qué horarios/clases están al 100% de capacidad.

### 1.2 Dashboard del Entrenador (El "War Room" Táctico)
Foco: Disponibilidad y rendimiento del equipo. Aquí es donde brilla tu idea del "Semáforo".
*   **Semáforo de Disponibilidad (Live):** Una cuadrícula con las fotos de los alumnos citados hoy.
    *   🔴 Rojo: Bloqueado (Moroso o Lesión grave).
    *   🟡 Amarillo: Observación (Fatiga alta RPE o documentos por vencer).
    *   🟢 Verde: Apto para entrenamiento/partido.
*   **Próxima Sesión:** Acceso rápido a la Pizarra Táctica del entrenamiento de hoy.
    *   Lista de objetivos técnicos a trabajar.
*   **Alerta de Fatiga (RPE):** Notificación inmediata si un jugador reportó un esfuerzo de 9/10 ayer (riesgo de lesión).
*   **Notas Pro del Día:** Espacio para anotar observaciones rápidas post-clase que luego alimentarán el historial 360°.

### 1.3 Dashboard del Alumno (Tu Portal de Progreso)
Foco: Autogestión y motivación (Gamificación).
*   **Status de Membresía:** "Tu plan vence en X días" + Botón de pago rápido.
*   **Mi Próxima Cita:** Cuenta regresiva para la siguiente clase o partido convocado.
*   **Widget de Progreso (Performance):** Gráfico de radar con habilidades (Fuerza, Técnica, Asistencia, Táctica).
    *   Insignias/Logros: "¡Has asistido 10 veces seguidas!" o "MVP del último partido".
*   **Check-in QR Central:** El código QR siempre visible o a un toque para entrar rápido a la academia.
*   **Contenido Recomendado:** Video corto de la técnica que le toca aprender según su nivel/cinturón.

### Detalles de UX (User Experience)
*   **Modo "Estadio/Dojo":** Botón de alto contraste para que el entrenador vea bien el dashboard bajo el sol o luces fuertes.
*   **Branding Dinámico:** Los colores de los gráficos y botones deben cambiar automáticamente según los 16 colores configurados por la academia.
*   **Widgets Colapsables:** El Admin puede elegir qué ver primero (si le importa más la plata o la asistencia).

---

## 2. Módulo: Alumnos / Integrantes / Jugadores

### 2.1 Evolución de la Interfaz (UI/UX)
Basándonos en tu captura actual, añadiremos capas de información para el entrenador y el administrador:
*   **KPI Cards Dinámicos:** Además de los financieros (Ingresos, Morosidad), incluiremos:
    *   Disponibilidad Total: % de atletas aptos vs. lesionados/suspendidos.
    *   Asistencia Promedio: % de participación del mes actual.
*   **Filtros Inteligentes:**
    *   Por Deporte/Categoría: Filtrar por "Basket", "Jiujitsu" o "Yoga" (usando el tenant_id y metadatos). -> NO ES NECESARIO PORQUE UN CLUB TIENE UN DEPORTE
    *   Estado de Salud: Filtrar por "Lesionados", "En observación" o "Aptos".
    *   Estatus Administrativo: Segmentación automática de morosos para acciones rápidas.

### 2.2 La "Ficha Atleta 360°" (Modelo de Datos)
Cada alumno tendrá un perfil centralizado dividido en cuatro pestañas lógicas para mantener el orden que buscas:

| Pestaña | Información Contenida | Fuente de Origen |
| :--- | :--- | :--- |
| Administrativa | Plan actual, historial de pagos, documentos legales (RUT, contratos) y estado de suscripción. | Legacy / Captura |
| Salud y Bienestar | Registro de Lesiones, alergias, contacto de emergencia y Justificativos médicos cargados. | Pizarra / Detalle Tracking |
| Rendimiento | Estadísticas acumuladas (goles, asistencias, técnicas dominadas), historial de asistencia y Gráfico RPE (fatiga). | Pizarra / Detalle Tracking |
| Técnico (Metadata) | Campos específicos: Cinturón/Grado (Artes Marciales) o Posición/Camiseta (Clubes). | Arquitectura Modular |

### 2.3 Funcionalidades de Gestión Crítica
Para que este módulo sea proactivo, implementaremos:
*   **Validación de Documentos:** Un sistema de estados para certificados médicos o autorizaciones parentales (Pendiente, Aprobado, Vencido).
*   **Historial de Lesiones:** No es solo un texto; es un registro con fecha de inicio, diagnóstico y fecha estimada de alta para alimentar el Semáforo del Entrenador.
*   **Acciones Masivas:**
    *   Enviar recordatorios de pago por WhatsApp/Email a todos los "Atrasados".
    *   Convocar a un grupo de jugadores a un partido desde la lista filtrada.

### 🛠 Especificación para el Desarrollador (Windsurf)
*   **Entidad Athlete:** Debe extender el modelo de User.
*   **Relación:** Athlete belongs to Academy (tenant_id).
*   **Atributo health_status:** Enum (healthy, injured, observation).
*   **Atributo performance_meta:** JSONB para guardar métricas específicas de cada disciplina (Basket vs BJJ) sin alterar la estructura de la tabla.

---

## 3. Módulo: Planes

### 3.1 Configuración de Reglas de Acceso (Business Rules)
Un plan no es solo un cobro; es un conjunto de permisos. Cada plan debería permitir configurar:
*   **Límite de Sesiones:** Definir si es ilimitado o limitado (ej: 2 o 3 veces por semana). Esto alimentará directamente el Check-in QR para bloquear accesos excedidos.
*   **Multisede:** Marcar si el plan permite entrenar en cualquier sucursal o solo en la "Sede Origen".
*   **Nivel de Contenido:** Vincular el plan a niveles de la biblioteca de videos (ej: Plan Básico solo ve "Fundamentos"; Plan Pro ve "Tácticas Avanzadas"). o Contenido por ejemplo.
*   **PASE DIARIO:** (clase o entrenamiento suelto)

### 3.2 Estructura Financiera Autónoma
El módulo de planes debe manejar la complejidad de los cobros:
*   **Costo de Inscripción (Matrícula):** Un cobro único inicial que se suma a la primera mensualidad.
*   **Ciclos de Facturación Flexibles:** No solo mensuales; debe permitir planes trimestrales, semestrales o anuales con descuentos por pago adelantado.
*   **Renovación Automática:** Opción para activar el cobro recurrente automático (Suscripción) mediante la tarjeta inscrita del alumno.

### 3.3 Gestión de Descuentos y Promociones
Para que el administrador tenga herramientas de marketing:
*   **Cupones de Descuento:** Creación de códigos (ej: "BASKET2026") para campañas específicas.
*   **Planes Familiares/Grupales:** Lógica para aplicar un % de descuento automático si se inscriben 2 o más personas bajo un mismo "Pagador".

### 📋 Tabla Comparativa de Atributos Sugeridos

| Atributo | Propósito | Impacto en el Producto |
| :--- | :--- | :--- |
| Créditos de Clase | Número de reservas permitidas al mes/semana. | Control de aforo en Pilates/Yoga. |
| Período de Gracia | Días que el sistema permite el acceso tras el vencimiento antes de bloquear. | Experiencia del usuario y retención. |
| Visible en Catálogo | Switch para decidir si el plan se puede comprar online por alumnos nuevos. | Automatización de ventas. |
| Seguro Obligatorio | Cargo adicional anual para clubes deportivos. | Gestión de riesgos en Basket/Fútbol. |

### 💡 Mi recomendación de UX para tu pantalla:
En lugar de una lista plana, podrías usar "Tarjetas de Plan" que muestren visualmente qué incluye cada uno (iconos de video, número de clases, acceso a sedes). Además, añadiría un KPI de "Churn por Plan" para que el dueño de la academia vea cuál de sus planes es el que más alumnos pierde.

**INTEGRACIÓN CON PASARELA DE PAGO** o la más fácil y barata en comisión Kiphu, Flow o REVENEU

---

## 4. Módulo: Pagos
Propósito: Gestionar de forma integral el ciclo de vida de cada transacción individual de los integrantes. Su función principal es asegurar que los compromisos financieros de los alumnos se transformen en dinero efectivo, automatizando el recaudo y facilitando la validación de pagos manuales.

### 4.1 Centro de Procesamiento Multicanal
*   **Pasarelas de Pago Automáticas:** Integración con servicios locales (Webpay, Reveniu, Flow, Khipu, MercadoPago) para procesar pagos con tarjetas de débito y crédito.
*   **Suscripciones Recurrentes (Card-on-file):** Capacidad de enrolar tarjetas para cobros automáticos mensuales, eliminando la necesidad de que el alumno realice el pago manualmente cada mes.
*   **Gestión de Transferencias Bancarias:** Repositorio centralizado donde los alumnos cargan sus comprobantes desde su portal. El administrador visualiza la imagen del depósito y aprueba/rechaza la transacción con un solo clic.
*   **Recaudación Presencial (Caja):** Interfaz rápida para registrar pagos en efectivo directamente en la recepción de la academia o club.

### 4.2 Control y Trazabilidad de Transacciones
*   **Historial de Pagos Auditables:** Listado detallado que incluye: cliente, plan asociado, monto, estado (Pagado, Pendiente, Fallido), método utilizado y fecha exacta.
*   **Logs de Comunicación (Webhooks):** Registro de las respuestas enviadas por las pasarelas externas para garantizar que el estado del pago en la plataforma coincida siempre con la realidad bancaria.
*   **Buscador y Filtros Operativos:** Capacidad de segmentar el listado por estado de pago, rangos de fecha, método de pago o planes específicos para agilizar las conciliaciones diarias.

### 4.3 Automatización de Cobranza y Recuperación
*   **Recordatorios Inteligentes:** Envío de notificaciones automáticas vía email y WhatsApp 3 días antes del vencimiento y recordatorios diarios en caso de mora.
*   **Motor de Reintentos:** En pagos automáticos fallidos, el sistema programa nuevos intentos de cobro en horarios estratégicos antes de marcar al alumno como deudor.
*   **Emisión de Comprobantes:** Generación y envío automático de recibos digitales con el logo y colores de la academia una vez confirmado el ingreso del dinero.

### 4.4 Integración Operativa Crítica
*   **Sincronización con Acceso (QR):** El estado de pago impacta directamente en el permiso de entrada. Un pago fallido o una transferencia rechazada bloquea automáticamente el código QR del alumno.
*   **Alerta al Entrenador (Semáforo Administrativo):** El módulo de pagos alimenta el tablero del coach, marcando en rojo a los atletas que tienen deudas pendientes, permitiendo al club decidir si el jugador puede participar en entrenamientos o competencias.
*   **Gestión de Multas y Recargos:** Capacidad de configurar el sistema para aplicar automáticamente cargos por mora después de una fecha límite de pago establecida en el plan.

---

## 5. Módulo: Admin Financiera

### 5.1 Motor de Recaudación (Ingresos)
Es el "Cajero Automático" que procesa el dinero de los alumnos.
*   **Tokenización y Recurrencia:** Integración nativa con pasarelas chilenas (Webpay OneClick, MercadoPago) para inscribir tarjetas y realizar el cobro automático el día 1 de cada mes.
*   **Conciliación de Transferencias:** Módulo para que el alumno suba el comprobante de transferencia y el administrador lo apruebe con un clic, activando la membresía al instante.
*   **Gestión de Efectivo (Caja Chica):** Registro de pagos presenciales en la recepción de la academia con generación de comprobante digital.
*   **Recargos y Multas:** Sistema automático que suma un porcentaje o monto fijo si el pago se realiza después de la fecha de vencimiento.

### 5.2 Administración Financiera (Egresos y Flujo)
No solo es recibir dinero, sino saber en qué se gasta.
*   **Gestión de Gastos:** Registro de costos operativos como arriendo de canchas, compra de implementos (balones, equipo) o servicios básicos.
*   **Módulo de Nómina (Payroll):** Basado en la pizarra, este sistema calcula el pago a profesores según:
    *   Sueldo fijo.
    *   Pago por clase dictada (conectado al calendario).
    *   Comisión por alumno asistente (conectado a la asistencia).
*   **Reportes de Rentabilidad:** Comparativa entre Ingresos (Membresías) vs. Egresos (Gastos + Nómina) para calcular la utilidad real del mes.

### 5.3 Inteligencia Financiera (KPIs)
Visualizaciones críticas para el dueño de la academia:
*   **MRR (Monthly Recurring Revenue):** Ingresos que el sistema ya tiene "asegurados" por suscripciones activas.
*   **Cuentas por Cobrar (Deuda):** Listado automático de alumnos morosos con botón de "Cobro masivo vía WhatsApp".
*   **Proyección de Caja:** Estimación de cuánto dinero ingresará el próximo mes basado en las fechas de vencimiento de los planes.

### 📋 El "User Journey" del Cobro Automático
Para que Windsurf programe la lógica correcta, este es el flujo sugerido:
1.  **Día -3:** El sistema envía un email/push preventivo: "Tu membresía se renovará en 3 días".
2.  **Día 0:** El sistema intenta el cobro automático con el token de la tarjeta.
3.  **Día +1 (Si falla):** El sistema reintenta el cobro y cambia el estado del alumno a "Pendiente".
4.  **Día +3 (Si persiste el fallo):** El sistema cambia el estado a "Moroso", bloquea el acceso por QR y notifica al entrenador mediante el "Semáforo Rojo".

---

## 6. Módulo: Horarios / Calendario

### 6.1 Segmentación A: Gestión de Horarios Recurrentes (Clases y Entrenamientos)
Orientado a la rutina semanal fija de la academia o club.
*   **Configurador de Sesiones Maestras:** Creación de bloques horarios con repetición automática (ej: "BJJ Niños - Lun/Mie/Vie 17:00").
*   **Asignación de Recursos:** Definición de profesor responsable y lugar físico (Cancha, Sala, Tatami) para evitar conflictos de espacio.
*   **Gestión de Aforos:** Establecimiento de un número máximo de alumnos por bloque para evitar sobrecupos.
*   (Vista de calendario Semanal)

### 6.2 Segmentación B: Calendario de Eventos Especiales (Hitos y Competencias)
Orientado a actividades puntuales que rompen la rutina.
*   **Agendamiento de Eventos:** Registro de campeonatos, exámenes de grado, seminarios o reuniones de socios.
*   **Eventos de Pago Adicional:** Capacidad de configurar eventos que requieren un ticket extra, independiente de la mensualidad (ej: un seminario internacional).
*   (Vista Mensual)

### 6.3 Configuración de Acceso y Validación QR (El Motor de Filtro)
Esta es la capa lógica que decide si el sistema permite el "Marcaje de Asistencia" al escanear el QR:
*   **Definición de Privacidad por Evento:** Al crear cualquier horario o evento, el administrador debe seleccionar una de estas tres reglas de acceso:
    1.  **Abierto a Todo Público:** Cualquier usuario registrado (o incluso externos si se desea) puede marcar asistencia sin importar su plan.
    2.  **Restringido por Suscripción:** El sistema solo permite el acceso si el alumno tiene un Plan de Pago Activo que incluya esa disciplina o categoría específica.
    3.  **Restringido por Perfil Técnico:** Solo acceso a perfiles específicos.

### 💡 Ejemplo de Flujo de Marcaje:
1.  El alumno llega al club y escanea su QR en el tótem de entrada para la clase de "Basket Sub-15".
2.  El sistema verifica en el Calendario: "¿Hay una clase de Basket ahora?" → Sí.
3.  El sistema verifica la Suscripción: "¿Este alumno tiene el Plan Basket al día?" → Sí.
4.  El sistema registra la Asistencia y abre el acceso. (Si fuera un "Evento Abierto/Comunidad", el sistema saltaría el paso 3 y registraría la asistencia directamente).

---

## 7. Módulo: Asistencia
Propósito: Gestionar la presencia física de los integrantes y transformar esos datos en métricas de elegibilidad para competencias, convocatorias y ascensos de grado.

### 7.1 Métodos de Registro y Validación (Check-in)
*   **Self-Check-in vía QR Fijo:** El alumno escanea un código impreso en el recinto usando la Web App.
*   **Validación Geográfica (Geofencing):** El sistema utiliza la Geolocation API para confirmar que el alumno está dentro del radio del club (ej. 50 metros), evitando registros fraudulentos.
*   **Validación Administrativa:** El sistema bloquea el marcaje si el alumno está "Moroso" en el módulo de Pagos o posee una "Lesión Crítica".

### 7.2 Vista Operativa: Dashboard de Asistencia Diaria
Interfaz diseñada para que el administrador o coach vea el pulso del club en tiempo real:
*   **Métricas de Hoy:** Visualización de "Asistencia Total del Día", "% de Ocupación" frente al aforo programado y número de "Drop-ins" (visitas).
*   **Monitor de Clase Activa:** Lista de alumnos que han marcado entrada en el bloque horario actual, con su foto y estado de salud.
*   **Alertas de Inasistencia:** Listado de alumnos que tenían reserva y no han marcado asistencia (No-show).

### 7.3 Analítica de Rendimiento y Elegibilidad (Vistas de Historial)
Esta sección procesa la data acumulada para determinar quién cumple con los requisitos del club:
*   **Score de Asistencia Individual:** Porcentaje de asistencia acumulado por alumno en periodos configurables (mes, temporada, ciclo de grado).
*   **Filtro "Matchday Ready" (Clubes Deportivos):** Vista que destaca a los jugadores con asistencia superior al 80-90% para facilitar la creación de Nóminas a Partidos y campeonatos.
*   **Filtro "Graduation Ready" (Artes Marciales):** Identificación automática de alumnos que han cumplido con el mínimo de clases requeridas para optar a un cambio de cinturón o grado.
*   **Reporte de Asistencia Perfecta:** Listado de alumnos con 100% de cumplimiento para sistemas de gamificación (MVP, insignias).

### 7.4 Gestión de Excepciones (Medical & Justificaciones)
*   **Justificaciones:** Panel de aprobación para inasistencias por estudio o trabajo que no afecten el porcentaje de elegibilidad.
*   **Medical Hub:** Registro de lesiones con fecha estimada de alta. El sistema justifica automáticamente las faltas durante el periodo de recuperación.

### 7.5 Integración con Nómina y Finanzas
*   **Reporte de Horas/Clase:** Consolidado de asistencias validadas para el cálculo automático de comisiones a profesores en el módulo de Administración Financiera.

---

## 8. Módulo: Reglas
Módulo de Reglas y Bloqueos Automáticos
El sistema funciona como un "portero" que revisa el estatus de cada jugador antes de permitir acciones clave.

### 8.1 Configuración de Reglas (Personalizables por Club)
El Administrador puede activar, desactivar o editar los parámetros de cumplimiento:
*   **Financieras:** Regla: Máximo de cuotas impagas permitidas (ej. 1 mes de atraso). Acción: Bloqueo de nómina y acceso a contenido premium.
*   **Asistencia:** Regla: % mínimo de asistencia a entrenamientos en los últimos 15 o 30 días (ej. 70%). Acción: Inhabilitación para ser citado a partidos oficiales.
*   **Rendimiento/Disciplina (Criterio del Coach):** Regla: Nota mínima de comportamiento o cumplimiento de objetivos. Acción: El coach puede poner un "veto manual" justificado que bloquea al jugador para la siguiente fecha.
*   **Documentación:** Regla: Ficha médica vencida. Acción: Bloqueo total de actividad física por seguridad legal.

### 8.2 El "Muro de Bloqueo" (Impacto en la App)
Cuando un jugador no cumple una regla, la app reacciona de tres formas:
1.  **En las Nóminas (Para el Entrenador):** Al intentar seleccionar a un jugador para un campeonato, su nombre aparece en gris o con un candado 🔒. Al tocar el nombre, el sistema explica: "No elegible: Deuda de 2 meses y asistencia inferior al 60%".
2.  **En el Contenido (Para el Jugador):** El módulo de Contenido (videos de partidos, fotos, jugadas) se bloquea. Aparece un mensaje: "Para ver este contenido, debes regularizar tu situación administrativa". Esto incentiva el pago y la asistencia.
3.  **En la Inscripción (Estatus de Socio):** Si el incumplimiento es grave o prolongado, el sistema cambia el estatus de "Activo" a "Suspendido", impidiendo que el jugador vea su calendario o estadísticas.

### 8.3 Panel de Control de Cumplimiento
*   **Semáforo de Jugadores:** Una lista donde el Admin ve rápidamente quiénes están en "Verde" (al día), "Amarillo" (en riesgo) y "Rojo" (bloqueados).
*   **Notificaciones de Advertencia:** El sistema envía una alerta automática 3 días antes de que un jugador caiga en "bloqueo" por inasistencias o pagos, dándole la oportunidad de corregirlo.

### 🤖 Integración con la IA
La IA se vuelve el "árbitro" imparcial. Como mencionamos antes, cuando alguien pregunte por qué no puede jugar, la IA citará directamente la regla configurada:
"No puedes ser citado porque el Club ha configurado que con más de 1 mes de deuda se bloquean las nóminas. Actualmente presentas un atraso de 45 días."

### 💡 Valor Agregado: Flexibilidad
Es vital permitir "Excepciones". El Administrador debe poder "indultar" a un jugador manualmente (por ejemplo, si tuvo una emergencia familiar que justifica sus faltas) para que el entrenador pueda citarlo a pesar de la regla.

---

## 9. Módulo: Nómina
Módulo de Nóminas y Citaciones Inteligentes

### 9.1 Armado con Validación Automática:
*   Al seleccionar jugadores, el sistema consulta el Motor de Reglas en milisegundos.
*   Si un jugador tiene deudas, falta de asistencia o documentos vencidos, aparecerá bloqueado con un candado 🔒. Al tocarlo, el coach verá: "Bloqueado: Deuda de 2 cuotas".

### 9.2 Ficha Completa del Partido:
*   La nómina no es solo una lista; incluye automáticamente: Sede (con link a mapa), Rival, Fecha/Hora y si el club juega como Local o Visitante.

### 9.3 Exportación e Impresión "Matchday Ready":
*   PDF Profesional: Genera una planilla limpia con el escudo del club, lista de jugadores, dorsales y espacios para firmas, lista para imprimir y entregar en la mesa de control del torneo.
*   Compartir en RRSS/WhatsApp: Crea una imagen atractiva (estilo diseño deportivo) para enviar por los grupos del equipo, facilitando la comunicación con padres y jugadores.

### 9.4 Notificaciones Proactivas:
*   Una vez confirmada la nómina, los jugadores seleccionados reciben una notificación Push: "Has sido convocado para el partido vs [Rival]".

He guardado estas especificaciones en una lista llamada "Funcionalidades Módulo de Nóminas y Citaciones" para que puedas consultarla en el futuro.

---

## 10. Módulo: Estadísticas
Módulo de Ingesta y Analítica Avanzada

### 10.1 Importador Universal (Easy-Load)
Como los datos suelen venir de apps específicas (ej. NBN23 para básquet, Veo para video-análisis o planillas de Excel manuales), el sistema debe ser agnóstico:
*   **Mapeador Inteligente (Data Mapper):** Al subir un archivo (CSV o Excel), el usuario puede "arrastrar y soltar" para emparejar las columnas. Ej: "La columna 'FG%' de mi Excel corresponde a 'Efectividad de Campo' en la App".
*   **Carga Masiva por Lote:** Capacidad de subir todos los partidos de un campeonato en un solo clic.
*   **API Abierta (Integraciones):** Posibilidad de conectar directamente con otras plataformas para que los datos viajen solos.

### 10.2 Visualización Multinivel (Dashboard Dinámico)
El valor real está en cómo se consumen estos datos:
*   **Vista Jugador (Evolución):** Gráficos de radar o de líneas para ver el progreso. "¿He mejorado mi porcentaje de tiros libres en los últimos 3 meses?".
*   **Vista Partido (Box Score):** El resumen técnico detallado de un encuentro específico, con comparativa directa contra el rival.
*   **Vista Campeonato:** Tablas de líderes automáticas. Quién es el "Pichichi", el máximo reboteador o el jugador más disciplinado (menos tarjetas).
*   **Filtros Temporales:** Poder segmentar por: "Esta Temporada", "Últimos 5 partidos", "Partidos de Local", etc.

### 10.3 El "Valor Agregado": Insights Automáticos
*   **Comparativa de Categoría:** El jugador puede ver cómo están sus métricas respecto al promedio de su liga o categoría. "Estás en el 10% superior de asistentes de la liga U17".
*   **Detección de Fortalezas y Debilidades:** La app genera un resumen de texto automático: "Tu rendimiento sube un 20% cuando juegas de local" o "El equipo pierde más balones en el 3er cuarto".

### 🔗 Integración con el Ecosistema
1.  **Con el Chat IA:** La IA ahora puede responder: "¿En qué período del año tuvimos mejor defensa?" o "Analiza si los jugadores que más faltas cometen son también los que tienen más deudas".
2.  **Con el Módulo de Contenido:** Al ver una estadística impresionante (ej. un triple doble), aparece un botón de "Generar Highlight" para buscar el video de ese partido.
3.  **Con la Nómina:** El entrenador puede armar la nómina del próximo partido basándose en el "Estado de Forma" (promedio de estadísticas de los últimos 3 partidos).

### 💡 Ideas Extra para Potenciar el Amateurismo
A. **Certificados de Rendimiento (PDF):** Al final de cada mes o campeonato, el jugador puede descargar un "Reporte de Temporada" profesional con sus fotos y estadísticas, ideal para enviarlo a becas universitarias o simplemente como recuerdo.
B. **El "Dream Team" de la Semana:** Un algoritmo que elige automáticamente el "Equipo Ideal" del club basándose exclusivamente en las estadísticas cargadas esa semana en todas las categorías.
C. **Mapas de Calor (Heatmaps):** Para fútbol o básquet, si los datos incluyen posición, mostrar dónde tuvo más contacto con el balón el jugador.

---

## 11. Módulo: Competencias
Módulo de Competiciones: Ligas y Torneos

### 11.1 Estructura del Campeonato
*   **Jerarquía de Eventos:** Un "Campeonato" (ej. Liga Federal 2026) puede contener múltiples "Etapas" (Fase de grupos, Playoffs) y cientos de "Partidos".
*   **Gestión de Rivales (Directorio de Clubes):** Base de datos de equipos contrarios con sus logos, colores y sedes habituales para que el fixture se vea profesional.
*   **Bases y Reglamentos:** Vínculo directo con el Módulo de Documentos para que cada jugador tenga a mano el PDF de las reglas y criterios de desempate.

### 11.2 Fixture e Inteligencia Logística
*   **Calendario Automatizado:** Sincronización con el calendario general del club.
*   **Localía Inteligente:** Si el club es Local, el sistema reserva automáticamente la cancha en el Módulo de Sedes. Si es Visitante, habilita un campo de "Instrucciones de Viaje" y mapa de la sede rival.
*   **Gestión de Horarios:** Alertas automáticas si hay solapamiento de partidos en una misma sede o si un entrenador tiene dos partidos a la misma hora.

### 11.3 Estadísticas y Resultados en Tiempo Real (Live Score)
*   **Mesa de Control Digital:** Una interfaz simplificada para que un delegado o asistente cargue puntos, goles, faltas o tarjetas en vivo.
*   **Actualización Instantánea:** Los padres y fans que no asistieron ven el marcador cambiar en tiempo real desde su app.
*   **Ranking y Tablas:** Tabla de posiciones automática (Puntos, PJ, PG, PP, Diferencia de tantos/goles).
*   **Líderes de Estadísticas:** Ranking de máximos anotadores, asistidores o vallas menos vencidas del torneo.

### 11.4 Vinculación con el Jugador y la Nómina
*   **Convocatoria por Partido:** El entrenador selecciona a los jugadores del Módulo de Nómina.
*   **Ficha de Partido:** Al finalizar, el sistema asocia las estadísticas del partido al perfil individual del jugador (alimentando el Dashboard de Rendimiento que vimos al principio).

### 📊 Panel de Visualización Dinámica

| Función | Descripción |
| :--- | :--- |
| Vista Fixture | Calendario tipo "brackets" (eliminatorias) o lista cronológica (todos contra todos). |
| Modo Live | Visualización especial con cronómetro y eventos clave (goles, faltas técnicas, cambios). |
| Análisis Comparativo | "Cara a Cara" (H2H) con el rival antes del partido basado en resultados previos. |

---

## 12. Módulo: Contenido
Módulo de Contenido: Media Hub & Social Marketing

### 12.1 Gestión de Video y Streaming
*   **Biblioteca de Video:** Soporte para carga directa (MP4) y, sobre todo, integración vía Embed (YouTube, Vimeo, Twitch).
*   **Categorización por Contexto:** Partidos: Vinculados directamente a un evento del calendario. Highlights (Jugadas destacadas): Clips cortos de los mejores momentos. Tutoriales/Entrenamientos: Videos técnicos que el coach sube para que los alumnos practiquen en casa.
*   **Video-Análisis Público o Privado:** Posibilidad de dejar comentarios con marca de tiempo (ej. "Minuto 2:15 - Gran bloqueo").

### 12.2 Galería de Fotos y Eventos
*   **Álbumes por Campeonato:** Carpetas organizadas cronológicamente para que los padres descarguen fotos de los partidos.
*   **Etiquetado de Jugadores:** (Face Tagging o Manual) Al subir una foto, el admin puede etiquetar al jugador. Esto hace que la foto aparezca automáticamente en el Dashboard del Jugador (sección Onboarding/Perfil).

### 12.3 Centro de Marketing y Redes Sociales
*   **Generador de "Matchday Assets":** Plantillas automáticas donde la app toma la foto del jugador, el logo del club y los datos del partido (Sede y Hora) para crear una imagen lista para Instagram Stories.
*   **Social Share Directo:** Botón para compartir cualquier contenido (un resultado, una foto, un video de YouTube) directamente en WhatsApp, Instagram o Facebook con un link que redirija a la app del club.
*   **Muro de Comunidad (Feed):** Un flujo de noticias estilo "red social interna" donde solo el staff sube contenido y los usuarios pueden dar "Me gusta" o reaccionar.

### 🔗 Integraciones Inteligentes (El "Dinámico")
1.  **Vínculo con Campeonatos:** Si un video se etiqueta con "Final Copa Oro", aparecerá automáticamente en la pestaña de ese torneo en el módulo de Documentos/Ligas.
2.  **Sponsors & Ads:** Posibilidad de poner banners de patrocinadores locales sobre los videos o en las galerías de fotos (monetización para el club).
3.  **Contenido Exclusivo:** Capacidad de marcar videos como "Solo para Socios Activos" (vinculado al estatus de pagos).

### 💡 Idea Extra: El "Player Card" Viral
Cada vez que un jugador alcanza una estadística alta (ej. 30 puntos en básquet o un hat-trick en fútbol), la app genera automáticamente una "Player Card" (estilo FIFA/EA Sports) con sus fotos del módulo de contenido y sus métricas, para que el jugador la comparta en sus redes. ¡Es publicidad gratuita para el club!

---

## 13. Módulo: Tracking/Entrenador
Panel del Entrenador: Gestión y Táctica

### 13.1 Planificador de Sesiones y Pizarra Táctica
*   **Biblioteca de Ejercicios:** Espacio para crear y guardar rutinas (calentamiento, técnica, táctica).
*   **Diseñador de Jugadas (Playbook):** Una herramienta gráfica donde el coach dibuja movimientos sobre el campo/cancha.
*   **Sincronización de Estadísticas:** Al planificar, el sistema sugiere qué jugadores necesitan reforzar ciertas áreas según sus datos previos (ej. "Jugador X tiene bajo porcentaje en triples, priorizar tiro").

### 13.2 Dashboard de Inteligencia del Jugador (360°)
Centraliza la información crítica para la toma de decisiones:
*   **Ficha de Rendimiento:** Gráficos de evolución en partidos y entrenamientos.
*   **Semáforo de Disponibilidad:** Visualización rápida de:
    *   Asistencia: % de presencia en el mes.
    *   Pagos: Estatus administrativo (bloqueo automático de nómina si hay deuda, opcional).
    *   Salud: Notas sobre lesiones o fatiga.
*   **Cuaderno de Notas Pro:** Comentarios privados del coach sobre actitud, disciplina o puntos a mejorar.

### 13.3 Pizarra Digital "Live" (Modo Tiempo Muerto)
Optimizado para tablets, con alto contraste para visibilidad bajo el sol o luces de estadio:
*   **Modo Rápido:** Limpieza de pantalla con un toque.
*   **Plantillas Predeterminadas:** Fondos de media cancha, cancha completa o zonas específicas (área penal, zona de 3 puntos).
*   **Guardado Instantáneo:** Posibilidad de guardar lo dibujado en el "minuto de oro" para repasarlo luego en el análisis post-partido.

### 13.4 Gestión de Contenido y Video-Análisis
*   **Carga de Partidos:** Subida directa al módulo de CONTENIDO existente.
*   **Etiquetado (Tagging):** Capacidad de marcar momentos específicos del video (ej: "Minuto 12:40 - Error en salida") para que los jugadores reciban una notificación y vean su clip.

### 💡 Ideas Extra para Potenciar el Amateurismo
A. **Reporte de Esfuerzo Percibido (RPE):** Después de cada entrenamiento, el jugador marca en la app del 1 al 10 qué tan pesado sintió el ejercicio. El entrenador recibe una alerta si un jugador está en riesgo de sobreentrenamiento.
B. **Scouting de Rivales:** Un apartado dentro de cada campeonato para anotar debilidades del equipo contrario (ej. "El portero sufre con los centros cruzados" o "El base siempre sale hacia la izquierda").
C. **Gamificación: "El MVP del Mes":** Un ranking automático basado en asistencia, notas del coach y estadísticas de partidos para fomentar la competitividad sana.
D. **Modo "Draft" para Torneos Internos:** Si el club organiza sus propios torneos, una herramienta para que los entrenadores repartan jugadores de forma equilibrada basándose en sus métricas de rendimiento pasadas.

---

## 14. Módulo: Documentos
Módulo de Documentación y Archivo Central

### 14.1 Categorización Inteligente (Taxonomía)
*   **Alumnos/Socios:** Fichas médicas (con alerta de vencimiento), autorizaciones de menores, seguros y fotos de DNI.
*   **Competencia:** Reglamentos de ligas, bases de campeonatos, calendarios (fixtures) y tablas de resultados.
*   **Institucional:** Estatutos del club, Términos y Condiciones, y contratos de staff.
*   **Gobierno/Dirigencia:** Minutas de reuniones de comisión directiva, actas de asambleas y resoluciones.

### 14.2 Control de Acceso y Privacidad
*   **Permisos por Rol:** No todos ven todo. Las minutas de la dirigencia son privadas, mientras que los reglamentos de liga son públicos para los entrenadores.
*   **Documentos "Solo Lectura":** Para que los padres puedan ver el reglamento pero no editarlo.

### 14.3 Herramientas de Gestión (PLUS)
*   **Firma Digital Integrada:** Permite que un padre firme el deslinde de responsabilidad o la ficha médica directamente desde su celular en la app.
*   **Buscador Global:** Filtros por deporte (Basket, Fútbol, etc.), por categoría (U15, Primera) o por palabra clave.
*   **Historial de Versiones:** Si las "Bases del Campeonato" cambian, el sistema guarda la versión anterior para evitar confusiones.

---

## 15. Módulo: Inventario
Módulo de Inventario: Control de Activos y Material

### 15.1 Catálogo de Artículos y Categorización
*   **Tipificación:** Clasificación por tipo de material (Indumentaria, Balones, Protecciones/Kimonos, Material de Entrenamiento -petos, conos-).
*   **Atributos Específicos:** Talles (para uniformes/kimonos), pesos (para balones/pesas) y marcas.
*   **Estado de Conservación:** Etiquetado del material como Nuevo, Buen estado, Desgastado o Para Reparar.

### 15.2 Trazabilidad y Ubicación (El "Dónde está")
*   **Asignación por Sede:** Cada ítem se vincula a una sede física o depósito específico.
*   **Asignación a Responsable:** Capacidad de asignar material a un entrenador específico (ej. "Kit de 15 balones de Basket asignado al Coach Martínez"). Esto genera responsabilidad sobre el equipo.
*   **Préstamos Temporales:** Registro de salida de material para eventos o partidos fuera de casa con fecha de retorno prevista.

### 15.3 Control de Stock e Inteligencia
*   **Alertas de Stock Mínimo:** Notificación automática cuando queden pocos petos o balones en condiciones para que el club realice una compra a tiempo.
*   **Registro de Bajas:** Justificación de pérdida o rotura de material para mantener el inventario saneado.

### 15.4 Integración con Operaciones (PLUS)
*   **Auditoría mediante QR:** Cada bolsa de material o equipo grande puede tener un código QR. El utilero o coach lo escanea con la app para confirmar que el material sigue en la sede o para reportar un daño.
*   **Vinculación con Cuotas:** Si un jugador pierde su indumentaria o kimono, el administrador puede cargar el costo de reposición directamente a su ficha de pagos desde el inventario.

---

## 16. Módulo: Sedes
Módulo de Sedes: Gestión de Infraestructura

### 16.1 Perfil Técnico de la Sede
*   **Geolocalización:** Integración con Google Maps/Waze para que los jugadores y padres lleguen sin perderse.
*   **Capacidad Operativa:** Definir el aforo máximo de personas (público) y de deportistas en simultáneo.
*   **Inventario de Canchas/Espacios:** Una sede puede tener múltiples sub-espacios (ej. "Cancha 1 - Parquet", "Cancha 2 - Sintético", "Gimnasio de Pesas").

### 16.2 Estatus de "Localía" y Competición
*   **Certificación de Ligas:** Checkbox para marcar si la sede cumple con las medidas reglamentarias de la federación de Basket, Volley o Fútbol.
*   **Configuración de Localía:** Permite al algoritmo de "Nóminas" o "Partidos" identificar automáticamente cuándo el club juega en casa y cuándo debe mostrar avisos de traslado a otra sede.

### 16.3 Gestión de Disponibilidad y Reservas
*   **Calendario de Ocupación:** Vista tipo Google Calendar donde el administrador ve qué categorías están ocupando qué canchas.
*   **Bloqueos por Mantenimiento:** Capacidad de inhabilitar una sede por reparaciones (ej. "Pintado de líneas" o "Re-sembrado de césped"), notificando automáticamente a los entrenadores afectados para que reprogramen.

### 16.4 Control de Accesos y Amenidades
*   **Ficha de Servicios:** Detalle de qué incluye la sede (Vestuarios, Cafetería, Estacionamiento, Desfibrilador/Zona Cardioprotegida).
*   **Check-in de Sede:** Registro de entrada para personal o jugadores mediante código QR asociado a la ubicación física (para validar que realmente están ahí).

### 📊 Integración con el Rol del Entrenador
*   **Asignación Inteligente:** Al planificar un entrenamiento, el sistema solo le deja elegir sedes que tengan el tipo de suelo o equipamiento necesario para su deporte.
*   **Logística de Partido:** Cuando se genera la Nómina, el PDF incluye automáticamente el link de la sede y las instrucciones de acceso (ej: "Entrada por portón B").

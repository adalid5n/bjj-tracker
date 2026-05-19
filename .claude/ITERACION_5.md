# Iteración 5 — Rediseño de home (calendario + dashboard)

**Versión:** 1.0 (planificación)
**Estado:** 🟡 En planificación — pendiente OK final del owner
**Predecesor:** Iteración 4 (cerrada con `v0.4.1-it4`, 2026-05-19)

---

## OBJETIVO

Transformar la home (`src/routes/+page.svelte`) de una **lista plana de
sesiones** (estado actual tras T-5.it4) a un **dashboard mobile-first
con calendario semanal interactivo** que reorganice la navegación
temporal: el usuario ve la semana de un vistazo, selecciona un día y
la sección inferior se actualiza con las sesiones de ese día.

**Por qué ahora:**
- La pieza "agrupar sesiones por día" entró en it.4 (T-5) como pivot
  organizado, pero el rediseño general de home quedó explícitamente
  para una iteración propia. Esta es esa iteración.
- Capturar y revisar sesiones es CU-1 del producto (caso de uso
  primario, definido en `REQUISITOS.md §2`: capturar una sesión tras
  la clase). La home es la pantalla más visitada y hoy es funcional
  pero pobre — una mejora aquí afecta cada apertura de la PWA.
- El backlog tiene varias entradas que apuntan a la home (calendario,
  reducir copy, stats). Abordarlas en una iteración cohesiva produce
  un cambio coherente en lugar de retoques inconexos.

**Lo que NO entra en esta iteración:**
- **"Próxima clase"** como concepto/sección. No existe en el modelo de
  datos (no hay tabla de clases programadas). Sería feature nueva
  mayor con su propio scope. Diferido.
- **Reemplazar `/rolls`** o mover allí cosas de home. Esta iteración
  toca solo la pantalla home; `/rolls` queda intacta.
- **Cambios al BottomNav o navegación general** de la app. Solo se
  rediseña el contenido de home.
- **Modo hobbyist vs avanzado**. Entrada activa en backlog, candidata
  a it.6 o posterior.
- **Cambios al modelo de datos** (schema BD). Esta iteración es 100%
  UI / queries derivadas de tablas existentes.

**Criterio de cierre:**
1. Las 4 tareas T-1.it5 … T-4.it5 cerradas con commit en `main`.
2. Tag `v0.5-it5` aplicado.
3. Bump de versión `0.4.1` → `0.5.0` en `package.json` (minor — la
   iteración introduce cambios funcionales visibles aunque no toque
   modelo de datos).
4. `ESTADO_ACTUAL.md` actualizado con el resultado del cierre.

Sin "uso real durante N días" como gate (decisión owner sesión 31):
las 4 tareas son auto-verificables visualmente.

---

## ALCANCE FUNCIONAL

### T-1.it5 — Calendario semanal + reorganización del home en dos secciones

**Es el pilar de la iteración.** Sin esto, las otras tareas no tienen
contexto. Toca la estructura completa del `+page.svelte`.

**Layout objetivo (mobile-first):**

```
┌─────────────────────────────┐
│ AppHeader                    │
├─────────────────────────────┤
│ [stats chip — T-3.it5]      │  ← discreto, "3 sesiones · 12 rolls"
├─────────────────────────────┤
│ CALENDARIO SEMANAL          │
│ ← Lun Mar Mié [Jue] Vie ... │  ← día seleccionado
│   ·       ·       ·          │  ← markers (T-2.it5)
├─────────────────────────────┤
│ Sesiones del [Jue]          │  ← header con día seleccionado
│ ┌─────────────────────────┐ │
│ │ BJJ — 3 rolls           │ │
│ │ Guardia + escapes       │ │
│ └─────────────────────────┘ │
│                              │
│ (si día vacío → placeholder │
│  discreto + FAB sigue ahí)  │
├─────────────────────────────┤
│ [insights — T-4.it5]        │
└─────────────────────────────┘
   FAB: + Nueva sesión
```

**Qué entra:**
- Componente nuevo `WeeklyCalendar.svelte` (o nombre similar) en
  `src/lib/components/`. Renderiza 7 días (Lun-Dom de la semana en
  curso) con:
  - **Día seleccionado por defecto**: hoy (decisión owner). Si se
    navega a otra semana, el "hoy" sigue marcado visualmente pero el
    "seleccionado" puede no coincidir.
  - **Navegación entre semanas**: botones `←` `→` arriba del calendario
    + soporte swipe horizontal en móvil. Botón "Hoy" para volver a la
    semana actual.
  - **Markers** placeholder (los implementa T-2.it5 — esta tarea
    define el slot, no la lógica).
- Refactor de `+page.svelte` para que tenga la estructura del layout
  objetivo: stats arriba (placeholder hasta T-3), calendario (T-1),
  sesiones del día (T-1), insights (placeholder hasta T-4).
- **Lógica del día seleccionado**: `$state` local `diaSeleccionado:
  string` (ISO `YYYY-MM-DD`). Default `todayIso()` (reusar
  `src/lib/day-headers.ts`).
- **Sesiones del día**: query/filter sobre las sesiones ya cargadas
  (`listSesiones()` ya devuelve todo). Filtra client-side por
  `s.fecha === diaSeleccionado`. Si la sesiones por usuario crecen
  mucho, considerar paginación o query por fecha — fuera de scope
  inicial.
- **Día vacío**: placeholder discreto (decisión owner): texto
  pequeño "Sin sesiones este día" + FAB sigue visible y operativo
  (al crear, pre-rellenar `fecha` con `diaSeleccionado`, no con hoy).

**Qué NO entra (en T-1, sí en otras tareas o fuera de scope):**
- Markers en días con sesión → T-2.it5.
- Stats chip → T-3.it5.
- Insights → T-4.it5.
- Vista mensual del calendario → fuera de scope it.5 (la entrada
  original del backlog mencionaba mensual; el owner cerró "semanal" en
  sesión 31).

**Caso "app vacía" (sin ninguna sesión jamás):** primera apertura tras
instalar. El calendario sigue renderizándose con la semana actual y el
día de hoy seleccionado; la sección inferior muestra el placeholder
"Sin sesiones este día" + FAB visible. El chip de stats (T-3) queda
oculto (definido en T-3). Los markers (T-2) no aparecen al no haber
fechas en el `Set`. Los insights (T-4) muestran mensaje "Aún no hay
datos suficientes" o se ocultan — decisión al implementar T-4. Es un
estado degradado limpio; el usuario sigue teniendo un único call to
action claro (FAB → crear primera sesión).

**Decisiones técnicas a confirmar al implementar:**
- ¿`bits-ui Calendar` (disponible según `CONTEXTO_AGENTE.md`) sirve
  como base, o se construye desde cero por ser muy específico (7 días
  visibles, markers custom)? Recomendación: probar `bits-ui` primero
  por la regla del proyecto "antes de construir un primitive de UI,
  revisar qué hay disponible".
- ¿`WeeklyCalendar.svelte` recibe `markers: Set<string>` como prop
  (delegando el cómputo a home) o consume directamente las queries?
  Recomendación: prop. Mantiene el componente puro y testeable.

**Validación:**
- `pnpm check` limpio.
- Manual: navegar entre semanas, seleccionar días distintos, confirmar
  que la sección inferior se actualiza. Tap día vacío → placeholder
  + FAB. Tap "Hoy" cuando estás en otra semana → vuelve a la actual y
  selecciona hoy.

---

### T-2.it5 — Markers en calendario (días con sesión)

**Qué entra:**
- Cómputo en home de un `Set<string>` con las fechas ISO que tienen
  al menos 1 sesión (derivar de `sesiones` ya cargadas).
- Pasarlo como prop al `WeeklyCalendar` (slot definido en T-1).
- Render del marker: **punto simple** debajo del número del día
  (decisión owner sesión 31). Color: token `bg-foreground/60` o
  similar (no destacar excesivamente; el marker es info passive).

**Qué NO entra:**
- Variantes de marker por tipo de sesión (BJJ/Grappling/Open mat).
  El owner descartó "más info por marker" en sesión 31.
- Count de rolls como marker. Misma razón.

**Validación:**
- Manual: días con sesión muestran punto debajo del número; días sin
  sesión no.
- El marker se actualiza al crear/eliminar sesiones (reactividad
  Svelte).

---

### T-3.it5 — Stats chip arriba (passive info)

**Qué entra:**
- Chip pequeño en la parte superior de home (encima del calendario)
  con info agregada:
  - **N sesiones esta semana** (de Lunes a Domingo de la semana en
    curso, no rolling-7-days).
  - **M rolls totales esta semana**.
- Formato: `3 sesiones · 12 rolls` (separador discreto, `text-xs
  text-muted-foreground`).
- Hidden si no hay sesiones (no mostrar "0 sesiones · 0 rolls" —
  ruido vacío).

**Por qué arriba y no abajo:** el dashboard tiene jerarquía vertical
clara. Stats agregadas son contexto general (no acción) → arriba
como subtitle implícito de la pantalla. Las secciones más densas
(calendario + sesiones del día) van debajo.

**Lo que NO entra (sigue en backlog si te interesa después):**
- Stats mensuales / acumuladas / por compañero.
- Distribución Dominé/Equilibrado/Me dominaron en el chip. Visualmente
  pesa y el `AnalisisPanel` ya lo cubre.

**Validación:**
- Manual: crear/eliminar sesiones de la semana en curso → el chip
  actualiza counts. Semana sin sesiones → chip oculto.

---

### T-4.it5 — Insights simplificados en home

**Qué entra:**
- Sección en home debajo de "sesiones del día seleccionado" con una
  versión simplificada del `AnalisisPanel` existente (vive hoy en
  `/rolls`).
- "Simplificada" = decisión al implementar tras revisar
  `AnalisisPanel`: si tiene N tipos de insight, en home se muestran
  los 2-3 más relevantes para la apertura diaria. El resto sigue solo
  en `/rolls`.
- Si la lógica del panel es compleja y reusar es costoso, extraer
  un sub-componente `AnalisisCompacto.svelte` que comparta queries
  con `AnalisisPanel` pero renderice menos.

**Qué NO entra:**
- Gráficos nuevos / visualizaciones avanzadas. Eso es backlog (it.5+).
- Insights que requieran queries nuevas a la BD. Esta tarea solo
  reusa lógica existente con presentación reducida.

**Decisiones a tomar al implementar:**
- ¿Cuántos y qué insights en home? Pendiente de revisar
  `AnalisisPanel.svelte` y consensuar 2-3 priorizados con el owner
  antes de implementar.
- ¿La sección de insights está colapsada por defecto (`<details>`) o
  visible? Recomendación: visible si los insights son ≤2 líneas cada
  uno; colapsada si son densos.

**Validación:**
- Manual: insights aparecen abajo, son legibles, no saturan.
- Tap en un insight (si tiene interactividad) → navega al sitio
  relevante (`/rolls` con filtro? `/mapa` con posición destacada?).
  Definir al implementar.

---

## DECISIONES DE PRODUCTO TOMADAS (sesión 31, 2026-05-19)

- **Vista del calendario:** semanal (no mensual). Mensual sigue en
  backlog para iteración futura si emerge la necesidad.
- **Tamaño del calendario en home:** panel grande arriba (1/3 del
  viewport en móvil aproximadamente, ajustable).
- **Interacción tap día:** la sección inferior se actualiza con las
  sesiones de ese día. Día por defecto = hoy.
- **Día sin sesión:** placeholder discreto + FAB sigue visible. Sin
  CTA grande.
- **Markers:** punto simple bajo el día. Sin variantes por tipo ni
  count.
- **Navegación entre semanas:** botones `←` `→` + swipe horizontal
  + botón "Hoy".
- **Layout:** dashboard con secciones modulares (no "lista de
  sesiones + calendario añadido").
- **Mobile-first**: el diseño se piensa primero para móvil; desktop
  adapta. Si en móvil el calendario semanal funciona bien y en
  desktop sobra espacio, valorar al implementar si añadir contenido
  lateral, pero sin bloquear cierre por ello.
- **Sin "próxima clase"** en scope. No hay modelo de datos para
  clases programadas.
- **Sin uso real como criterio de cierre.** 4 tareas cerradas + tag =
  cierre.
- **Tag de cierre:** `v0.5-it5` (minor — introduce cambios funcionales
  visibles).

---

## ORDEN SUGERIDO DE EJECUCIÓN

1. **T-1.it5** (pilar) — calendario semanal + reorganización home en
   dos secciones (calendario + sesiones del día seleccionado).
   Estimación: 2-4 horas dependiendo de si bits-ui Calendar encaja o
   hay que construir custom.
2. **T-2.it5** — markers en calendario. Encaja inmediatamente tras
   T-1 porque T-1 deja el slot definido. Estimación: 30 min.
3. **T-4.it5** — insights simplificados en home. Antes que T-3 porque
   los insights consumen más espacio visual y conviene definirlos en
   contexto del layout existente.
4. **T-3.it5** — stats chip arriba. Refinamiento final al tener el
   resto en su sitio. Estimación: 30-60 min.

Orden no vinculante. Si emerge razón para reordenar (e.g., T-1 se
parte en sub-tareas por complejidad), se documenta en
`ESTADO_ACTUAL.md`.

---

## RIESGOS Y NOTAS

- **Rendimiento con muchas sesiones:** la T-1 filtra client-side por
  `s.fecha === diaSeleccionado`. Con cientos de sesiones acumuladas
  esto sigue siendo barato (filter sobre array en memoria). Si en uso
  real se nota lag, optimizar con query por fecha en `listSesiones`
  acepta parámetro `fecha` opcional. No hacer hasta que se note.
- **Calendar de bits-ui es de fecha completa (mes).** Para vista
  semanal probablemente haya que componer manualmente (7 botones
  alineados) usando primitives de bits-ui pero no el componente
  `Calendar` entero. Documentar la decisión al implementar T-1.
- **Reactividad del marker `Set<string>`:** Svelte 5 detecta mejor
  los `$state` con objetos planos. Si el `Set` se pasa como prop y se
  reemplaza al cambiar `sesiones`, OK. Si se muta, puede no propagar.
  Probar al implementar.
- **El stats chip de T-3 oculto si 0 sesiones** evita "ruido vacío"
  pero tras crear la primera sesión de la semana puede sentirse
  abrupto el pop-in. Verificar UX al implementar.

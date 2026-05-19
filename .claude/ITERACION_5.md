# Iteración 5 — Rediseño de home (calendario + dashboard)

**Versión:** 2.0 (re-formalizada en sesión 32 tras pivot semanal→mensual scroll-driven)
**Estado:** 🟢 En curso — T-1.it5 ✅, T-2.it5 ✅, T-4.it5 ✅ (diferido a it.6); queda T-3 (stats chip)
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

### T-1.it5 — MonthCalendar scroll-driven + reorganización del home ✅

**Estado:** ✅ Cerrada (commit `cd4583a`, sesión 32 — 2026-05-19).

**Pivot del plan original (decidido en sesión 32 tras feedback del owner sobre el prototipo inicial):**
- ❌ **Semanal** → ✅ **Mensual**. El plan original planteaba vista semanal de 7 días. Tras ver el prototipo, el owner pidió mensual (más contexto). Decisión: calendario muestra siempre el mes completo (42 cells = 6 filas × 7 cols).
- ❌ **Click-driven compact (cambio modo semana)** → ✅ **Scroll-driven compactación**. El owner clarificó "no transformación a semana, solo se hace pequeño". La compactación es 100 % por scroll: al scrollear el calendario reduce cells (aspect-square → h-7), oculta weekday headers y botón Hoy, mantiene mes completo.
- ❌ **Botón Hoy visible en compact** → ✅ **Hoy solo visible en expanded**. Al ocultarse en compact se resuelve colateralmente el bug observado de "Hoy reseteaba a tamaño normal" — para usar Hoy hay que estar expanded.

**Lo que se implementó (commit `cd4583a`):**
- **Nuevo `src/lib/components/MonthCalendar.svelte`** (~230 líneas): mes completo siempre. Sticky `top-14` debajo del AppHeader. Soporte navegación ← →, swipe horizontal, botón "Hoy" (visible en expanded). Markers preparados como slot para T-2.it5.
- **Refactor `src/routes/+page.svelte`**: `diaSeleccionado` state, sesiones filtradas por día, MonthCalendar + sección abajo. Día vacío → placeholder "Sin sesiones este día". FAB pasa `defaultFecha={diaSeleccionado}` al editor. `<main>` con `min-h-[calc(100vh+200px)]` para forzar scroll disponible.
- **`src/lib/components/SesionEditor.svelte`**: nueva prop `defaultFecha?` (pisa today al abrir).

**Decisión técnica clave — 3 capas anti-loop para scroll-driven:**
Tras 3 approaches descartados (sentinel + IntersectionObserver falló por scroll anchoring del browser; scroll listener simple falló por jitter durante transición CSS), la versión final combina:
1. **`overflow-anchor: none`** en `<main>` + descendants (en home). Deshabilita el reajuste automático de scroll del browser al cambiar altura de elementos.
2. **Hysteresis**: compact=true cuando `scrollY > 100`, compact=false cuando `scrollY < 50`. Zona muerta 50–100px.
3. **Lockout temporal**: tras cada toggle, ignorar el listener durante 250ms (200ms de transición CSS + 50ms margen).

**Decisión de primitive**: `bits-ui Calendar` (ya en deps) se evaluó pero no encaja para compactación scroll-driven y customización fina de cells. Construir custom con `@internationalized/date` (la lib que bits-ui Calendar usa internamente) da control completo con ~230 líneas.

**Caso "app vacía" (sin ninguna sesión jamás):** primera apertura tras instalar. El calendario renderiza el mes actual con hoy seleccionado; la sección inferior muestra "Sin sesiones este día"; el FAB queda como único CTA claro.

**Lo que NO entró en T-1 (sigue para tareas posteriores):**
- Markers en días con sesión → T-2.it5.
- Stats chip → T-3.it5.
- Insights → T-4.it5.
- Animación del cambio de mes (← → cambia instantáneamente). Si emerge fricción real, valorar CSS view transitions como follow-up post-it.5.

**Validación:**
- `pnpm check` 1055/0/0.
- Visual del owner OK tras varias iteraciones de feedback ("mensual no semanal", "compactable no colapsable", "scroll-driven no click-driven", fixes del loop por jitter durante scroll lento).

---

### T-2.it5 — Markers en calendario (días con sesión) ✅

**Estado:** ✅ Cerrada (commit `d09157d`, sesión 33 — 2026-05-19).

**Lo que se hizo:**
- En `src/routes/+page.svelte`: `const diasConSesion = $derived(new Set(sesiones.map((s) => s.fecha)));` — Set reactivo de fechas ISO con al menos 1 sesión.
- Reemplazo de `markers={new Set()}` por `markers={diasConSesion}` en la invocación a `MonthCalendar`. El slot del marker ya estaba implementado en T-1 (punto bajo el número del día, color `bg-foreground/60` y `bg-primary-foreground` cuando el día está seleccionado).

**Validación:**
- `pnpm check` 1055/0/0.
- Visual owner OK ("Los días con sesión se muestran con un punto, perfecto").

**Fix colateral de T-1 (mismo bloque de validación, commit `fe41907`):**
- Bajada del threshold de expansión scroll-driven: hysteresis 50/100 → **5/100**. Razón: la expansión ocurría demasiado pronto al scrollear arriba (antes de que el primer card llegara al top). Con threshold 5, la expansión solo dispara cerca del top absoluto, dando sensación de "tensión" — el card llega al top y se queda visible bajo el calendario compacto hasta que el user "tira" hasta arriba.

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

### T-4.it5 — Insights simplificados en home ✅ (diferido)

**Estado:** ✅ Cerrada con cambio de scope (commit `b7cf755`, sesión 34 — 2026-05-19). **Componente construido, NO montado en home — uso diferido a it.6 (modo hobbyist vs avanzado).**

**Lo que se hizo:**
- Nuevo `src/lib/components/AnalisisHome.svelte` (~109 líneas): versión compacta del `AnalisisPanel` con solo C1 (problemas recurrentes), ventana fija de 5 sesiones, top 3 posiciones + top 3 técnicas, sin `<details>` plegable. Reusa la query `getProblemasRecurrentes` existente.
- **NO montado** en `+page.svelte`. Decisión owner s34: en lugar de aparecer por defecto en home, los insights deben quedar escondidos bajo un toggle "Modo hobbyist vs avanzado" — feature de it.6 según el backlog `MEJORAS_FUTURAS.md §Modo hobbyist vs avanzado`.

**Por qué se cierra T-4 ahora pese a no montar:**
- El componente está construido y validado (`pnpm check` 1056/0/0).
- Está documentado dentro de su propio fichero la razón de "no montado" y la referencia a it.6.
- El componente representa el trabajo planeado de T-4 (versión reducida del análisis para home); el siguiente paso (montarlo en home con toggle) es trabajo de it.6, no de it.5.
- Alternativa rechazada: implementar el toggle hobbyist/avanzado dentro de it.5. Eso es scope creep significativo — el toggle toca settings, persistencia, branching en múltiples pantallas. Es it.6 entero.

**Lecciones:** misma conclusión que T-2.it4 ("la feature ya existía") en una variante distinta: una tarea puede cerrarse con código construido pero sin exponerlo en UI si la exposición depende de otra feature aún no implementada. Documentar bien el "por qué no se monta" para que sea recuperable cuando llegue su iteración.

**Validación:**
- `pnpm check` 1056/0/0.
- El componente compila y no se queja por estar sin uso (Svelte no marca componentes importables como unused).

---

## DECISIONES DE PRODUCTO TOMADAS

**Sesión 31 (planificación inicial), revisadas en sesión 32 (tras prototipo de T-1):**

- ❌ ~~**Vista del calendario: semanal**~~ → ✅ **Mensual** (revisado s32). El mes completo da más contexto. La compactación scroll-driven evita la pérdida de espacio cuando ya hay un día seleccionado.
- ✅ **Tamaño del calendario en home:** panel arriba, sticky `top-14`.
- ✅ **Interacción tap día:** la sección inferior se actualiza con las sesiones de ese día. Día por defecto = hoy.
- ✅ **Día sin sesión:** placeholder discreto + FAB sigue visible. Sin CTA grande.
- ✅ **Markers:** punto simple bajo el día (lo implementa T-2.it5).
- ❌ ~~**Toggle compact por click**~~ → ✅ **Scroll-driven** (revisado s32). El owner clarificó: el mes COMPLETO se compacta visualmente (no se transforma a semana).
- ✅ **Navegación entre meses:** botones `←` `→` + swipe horizontal.
- ❌ ~~**Botón "Hoy" siempre visible**~~ → ✅ **Hoy visible solo en expanded** (revisado s32). Al ocultarse en compact se resuelve el bug "Hoy reseteaba a tamaño normal". Para usar Hoy desde compact: scroll-up → expand.
- ✅ **Layout:** dashboard con secciones modulares.
- ✅ **Mobile-first**.
- ✅ **Sin "próxima clase"** en scope.
- ✅ **Sin uso real como criterio de cierre.** 4 tareas cerradas + tag = cierre.
- ✅ **Tag de cierre:** `v0.5-it5` (minor).

---

## ORDEN SUGERIDO DE EJECUCIÓN

1. **T-1.it5** ✅ Cerrada (sesión 32, commit `cd4583a`; fix de threshold en s33 commit `fe41907`).
2. **T-2.it5** ✅ Cerrada (sesión 33, commit `d09157d`).
3. **T-4.it5** ✅ Cerrada (sesión 34, commit `b7cf755`, diferido a it.6 — componente construido sin montar).
4. **T-3.it5** (única pendiente) — stats chip arriba. Refinamiento final.

Fix adicional en s34 (commit `0805fa6`): `diaSeleccionado` se persiste en sessionStorage. Resuelve bug donde al navegar a /sesion/[id] y volver con back, el calendario se reseteaba a hoy.

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

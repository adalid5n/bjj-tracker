# Iteración 4 — Pulido post-grafo y consistencia UX

**Versión:** 1.0
**Estado:** 🟢 En curso — T-1.it4 cerrada (2026-05-19)
**Predecesor:** Iteración 3 (cerrada con `v0.4-it3`, 2026-05-19)

---

## OBJETIVO

Cerrar el ciclo del grafo (it.3) con tareas de pulido y consistencia
UX que fueron emergiendo durante it.1-it.3 pero no encajaban en el
scope estricto de ninguna. Sin features nuevas; todo es refinado.

**Por qué ahora:**
- Las tareas no bloquean ninguna feature pendiente y no comparten
  dependencia técnica entre sí. Hacerlas ahora evita acumular fricción
  en la captura diaria.
- La auditoría de tokens semánticos crece linealmente con el número
  de componentes que aún usan Tailwind crudo — cuanto más tarde, más
  trabajo. Hacerla en it.4 fija un punto de partida limpio para
  features posteriores.

**Lo que NO entra en esta iteración:**
- **Móvil + sync JSON entre dispositivos** (lo que REQUISITOS §6
  originalmente listaba como it.4). Quedó cubierto antes:
  - "Móvil = read-only" se descartó en sesión 6 (decisión
    2026-05-13: *Móvil del mapa también edita*). El responsive del
    mapa está en producción desde it.1.
  - Export/import JSON está en producción desde it.0.
- **Sugerencia automática de compañero por defecto** (Parte A del
  backlog `Roll editor — sugerir compañero…`). Requiere elegir
  algoritmo (último de la sesión / más frecuente / último global) y
  validarlo en uso real. Mejor en una iteración con foco específico
  en captura.
- **Tab Sumisiones en el sub-toggle de Lista del `/mapa`.** Anotado
  en backlog; no encaja en el tema cohesivo de it.4. Diferido.
- **Botón "Forzar actualización" en `/ajustes`.** Requiere decidir
  si el prompt PWA existente (T-8) ya cubre el caso o no.
- **Bump a Node 24 en el workflow.** Toca `.github/workflows/deploy.yml`
  (fichero protegido por `CONTEXTO_AGENTE.md`). Tarea aparte con
  decisión explícita.
- **Análisis avanzado, gráficos, calendario.** Backlog (it.5+).

**Criterio de cierre:**
1. Las 4 tareas T-1.it4 … T-4.it4 cerradas con commit en `main`.
2. Tag `v0.4.1-it4` aplicado.
3. `ESTADO_ACTUAL.md` actualizado con el resultado del cierre.

---

## ALCANCE FUNCIONAL

### T-1.it4 — Long-press → modo edición en grafo + UX móvil ✅

**Estado:** ✅ Cerrada (commits `93baea6` + `4cbacae`, push en `48662a8`,
sesión 25 — 2026-05-19).

**Lo que se hizo (resumen — detalle en `ESTADO_ACTUAL.md §Sesión 25`):**
- Approach inicial (long-press 350 ms para armar drag) descartado tras
  detectar que `r.dragData.touchDragEles` no se reevalúa post-touchstart
  en Cytoscape. Imposible togglear `grabify` a mitad de touch.
- Solución final: **modo edición explícito** vía botón "Mover nodos" en
  el sub-header de `/mapa`. Modo navegación = `panify + ungrabify` (tap
  abre modal, drag pannea). Modo edición = `unpanify + grabify` (drag
  mueve nodo, marca dirty).
- UX grafo móvil: grafo de borde a borde llegando al bottom nav; pan a
  entidad mide el drawer real del DOM (no asume 50%); sombra del bottom
  nav más visible sobre fondos oscuros.

**Por qué cuenta como cerrada para el criterio de it.4:** validación
visual del owner OK; documentación reflejando el rework y los
hallazgos sobre Cytoscape; sin regresiones en `pnpm check`.

---

### T-2.it4 — Combobox compañero en RollEditor

**Origen:** `MEJORAS_FUTURAS.md §Roll editor — sugerir compañero por defecto + selector inteligente` (Parte B).

**Qué entra:**
- Sustituir el `Select` simple del campo "compañero" del RollEditor por
  un combobox con autocompletado (filtrado en vivo según lo tecleado).
- Si lo tecleado no coincide con ningún compañero existente, mostrar
  opción inline **"Crear como nuevo compañero"** que cree la entidad
  sin abrir un modal/wizard adicional.

**Qué NO entra:**
- Sugerencia/preselección automática al abrir el editor (Parte A del
  backlog). Sigue en `MEJORAS_FUTURAS.md` como entrada activa.

**Implementación esperada:**
- Reusar el `Combobox.svelte` propio (creado en T-10 sobre primitives
  de bits-ui). Aplica si se identifica un patrón equivalente entre
  posiciones (T-10) y compañeros.
- Si "crear inline" requiere algo más que un nombre, abrir wizard
  completo en lugar de inline (caso por confirmar al implementar).

**Validación:**
- `pnpm check` limpio.
- Verificación manual: abrir RollEditor, escribir nombre parcial,
  seleccionar de sugerencias; escribir nombre nuevo, ejecutar "Crear
  como nuevo compañero", confirmar que aparece en el catálogo.

---

### T-3.it4 — Orden `/rolls` por `created_at DESC`

**Origen:** `MEJORAS_FUTURAS.md §Orden de la tabla /rolls — más reciente arriba`.

**Estado actual:** la tabla ordena por `sesion.fecha DESC` y dentro de la
misma sesión por `rolls.orden ASC`. Resultado: un roll nuevo añadido a
una sesión existente aparece *abajo* en el bloque de esa sesión, no
arriba del todo.

**Qué entra:**
- Cambiar el `ORDER BY` (o la lógica equivalente en TS, según dónde
  se haga el sort) para que el criterio primario sea `created_at DESC`
  (o `updated_at DESC` si encaja mejor — decisión al implementar).
- El último roll capturado debe aparecer arriba del todo en `/rolls`.

**Por qué:** captura post-clase típica = añadir 3 rolls seguidos a una
sesión; expectativa al volver a `/rolls` = ver el último arriba.

**Validación:**
- `pnpm check` limpio.
- Verificación manual: añadir roll a sesión existente; abrir `/rolls`;
  confirmar que aparece en el tope.
- Comprobar que los filtros existentes (por fecha, compañero, resultado)
  siguen funcionando con el nuevo orden.

---

### T-4.it4 — Auditoría tokens semánticos en `src/`

**Origen:** `MEJORAS_FUTURAS.md §Sistema de diseño coherente — usar design tokens en lugar de Tailwind raw` y regla del proyecto (`CONTEXTO_AGENTE.md §Restricciones`).

**Qué entra:**
- Grep exhaustivo en `src/` buscando colores Tailwind crudos prohibidos
  por la regla del proyecto: `bg-{color}-{N}`, `text-{color}-{N}`,
  `border-{color}-{N}`, `ring-{color}-{N}`, `from-/to-{color}-{N}`,
  etc. donde `{color}` ∈ `{blue, red, green, yellow, gray, slate,
  zinc, neutral, stone, orange, amber, lime, emerald, teal, cyan,
  sky, indigo, violet, purple, fuchsia, pink, rose}` y `{N}` ∈
  `{50..950}`.
- Reemplazar cada hit por el token semántico equivalente
  (`bg-primary`, `text-destructive`, `bg-muted`,
  `text-muted-foreground`, `border-border`, `bg-success`, `bg-warning`,
  etc.). Si la variante semántica que se necesita no existe, añadir
  el token en `src/routes/layout.css` (`:root` + `.dark`), no
  perpetuar Tailwind crudo.

**Qué NO entra:**
- Tocar `src/lib/components/ui/*` (wrappers shadcn-svelte instalados
  vía CLI). Estos ficheros se sobrescriben al actualizar componentes
  desde upstream; si tienen color crudo es responsabilidad del paquete
  upstream.
- Tocar utilidades globales en `app.css` (si las hay) — la regla solo
  prohíbe colores crudos en componentes propios.

**Validación:**
- `pnpm check` limpio.
- Verificar visualmente que los componentes tocados se ven correctamente
  en light + dark mode.
- Re-correr el grep al final; debe devolver 0 hits en componentes propios.

---

## DECISIONES DE PRODUCTO TOMADAS

- **Nombre de la iteración:** "Pulido post-grafo y consistencia UX"
  (decidido 2026-05-19, sesión 26). Refleja que el origen es refinar
  tras cerrar it.3 (grafo) y que el hilo conductor es consistencia,
  no funcionalidad nueva.
- **Numeración:** se mantiene `it.4` aunque el contenido difiere del
  que REQUISITOS §6 planteaba originalmente. La "it.4 = Móvil"
  original se considera **fusionada** en it.0 (sync JSON) + it.1
  (móvil del mapa edita). `REQUISITOS.md` actualizado en consecuencia.
- **Bump de versión:** `v0.4.1-it4` (patch) — es pulido, no
  funcionalidad nueva, no merece un minor.
- **Sin "captura de N sesiones reales" como criterio.** Las 4 tareas
  son refinamientos auto-verificables; el "uso real" como gate
  aplicaba en it.0/it.0.5/it.1 donde se introducían entidades nuevas.

---

## ORDEN SUGERIDO DE EJECUCIÓN

1. **T-3.it4** (orden `/rolls`) — la más pequeña y aislada. Buena para
   recalibrar tras la pausa.
2. **T-2.it4** (combobox compañero) — riesgo medio (toca RollEditor,
   componente con dirty handler y wizard de creación). Ejecutar con
   pnpm dev abierto y validar inline.
3. **T-4.it4** (auditoría tokens) — la más extensa pero también la más
   mecánica. Se hace al final para no mezclar diffs visuales con
   cambios funcionales de T-2/T-3.

El orden no es vinculante; si emerge una razón para reordenar, se
documenta en `ESTADO_ACTUAL.md` y se sigue.

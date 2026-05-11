# Iteración 0.5 — Pulido pre-iteración 1

**Versión:** 0.1 (borrador)
**Estado:** 🟡 En planificación
**Predecesor:** Iteración 0 (cerrada en `v0.1-it0`, 2026-05-10)

---

## OBJETIVO

Resolver fricción de uso detectada al capturar sesiones reales en it.0 y
dejar el sistema de diseño coherente antes de meter funcionalidad nueva
en it.1 (mapa técnico).

**Por qué ahora y no después:**
- Si rediseñamos formularios antes que los tokens, los chips nuevos
  quedan en Tailwind crudo y hay que retocarlos. Mejor un solo paso.
- El combobox de compañero entra ahora (no esperar a feedback de uso
  real) porque es el momento donde se crean más compañeros nuevos.

**Lo que NO entra en esta iteración:**
- Mapa técnico (posiciones / técnicas como entidades) — it.1.
- Cualquier cambio en el modelo de datos. Esta iteración es 100% UI/UX
  y operativa de PWA. Schema BD intacto.
- Análisis automático, resúmenes, gráficos — it.2.
- Sync con merge inteligente — sigue siendo export/import JSON.

**Criterio de éxito:**
1. Al capturar la siguiente sesión real, los rolls se introducen sin
   "rebotar" entre campos ni teclear cosas que ya estaban en una lista
   conocida.
2. Visualmente, los componentes propios ya no usan colores Tailwind
   crudos — todo pasa por tokens shadcn.
3. Si se publica una versión nueva, la app pregunta si se quiere
   recargar en vez de hacerlo silenciosamente.

---

## ALCANCE FUNCIONAL

### F-1 — Design tokens coherentes
- Prohibir colores Tailwind crudos (`bg-blue-500`, `text-red-700`, etc.)
  en componentes propios. Solo permitidos en `app.css` o en utilidades
  globales de shadcn.
- Usar tokens semánticos: `bg-primary`, `text-destructive`,
  `bg-muted`, `text-muted-foreground`, `border-border`, etc.
- Reflejar la regla en `CONTEXTO_AGENTE.md`.
- Migrar los componentes que aún usan colores crudos:
  - FAB ("+ Nueva sesión") en P1.
  - Badges de resultado en P5 (domine / equilibrado / me_dominaron).
  - Mensajes de empty state.
  - Cualquier otro hallazgo durante la auditoría.

### F-2 — Rediseño del editor de roll (P3)
Pantalla actual: formulario completo en modal. Problema: muchos campos
de golpe, teclas raras, easy to skip.

Nueva propuesta — **wizard de 5 pasos con auto-avance**, una decisión
por paso. No hay botones "Atrás" / "Siguiente"; el avance es implícito
al completar el paso. Sí hay indicador de paso (`1/5`) clickable para
volver atrás manualmente, y botón "Cancelar" siempre visible.

| Paso | Decisión | UI | Avance |
|---|---|---|---|
| 1 | Compañero | Combobox con autocomplete + "+ Crear nuevo: 'X'" inline | al seleccionar |
| 2 | Tamaño relativo | Chips (similar / más / menos / mucho más / mucho menos) | al click |
| 3 | Duración (min) | Input numérico | Enter o botón "Continuar" |
| 4 | Resultado | Chips (dominé / equilibrado / me dominaron) | al click |
| 5 | Notas (qué intenté, qué falló, posiciones problema) | 3 textareas + botón "Guardar" | manual |

**Skipeable:** todos los pasos excepto el compañero (paso 1). En cada
paso opcional hay un link "Saltar" visible que avanza sin guardar
valor. El paso 5 (notas) se puede guardar vacío.

**Chips = pills clickables** con selección única (tipo radio), no
selects nativos.

**Crear nuevo compañero desde el paso 1:** crea con solo el nombre y
muestra debajo un "+ Añadir más datos" expandible (opcional) con
cinturón, experiencia, peso default, notas — todo sin salir del paso.

### F-3 — Rediseño del editor de compañero (P4)
Mismo patrón de auto-avance, una decisión por paso. Solo el nombre
es obligatorio; el resto skipeable.

| Paso | Decisión | UI | Avance |
|---|---|---|---|
| 1 | Nombre | Input texto | Enter o "Continuar" |
| 2 | Cinturón | Chips (blanco / azul / morado / marrón / negro) | al click |
| 3 | Experiencia (años) | Input numérico | Enter o "Continuar" |
| 4 | Peso relativo default | Chips | al click |
| 5 | Notas | Textarea + botón "Guardar" | manual |

**Edición:** sigue como form (no obligar a pasar por pasos para tocar
un campo).

### F-4 — Rediseño del editor de sesión (P2)
**Alta nueva** pasa a wizard con auto-avance (inline en la página
`/sesion/nueva`, no modal). **Edición** sigue como form inline en
`/sesion/[id]` (como hoy).

Pasos al crear sesión nueva:

| Paso | Decisión | UI | Avance |
|---|---|---|---|
| 1 | Fecha (obligatoria) | Date picker (default hoy) | botón "Continuar" |
| 2 | Tipo (obligatorio) | Chips (bjj / grappling / open mat), sin preselección | al click |
| 3 | Foco | Input texto | Enter o "Continuar" |
| 4 | Técnica clase | Textarea | botón "Continuar" |
| 5 | Observaciones profesor | Textarea + "Guardar" | manual |

Pasos 1 y 2 obligatorios. Pasos 3-5 skipeables (avanzan vacíos con
"Continuar"). No hay link "Saltar" — patrón alineado con T-5/T-6.

### F-5 — Auto-update PWA
- Cambiar `registerType: 'autoUpdate'` → `'prompt'` en `vite.config.ts`.
- Componente toast "Nueva versión disponible. ¿Recargar?" con botón
  "Recargar" + opción descartar.
- Posicionado en bottom para no bloquear el FAB ni la barra de tabs.

**Requiere tocar `vite.config.ts` (fichero protegido).** Pedir OK
explícito antes de modificarlo.

---

## DECISIONES CONFIRMADAS

1. **Wizard con auto-avance, una decisión por paso.** Sin botones
   "Atrás/Siguiente"; el paso avanza implícitamente al seleccionar
   un chip o confirmar un input (Enter / botón "Continuar" en campos
   de texto). Indicador `N/M` clickable para volver atrás.
2. **Todos los pasos opcionales tienen "Saltar" visible.** El roll y
   el compañero tienen un paso obligatorio (compañero / nombre); el
   resto skipeable. La sesión solo obliga a la fecha (default hoy).
3. **"+ Crear nuevo" desde el combobox crea con solo el nombre +
   despliegue opcional "+ Añadir más datos"** dentro del mismo paso,
   sin salir del flujo del roll.
4. **Chips de enum = selección única tipo radio.** Más ligero que un
   select nativo. Mismo patrón que los chips de filtros en P5.
5. **Form para editar, wizard solo para alta nueva** — aplica a
   sesión, roll y compañero. Editar un solo campo no debería forzar
   el wizard.
6. **Toast de update se descarta por sesión.** Si lo cierras sin
   recargar, no vuelve hasta que cierres y abras la app de nuevo.

---

## PANTALLAS AFECTADAS

| Pantalla | Cambio |
|---|---|
| P1 — Home | FAB pasa a token `bg-primary`. |
| P2 — Detalle sesión | Alta nueva = wizard. Edición = inline. |
| P3 — Editor de roll | Wizard 4 pasos + combobox + chips. |
| P4 — Editor de compañero | Wizard 2 pasos + chips. |
| P5 — Tabla rolls | Badges de resultado a tokens. |
| P6 — Ajustes | Toast de update reposiciona si está visible. |

---

## PLAN DE TAREAS

Ordenadas por dependencias. Cada tarea = 1 commit (o pocos commits).

### T-1 — Auditoría de colores crudos
- [ ] Grep de `bg-(blue|red|green|yellow|gray|slate)-` y similares en
  `src/`.
- [ ] Listar los componentes afectados.
- [ ] Definir el token de reemplazo para cada caso.

### T-2 — Migración a tokens shadcn
- [ ] Reemplazar colores crudos por tokens en todos los componentes
  listados en T-1.
- [ ] Añadir regla en `CONTEXTO_AGENTE.md`.
- [ ] Verificar visualmente que nada se rompió (modo claro/oscuro).

### T-3 — Componente Chips (selección única)
- [ ] Crear `lib/components/ui/Chips.svelte` (o similar) genérico,
  con `options`, `value`, `on:change`.
- [ ] Usable en editores y filtros.

### T-4 — Combobox de compañero con "crear nuevo"
- [ ] Crear `lib/components/CompaneroCombobox.svelte`.
- [ ] Autocomplete por `nombre`.
- [ ] Opción "+ Crear nuevo: 'X'" si no hay match exacto.

### T-5 — Wizard de roll (P3)
- [ ] Refactor de P3 a 5 pasos con auto-avance.
- [ ] Integrar Chips + Combobox.
- [ ] "Saltar" en pasos 2-5; paso 1 (compañero) obligatorio.
- [ ] Despliegue opcional "+ Añadir más datos" al crear compañero nuevo.

### T-6 — Wizard de compañero (P4)
- [ ] Refactor de P4 a 5 pasos con auto-avance.
- [ ] Integrar Chips.
- [ ] "Saltar" en pasos 2-5; paso 1 (nombre) obligatorio.

### T-7 — Wizard de sesión nueva (P2)
- [ ] Refactor de `/sesion/nueva` a wizard inline de 5 pasos (no
  modal — sigue siendo página).
- [ ] Pasos 1 (fecha) y 2 (tipo) obligatorios. Resto skipeables.
- [ ] Edición de sesión existente sigue inline (como hoy).

### T-8 — Auto-update PWA
- [ ] Tocar `vite.config.ts` para `registerType: 'prompt'` (pedir OK).
- [ ] Componente `UpdateToast.svelte`.
- [ ] Hook en `+layout.svelte` para detectar `needRefresh`.

### T-9 — Verificación en uso real
- [ ] Capturar 1 sesión real con el flujo nuevo.
- [ ] Anotar fricción residual en `MEJORAS_FUTURAS.md` si aparece.

---

## CRITERIOS DE ACEPTACIÓN

Para considerar it.0.5 cerrada:

**Visuales:**
- [ ] `grep -r "bg-blue-\|bg-red-\|bg-green-\|bg-yellow-\|bg-gray-\|bg-slate-" src/` no devuelve nada (excepto en `app.css` o tokens de shadcn).
- [ ] Modo claro y modo oscuro coherentes (si modo oscuro existe).

**Funcionales:**
- [ ] Puedo crear un roll completo siguiendo los 4 pasos del wizard.
- [ ] Puedo crear un compañero al vuelo desde el paso 1 del wizard de
  roll, sin abrir otra pantalla.
- [ ] Los chips de enum se ven y se comportan igual en P3, P4, P2.
- [ ] El editor de roll/compañero existente sigue funcionando para
  editar (no es bloqueante pasar por wizard al editar).
- [ ] Tras publicar una versión nueva en GitHub Pages, al abrir la app
  veo el toast de "nueva versión disponible".
- [ ] Si cierro el toast sin recargar, no vuelve a aparecer hasta que
  cierro/abro la app.

**Uso real:**
- [ ] He capturado al menos 1 sesión real con el flujo nuevo.

---

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| El wizard hace más lenta la captura que el formulario único | Medir tiempo real en T-9. Si es peor, evaluar pantalla única con auto-foco como alternativa. |
| `registerType: 'prompt'` requiere wiring específico de `vite-plugin-pwa` que aún no está | T-8 empieza leyendo el config actual antes de tocar nada. |
| El combobox con "crear nuevo" genera compañeros duplicados por typos | Validar exact match case-insensitive antes de ofrecer "crear nuevo". |
| Tokens shadcn no cubren todos los casos (ej. badges de resultado en 3 colores semánticos) | Definir 2-3 tokens custom en `app.css` (`--success`, `--warning`, etc.) si hace falta. Documentarlos. |

---

## CIERRE — pendiente

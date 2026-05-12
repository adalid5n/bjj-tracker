# Iteración 1 — Mapa técnico básico

**Versión:** 1.0 (planificación)
**Estado:** 🟡 En planificación — pendiente de tu OK final
**Predecesor:** Iteración 0.5 (pulido pre-it.1, cierre con T-9 pendiente)

---

## OBJETIVO

Introducir **Posiciones**, **Técnicas** y **Sumisiones terminales** como entidades de primera clase. Vista lista del mapa con **modales navegables encadenados**. Linkear rolls a posiciones de problema. Sentar la base estructural para análisis (it.2) y vista grafo (it.3).

**Por qué ahora:**
- It.0 + it.0.5 dejaron la captura cómoda pero con técnicas/posiciones como texto libre. El análisis (CU-3) necesita estructura.
- Antes del grafo (it.3) hace falta catálogo poblado, y antes del catálogo hace falta UI para construirlo.

**Lo que NO entra en esta iteración:**
- Linkear rolls a **técnicas** — it.2.
- Vista **grafo** con Cytoscape — it.3.
- Análisis automático (consultas C1, C2) — it.2.
- Sync móvil↔desktop por JSON — it.4.

**Criterio de éxito:**
1. Catálogo poblado con **2 posiciones bien mapeadas** (guardia cerrada bottom + mount bottom) — al menos 3 técnicas por posición y sus contras conocidas.
2. Al capturar un roll, selecciono **posiciones donde tuve problema** referenciando catálogo.
3. **Recorrido de modales encadenado** funciona en uso real: nodo → técnica → contra → respuesta → ... sin bucles ni errores.
4. En **móvil y desktop** veo el catálogo y puedo crearlo/editarlo (uso real: capturar técnicas tras clase desde móvil).

---

## ALCANCE FUNCIONAL

### F-1 — Schema BD v2

Nuevas tablas y migración v1→v2:

**POSICION**
- `id` (UUID)
- `nombre` (text)
- `categoria` (text: guardia / control_superior / espalda / transicion / otro)
- `tipo` (text: ofensiva / defensiva / neutral)
- `notas` (text, default '')

**SUMISION_TERMINAL**
- `id` (UUID)
- `nombre` (text, UNIQUE)
- `notas` (text, default '')

(Nodo terminal del grafo. No tiene posición de origen ni salidas.)

**TECNICA**
- `id` (UUID)
- `nombre` (text)
- `variante` (text, nullable)
- `posicion_origen_id` (FK POSICION, NOT NULL)
- `posicion_destino_id` (FK POSICION, nullable)
- `sumision_destino_id` (FK SUMISION_TERMINAL, nullable)
- `tipo` (text: ataque / sweep / escape / transicion / sumision)
- `estado` (text: probando / funciona / descartada, default 'probando')
- `detalles` (text, default '')
- `errores_comunes` (text, default '')

Constraint: exactamente uno de (`posicion_destino_id`, `sumision_destino_id`) NOT NULL. Si `tipo = sumision`, debe ser `sumision_destino_id`; si no, `posicion_destino_id`.

UNIQUE: (`nombre`, `posicion_origen_id`, `variante`) — evita duplicados exactos, pero permite varias variantes y orígenes distintos.

**TECNICA_CONTRA** (N:N auto-referencial, asimétrica)
- `tecnica_id` (FK TECNICA)
- `contra_tecnica_id` (FK TECNICA)
- PK compuesta `(tecnica_id, contra_tecnica_id)`

**ROLL_POSICION_PROBLEMA** (N:N)
- `roll_id` (FK ROLL)
- `posicion_id` (FK POSICION)
- PK compuesta `(roll_id, posicion_id)`

**Migración v1→v2:**
- Crear las 4 tablas nuevas.
- Eliminar columna huérfana `experiencia_anos` de `companeros` (deuda anotada en MEJORAS_FUTURAS).
- Bump `schema_version` a 2.

### F-2 — Página `/mapa` (desktop + móvil)

**Estructura:**
- Lista de **posiciones agrupadas por categoría** (guardia, control superior, espalda, transición, otro).
- Sección aparte al final con **sumisiones** (lista plana, no agrupada).
- **Buscador** por nombre que filtra ambas listas.

**Acciones (mismas en móvil y desktop tras revisión T-8):**
| Acción | Comportamiento |
|---|---|
| FAB "+ Nueva posición" / "+ Nueva sumisión" | Visible siempre. |
| Edición / borrado desde modales | Disponible siempre. |
| Modales navegables encadenados | Idéntico en ambos. |

**Empty state:**
- Catálogo vacío: "Catálogo vacío. Pulsa '+ Nueva posición' para empezar."

**Acceso:**
- Desktop: link en barra de navegación.
- Móvil: tab nuevo en `BottomNav` (icono mapa).

### F-3 — Modales navegables (3 tipos)

Diseño del patrón **stack de modales**:
- Cada click en una salida (link a nodo/técnica/contra) abre un nuevo modal **encima** del anterior.
- Botón **"← Atrás"** vuelve al modal previo (cierra solo el del top).
- Botón **"✕ Cerrar"** cierra todo el stack.
- Breadcrumb mínimo en header: ruta navegada (ej. `Mount bottom → Upa → Posting brazo`).

**Modal de POSICION:**
- Header: nombre + chip de categoría + chip de tipo.
- Notas/principios.
- Tabs por tipo de técnica que sale de aquí (solo los tabs con contenido): **Ataques | Sweeps | Escapes | Transiciones | Sumisiones**.
- Cada item del tab: nombre + variante (si aplica) + destino + número de contras.
- Acciones: editar, borrar (con confirmación si tiene técnicas). Disponibles en móvil y desktop.

**Modal de TECNICA:**
- Header: nombre [+ variante] + chip de tipo + chip de estado.
- **Origen** → link al nodo de posición.
- **Destino** → link al nodo (posición o sumisión).
- Setup / ejecución.
- Errores comunes.
- **Contras conocidas**: lista clickable de técnicas que la responden.
- **Otras variantes de [nombre]**: aparece si hay aristas hermanas con mismo nombre (distinto origen y/o variante).
- Acciones: editar, añadir contra, borrar. Disponibles en móvil y desktop.

**Modal de SUMISION:**
- Header: nombre.
- Notas.
- **Variaciones agrupadas por posición de origen**: lista de aristas que llegan, click → modal de la técnica.
- Acciones: editar, borrar. Disponibles en móvil y desktop.

### F-4 — Editores (wizards)

Mismo patrón auto-avance que it.0.5 (chips para enums, combobox con "+ crear nuevo" inline, "Saltar" en pasos opcionales).

**Wizard de POSICION (4 pasos, solo el primero obligatorio):**
1. Nombre (obligatorio).
2. Categoría (chips: guardia / control_superior / espalda / transición / otro). Skippable — default `otro` si se salta.
3. Tipo (chips: ofensiva / defensiva / neutral). Skippable.
4. Notas (textarea, opcional, manual).

**Wizard de SUMISION (1 paso real):**
1. Nombre (obligatorio).
2. Notas (textarea, opcional, manual).

**Wizard de TECNICA (más complejo):**
1. Nombre (obligatorio).
2. Variante (input texto, skippable).
3. Posición de origen (combobox sobre posiciones existentes — sin "crear nueva" aquí; si no existe la posición, fuera del wizard).
4. Tipo (chips: ataque / sweep / escape / transicion / sumision) — decide paso 5.
5. Destino:
   - Si tipo `!= sumision`: combobox de posición destino + "+ crear nueva posición" inline.
   - Si tipo `= sumision`: combobox de sumisión destino + "+ crear nueva sumisión" inline.
6. Estado (chips, default `probando`, skippable).
7. Detalles + errores comunes (2 textareas, opcional, manual).

**Añadir contra a una técnica:**
- Desde modal de técnica, botón "+ Añadir contra".
- Combobox de técnicas (autocomplete por nombre) + "+ Crear nueva técnica" inline (abre el wizard de técnica).

### F-5 — Captura inline desde wizard de roll

`RollEditor.svelte` gana un paso nuevo entre "compañero" y "tamaño relativo":

**Paso nuevo — Posiciones donde tuve problema (opcional):**
- Multi-chips sobre posiciones existentes (selección múltiple).
- "+ Crear nueva posición" inline: abre el **wizard completo de posición** (4 pasos). Solo nombre obligatorio; los demás disponibles pero skippables. El usuario decide cuánto rellenar en caliente vs dejar para luego.
- Skippable (puede no haber posiciones problema).

Persiste en `roll_posicion_problema` al guardar el roll.

### F-6 — Visualización en detalle de sesión y tabla de rolls

- Detalle de sesión (`/sesion/[id]`): cada roll muestra (si tiene) chips de posiciones de problema (read-only).
- Tabla `/rolls`: filtro nuevo "Posición problema" (multi-select de posiciones del catálogo).

---

## DECISIONES CONFIRMADAS

1. **Sumisiones = nodos terminales separados** (REQUISITOS §7 cerrado).
2. **Variantes como aristas paralelas** (REQUISITOS §7 cerrado).
3. **Tipos:** ataque / sweep / escape / transición / sumisión. "Defensa" fuera (vive como contra).
4. **Posiciones semilla:** guardia cerrada bottom + mount bottom.
5. **Móvil del mapa entra en it.1 con edición.** Cambio de scope (2026-05-13, s5) respecto a la decisión original "móvil read-only": el stakeholder usa móvil para capturar técnicas durante/tras clase.
6. **Linkear rolls a técnicas: it.2**, no en it.1. En it.1 solo posiciones.
7. **Modales encadenados desde it.1** — no esperan al grafo (it.3).
8. **Wizards con auto-avance** mismo patrón que it.0.5.
9. **Stack de modales con breadcrumb**, no navegación por reemplazo. Si en uso real resulta confuso, refactor a reemplazo.

---

## PANTALLAS AFECTADAS

| Pantalla | Cambio |
|---|---|
| `/` home | Sin cambio. |
| `/mapa` (nueva) | Lista + buscador + modales navegables. FAB visible siempre (móvil + desktop). |
| `/rolls` tabla | Filtro nuevo por posición de problema. |
| `/sesion/[id]` detalle | Chips de posiciones problema bajo cada roll. |
| Wizard de roll | Paso nuevo: "posiciones donde tuve problema". |
| `BottomNav` móvil | Tab nuevo "Mapa". |

---

## PLAN DE TAREAS

Ordenadas por dependencias. Cada tarea = 1 commit (o pocos).

### T-1 — Schema v2 + migración
- [ ] Definir `SCHEMA_V2` en `src/lib/db/schema.ts`.
- [ ] Función `migrate_v1_to_v2`: crear nuevas tablas + drop `experiencia_anos`.
- [ ] Bump `schema_version` a 2.
- [ ] Test unitario de migración (Vitest).

### T-2 — Capa de datos (CRUD interno)
- [ ] `src/lib/posiciones.ts` — list / get / create / update / delete.
- [ ] `src/lib/sumisiones.ts` — idem (sobre `sumisiones_terminales`).
- [ ] `src/lib/tecnicas.ts` — idem + `getByPosicion(id)`, `getByPosicionYTipo(id, tipo)`, `getOtrasVariantes(nombre, excluirId)`.
- [ ] `src/lib/contras.ts` — `addContra`, `removeContra`, `getContras(tecnicaId)`.
- [ ] Extender `src/lib/rolls.ts` con `setPosicionesProblema(rollId, posicionIds[])` y `getPosicionesProblema(rollId)`.
- [ ] Añadir tipos `Posicion`, `SumisionTerminal`, `Tecnica`, `TipoTecnica`, etc. en `src/lib/types/`.

### T-2.5 — Export/import (sync.ts) cubre schema v2
- [ ] Actualizar `src/lib/sync.ts`: `CURRENT_SCHEMA_VERSION` → 2.
- [ ] `exportAll()` incluye `posiciones`, `sumisiones_terminales`, `tecnicas`, `tecnica_contras`, `roll_posicion_problema`.
- [ ] `importAll()` valida `schema_version === 2` y mergea/restaura las tablas nuevas con la misma estrategia que las v1 (upsert por id, last-write-wins por timestamp donde aplique).
- [ ] Verificación: export → wipe BD → import → estado idéntico.

### T-3 — Ruta `/mapa` lista (read-only)
- [ ] Página con lista de posiciones por categoría + sumisiones aparte + buscador.
- [ ] Renderizado desde BD (sin edición todavía).
- [ ] Tab "Mapa" en `BottomNav` móvil + responsive.

### T-4 — Stack de modales (infra)
- [ ] Store o context para gestionar el stack.
- [ ] Componente base `ModalStack.svelte` con botones atrás/cerrar y breadcrumb.

### T-5 — Modal de POSICION
- [ ] `PosicionModal.svelte` con tabs por tipo de técnica.
- [ ] Click en item del tab → push del modal de técnica al stack.

### T-6 — Modal de TECNICA
- [ ] `TecnicaModal.svelte` con salidas a origen / destino / contras / otras variantes.
- [ ] Query "otras variantes de [nombre]".

### T-7 — Modal de SUMISION
- [ ] `SumisionModal.svelte` con variaciones agrupadas por origen.

### T-8 — Editor de POSICION (wizard)
- [ ] FAB "+ Nueva posición" visible en móvil y desktop.
- [ ] Wizard 4 pasos con auto-avance.
- [ ] Acciones editar/borrar desde modal de posición.

### T-9 — Editor de SUMISION (wizard)
- [ ] FAB toggle "+ Nueva sumisión" visible en móvil y desktop.
- [ ] Wizard mínimo.
- [ ] Acciones editar/borrar.

### T-10 — Editor de TECNICA (wizard)
- [ ] Wizard con lógica condicional en paso destino.
- [ ] Acciones editar/borrar.
- [ ] "+ Crear nueva sumisión" inline desde paso destino.

### T-11 — Contras
- [ ] Botón "+ Añadir contra" en modal de técnica.
- [ ] Combobox con autocomplete + "+ Crear nueva técnica" inline.

### T-12 — Captura inline en wizard de roll
- [ ] Paso nuevo "posiciones problema" en `RollEditor.svelte`.
- [ ] Multi-chips + "+ crear nueva posición" inline reutilizando el wizard completo de posición (todos los pasos disponibles, solo nombre obligatorio).
- [ ] Persistir `roll_posicion_problema` al guardar.

### T-13 — Visualización de posiciones problema
- [ ] Chips en detalle de sesión bajo cada roll.
- [ ] Filtro en `/rolls` por posición de problema.

### T-14 — Semilla y verificación
- [ ] Mapear guardia cerrada bottom + mount bottom + sus técnicas conocidas.
- [ ] Capturar 2-3 rolls reales linkeando posiciones.
- [ ] Verificar recorrido de modales encadenado en uso real (móvil y desktop).

### T-15 — Cierre
- [ ] Actualizar `ESTADO_ACTUAL.md`.
- [ ] Bump versión en `package.json` y `version.ts`.
- [ ] Commit + tag `v0.2-it1` + push + verificar deploy.

---

## CRITERIOS DE ACEPTACIÓN

**Funcionales:**
- [ ] Schema v2 migra de v1 sin perder datos.
- [ ] Puedo crear/editar/borrar posiciones, sumisiones y técnicas desde móvil y desktop.
- [ ] Puedo añadir contras a una técnica.
- [ ] Puedo navegar nodo → técnica → contra → otra técnica sin bucles ni errores.
- [ ] El modal de técnica muestra "otras variantes de [nombre]" cuando hay aristas hermanas.
- [ ] En móvil veo y edito el catálogo igual que en desktop (FAB + acciones disponibles).
- [ ] Al capturar un roll, selecciono posiciones de problema desde el wizard.
- [ ] El detalle de sesión y la tabla `/rolls` muestran las posiciones de problema.

**Visuales:**
- [ ] Stack de modales coherente: botones atrás y cerrar visibles y funcionales, breadcrumb claro.
- [ ] Empty state claro (catálogo vacío con CTA al FAB).

**Uso real:**
- [ ] Guardia cerrada bottom + mount bottom mapeadas con al menos 3 técnicas cada una y sus contras conocidas.
- [ ] 2-3 rolls capturados con posiciones de problema linkeadas.

---

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Stack de modales se vuelve confuso ("¿dónde estoy?") | Breadcrumb obligatorio. Si aún confuso en uso real, refactor a navegación por reemplazo (no stack). Decisión post-T-14. |
| Catálogo vacío bloquea capturar rolls (no hay posiciones que seleccionar) | El paso "posiciones problema" es skippable + "+ crear nueva posición" inline en el propio wizard. No bloquea. |
| Migración v1→v2 falla en BDs reales con datos | Test unitario + verificación manual en preview antes de push. Plan B: keep `experiencia_anos` y limpiar en v3. |
| Modal de técnica con muchas contras se vuelve scrolleable infinito | Renderizar como chips. Volumen esperado bajo (§4.7). Paginar solo si pasa. |
| Wizard de técnica con 7 pasos se siente largo | Auto-avance + pasos skippables minimiza fricción. Si aún molesta, evaluar form compacto en una pantalla como alternativa post-T-14. |
| Móvil con catálogo grande lento en lectura | Volumen esperado bajo. Si pasa, lazy loading por categoría. |
| Inline "crear nueva posición" desde wizard de roll genera posiciones huérfanas (sin categoría ni tipo bien definidos) | El mini-wizard pide categoría obligatoria (mínimo razonable). El resto se rellena luego en `/mapa`. Modal de posición avisa de "ficha incompleta" si faltan notas. |

---

## CUESTIONES PEQUEÑAS A CERRAR EN EJECUCIÓN

No bloquean planificación pero hay que cerrarlas al pasar por la tarea correspondiente:

- **Categorías de posición:** propongo guardia / control_superior / espalda / transición / otro. ¿Hace falta más granularidad (ej. half_guard separada de guardia)? Decisión en T-1.
- **¿Borrar una posición con técnicas asociadas se permite (cascade) o se prohíbe?** Propongo: confirmar + cascade (borra la posición + todas sus técnicas). Decisión en T-8.
- **¿Cómo se editan las contras (no solo añadir)?** Lista en modal con icono "✕" para quitar. Decisión en T-11.
- **Tipo "transicion" vs "transición" en BD** — usar sin tilde para evitar problemas de encoding/queries. Solo el label de UI lleva tilde. Decisión en T-1.

---

## CIERRE — pendiente

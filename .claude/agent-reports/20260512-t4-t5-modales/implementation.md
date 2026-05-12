# T-4 + T-5 + seed `/dev/seed-mapa` — Implementación

**Fecha:** 2026-05-12
**Tareas:** T-4 (infra stack de modales) + T-5 (modal de posición) + ruta dev de seed.
**Resultado `pnpm check`:** `0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS` sobre 974 ficheros.

---

## Resumen ejecutivo

Se implementa el **stack de modales del mapa técnico** como un único `Dialog` controlado por un store global, no como Dialogs anidados. El store mantiene la lista de entradas (posicion/tecnica/sumision) y el host (`MapaModalHost`) renderiza la del top con breadcrumb + botones ←/✕.

Sobre esa infra se monta el **modal de posición** (T-5): chips de tipo/categoría, notas, y tabs por tipo de técnica (solo los que tienen contenido). Click en una técnica hace `push` al stack — el modal de técnica es placeholder esperando T-6, y el de sumisión esperando T-7.

Como apoyo, se añade `/dev/seed-mapa`: una página con dos botones (seed idempotente / wipe total) que crea el catálogo mínimo necesario para validar todos los casos del modal de posición sin esperar a los editores (T-8+).

---

## Decisiones tomadas

### Stack store

- **Ubicación:** `src/lib/components/mapa-modal-stack.svelte.ts`. Vive en `components/` (no en `stores/` o `lib/`) porque es solapado al host: solo tiene sentido junto con `MapaModalHost.svelte` y `PosicionModalContent.svelte`. Si más adelante se reutiliza fuera del mapa, se promueve a `lib/stores/`.
- **Patrón canónico:** `class MapaModalStack { #stack = $state<MapaModalEntry[]>([]); ... }` con get/set, exportada como singleton `mapaModalStack`. Sigue el patrón del proyecto (ver `pwa.svelte.ts` y la nota de `CONTEXTO_AGENTE` sobre runas en module-level: prohibidas; van dentro de class fields).
- **API mínima:** `push`, `pop`, `popTo(i)`, `closeAll`, getters `stack`, `top`, `isOpen`. Los mutadores usan asignación inmutable (`this.#stack = [...this.#stack, entry]`) en lugar de `.push()` para evitar surpresas con la reactividad fina de Svelte 5.

### Tabs sin primitive

shadcn-svelte instalado en este proyecto **no incluye Tabs primitive** (solo `button`, `dialog`, `input`, `label`, `select`, `separator`, `textarea`). bits-ui sí lo expone pero no se ha incorporado a `src/lib/components/ui/`. Para evitar instalar/copiar un componente nuevo en una iteración de modales, los tabs se implementan **a mano con botones-chip** (mismo lenguaje visual que `src/lib/components/Chips.svelte`):

- `role="tablist"` en el contenedor, `role="tab"` + `aria-selected` en cada botón.
- Chip activo: `border-primary bg-primary text-primary-foreground`. Chip inactivo: `border-border bg-muted text-muted-foreground hover:bg-accent`.
- El panel debajo es un `<div role="tabpanel">` con la lista de técnicas dentro.

Si en T-6/T-7 hace falta tabs en más sitios, plantear instalar el primitive de shadcn-svelte de forma centralizada (≤30 min). Por ahora **no se introduce nueva dependencia**.

### Placeholders para tecnica/sumision

`MapaModalHost.svelte` ya reconoce los tres tipos de `kind` en el stack. Cuando el top es `tecnica` o `sumision`, renderiza una caja punteada con el texto "Modal de técnica llega en T-6" / "Modal de sumisión llega en T-7".

Importante: cuando T-6 implemente `TecnicaModalContent`, basta con sustituir la rama `top.kind === 'tecnica'` del host por `<TecnicaModalContent tecnicaId={top.id} />` (con un patrón de carga similar al de posiciones: cache lazy en el host). El stack store y la mecánica de navegación no necesitan cambios.

### Carga lazy de la posición en el host

El stack guarda `{kind, id, nombre}` (no la entidad completa) para que el `push` desde cualquier sitio sea barato — solo necesitas saber el nombre para el breadcrumb. La hidratación completa (notas, categoría, tipo) la hace el host bajo demanda via `$effect`, cacheando por id. Esto evita que el host tenga que recibir entidades por prop desde callers heterogéneos y deja preparado el patrón para tecnica/sumision en T-6/T-7.

### Integración con `Dialog.Content`

El `Dialog.Content` de shadcn-svelte ya provee un botón ✕ (top-right). En lugar de duplicar otro botón "✕ Cerrar" del brief, **reutilizo el del Dialog** y conecto su `onOpenChange(false)` a `mapaModalStack.closeAll()`. Así también captura Esc y click en overlay como "cerrar todo". El botón "← Atrás" sí es nuestro, va junto al título dentro del header, solo si `stack.length > 1`.

### Seed idempotente

- **Posiciones y sumisiones:** matching por `nombre` (case-insensitive, trimmed). Si ya existe una con ese nombre, se respeta. No actualiza notas/categoría/tipo.
- **Técnicas:** matching por tupla `(nombre, posicion_origen_id, variante ?? '')`. Coincide con el UNIQUE definido en schema v2. Una técnica seed sin variante NO duplica una técnica existente del mismo nombre+origen con variante "clásica" (porque la tupla difiere). Si se queda corto, hay que actualizar el matcher.
- **Tipo de fila resultante:** la primera ejecución crea 3+2+6 = 11 filas. La segunda ejecución crea 0. Si se ejecuta tras wipe, vuelve a crear 11.
- **Wipe:** confirm() + borra técnicas → sumisiones → posiciones en orden inverso a las FKs. El schema v2 ya tiene `ON DELETE CASCADE` en `tecnicas.posicion_origen_id`, pero el borrado explícito es defensivo y deja un estado limpio garantizado.

### Decisiones que NO necesitaron escalamiento

- Lookup de nombres de destino (posiciones/sumisiones referenciadas por una técnica): cargamos las listas completas una vez en `onMount` y construimos `Record<id, nombre>` en memoria. Volumen esperado bajo (§4.7 REQUISITOS), evita N queries.
- Contador de contras en la lista de técnicas: paralelizado con `Promise.all` sobre `getContras(tecnicaId).length`. Para el catálogo mínimo (6 técnicas) son 6 queries triviales. Si hay riesgo de escala, ya hay deuda anotada (ver más abajo).

---

## Ficheros tocados/creados

| Fichero | Estado | Resumen |
|---|---|---|
| `src/lib/components/mapa-modal-stack.svelte.ts` | **Nuevo** | Store del stack con API `push`/`pop`/`popTo`/`closeAll`. |
| `src/lib/components/MapaModalHost.svelte` | **Nuevo** | Único `Dialog` controlado por el stack; breadcrumb + ← + ruteo por `kind`. |
| `src/lib/components/PosicionModalContent.svelte` | **Nuevo** | Contenido del modal de posición: chips + notas + tabs hechos a mano + lista de técnicas clickable. |
| `src/routes/mapa/+page.svelte` | Modificado | Importa el stack + host, posiciones/sumisiones ahora son `<button>` que hacen `push`, monta `<MapaModalHost />` tras `<BottomNav />`. |
| `src/routes/dev/seed-mapa/+page.svelte` | **Nuevo** | Página dev con botones de seed idempotente y wipe; muestra contadores en vivo. |

---

## `pnpm check`

```
> bjj-tracker@0.0.2 check /home/adalid/projects/bjj-tracker
> svelte-kit sync && svelte-check --tsconfig ./tsconfig.json

START "/home/adalid/projects/bjj-tracker"
COMPLETED 974 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

Hubo un warning intermedio (`a11y_no_noninteractive_element_to_interactive_role` por `<ul role="tabpanel">`) que se corrigió envolviendo la lista en un `<div role="tabpanel">` con `<ul>` semántico dentro.

---

## Verificación manual para Adalid

Asumiendo BD ya en schema v2 (T-1 cerrado), ejecutar `pnpm run dev` localmente y probar:

1. **Seed inicial:**
   - Ir a `/dev/seed-mapa` directamente por URL (no hay link desde la home — es ruta temporal).
   - Pulsar "Sembrar datos de ejemplo". Esperar mensaje verde "Sembrado: 3 posiciones, 2 sumisiones, 6 técnicas."
   - Contadores arriba deben reflejar 3/2/6.

2. **Idempotencia del seed:**
   - Pulsar otra vez "Sembrar datos de ejemplo". Mensaje debe ser "Sembrado: 0 posiciones, 0 sumisiones, 0 técnicas." y contadores siguen en 3/2/6.

3. **Modal de posición — caso con varios tabs:**
   - Ir a `/mapa`.
   - Click en "Guardia cerrada bottom". Se abre el modal con título "Guardia cerrada bottom", chips "Ofensiva" + "Guardia", **sin breadcrumb** ni botón ←.
   - Deben aparecer dos tabs: "Sweeps" y "Sumisiones". El primero ("Sweeps") seleccionado por defecto.
   - En "Sweeps" debe verse "Hip bump sweep → Mount top" + "Sin contras".
   - Click en tab "Sumisiones": deben aparecer "Armbar desde guardia → Armbar (sumisión)" y "Cross choke desde guardia → Cross choke (sumisión)".

4. **Modal de posición — caso con un solo tipo de técnica:**
   - Cerrar modal (✕ o Esc) y click en "Mount top". Solo tab "Sumisiones" visible, con "Armbar desde mount → Armbar (sumisión)".

5. **Modal de posición — caso de variantes:**
   - Cerrar y click en "Mount bottom". Tab "Escapes" visible con dos entradas: "Upa" y "Elbow escape (clásica)". Ambas con destino "→ Guardia cerrada bottom".

6. **Stack de modales (placeholder):**
   - En el modal de "Mount bottom" → tab "Escapes" → click en "Upa". El modal cambia: breadcrumb arriba muestra "Mount bottom → Upa", aparece flecha ← junto al título, y el cuerpo es la caja "Modal de técnica llega en T-6".
   - Pulsar ← (atrás). Vuelves al modal de "Mount bottom" sin breadcrumb.
   - Repetir push → click en breadcrumb "Mount bottom" del header: vuelves directamente sin pasar por estado intermedio.
   - Esc o ✕ cierra todo el stack a la vez.

7. **Sumisiones placeholder:**
   - En `/mapa`, scroll abajo, click en "Armbar". Modal con título "Armbar", sin breadcrumb, sin ←, contenido "Modal de sumisión llega en T-7".

8. **Wipe + re-seed:**
   - Ir a `/dev/seed-mapa`, pulsar "Limpiar todo el catálogo", confirmar. Contadores a 0/0/0.
   - Pulsar "Sembrar datos de ejemplo" otra vez. Vuelve a 3/2/6.

9. **`/mapa` sigue rindiendo igual visualmente** (los chips de tipo/categoría siguen en su sitio, solo añadimos hover/focus en los items).

10. **A11y/teclado:**
    - Navegar con Tab por la lista de `/mapa`: cada item recibe foco visible.
    - Enter sobre un item abre el modal.
    - Dentro del modal, Tab cicla por breadcrumb → ← → ✕ → tabs → items de la lista.
    - Esc cierra el stack completo.

---

## Deuda detectada / cuestiones pendientes

### Para T-6 (modal de técnica)

- Sustituir la rama `top.kind === 'tecnica'` de `MapaModalHost.svelte` por `<TecnicaModalContent tecnicaId={top.id} />` siguiendo el patrón de `PosicionModalContent`. La carga lazy de la técnica puede hacerse igual que con posiciones (cache `Record<id, Tecnica>` en el host) o directamente dentro del componente content como en posiciones.
- El stack ya soporta `{kind: 'tecnica', id, nombre}`. T-5 ya hace `push` de técnica al click en una entrada de tab. T-6 solo debe encargarse de **mostrar** el contenido y de **emitir sus propios `push`** hacia origen/destino/contras/variantes.

### Para T-7 (modal de sumisión)

- Análogo: sustituir la rama `top.kind === 'sumision'` por `<SumisionModalContent />`. T-5 ya hace `push` desde `/mapa` (item de sumisión clickable).

### Deuda menor anotada

- **Contras query N+1.** `PosicionModalContent` lanza `getContras(id)` por cada técnica del listado. Volumen actual: ≤ 10 técnicas por posición, irrelevante. Si se nota, consolidar en una sola query con `COUNT(*) GROUP BY tecnica_id`. No urgente — candidato para `MEJORAS_FUTURAS.md` solo si aparece en perfilado.
- **Caché del host vs cambios.** Si una posición se edita desde T-8 mientras un modal del mismo nodo está abierto, el host muestra la versión cacheada. Como T-8 cierra su propio diálogo al guardar, en la práctica no se ve, pero documentado por si T-8 quiere invalidar.
- **Ruta `/dev/seed-mapa` se elimina al cerrar iteración 1** (recordatorio explícito en el header de la página y en este informe).

### Cuestiones de producto no decididas

Ninguna escalada en esta tarea. Decisiones técnicas menores (todas listadas arriba) tomadas a mi criterio dentro de las restricciones del brief.

---

## Restricciones respetadas

- Sin tocar `vite.config.ts`, `svelte.config.js`, `+layout.svelte`, `+layout.ts`, `.github/workflows/deploy.yml`, `package.json`, `src/lib/db/*`.
- Sin nuevas dependencias.
- Sin colores Tailwind crudos: solo tokens shadcn (`bg-primary`, `text-muted-foreground`, `bg-destructive/10`, `bg-success/15`, `bg-warning/10`, `border-border`, `text-primary-foreground`, `bg-accent`, etc.).
- Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`).
- Importes dinámicos para CRUD dentro de `onMount`.
- Strings UI en español.
- No commits, no push.
- No se arrancó `pnpm dev`.

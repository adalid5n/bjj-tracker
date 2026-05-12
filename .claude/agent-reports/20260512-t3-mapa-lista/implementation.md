# T-3 — Página `/mapa` (read-only) + tab Mapa en BottomNav

**Fecha:** 2026-05-12
**Iteración:** 1
**Tarea:** T-3 (Ruta `/mapa` lista, read-only)
**Estado:** implementado, sin commit/push

## Resumen ejecutivo

Se añade la primera pieza visible de la iteración 1: una página `/mapa` que
lista el catálogo de Posiciones (agrupadas por categoría) y Sumisiones
terminales (lista plana al final), con un buscador case-insensitive que filtra
ambas listas en cliente. Lectura pura: sin FAB, sin acciones de
editar/borrar, sin modales (esos llegan en T-4..T-9). Además se inserta un
quinto item "Mapa" en `BottomNav` entre Rolls y Compañeros. `pnpm check` pasa
en limpio (0 errores, 0 warnings).

## Decisiones tomadas

- **Estructura del filtro.** Input único de búsqueda (substring case-insensitive
  sobre `nombre`). Filtra simultáneamente posiciones y sumisiones; las
  secciones que queden sin items tras el filtro no se renderizan. Estado en
  cliente (`$state`/`$derived`), sin tocar SQL. Se normaliza con `trim()` para
  que espacios sueltos cuenten como query vacía.
- **Agrupación de posiciones.** Itero sobre un orden fijo
  `['guardia', 'control_superior', 'espalda', 'transicion', 'otro']` y solo
  pinto la sección si tiene items. Esto da estabilidad visual: el orden
  no salta al filtrar.
- **Estados vacíos diferenciados** (decisión consciente del brief):
  - **Catálogo vacío en BD** (sin posiciones y sin sumisiones): bloque
    `border-dashed` con copy *"Catálogo vacío. Las posiciones, sumisiones y
    técnicas se podrán crear cuando llegue T-8."* — la opción "sincera" del
    brief, dado que la app es de un solo usuario y la promesa "se actualizará
    automáticamente" suena humo. En este estado tampoco se pinta el buscador
    (no aportaría nada).
  - **Filtro sin resultados** (hay datos pero la query los oculta todos):
    mensaje `Sin resultados para "{query}".`, también con borde discontinuo
    para consistencia visual. El input del buscador sigue visible para poder
    editar la query.
- **Items no interactivos.** Los `<li>` no son `<button>` ni `<a>`. Llevan
  `cursor-default` para no prometer interacción que aún no existe. Cuando
  T-5/T-7 metan los modales, se promoverán a botones.
- **Chips.** Mismo patrón semántico que `/rolls` (`RESULTADO_BADGE`):
  - Tipo ofensiva → `bg-success/15 text-success`.
  - Tipo defensiva → `bg-destructive/15 text-destructive`.
  - Tipo neutral → `bg-muted text-muted-foreground`.
  - Categoría → siempre `bg-muted text-muted-foreground` (es informativa,
    no tiene tono semántico).
  Todo con tokens, ningún `bg-blue-500` ni similar.
- **Posición del item "Mapa" en BottomNav.** Entre Rolls y Compañeros (orden
  Home → Rolls → Mapa → Compañeros → Ajustes), como pedía el brief. Cinco
  items caben en `max-w-md` con `flex-1`; los labels actuales son cortos
  ("Home", "Rolls", "Mapa", "Compañeros", "Ajustes"). Si en uso real queda
  apretado en pantallas pequeñas, decisión post-T-14 (no entra en T-3).
- **Icono de búsqueda.** Decorativo dentro del Input, posicionado absoluto
  con `pl-8` en el input. `pointer-events-none` para que no robe el click.
- **`pb-28` en el `<main>`.** Mismo padding inferior que `/rolls` (que tampoco
  tiene FAB), no `pb-32` como en `/companeros` (que sí tiene FAB y necesita
  más hueco).
- **Carga.** Importes dinámicos para `$lib/posiciones` y `$lib/sumisiones`
  dentro de `onMount`, igual que `/companeros` con `$lib/companeros`, para
  evitar SSR del worker SQLite. Se cargan en paralelo con `Promise.all`.

## Ficheros tocados

- `src/routes/mapa/+page.svelte` **(nuevo)** — página `/mapa` read-only:
  header, buscador, lista de posiciones agrupadas por categoría, sección
  plana de sumisiones, empty states (catálogo vacío y sin resultados).
- `src/lib/components/BottomNav.svelte` — añade item "Mapa" con icono
  `@lucide/svelte/icons/map` entre Rolls y Compañeros; match por prefijo
  `/mapa`.

No se han modificado otros ficheros. No se han añadido dependencias. No se
han tocado restricciones (`vite.config.ts`, `svelte.config.js`,
`+layout.svelte`, `+layout.ts`, workflow, `package.json`, `src/lib/db/*`).

## Resultado de `pnpm check`

```
> bjj-tracker@0.0.2 check /home/adalid/projects/bjj-tracker
> svelte-kit sync && svelte-check --tsconfig ./tsconfig.json

START "/home/adalid/projects/bjj-tracker"
COMPLETED 968 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

Limpio.

## Verificación manual para Adalid

1. `pnpm dev` y navegar a `/mapa`.
2. **Caso A — BD vacía** (todavía sin posiciones ni sumisiones creadas, que
   es el estado real ahora mismo): debería verse solo el header "Mapa
   técnico" y un bloque punteado con el copy *"Catálogo vacío. Las
   posiciones, sumisiones y técnicas se podrán crear cuando llegue T-8."*.
   No debería aparecer el buscador.
3. **Caso B — con datos**. Si quieres ver el render completo antes de T-8,
   inserta manualmente posiciones desde la consola (o desde `/dev` si
   tiene helper). Comprueba:
   - Las secciones aparecen en orden fijo: Guardia → Control superior →
     Espalda → Transición → Otro.
   - Solo aparecen secciones con items.
   - Cada posición muestra nombre + (chip de tipo si lo tiene) + chip de
     categoría.
   - La sección "Sumisiones" aparece al final si hay sumisiones, lista
     plana sin agrupar.
4. **Buscador**:
   - Escribir parte de un nombre filtra ambas listas.
   - Borrar el buscador vuelve a mostrar todo.
   - Buscar algo que no existe muestra *Sin resultados para "..."* y
     conserva el input visible.
   - Es case-insensitive ("guard" encuentra "Guardia cerrada").
5. **Items no interactivos**. Hacer click en una posición/sumisión no debe
   abrir nada ni cambiar el cursor a pointer.
6. **BottomNav** en móvil/responsive:
   - Cinco tabs visibles: Home, Rolls, Mapa, Compañeros, Ajustes.
   - Al estar en `/mapa`, el tab Mapa se pinta en `text-primary`.
   - Navegar a otra ruta y volver, el active state debe respetarse.
7. **Modo oscuro**: todos los chips, bordes y empty states deben
   adaptarse vía tokens. Toggle desde `/ajustes`.

## Cuestiones pendientes / deuda

- **Sin tests automatizados.** T-3 no incluyó unit tests; el patrón de
  `/companeros` tampoco los tiene y el brief no los pidió. Si en T-5/T-7
  se introducen modales con stack, valdría la pena cubrir esa lógica
  con tests aunque la lista en sí siga sin ellos.
- **5 items en BottomNav.** Cabe, pero "Compañeros" es la etiqueta más
  larga (10 caracteres). En pantallas muy estrechas (~320px) podría
  apretarse. Si en uso real molesta, el refactor a "iconos solo en móvil"
  es deuda anotada para post-T-14 (decisión del brief).
- **Acceso desde desktop.** `BottomNav` solo se ve en móvil de facto
  (al menos no hay una nav desktop independiente). El brief de T-3
  solo pidió el tab móvil. Si la navegación desktop necesita un link
  a `/mapa`, eso es T-14 (cierre) o tarea aparte.
- **Performance.** Filtrado en cliente con `.filter()` sobre dos arrays
  pequeños. Si en uso real el catálogo crece a cientos de items y se
  nota lag al teclear, optar por debounce o índice. No hay señal de que
  haga falta.
- **Sin loader skeleton.** Mismo patrón "Cargando…" en texto plano que el
  resto de la app. Si más adelante se introduce un skeleton compartido,
  esta pantalla lo adoptará.

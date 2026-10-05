# Proposal

## Why

Hoy la importación inserta en el catálogo al pulsar "Confirmar e
insertar" a partir de **listas** de nombres. El error típico de la IA
(técnica que sale y llega a la misma posición, posición duplicada con otro
nombre, técnica colgando de la posición equivocada) solo se ve después, en
el grafo, cuando ya está escrito y hay que corregirlo a mano. Ver **en el
propio mapa** lo que se va a añadir, antes de escribir nada, convierte la
revisión en algo visual y rápido.

Además, las disciplinas deben quedar aisladas: hoy todo lo importado se
crea con la disciplina activa del mapa, sin que el usuario lo elija en la
importación.

## What Changes

- **Elegir disciplina al importar.** El primer paso de la importación
  ofrece BJJ / Grappling / Ambos (por defecto, la disciplina activa), con
  el mismo comportamiento de selector que el resto de la app (tocar elige;
  tocar la activa no hace nada). Todo lo creado lleva esa disciplina.
- **Vista previa en el mapa.** En el punto de confirmar, la ventana de
  importación (y cualquier ficha abierta) se cierra y el usuario queda en
  el mapa, vista Grafo, viendo el grafo real con lo que se va a añadir
  **resaltado con un color que late** (no con el tamaño).
- Mismo modelo visual que siempre: posiciones y sumisiones son nodos; las
  técnicas son flechas. Una posición existente que recibe una técnica
  nueva **no** late; solo late la flecha nueva.
- **Leyenda fija** con el recuento ("N posiciones, M técnicas… nuevas") y
  dos botones:
  - **"Aceptar"** → se crea todo y el usuario se queda en el mapa, que
    vuelve a la normalidad con los elementos ya reales.
  - **"Cancelar"** → vuelve a la ventana de importación, en "Revisar
    propuesta", con todo lo que tenía. No se ha escrito nada.
- Mientras dura la vista previa, el mapa muestra la disciplina de la
  importación, ignora los filtros de tipo/estado/categoría y bloquea las
  acciones que cambian datos u organización (mover nodos, guardar
  organización, crear, abrir fichas, cambiar vista o disciplina).
- Salir del mapa durante la vista previa equivale a cancelarla: no se
  escribe nada y la importación queda en el historial como "Sin terminar".
- Con "reducir movimiento" activado, el resaltado es un color fijo.
- El color sale de un **token semántico nuevo** (tema claro y oscuro).

## Decisiones (owner, cerradas)

- Vista previa sobre el **grafo real de `/mapa`** (opción b de la primera
  versión del diseño): la ventana se cierra y el usuario ve el mapa.
- "Aceptar" inserta y deja al usuario en el mapa; "Cancelar" vuelve a la
  revisión con el borrador intacto. Nada se escribe hasta "Aceptar".
- Resaltado por color que late, no por tamaño; las posiciones existentes
  que reciben técnica nueva no laten.
- `prefers-reduced-motion` → color fijo sin animación.
- Color mediante token semántico nuevo en `src/routes/layout.css`.
- Las disciplinas no se mezclan: la importación elige BJJ / Grappling /
  Ambos en el primer paso (por defecto la activa) y todo lo creado la
  lleva. Va en este change (y no en uno aparte) porque la vista previa
  depende de ella: el mapa de la vista previa es el de esa disciplina.

## Fuera de alcance

- Cómo se compara con el catálogo existente y qué catálogo se envía a la
  IA según la disciplina de la importación (punto abierto, ver
  `design.md`). El requisito actual "Reutilización de lo que ya existe en
  el catálogo" no se toca todavía.
- Editar la propuesta desde la vista previa (renombrar, mover, desmarcar
  tocando el grafo): para corregir se cancela y se vuelve a la revisión.
- Guardar la organización de los nodos nuevos durante la vista previa.
- Revertir una importación ya confirmada.
- Avisos de calidad (origen = destino, nombres casi duplicados): it.8.
- Arreglar los fallos conocidos de la línea base de importar.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `importar-clase`:
  - "Confirmar e insertar en el catálogo": se dispara con "Aceptar" en la
    vista previa del mapa y usa la disciplina elegida en la importación
    (se mantiene la marca de bug conocido).
  - Nuevos: disciplina de la importación; paso a la vista previa en el
    mapa; aceptar; cancelar.
- `mapa`: nuevo modo "vista previa de importación" (resaltado de lo nuevo,
  leyenda, movimiento reducido, disciplina y filtros durante la vista
  previa, acciones bloqueadas, salir del mapa).

## Impact

- **Usuario:** un paso más antes de insertar, a cambio de ver los errores
  de la IA en su mapa antes de que lleguen al catálogo; control explícito
  de la disciplina de lo importado.
- **Código:** `ImportarClaseDialog.svelte` (ciclo de vida del borrador),
  nuevo estado de borrador fuera del diálogo, `src/routes/mapa/+page.svelte`
  (modo vista previa), `GrafoMapa.svelte` (elementos fantasma),
  `src/lib/grafo.ts`, `src/routes/layout.css` (token nuevo). Sin cambios
  de BD ni dependencias nuevas.
- **Depende de** `selector-coherente` (comportamiento del selector) y va
  después de `historial-importaciones` (comparten el diálogo).

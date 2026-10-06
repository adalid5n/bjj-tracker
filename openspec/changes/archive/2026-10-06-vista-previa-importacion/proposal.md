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
- **Comparación con el catálogo por disciplina.** Para decidir qué ya
  existe (y qué catálogo se envía a la IA) solo se mira la disciplina de
  la importación: BJJ o Grappling → esa disciplina y "Ambos"; "Ambos" →
  solo "Ambos". Lo que falta se crea con la disciplina de la importación,
  aunque exista uno con el mismo nombre en la otra disciplina.
- **Vista previa en el mapa.** En el punto de confirmar, la ventana de
  importación (y cualquier ficha abierta) se cierra y el usuario queda en
  el mapa, vista Grafo, viendo el grafo real con lo que se va a añadir
  **resaltado con un color amarillo vivo, en el borde de los nodos con un halo exterior, y en la línea de las flechas que respira** (pasa suavemente del color
  normal al de resaltado y vuelve; no cambia el tamaño).
- Mismo modelo visual que siempre: posiciones y sumisiones son nodos; las
  técnicas son flechas. Una posición existente que recibe una técnica
  nueva **no** se resalta; solo la flecha nueva.
- **Pasos de la vista previa.** Una importación de BJJ o de Grappling
  tiene una vista previa, en esa disciplina. Una de **"Ambos" tiene dos
  seguidas**: "Vista previa 1 de 2 · BJJ" y "Vista previa 2 de 2 ·
  Grappling". Siempre hay un indicador del paso visible.
- **Barra fija** con el indicador del paso, el recuento ("N posiciones, M
  técnicas… nuevas") y los botones del paso:
  - **"Siguiente: Grappling →"** (solo en el primer paso de "Ambos") y
    **"← Atrás"** (solo en el segundo).
  - **"Aceptar"**, solo en el último paso → se crea todo **una sola
    vez** y el usuario se queda en el mapa, que vuelve a la normalidad con
    los elementos ya reales y con la **disciplina activa cambiada a la de
    la importación** (en "Ambos", la del último paso: Grappling).
  - **"Cancelar"** → vuelve a la ventana de importación, en "Revisar
    propuesta", con todo lo que tenía. No se ha escrito nada.
- **Si un paso no se puede mostrar**, en lugar de la vista previa sale
  "No se puede: <breve descripción>" con **"Retroceder"** (vuelve a
  "Revisar propuesta") y, si hay paso siguiente, **"Seguir con la
  siguiente disciplina"**. Ese paso no permite aceptar. Si se sigue y se
  acepta en el último paso, se crea todo **excepto** los elementos que
  causaron el error, y el usuario ve cuáles no se crearon.
- En la revisión, "+ Añadir" ofrece como origen/destino solo el catálogo
  de la disciplina de la importación (misma regla que la comparación).
- Mientras dura la vista previa, el mapa muestra la disciplina del paso,
  ignora los filtros de tipo/estado/categoría y bloquea las
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
- Resaltado por color que respira (transición suave, amarillo vivo, en el borde de los nodos con un halo exterior, y en la línea de las flechas), no
  por tamaño; las posiciones existentes que reciben técnica nueva no se
  resaltan.
- `prefers-reduced-motion` → color fijo sin animación.
- Color mediante token semántico nuevo en `src/routes/layout.css`.
- Las disciplinas no se mezclan: la importación elige BJJ / Grappling /
  Ambos en el primer paso (por defecto la activa) y todo lo creado la
  lleva. Va en este change (y no en uno aparte) porque la vista previa
  depende de ella: el mapa de la vista previa es el de esa disciplina.
- Comparación con el catálogo (y catálogo enviado a la IA) por
  disciplina: BJJ o Grappling → esa + "Ambos"; "Ambos" → solo "Ambos". Lo
  que falta se crea con la disciplina de la importación.
- BJJ o Grappling → una vista previa; al aceptar, la disciplina activa
  pasa a ser la de la importación y el usuario se queda en `/mapa`.
- "Ambos" → dos vistas previas consecutivas (BJJ, luego Grappling) con
  Siguiente / Atrás / Cancelar y "Aceptar" solo en la última; se inserta
  una sola vez; después la disciplina activa es Grappling.
- Errores en un paso: "No se puede: <breve>" con "Retroceder" o "Seguir
  con la siguiente disciplina"; aceptar después crea todo salvo lo que
  causó el error y avisa de qué no se creó (decisión del orquestador).
- "+ Añadir" en la revisión usa el mismo catálogo por disciplina
  (decisión del orquestador).

## Fuera de alcance

- Detectar o fusionar duplicados entre disciplinas. Con la comparación
  por disciplina **pueden aparecer duplicados** (p. ej. "Mount" de BJJ y
  "Mount" de Grappling, o un "Kimura" de "Ambos" junto al de BJJ). Es
  aceptado; los avisará el futuro panel de alertas (it.8).
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
  - "Generación de la propuesta" y "Reutilización de lo que ya existe en
    el catálogo": la IA recibe y la comparación usa solo el catálogo de la
    disciplina de la importación ("Ambos" → solo "Ambos").
  - "Añadir elementos a mano en la revisión": origen y destino solo del
    catálogo de la disciplina de la importación.
  - Nuevos: disciplina de la importación; paso a la vista previa en el
    mapa; pasos de la vista previa según la disciplina; aceptar (cambia la
    disciplina activa); cancelar; paso que no se puede mostrar; aceptar tras un paso con error.
- `catalogo-tecnico`: "Sumisión terminal" — el nombre pasa a ser único
  por disciplina (antes, en todo el catálogo). Decisión del owner tras la
  validación (2026-10-06): sin esto, una importación no podía crear
  "Kimura" de Grappling o de Ambos si ya existía la de BJJ. Requiere
  migración de BD (v11).
- `mapa`: nuevo modo "vista previa de importación" (resaltado de lo nuevo,
  barra con indicador de paso, movimiento reducido, disciplina y filtros
  durante cada paso, acciones bloqueadas, salir del mapa).

## Impact

- **Usuario:** un paso más antes de insertar, a cambio de ver los errores
  de la IA en su mapa antes de que lleguen al catálogo; control explícito
  de la disciplina de lo importado.
- **Código:** `ImportarClaseDialog.svelte` (ciclo de vida del borrador),
  nuevo estado de borrador fuera del diálogo, `src/routes/mapa/+page.svelte`
  (modo vista previa), `GrafoMapa.svelte` (elementos fantasma),
  `src/lib/grafo.ts`, `src/routes/layout.css` (token nuevo). Migración de
  BD v11 (`sumisiones_terminales`: nombre único por disciplina) y
  `SumisionWizard.svelte` (comprobación de repetido por disciplina). Sin
  dependencias nuevas; el formato de la copia de seguridad no cambia.
- **Depende de** `selector-coherente` (comportamiento del selector) y va
  después de `historial-importaciones` (comparten el diálogo).

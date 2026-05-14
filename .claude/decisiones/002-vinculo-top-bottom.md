# ADR-002 — Vínculo de posiciones complementarias (top ↔ bottom)

**Fecha:** 2026-05-14
**Estado:** Aceptada
**Commit del schema v3:** pendiente (T-1.it2)

## Contexto

El catálogo de iteración 1 modela cada posición como entidad
independiente. "Mount top" y "Mount bottom" son dos posiciones
inconexas en la base de datos, aunque en BJJ representan la misma
situación vista por cada uno de los dos practicantes.

Esta carencia bloquea tres casos de uso de iteración 2+:

1. **Vista del oponente** en el modal de posición: estando en "Mount
   top", el usuario quiere ver "qué puede hacer tu oponente desde
   Mount bottom" (escapes, sweeps, sumisiones aplicables sobre ti).
2. **Prefill correcto de contras inline** (deuda heredada de T-11):
   una contra la ejecuta el oponente desde la posición complementaria,
   no desde la posición actual. Sin vínculo no se puede inferir el
   origen correcto y T-11 quedó sin prefill (decisión sesión 10).
3. **Métricas combinadas a futuro** (it.3+): "tiempo total en mount"
   = top + bottom; "% de éxito desde guardia cerrada" sumando ambos
   lados.

En sesión 4 se confirmó (REQUISITOS §7) que las posiciones son nodos
del grafo y las técnicas aristas, pero no se modeló la relación
bidireccional entre dos vistas del mismo nodo físico.

## Decisión

Añadir columna autoref `posicion_complementaria_id TEXT REFERENCES
posiciones(id) ON DELETE SET NULL` a la tabla `posiciones`. Nullable
(transiciones y posiciones sin par válido).

Schema v3 + migración v2→v3 siguiendo el patrón del array
`{from, to, run}` establecido en T-1 (it.1): array extensible,
fresh DBs aplican V1 + todas las migraciones siempre.

**Sincronía simétrica en TS** (no triggers SQL): al setear
`A.complementaria = B`, `updatePosicion` escribe también
`B.complementaria = A` en la misma transacción. Al limpiar la
relación, limpia ambos lados. Al borrar A con `deletePosicion`, la
FK `ON DELETE SET NULL` deja a B con complementaria nula
(reasignable por el usuario).

**UI**:

- Campo "Complementaria" editable en `PosicionWizard` y modal de
  edición. Combobox sobre el catálogo restante (excluida la propia
  posición y las que ya tengan una complementaria distinta — el
  usuario tendrá que romper el otro vínculo antes).
- Sección derivada **"Vista del oponente"** en `PosicionModalContent`:
  si hay complementaria, mostrar las técnicas que salen de ella
  agrupadas por tipo (ataque, sweep, escape, transicion, sumision).
  Cada técnica clickable empuja al stack del modal.

**Retro-vinculación de pares creados durante it.1**: el owner abre
cada par desde la UI y los enlaza manualmente. Estimación ≤6 pares
en el catálogo actual.

## Consecuencias

- **Modelo bidireccional con redundancia controlada**: dos filas se
  referencian mutuamente. Coherencia mantenida por TS, no por DB.
- **Inconsistencia posible si una operación TS falla entre los dos
  UPDATEs**. Mitigación: ambos en la misma transacción
  (`BEGIN`/`COMMIT`). Si el segundo `UPDATE` falla, rollback completo.
- **Contras inline (deuda de T-11) desbloqueadas**: el prefill pasa a
  ser inferible. No es parte de T-1.it2 — se trata en una tarea
  separada de it.2 cuando se reabra ese flujo.
- **Reglas de borrado**: borrar A no borra B. La FK `ON DELETE SET
  NULL` deja a B sin complementaria. El usuario lo verá vacío y
  puede reasignar. No se cascadea para evitar borrados destructivos
  no intencionales.
- **Sin caso N:M en el roadmap**. Si emerge (poco probable según
  BJJ canónico), refactor a tabla `posicion_par` como tarea
  posterior. La columna autoref no compromete ese refactor (drop
  + migración).

## Alternativas consideradas

- **Tabla `posicion_par(id_a, id_b)`** con constraint canónico
  `id_a < id_b`. Pros: simetría inherente a nivel DB (una sola fila
  por par), extensible a N:M trivialmente. Cons: sobre-ingeniería
  para 1:1 estricto, JOIN extra en cada lectura del catálogo,
  queries más verbosas. Descartada por overhead sin caso N:M en el
  roadmap.

- **Inferir por `categoria + tipo` opuesto** sin schema nuevo.
  Pros: cero migración. Cons: (1) falla cuando `categoria='otro'` o
  `tipo IS NULL` (transiciones, posiciones poco definidas);
  (2) ambiguo si dos posiciones de la misma categoría comparten rol
  ("Mount top" y "S-mount top" comparten `control_superior+ofensiva`);
  (3) no permite override manual cuando la heurística falla.
  Descartada por fragilidad.

- **Trigger SQL para la simetría** en lugar de lógica TS. Pros:
  invariante garantizada a nivel DB, imposible quedar desincronizado.
  Cons: lógica oculta, más difícil de seguir para QA, rompe el
  patrón del proyecto (toda la lógica de datos vive en TS, SQL crudo
  mínimo). Descartada por opacidad.

## Referencias

- `ESTADO_ACTUAL.md` (sesión 9): primera mención de T-1.it2 como
  entrada de iteración 2.
- `REQUISITOS.md §7`: confirmación del modelo de grafo
  posición/técnica (sesión 4, sin abordar bidireccionalidad).
- Sesión 10 (commit `a2a8552`, T-11): decisión de dejar contras sin
  prefill hasta que el vínculo top↔bottom existiera. Esta deuda se
  resolverá en it.2 sobre la base de ADR-002.

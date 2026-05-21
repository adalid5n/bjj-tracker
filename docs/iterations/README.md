# Iteraciones

Histórico de iteraciones del proyecto. Cada iteración tiene su propio documento con objetivo, scope, tareas y criterios de cierre. **Las iteraciones cerradas son inmutables** — sirven como histórico de planificación; los cambios posteriores van a una iteración nueva.

## Índice

| #     | Iteración                                                           | Estado    | Tag           | Fecha cierre  |
| ----- | ------------------------------------------------------------------- | --------- | ------------- | ------------- |
| 0     | [Esqueleto y captura mínima](ITERACION_0.md)                        | ✅ Cerrada | `v0.1-it0`    | 2026-05-10    |
| 0.5   | [Pulido pre-iteración 1](ITERACION_0_5.md)                          | ✅ Cerrada | (sin tag propio) | 2026-05-13 |
| 1     | [Mapa técnico básico](ITERACION_1.md)                               | ✅ Cerrada | `v0.2-it1`    | 2026-05-14    |
| 2     | Mapa lista CRUD + análisis (sin doc propio)                         | ✅ Cerrada | `v0.3-it2`    | 2026-05-16    |
| 3     | Vista grafo Cytoscape (sin doc propio)                              | ✅ Cerrada | `v0.4-it3`    | 2026-05-18    |
| 4     | [Pulido post-grafo y consistencia UX](ITERACION_4.md)               | ✅ Cerrada | `v0.4.1-it4`  | 2026-05-19    |
| 5     | [Rediseño de home (calendario + dashboard)](ITERACION_5.md)         | ✅ Cerrada | `v0.5-it5`    | 2026-05-19    |
| 6     | [Modo hobbyist vs avanzado](ITERACION_6.md)                         | ✅ Cerrada | `v0.6-it6`    | 2026-05-20    |
| 7+    | (sin decidir — pausa entre iteraciones)                             | —         | —             | —             |

Para cambios entregados como pulido continuo (sin iteración propia), ver [CHANGELOG.md](../../CHANGELOG.md).

## Iteraciones sin doc propio

`it.2` e `it.3` cerraron sin fichero de planificación propio — fueron iteraciones donde el plan vivió en T-N (tareas) y reports de subagentes. Si necesitas su contexto:

- **it.2** — implementación del CRUD del mapa, vista lista, análisis. Ver agent-reports `20260512-t2-crud`, `20260512-t3-mapa-lista`, `20260513-t9-editor-sumision`, etc.
- **it.3** — vista grafo con Cytoscape + fcose. Ver agent-reports `20260516-it3-plan`, `20260517-t8-it3-grafo`. Decisiones derivadas: ADRs 004-008.

## Archivo

Documentos de planificación antiguos (planes de tarea específicos) viven en [`archive/`](archive/) — `T2_PLAN.md`, `T2_PLAN_v2.md`, `T2_RESTRICCIONES.md`.

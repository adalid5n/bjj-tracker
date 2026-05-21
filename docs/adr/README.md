# Architecture Decision Records (ADR)

Decisiones arquitectónicas con peso del proyecto. Cada ADR captura el contexto, la decisión tomada y sus consecuencias en un momento concreto. **Las ADRs no se reescriben** — si una decisión cambia, se crea una nueva que la supersede.

Referencia del patrón: [adr.github.io](https://adr.github.io/) — formato Michael Nygard.

## Índice

| #   | Título                                                              | Fecha       | Estado    |
| --- | ------------------------------------------------------------------- | ----------- | --------- |
| 001 | [Bump de svelte/kit/vite para resolver TypeError en refresh](001-bump-deps-fix-refresh.md) | 2026-05-12  | Aceptada  |
| 002 | [Vínculo de posiciones complementarias (top ↔ bottom)](002-vinculo-top-bottom.md) | 2026-05-14  | Aceptada  |
| 003 | [Theme manager (auto / claro / oscuro) con override en /ajustes](003-theme-manager.md) | 2026-05-14  | Aceptada  |
| 004 | [Algoritmo fcose como layout del grafo de Cytoscape](004-fcose-layout-algorithm.md) | 2026-05-17  | Aceptada  |
| 005 | [Lazy-load de Cytoscape y fcose vía `await import()`](005-cytoscape-lazy-load.md) | 2026-05-17  | Aceptada  |
| 006 | [Layout "grafo siempre visible" + Sheet/Drawer en mapa](006-grafo-siempre-visible-sheet-drawer.md) | 2026-05-18  | Aceptada  |
| 007 | [Sincronización modal↔grafo: pan animado al nodo focal](007-sincronizacion-modal-grafo.md) | 2026-05-18  | Aceptada  |
| 008 | [Persistencia del layout del grafo en SQLite + dirty state](008-persistencia-layout-grafo.md) | 2026-05-18  | Aceptada  |

## Cómo añadir un ADR

1. Numerar correlativo: `NNN-slug-corto.md`.
2. Cabecera mínima: título, fecha, estado (`Propuesta` / `Aceptada` / `Superada por ADR-XXX` / `Rechazada`).
3. Cuerpo libre — los existentes documentan contexto, decisión, alternativas consideradas, consecuencias y referencias a commits/sesiones.
4. Añadir la entrada a la tabla de arriba.

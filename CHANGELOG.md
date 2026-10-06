# Changelog

Todas las versiones notables del proyecto se documentan aquí. Sigue el formato de [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) y el versionado [SemVer](https://semver.org/spec/v2.0.0.html).

Cada release corresponde a una iteración cerrada con tag git. El detalle de cada iteración (objetivo, scope, tareas) vive en [`docs/iterations/`](docs/iterations/). Las decisiones arquitectónicas en [`docs/adr/`](docs/adr/).

## [Unreleased]

### Added
- **Vista previa de la importación en el mapa** (it.7, T-3): antes de insertar, el diálogo se cierra y el grafo real muestra lo nuevo resaltado (borde y halo amarillos que respiran; fijo con "reducir movimiento"), con una barra fija Aceptar/Cancelar. La importación tiene ahora disciplina propia (BJJ/Grappling/Ambos), compara solo con el catálogo de esa disciplina, y las de "Ambos" se revisan en dos pasos (BJJ y luego Grappling).
- Sumisiones con el mismo nombre en BJJ y en Grappling (antes el nombre era único en todo el catálogo).
- **Historial de importaciones de clase** (it.7, T-2): cada importación se guarda en cuanto se pulsa Analizar, con título, texto y lo aceptado, y estado Importada / Sin terminar / Falló. Se consulta desde un icono en el mapa, con tarjetas desplegables, bloques copiables, Reintentar (misma tarjeta, lo aceptado se acumula) y borrar.
- **Importación de clase vía IA** (Groq; modelo `openai/gpt-oss-120b` desde 2026-10-05): pipeline de 3 fases — normalización de texto dictado por voz (corrige términos, resalta cambios), extracción de posiciones/técnicas/sumisiones, validación automática con rúbrica. Dialog paso a paso con revisión y edición de detalles de ejecución.
- **Tags para posiciones**: sistema de etiquetas con colores preset. Nuevo paso en `PosicionWizard`; gestión bulk (añadir/quitar) en modo edición del mapa.
- **Filtro por disciplina** (BJJ / Grappling): campo `disciplina` en posiciones, técnicas y sumisiones. Toggle en `/ajustes` y en la barra del mapa. El grafo y la lista filtran según la disciplina activa.
- Selected state en grafo + reorden de chips + Origen/Destino navegables en mapa.
- "+ Crear nueva" en wizards standalone.

### Fixed
- "Reorganizar" el grafo ya no borra la organización guardada de la otra disciplina.
- **Copia de seguridad**: ahora incluye etiquetas, sus asignaciones y el historial de importaciones, y al restaurar conserva la disciplina de posiciones, técnicas y sumisiones (antes se perdían). Formato de fichero v7; se siguen aceptando ficheros v6.
- Selectores coherentes (it.7, T-1): tocar la opción ya activa no cambia nada (BJJ/Grappling del mapa, disciplina en los asistentes, tipo de sesión y resultado de roll). Antes, en los asistentes volvía a BJJ sin avisar.
- Importación de clase vía IA rota: Groq retiró `llama-3.3-70b-versatile`; sustituido por `openai/gpt-oss-120b`.
- Toast de actualización PWA: feedback visual y fallback de reload al pulsar Recargar.
- Bug z-index AlertDialog en mapa.
- Bug de complementaria en flujos de roll.
- Scroll en mapa roto al añadir toggle de disciplina como fila extra (movido a la misma fila que tabs Grafo/Lista).

### Changed
- Notas (posición, sumisión) y detalles/errores comunes (técnica) siempre visibles en modales cuando tienen contenido, sin requerir vista avanzada.
- Categorías de posición simplificadas: `control_superior` + `espalda` → `control` (4 valores: guardia, control, transicion, otro).
- Pulido UX en rolls, mapa y wizards (post-it.6).

## [0.6.0] — 2026-05-20

Tag: `v0.6-it6` · [Iteración 6](docs/iterations/ITERACION_6.md) — Modo hobbyist vs avanzado.

### Added
- Toggle **Vista avanzada** en `/ajustes` (tabla `app_settings` + `SettingsState`).
- En vista avanzada: `AnalisisHome` (problemas recientes) en home, `AnalisisPanel` en `/rolls`, y los 9 campos opcionales en wizards/editores.
- Tab **Sumisiones** en el sub-toggle de Lista del mapa.

### Changed
- Cards de roll en home reducidas a 2 filas ("Fue bien" / "Fue mal").
- Recortados 9 campos opcionales en wizards en modo hobbyist (default).

## [0.5.0] — 2026-05-19

Tag: `v0.5-it5` · [Iteración 5](docs/iterations/ITERACION_5.md) — Rediseño de home (calendario + dashboard).

### Added
- Home con `MonthCalendar` scroll-driven (mobile-first).
- Markers en calendario bajo días con sesión.
- Stats chip arriba (sesiones y rolls de la semana).
- Componente `AnalisisHome` preparado (sin montar — se activa en it.6).

### Fixed
- Persistencia de `diaSeleccionado` en sessionStorage.
- Threshold de expansión del calendario (50→5 px) para tensión natural en scroll.

## [0.4.1] — 2026-05-19

Tag: `v0.4.1-it4` · [Iteración 4](docs/iterations/ITERACION_4.md) — Pulido post-grafo y consistencia UX.

### Added
- Long-press 350 ms para activar drag de nodos en grafo (modo edición móvil).
- Headers por día agrupando sesiones en home (T-5.it4, pivot organizado).

### Changed
- Orden de `/rolls` por `created_at DESC` dentro de cada día.
- Auditoría completa de tokens semánticos (0 hits de Tailwind crudo).

## [0.4.0] — 2026-05-18

Tag: `v0.4-it3` · Iteración 3 (sin doc dedicado) — Vista grafo del mapa técnico.

### Added
- Vista grafo del mapa técnico con **Cytoscape + fcose** ([ADR-004](docs/adr/004-fcose-layout-algorithm.md), [ADR-005](docs/adr/005-cytoscape-lazy-load.md)).
- Sub-header con toggle Grafo/Lista + drawer lateral/inferior ([ADR-006](docs/adr/006-grafo-siempre-visible-sheet-drawer.md)).
- Sincronización modal↔grafo: pan animado al nodo focal ([ADR-007](docs/adr/007-sincronizacion-modal-grafo.md)).
- Persistencia del layout del grafo en SQLite con dirty state ([ADR-008](docs/adr/008-persistencia-layout-grafo.md)).
- Nodos circulares, tamaño por degree, canvas dark.

## [0.3.0] — 2026-05-16

Tag: `v0.3-it2` · Iteración 2 (sin doc dedicado) — Mapa lista CRUD + análisis.

### Added
- Vínculo top↔bottom de posiciones complementarias ([ADR-002](docs/adr/002-vinculo-top-bottom.md)).
- Vista del oponente en mapa.
- Plano-edit en wizards (footer + copy pulido).
- Rolls↔técnicas/posiciones por entidad.
- `ChipPicker` con tabs Fue bien/mal y accent semántico.
- Prefill de contras inline con complementaria del origen.
- Panel de análisis C1 + C2 en `/rolls`.

## [0.2.0] — 2026-05-14

Tag: `v0.2-it1` · [Iteración 1](docs/iterations/ITERACION_1.md) — Mapa técnico básico.

### Added
- Entidades **Posición**, **Técnica** y **Sumisión** de primera clase.
- Modales de Posición/Técnica/Sumisión + wizards de edición + stack de modales encadenados.
- Editor de contras editables + posiciones-problema en roll.
- Chips de posiciones-problema en `/sesion/[id]` y `/rolls` + filtro.
- `AppHeader` global + theme manager ([ADR-003](docs/adr/003-theme-manager.md)) + paleta suavizada.
- Cards en home / companeros / sesion / mapa, sticky sub-header.
- `/rolls` con día + DateRangePopover + filtros.
- "+ Crear nueva inline" en wizards.
- Auto-capitalización en inputs de texto libre.
- Toast e import-warning incluyen el mapa técnico.

## [0.1.0] — 2026-05-10

Tag: `v0.1-it0` · [Iteración 0](docs/iterations/ITERACION_0.md) — Esqueleto y captura mínima.

### Added
- App PWA funcional desplegada en GitHub Pages.
- CRUD de Compañeros, Sesiones y Rolls (modales P1–P4 con FAB y selector compañero anidado).
- Tabla global de rolls con filtros + bottom nav.
- Export e import JSON de toda la BD desde `/ajustes`.
- Visibility-pause para auto-handoff de SAH-Pool de SQLite-WASM entre tabs/PWA.
- Bump de svelte/kit/vite para fix de refresh ([ADR-001](docs/adr/001-bump-deps-fix-refresh.md)).

### Fixed
- File picker en Android: usar `showOpenFilePicker` para evitar Cámara/Fotos.

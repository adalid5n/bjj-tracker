# Roadmap

Vista pública del backlog de mejoras del proyecto, derivada del documento interno [`.claude/MEJORAS_FUTURAS.md`](.claude/MEJORAS_FUTURAS.md). Las entradas aquí son las ideas y deuda **activas** — las ya entregadas viven en [CHANGELOG.md](CHANGELOG.md).

El proyecto está en pausa entre iteraciones tras `v0.6-it6`. La próxima iteración (it.7) se decidirá entre los candidatos del backlog.

## Próximo en cola

Trabajo identificado como prioridad alta para la próxima iteración o sub-tarea inmediata.

### Visualización de contras en el grafo — 2 fases

Hoy los contras (relación N:N entre técnicas) son invisibles en el grafo principal y solo aparecen como hipervínculos planos dentro del modal de técnica. La mejora se diseña en dos fases con el mismo objetivo:

- **Fase 1 — Mini-grafo de contras en el modal de técnica.** Sub-grafo Cytoscape hub-spoke (técnica al centro, contras alrededor, coloreadas por tipo). Barata, aislada, valida la hipótesis.
- **Fase 2 — Zoom semántico en el grafo principal ("edge promotion").** Al seleccionar una posición, las técnicas se promueven a nodos satélite con sus contras. Versión ambiciosa que reutiliza el componente de fase 1.

Modo de trabajo: rama `feature/contras-visuales`, plan técnico antes de arrancar.

## UX

- **Reducir copy / texto inicial en cada pantalla** — auditar pantalla por pantalla qué se puede eliminar, acortar, o mover a tooltip. Pantalla ancla: `/rolls`.
- **Roll editor — sugerir compañero por defecto + selector inteligente** — frecuente / reciente / del día arriba.
- **Editor de compañero (y formularios similares) — captura por pasos** con auto-avance y sugerencias en lugar de dropdowns largos.
- **Botón "Forzar actualización" en `/ajustes`** — para forzar fetch del SW cuando el toast no aparece.
- **Sistema de diseño coherente — design tokens en lugar de Tailwind raw** — auditoría continua para que ningún color/shadow vaya inline.
- **Sistematizar sombras (`shadow-[rgba(...)]` inline → tokens semánticos)** — extensión natural de la auditoría de tokens.
- **Vista grafo del mapa técnico disponible (lectura) en móvil** — desbloquear consulta de técnicas/contras durante o tras clase.
- **Una técnica con múltiples destinos posibles** — soportar técnicas que llegan a varias posiciones según contexto.
- **Cards en items — revisar saturación visual tras uso real** — chequear que el catálogo poblado no se vuelve denso.
- **Reducir fricción al crear técnica tipo sumisión** — el nombre redundante actual molesta.
- **Resumen automático post-sesión** — aplazado de T-5.it2, parte del CU-3.

## Modelo de datos

- **Simplificar enum `TipoTecnica`** si el uso real solo usa subset (transición vs ataque vs defensa).
- **Sumisiones vs técnicas — redundancia del modelo** — evaluar si sumisión debe seguir siendo entidad separada o tipo de técnica.
- **C2 — mínimo de rolls configurable para activar bandera** — hoy hardcoded.

## Performance / build

- **Reducir precache PWA (~2.3 MB)** eliminando la duplicación de `sqlite3.wasm` (Vite emite copia hasheada extra de la nuestra estática).

## Tech debt / dev experience

- **FOUC inicial al cargar con tema oscuro persistido** — flash de tema claro antes de aplicar el guardado.
- **`CATEGORIAS_ORDEN` / `CATEGORIA_LABEL` duplicados en 3 sitios** — consolidar fuente única.
- **Loop de refresh en primera carga tras deploy con cambios grandes en SW** — investigar invalidación de cache.
- **Esquema BD legacy: columna `experiencia_anos` en `companeros`** — colgada de modelo anterior, candidata a migración de limpieza.
- **Workflow GitHub Actions a Node 24** — Node 22 está cerca de deprecación en el runner.

---

Para ver el detalle (origen, contexto, tradeoffs) de cada entrada, ver [`.claude/MEJORAS_FUTURAS.md`](.claude/MEJORAS_FUTURAS.md).

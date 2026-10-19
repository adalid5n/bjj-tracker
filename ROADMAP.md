# Roadmap

Vista pública del backlog de mejoras del proyecto, derivada del documento interno [`.claude/MEJORAS_FUTURAS.md`](.claude/MEJORAS_FUTURAS.md). Las entradas aquí son las ideas y deuda **activas** — las ya entregadas viven en [CHANGELOG.md](CHANGELOG.md).

Última iteración cerrada: **it.7 "Importar clase 2.0"** (v0.7.0, 2026-10-19) — historial de importaciones, vista previa en el mapa, "Ambos" como dos copias independientes y disciplina en sesiones y rolls (ver [CHANGELOG](CHANGELOG.md)). Siguiente: por decidir entre el panel de alertas (it.8) y el pulido prioritario del mapa.

## Próximo en cola

Trabajo identificado como prioridad alta para la próxima iteración o sub-tarea inmediata.

### Pulido prioritario del mapa

- **Ficha del mapa como hoja inferior arrastrable** — en móvil se podrá plegar a solo la cabecera, dejarla a media altura o desplegarla, para mirar el grafo sin cerrarla. Se cerrará sola al cambiar de disciplina o al entrar a mover nodos.
- **Barra de edición del grafo con "Guardar" y "Cancelar"** — un único botón principal y una salida explícita que descarta los cambios.
- **Fallos conocidos del catálogo y la importación** — avisar antes de borrar una técnica usada en rolls, mensajes de error comprensibles.

### Panel de alertas en el grafo (candidata a it.8)

Señalar técnicas con origen = destino y nombres casi duplicados (también entre las dos disciplinas); aviso de nombres parecidos al importar.

### Importar clase — revertir

Deshacer una importación ya confirmada (pendiente de la it.7).

### Visualización de contras — F3 sub-grafo filtrado (tras it.8)

Los contras siguen invisibles en el grafo principal. Dos approaches (mini-grafo en el modal; técnicas como nodos satélite) se probaron y se rechazaron; la siguiente propuesta es un sub-grafo filtrado con los contras como aristas.

## UX

- **"Ambos" con un elemento que ya existe en una disciplina** — crearlo solo donde falta y avisar, en vez de bloquear (hoy pasa al crear desde el mapa y con técnicas ya existentes en la otra disciplina).
- **Reducir copy / texto inicial en cada pantalla** — auditar pantalla por pantalla qué se puede eliminar, acortar, o mover a tooltip. Pantalla ancla: `/rolls`.
- **Roll editor — sugerir compañero por defecto + selector inteligente** — frecuente / reciente / del día arriba.
- **Botón "Forzar actualización" en `/ajustes`** — para forzar fetch del SW cuando el toast no aparece.
- **Sistematizar sombras (`shadow-[rgba(...)]` inline → tokens semánticos)** — los colores ya usan tokens; faltan las sombras.
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
- **Workflow GitHub Actions a Node 24** — las acciones del deploy siguen en versiones pensadas para Node 20, que GitHub ha retirado de sus runners; el deploy funciona, pero toca actualizarlas.

---

Para ver el detalle (origen, contexto, tradeoffs) de cada entrada, ver [`.claude/MEJORAS_FUTURAS.md`](.claude/MEJORAS_FUTURAS.md).

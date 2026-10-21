# Iteración 8 — Pulido P1

**Versión:** 1.0 (sesión 52, 2026-10-21)
**Estado:** 🟡 Abierta 2026-10-21 — T-1 a T-4 en main (2026-10-21); siguen MF-043 y MF-041
**Predecesor:** Iteración 7 "Importar clase 2.0" (cerrada con `v0.7-it7`, 2026-10-19).

---

## OBJETIVO

Cerrar los fallos y fricciones P1 que más molestan en el uso diario, sin
features nuevas grandes. El panel de alertas (MF-030) pasa a la it.9.

## ALCANCE (owner, 2026-10-21)

### T-1.it8 — Ficha del mapa por encima del menú inferior

**Estado:** ✅ Validada por el owner 2026-10-21 (en escritorio; la barra de gestos real se comprueba en la tablet tras desplegar). Además: altura del menú inferior unificada en `--bottom-nav-h` para ficha, panel de historial, barras de vista previa, barra de borrado de rolls, FAB y aviso de actualización.
**Qué entrega:** la ficha del mapa deja de quedar tapada por el menú
inferior en móvil (bug de safe-area + z-index).
**Specs:** sin cambio de spec previsto (es un bug de presentación).

### T-2.it8 — Borrado de rolls en bloque + confirmación al borrar un roll

**Estado:** ✅ Validada por el owner 2026-10-21, incluida la selección manteniendo pulsado. Change archivado: `openspec/changes/archive/2026-10-21-borrado-rolls-en-bloque/`.
**Qué entrega:** seleccionar varios rolls y borrarlos de una vez, y
confirmación propia de la app (no la del navegador) al borrar un roll.

### T-3.it8 — Guardar la organización del grafo al aceptar una importación

**Estado:** ✅ Validada por el owner 2026-10-21. Bug: los nodos importados quedaban solo en memoria y al volver al mapa salía siempre "¿Descartar cambios?". Ahora se guardan sus posiciones al aceptar (solo las nuevas). Los nodos de importaciones anteriores necesitan un "Guardar organización" manual una vez. Change archivado: `openspec/changes/archive/2026-10-21-import-guarda-organizacion/`.

### T-4.it8 — Botón "+" del mapa igual que el resto y sin parpadeo

**Estado:** ✅ Validada por el owner 2026-10-21. El "+ Nuevo" del mapa pasa a ser el FAB redondo de Inicio/Compañeros; el FAB queda siempre montado (desactivado mientras carga) en Inicio, Compañeros, Sesión y Mapa, para que no aparezca/desaparezca al navegar. Descartado un FAB global en el layout (más acoplamiento, solo compensaría con transiciones entre pantallas). Change archivado: `openspec/changes/archive/2026-10-21-fab-mapa-unificado/`.

### Después (sin empezar)

- **MF-043** — borrar una técnica usada en rolls borra esos vínculos sin
  avisar. Ahí se decide la regla de borrado común (ver MF-048).
- **MF-041** — barra de edición del grafo: "Guardar" + "Cancelar".
- **MF-040** — ficha como hoja inferior con alturas fijas: a decidir
  (dependencia nueva `vaul-svelte` vs arrastre propio sobre el `Sheet`).

**Lo que NO entra:**
- **MF-048** (borrar bloqueado sin explicación visible en móvil): al
  backlog para más adelante. Decisión del owner: mantener el botón
  deshabilitado y añadir un icono de información con Popover.
- Panel de alertas (MF-030): it.9.

## CRITERIO DE CIERRE

1. Cada tarea validada por el owner en `pnpm preview` (puerto 4173).
2. Cada change de OpenSpec archivado antes de cerrar su tarea.
3. `pnpm check` y `pnpm build` limpios; CHANGELOG y versión al día; tag
   de la iteración.

## REFERENCIAS

- Backlog: [`.claude/MEJORAS_FUTURAS.md`](../../.claude/MEJORAS_FUTURAS.md)
  (MF-040, MF-041, MF-043, MF-048).
- Estado vivo: [`.claude/ESTADO_ACTUAL.md`](../../.claude/ESTADO_ACTUAL.md).

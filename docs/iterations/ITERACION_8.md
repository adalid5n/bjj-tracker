# Iteración 8 — Pulido P1

**Versión:** 1.0 (sesión 52, 2026-10-21)
**Estado:** 🟡 Abierta 2026-10-21 — rama `it8/pulido`
**Predecesor:** Iteración 7 "Importar clase 2.0" (cerrada con `v0.7-it7`, 2026-10-19).

---

## OBJETIVO

Cerrar los fallos y fricciones P1 que más molestan en el uso diario, sin
features nuevas grandes. El panel de alertas (MF-030) pasa a la it.9.

## ALCANCE (owner, 2026-10-21)

### T-1.it8 — Ficha del mapa por encima del menú inferior

**Estado:** 🟡 Implementada, pendiente de validar por el owner.
**Qué entrega:** la ficha del mapa deja de quedar tapada por el menú
inferior en móvil (bug de safe-area + z-index).
**Specs:** sin cambio de spec previsto (es un bug de presentación).

### T-2.it8 — Borrado de rolls en bloque + confirmación al borrar un roll

**Estado:** 🟡 Implementada, pendiente de validar por el owner.
**Change OpenSpec:** [`openspec/changes/borrado-rolls-en-bloque/`](../../openspec/changes/borrado-rolls-en-bloque/proposal.md)
**Qué entrega:** seleccionar varios rolls y borrarlos de una vez, y
confirmación propia de la app (no la del navegador) al borrar un roll.

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

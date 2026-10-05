# Design

## Context

Ver `proposal.md` — Why. Inventario de selectores de "una opción entre
varias" encontrados en `src/` (revisado 2026-10-05):

| # | Dónde | Selector | Comportamiento hoy | Acción |
|---|-------|----------|--------------------|--------|
| 1 | `src/routes/mapa/+page.svelte` (fila 1 del sub-header) | Grafo / Lista | Elige la opción; la activa no hace nada (`requestVistaChange` hace early return) | Referencia. Sin cambios |
| 2 | `src/routes/mapa/+page.svelte` (fila 1, `toggleDisciplina`) | BJJ / Grappling | **Un único `<button>`** con dos `<span>`: cualquier toque alterna | **Cambiar**: dos botones, cada uno llama a `settings.setDisciplinaActiva(valor)` |
| 3 | `src/routes/mapa/+page.svelte` (fila 2, vista Lista) | Posiciones / Técnicas / Sumisiones | Elige la opción; reasignar la activa es inocuo | Sin cambios |
| 4 | `src/routes/ajustes/+page.svelte` (sección Disciplina) | BJJ / Grappling | Elige la opción (`role="group"`, `aria-pressed`) | Sin cambios. Es el patrón a copiar para el #2 |
| 5 | `src/routes/ajustes/+page.svelte` (Apariencia) | Auto / Claro / Oscuro | Elige la opción | Sin cambios |
| 6 | `PosicionWizard.svelte` (pasos de crear y de editar, 2 sitios) | Disciplina BJJ / Grappling / Ambos (`Chips`) | `Chips` des-selecciona al tocar la activa → `onChange(null)` → el wizard cae a `'bjj'`. Tocar "Grappling" o "Ambos" activos **cambia a BJJ** | **Cambiar** |
| 7 | `SumisionWizard.svelte` (2 sitios) | Disciplina (`Chips`) | Igual que #6 | **Cambiar** |
| 8 | `TecnicaWizard.svelte` (2 sitios) | Disciplina (`Chips`) | Igual que #6 | **Cambiar** |
| 9 | `RollEditor.svelte` (4 sitios) | Fue bien / Fue mal | Elige la opción | Sin cambios |
| 10 | `AnalisisPanel.svelte` | Ventana N de sesiones | Elige la opción | Sin cambios |
| 11 | `PosicionModalContent.svelte` (2 sitios) | Pestañas por tipo de técnica | Elige la opción | Sin cambios |

Excluidos a propósito (no son equivalentes): los demás usos de `Chips`
(categoría, tipo de rol, tipo y estado de técnica, peso relativo,
resultado, tipo de sesión) son campos **opcionales** donde re-tocar = dejar
vacío es intencionado (p. ej. `handleCategoriaChange` vuelve el botón a
"Saltar"); `CinturonChips` ya solo elige; Switch "Vista avanzada" y botón
"Mover nodos" son on/off.

## Goals / Non-Goals

**Goals:** una sola regla observable para selectores obligatorios de
opción única; cero cambios de BD.

**Non-Goals:** crear un componente `SegmentedControl` compartido o migrar a
`ToggleGroup` de bits-ui (sería deseable pero amplía el diff; se anota como
posible pulido).

## Decisions

1. **Selector de disciplina del mapa (#2):** replicar el marcado de
   Ajustes (#4): `role="group"`, dos `<button>` con `aria-pressed`,
   `onclick={() => settings.setDisciplinaActiva(opt.value)}`. Se elimina
   `toggleDisciplina`. Alternativa descartada: mantener un único botón y
   detectar qué `<span>` se tocó — frágil y mala accesibilidad.
   `setDisciplinaActiva` con el mismo valor ya es idempotente; aun así se
   añade early return si `opt.value === settings.disciplinaActiva` para
   evitar una escritura en BD innecesaria.
2. **Disciplina en asistentes (#6-#8):** no cambiar el contrato de
   `Chips` (lo usan campos opcionales). Opción elegida: añadir a `Chips`
   una prop opcional `required?: boolean` (por defecto `false`); con
   `required` el toque sobre la activa no llama a `onChange`. Se pasa
   `required` en los 6 usos de disciplina. Alternativa: tratar `null` en
   cada `onChange` (`v ?? disciplina`) — funciona pero repite lógica en 6
   sitios y deja el chip parpadeando como "deseleccionado" en
   `aria-checked`. La prop es más limpia y reutilizable.
3. Tokens: no se tocan estilos; siguen los semánticos actuales.

## Risks / Trade-offs

- [Algún otro selector obligatorio usa `Chips` y nadie lo detectó] →
  la prop `required` lo resuelve con una línea; inventario arriba.
- [Cambiar `Chips` afecta a 6 asistentes/editores] → la prop es opt-in;
  sin ella el comportamiento no cambia.

## Migration Plan

Sin migración. Despliegue normal; rollback = revert del commit.

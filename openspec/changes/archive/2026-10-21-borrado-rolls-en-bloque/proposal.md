# Proposal

> **Resumen para el owner**
> - En la pantalla de Rolls aparece un botón **Seleccionar**: al activarlo,
>   tocar un roll lo marca o desmarca (no abre el editor).
> - Una barra fija sobre la navegación inferior muestra cuántos hay
>   marcados y el botón **Borrar (N)**, desactivado si no hay ninguno.
> - Borrar pide confirmación con el diálogo de la app ("¿Borrar N rolls?
>   No se puede deshacer…"); se borran también sus posiciones y técnicas
>   marcadas. Todo o nada.
> - **Cancelar** sale del modo selección sin borrar. Cambiar un filtro
>   vacía la selección (solo se seleccionan rolls visibles).
> - Borrar un solo roll desde su editor deja de usar el aviso nativo del
>   navegador y usa el mismo diálogo de la app (en Rolls y en Sesión).

## Why

Limpiar rolls de prueba o duplicados obliga hoy a abrir cada roll y
borrarlo uno a uno, con un `confirm()` nativo del navegador que rompe el
estilo de la app (y en móvil se ve como un aviso del sistema).

## What Changes

- Modo selección en `/rolls` con borrado en bloque y confirmación.
- Confirmación de la app (AlertDialog) para el borrado individual en el
  editor de roll, compartido por `/rolls` y `/sesion/[id]`.
- Sin "Seleccionar todo": el mapa (patrón de referencia) no lo tiene.

## Capabilities

### Modified Capabilities
- `sesiones-y-rolls`: borrado de rolls (en bloque e individual).

## Impact

- `src/lib/rolls.ts` (nuevo `deleteRolls`, transaccional).
- `src/routes/rolls/+page.svelte`, `src/lib/components/RollEditor.svelte`.
- Sin migraciones: los vínculos de posiciones y técnicas ya se borran en
  cascada con el roll.

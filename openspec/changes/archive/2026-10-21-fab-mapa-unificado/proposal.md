## Why

El botón de crear del mapa ("+ Nuevo", rectangular con texto) era distinto del botón flotante redondo "+" de Inicio y Compañeros. El owner pidió unificarlo (2026-10-21).

## What Changes

- El botón de crear del mapa pasa a ser el mismo botón flotante redondo "+" que Inicio y Compañeros, en la misma posición. Al pulsarlo sigue desplegando Nueva posición / Nueva sumisión / Importar de clase.
- Los textos que mencionaban "+ Nuevo" pasan a decir "+".

## Capabilities

### Modified Capabilities

- `mapa`: requisito "Catálogo vacío" (texto del botón).

## Impact

`src/routes/mapa/+page.svelte`, `src/lib/components/Fab.svelte` (acepta atributos extra para el menú desplegable). Sin cambios de datos.

# Tasks

## 1. Datos

- [x] 1.1 `deleteRolls(ids)` en `src/lib/rolls.ts`: un único `DELETE … WHERE id IN (…)` dentro de `conSavepoint`; lista vacía = no hace nada

## 2. Pantalla de rolls

- [x] 2.1 Modo selección en `src/routes/rolls/+page.svelte` (patrón del mapa): botón "Seleccionar"/"Cancelar", tarjeta con check y `aria-pressed`, tocar marca/desmarca sin abrir el editor
- [x] 2.2 Vaciar la selección al cambiar cualquier filtro
- [x] 2.3 Barra fija sobre la navegación inferior con contador y "Borrar (N)" (desactivado con N=0)
- [x] 2.4 AlertDialog de confirmación; al confirmar `deleteRolls`, salir del modo, refrescar lista y análisis; error visible si falla

- [x] 2.5 Entrar en modo selección manteniendo pulsado un roll (acción `use:longpress` en `src/lib/actions/longpress.ts`: 500 ms, cancela al moverse > 10 px o soltar; anula el click posterior y el menú contextual); el botón "Seleccionar" se mantiene
- [x] 2.6 Barra de acciones posicionada con `--bottom-nav-h` + safe-area

## 3. Editor de roll

- [x] 3.1 Sustituir `confirm()` nativo de `RollEditor.svelte` por AlertDialog (vale para `/rolls` y `/sesion/[id]`)

## 4. Verificación

- [x] 4.1 `pnpm check` y `pnpm build` sin errores
- [x] 4.2 Validación manual del owner (2026-10-21, incluida la pulsación larga) en `pnpm preview` (escritorio y móvil)

## Why

Resumen para el owner: al elegir el origen o el destino de una técnica, la
lista se abre con el cursor ya en "Buscar posición…" y en el móvil salta el
teclado, que tapa casi toda la lista. Con este cambio, abrir el selector
enseña la lista sin teclado: eliges tocando, y solo si tocas "Buscar…" sale
el teclado para filtrar. Aplica a todos los selectores de lista con buscador
(origen, destino, sumisión destino, complementaria, añadir contra). El campo
de compañero del roll no cambia: ahí escribir el nombre es la acción
principal (también para crear uno nuevo). En ordenador, las flechas y Enter
siguen funcionando y al teclear una letra el texto va al buscador.

Pedido por el owner el 2026-10-21 (T-7.it8).

## What Changes

- Los selectores de lista con buscador no ponen el foco en el buscador al abrirse.
- El buscador sigue disponible al tocarlo; en teclado físico, teclear empieza a buscar.

## Capabilities

### Modified Capabilities

- `selectores`: nuevo requisito "Abrir una lista con buscador sin teclado".

## Impact

`src/lib/components/Combobox.svelte` (componente compartido; lo usan
`TecnicaWizard`, `PosicionWizard` y `TecnicaModalContent`). Sin cambios de
datos. `CompaneroCombobox` y los `ChipPicker` del roll no se tocan (el
primero es un campo de texto; los segundos no autoenfocan).

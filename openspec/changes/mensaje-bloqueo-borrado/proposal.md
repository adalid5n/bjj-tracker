## Why

Resumen para el owner: cuando no se puede borrar algo de las fichas, el
mensaje decía "Borra antes esta técnica:", que no explica para qué. Ahora
empieza por lo que quieres hacer: "Si quieres borrar esta posición, borra
antes las técnicas que salen de ella:" (con los mismos enlaces), "Si quieres
borrar esta sumisión, borra antes las técnicas que llegan a ella:", y en
técnica "Si quieres borrar esta técnica, quítala antes como contra de …".
Solo cambia el texto; cuándo se bloquea sigue igual (MF-048 es aparte).

Pedido por el owner el 2026-10-21 (T-9.it8).

## What Changes

- Textos de bloqueo de borrado en las fichas de posición, sumisión y técnica.

## Capabilities

### Modified Capabilities

- `catalogo-tecnico`: requisitos "Borrar una posición", "Borrar una técnica", "Borrar una sumisión" (texto del mensaje).

## Impact

`PosicionModalContent.svelte`, `SumisionModalContent.svelte`,
`TecnicaModalContent.svelte`. Sin cambios de lógica ni de datos.

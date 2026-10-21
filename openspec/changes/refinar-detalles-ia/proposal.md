## Why

Resumen para el owner: debajo del campo "Detalles" de una técnica (al crearla
en el asistente y al editarla) aparece un botón "Refinar con IA". La IA
corrige ortografía y gramática y, si ayuda, ordena el texto en pasos cortos o
viñetas, sin inventar nada: tiene prohibido añadir técnicas, pasos, detalles
o consejos que no estén en tu texto y quitar información. El resultado se
enseña primero como propuesta debajo del campo; tú decides "Aceptar" (lo
sustituye) o "Descartar" (te quedas con lo tuyo). Sin texto, sin conexión o
sin clave de IA el botón está desactivado y se explica por qué.

Pedido por el owner el 2026-10-21 (T-8.it8).

## What Changes

- Botón "Refinar con IA" bajo Detalles (asistente paso Detalles y formulario de edición; solo modo avanzado, que es donde existe el campo).
- Vista previa de la propuesta con Aceptar / Descartar; el texto original no cambia hasta aceptar.
- Prompt estricto: solo redacción; nombre, tipo, origen y destino de la técnica se pasan como contexto, no como contenido.

## Capabilities

### Modified Capabilities

- `catalogo-tecnico`: nuevo requisito "Refinar los detalles de una técnica con IA".

## Impact

`src/lib/ai.ts` (`refinarDetallesTecnica`, `hayClaveIA`; mismo modelo,
timeout y errores que el resto), nuevo `src/lib/components/RefinarDetallesIA.svelte`,
`src/lib/components/TecnicaWizard.svelte`. Sin cambios de datos ni dependencias.

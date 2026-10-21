# Proposal

> **Resumen para el owner**
> - El bloque "Texto" de cada importación del historial muestra el texto
>   **corregido** (el interpretado, tal como lo dejaste al pulsar "Generar
>   propuesta"), no el dictado en bruto. Se copia igual que hoy.
> - Las importaciones antiguas, que no lo tienen, siguen mostrando el texto
>   analizado.
> - "Reintentar" arranca con ese texto corregido (o el analizado, si no hay).
> - "Refinar propuesta" usa también el texto corregido, no el original.
> - La copia de seguridad lleva el texto corregido; las copias anteriores
>   se siguen pudiendo restaurar.

## Why

El historial es el diario de entreno: el dictado en bruto lleva errores de
transcripción ("dog fight", "nisli") que el usuario ya corrigió en el paso
"Texto interpretado". Mostrar el bruto obliga a corregirlo de nuevo al
copiarlo o reintentarlo. Además "Refinar" enviaba a la IA el texto en
bruto, ignorando las correcciones del usuario (T-5.it8).

## What Changes

- Al generar la propuesta se guarda en la entrada el texto corregido; un
  nuevo análisis lo descarta hasta la siguiente propuesta.
- El bloque "Texto" muestra el corregido (o el analizado si no hay).
- "Reintentar" precarga el corregido (o el analizado).
- "Refinar propuesta" parte del texto corregido.
- La copia de seguridad incluye el texto corregido (nueva versión de
  fichero); las anteriores se restauran sin él.

## Fuera de alcance

- Mostrar el texto en bruto en el historial (sigue guardado, no visible).
- Guardar la propuesta de la IA.
- Recuperar el texto corregido de importaciones anteriores a este cambio.

## Capabilities

### Modified Capabilities

- `historial-importaciones`: qué texto se guarda, se muestra y se reintenta.
- `importar-clase`: "Refinar" parte del texto corregido.
- `copia-seguridad`: la copia incluye el texto corregido.

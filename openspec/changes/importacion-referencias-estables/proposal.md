# Proposal

> **Resumen para el owner**
> - Renombrar en la revisión una posición o sumisión nueva ya no deja
>   "huérfanas" sus técnicas: siguen saliendo de / llegando a ella con el
>   nombre nuevo, en la revisión, en la vista previa y al aceptar.
> - Si una técnica (de la IA o manual) se queda sin origen o destino válido
>   (p. ej. desmarcaste su posición), se marca en la revisión con un aviso
>   y aparecen los selectores de Origen/Destino para re-apuntarla; no se
>   puede marcar hasta arreglarla.
> - La leyenda del texto interpretado deja de nombrar colores ("Naranja"
>   se veía rosa): muestra las dos marcas con su significado.

## Why

Las técnicas de la propuesta apuntan a sus extremos por nombre. Si el
usuario corrige el nombre de una posición nueva ("Dog fight" → "Dogfight"),
la técnica sigue buscando "Dog fight" y al aceptar no se crea ("su origen o
destino ya no está disponible"), sin aviso previo (T-6.it8). La leyenda
"Amarillo / Naranja" no coincide con el color real de la marca de duda.

## What Changes

- Cada técnica del borrador apunta al elemento (nuevo o del catálogo), no a
  su nombre: renombrarlo la mantiene enlazada.
- La validez de cada técnica se recalcula en vivo; una técnica sin extremo
  válido se destaca con aviso, se desmarca y muestra los selectores de
  origen y destino.
- Leyenda del texto interpretado con las marcas de ejemplo, sin nombres de
  color.

## Fuera de alcance

- Editar nombre o tipo de las técnicas propuestas por la IA (siguen sin
  editarse; solo se re-apuntan si están sin resolver).
- Borrar elementos de la propuesta.
- Cambios en la IA o en lo que propone.

## Capabilities

### Modified Capabilities

- `importar-clase`: revisión de la propuesta, técnicas sin resolver,
  inserción y leyenda del texto interpretado.

# Proposal

> **Resumen para el owner**
> - Al pulsar **Aceptar** en la vista previa de una importación, el sitio
>   en el que se vio cada elemento nuevo se guarda solo.
> - Salir del mapa después ya no pregunta "¿Descartar cambios del grafo?".
> - Lo que ya tenías organizado y guardado no se toca: solo se guarda el
>   sitio de lo recién creado. En "Ambos", el de cada disciplina.
> - Si antes de importar tenías cambios de organización sin guardar,
>   siguen pendientes (no se guardan a escondidas).

## Why

Tras importar una clase, los nodos nuevos aparecen bien colocados pero su
sitio no se guarda. Al volver al mapa la app los ve "sin posición guardada"
y da el grafo por modificado, así que cada salida del mapa pide descartar
cambios que el usuario no ha hecho (bug de T-3.it7, T-3.it8).

## What Changes

- Aceptar una importación guarda la organización de los elementos creados
  (posiciones y sumisiones) en la disciplina de cada paso de la vista previa.
- La organización guardada de los elementos existentes no cambia.
- Los cambios de organización pendientes de antes de la importación se
  mantienen pendientes, como hasta ahora.
- "Reorganizar", "Guardar organización", "Cancelar" de la vista previa y
  los elementos creados a mano no cambian.

## Fuera de alcance

- Nodos que ya quedaron sin posición guardada por importaciones anteriores
  a este arreglo: se resuelven pulsando una vez "Guardar organización".
- Guardar automáticamente la organización al crear elementos a mano.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `mapa`: "Organizar el grafo a mano" — lo creado por una importación
  aceptada queda con su sitio guardado.

## Impact

- `src/lib/components/GrafoMapa.svelte` (guardado de las posiciones
  transferidas desde la vista previa) y `src/routes/mapa/+page.svelte`
  (`aceptarPreview` espera ese guardado). Sin migraciones ni dependencias.

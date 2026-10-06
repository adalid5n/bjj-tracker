# Proposal

## Why

En el mapa hay dos selectores que se ven iguales y se comportan distinto:
en **Grafo / Lista** pulsar una opción la elige; en **BJJ / Grappling**
cualquier toque cambia a la *otra* disciplina, aunque se pulse la que ya
está activa. El usuario pierde la disciplina sin querer y la app enseña a
desconfiar de sus controles. Es un cambio pequeño y va primero en la it.7
porque la vista previa de importación (T-3.it7) se apoya en la disciplina
activa.

## What Changes

- Regla única para todos los selectores de "una opción entre varias": tocar
  una opción **elige esa opción**; tocar la que ya está activa **no hace
  nada**.
- El selector BJJ / Grappling del mapa deja de alternar y pasa a elegir la
  opción tocada (igual que Grafo / Lista y que el selector de disciplina de
  Ajustes, que ya funciona así).
- El selector de disciplina de los asistentes de posición, sumisión y
  técnica (BJJ / Grappling / Ambos) deja de "desmarcarse" al tocar la
  opción activa (hoy eso la cambia a BJJ sin avisar).
- El resto de selectores equivalentes ya cumplen la regla; se revisan y se
  dejan como están (lista en `design.md`).

## Decisiones (owner, cerradas)

- Grafo / Lista y BJJ / Grappling deben comportarse igual: tocar = elegir
  esa opción; tocar la activa = no pasa nada.
- La regla se aplica a todos los selectores equivalentes de la app (p. ej.
  Ajustes, sub-selector de la Lista), no solo al del mapa.

## Fuera de alcance

- Cambiar el aspecto visual de los selectores o unificarlos en un único
  componente nuevo.
- Los selectores de campos **opcionales** de los asistentes (categoría,
  tipo de rol, tipo/estado de técnica, peso, resultado…), donde volver a
  tocar la opción activa la desmarca a propósito para dejar el campo vacío.
  No son "una opción obligatoria entre varias" (ver `design.md`).
- Interruptores de encendido/apagado (Vista avanzada, Mover nodos).

## Capabilities

### New Capabilities

- `selectores`: regla transversal de selector de opción única obligatoria (incluye Tipo de sesión y Resultado de roll, añadidos tras la implementación por decisión del owner).

### Modified Capabilities

- `mapa`: "Vistas Grafo y Lista" y "Disciplina activa" — tocar la opción
  activa no cambia nada; el selector de disciplina elige la opción tocada.
- `catalogo-tecnico`: "Disciplina de cada elemento" — en los asistentes,
  tocar la disciplina ya elegida la mantiene.

## Impact

- **Usuario:** deja de cambiar de disciplina por accidente en el mapa y en
  los asistentes.
- **Código:** `src/routes/mapa/+page.svelte` (selector de disciplina),
  `PosicionWizard.svelte`, `SumisionWizard.svelte`, `TecnicaWizard.svelte`
  (chips de disciplina). Sin cambios de BD ni dependencias.

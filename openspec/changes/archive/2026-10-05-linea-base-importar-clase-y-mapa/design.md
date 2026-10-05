# Design

## Context

Change de **línea base**: documenta el comportamiento actual, no hay
implementación. Ver proposal.md (Why). Las specs se redactaron leyendo el
código (fuente de verdad) y contrastando con `docs/spec/REQUISITOS.md` §3 y
las ADR 002, 006, 007 y 008. Donde código y documentos discrepan, la spec
sigue al código.

Dónde vive cada capability en el código (referencia para quien mantenga
las specs):

- `importar-clase`: `src/lib/components/ImportarClaseDialog.svelte`
  (flujo y pasos), `src/lib/ai.ts` (llamadas al servicio de IA: Groq,
  modelo `openai/gpt-oss-120b`, timeout 30 s, clave `VITE_GROQ_KEY`
  embebida en el build). Entrada desde el FAB de `src/routes/mapa/+page.svelte`.
- `catalogo-tecnico`: `src/lib/posiciones.ts`, `tecnicas.ts`,
  `sumisiones.ts`, `contras.ts`, `tags.ts`, `settings.svelte.ts`
  (disciplina activa, modo avanzado); asistentes `PosicionWizard`,
  `TecnicaWizard`, `SumisionWizard`; restricciones en `src/lib/db/schema.ts`
  (CHECK de destino por tipo, índice único nombre+origen+variante,
  UNIQUE en nombre de sumisión y de tag).
- `mapa`: `src/routes/mapa/+page.svelte`, `GrafoMapa.svelte`,
  `GrafoLeyenda.svelte`, `src/lib/grafo.ts`, `src/lib/grafo-layout.ts`,
  `MapaModalHost.svelte`, `mapa-modal-stack.svelte.ts` y las fichas
  `PosicionModalContent`, `TecnicaModalContent`, `SumisionModalContent`.

## Goals / Non-Goals

**Goals:**
- Que al archivar existan tres specs vivas fieles al comportamiento actual.

**Non-Goals:**
- Corregir comportamiento, código ni documentos existentes.

## Decisions

- **Tres capabilities en lugar de dos.** `mapa` en una sola spec superaba
  las ~25 requirements; se separan las reglas del catálogo
  (`catalogo-tecnico`) de la presentación (`mapa`).
- **Rarezas como comportamiento actual.** Las limitaciones detectadas
  (inserciones omitidas en silencio, destino igual al origen, etc.) se
  escriben de forma neutral en los escenarios. Si el owner decide
  cambiarlas, irán como MODIFIED en un change posterior.

## Risks / Trade-offs

- [Algún escenario puede no reflejar un caso límite que solo se ve
  usando la app] → revisión del owner en preview antes de archivar.
- [Comportamiento de borrado de posición que es solo destino deducido del
  esquema, no probado en la app] → marcado como duda en el informe.

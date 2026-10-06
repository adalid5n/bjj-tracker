# Tasks

## 1. Selector de disciplina del mapa

- [x] 1.1 En `src/routes/mapa/+page.svelte` sustituir el botón único `toggleDisciplina` por un grupo de dos botones BJJ / Grappling con el patrón de `/ajustes` (`role="group"`, `aria-pressed`, tokens semánticos); verificar en `pnpm dev` que tocar "BJJ" con BJJ activo no cambia nada y que tocar "Grappling" cambia el grafo
- [x] 1.2 Eliminar `toggleDisciplina` y añadir early return si la opción tocada ya es la activa; verificar con `pnpm check` sin errores nuevos

## 2. Disciplina en los asistentes

- [x] 2.1 Añadir a `src/lib/components/Chips.svelte` la prop opcional `required` (default `false`) que impide des-seleccionar la opción activa; verificar que los usos existentes sin la prop siguen des-seleccionando (p. ej. categoría en el asistente de posición vuelve a "Saltar")
- [x] 2.2 Pasar `required` a los chips de disciplina de `PosicionWizard.svelte`, `SumisionWizard.svelte` y `TecnicaWizard.svelte` (crear y editar, 6 sitios); verificar en `pnpm dev` que con "Grappling" o "Ambos" elegidos, volver a tocarlos no los cambia a BJJ

## 3. Verificación

- [x] 3.1 `pnpm check` y `pnpm build` sin errores nuevos; revisión manual del owner en `pnpm preview` de los selectores #1-#8 de `design.md`
- [x] 3.2 Archivar el change (`openspec archive selector-coherente`) tras la validación del owner; verificar que `openspec/specs/mapa` y `openspec/specs/catalogo-tecnico` reflejan los requisitos modificados

## 4. Ampliación: campos obligatorios

- [x] 4.1 `required` en Chips de "Tipo *" (SesionEditor) y "Resultado *" (RollEditor, asistente y editor)
- [x] 4.2 Capacidad `selectores` (spec transversal) con la regla y sus escenarios

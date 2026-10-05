# Tasks

> Aplicar después de `selector-coherente` (prop `required` de `Chips`) y de
> `historial-importaciones` (escrituras de historial que se mueven al
> borrador). Antes de empezar, cerrar con el owner los Open Questions de
> `design.md` que afectan a specs.

## 1. Borrador fuera del diálogo (sin cambio visible)

- [ ] 1.1 Crear `src/lib/importacion-borrador.svelte.ts` con la clase `ImportacionBorrador` (`$state` en class fields), moviendo el estado del borrador, `confirmar()`, `reset()` y las escrituras de historial desde `ImportarClaseDialog.svelte`; verificar con `pnpm check`
- [ ] 1.2 Instanciar el borrador en `src/routes/mapa/+page.svelte` y pasarlo al diálogo; abrir/cerrar el `Dialog` ya no resetea, solo "Descartar"; verificar en `pnpm dev` el flujo completo de importación de punta a punta igual que antes (incluido el historial)

## 2. Disciplina de la importación

- [ ] 2.1 Añadir en el paso `input` el selector BJJ / Grappling / Ambos (`Chips` con `required`, valor inicial = disciplina activa) y usar `borrador.disciplina` en todos los `create*`; verificar importando con BJJ activo y "Grappling" elegido que todo lo creado aparece con Grappling activo y no con BJJ

## 3. Token y elementos fantasma

- [ ] 3.1 Añadir `--highlight` / `--highlight-foreground` en `:root` y `.dark` de `src/routes/layout.css` y en `@theme inline`; verificar en ambos temas y que no aparece Tailwind crudo nuevo (`grep -rE "(bg|text|border)-(red|blue|green|yellow|amber|lime|gray)-[0-9]" src`)
- [ ] 3.2 Crear `buildPreviewElements` en `src/lib/grafo.ts` (fantasma con `nuevo`, `degree` recalculado, recuento por tipo); verificar con `pnpm check` y en consola de `pnpm dev` con una importación de ejemplo
- [ ] 3.3 Prop `preview` en `GrafoMapa.svelte`: sin taps a fichas, sin arrastre, fantasma fuera de `positionsCache`, de `saveLayout()` y de `dirty`; verificar que con organización sin guardar previa, tras cancelar la vista previa y guardar, `grafo_layout` no contiene ids `new-*`
- [ ] 3.4 Estilos `node.nuevo` / `edge.nuevo` + pulso (`transition-property` + `setInterval` sobre `.pulso-on`) y `prefers-reduced-motion` → color fijo; verificar emulando la preferencia en DevTools y que el tamaño no cambia al latir

## 4. Modo vista previa en /mapa

- [ ] 4.1 Paso `preview`: "Ver en el mapa" en "Añadir detalles" cierra fichas (`attemptCloseAll`) y diálogo, fuerza vista Grafo y activa el modo; verificar desde vista Lista y con una ficha abierta, y que el catálogo no cambia
- [ ] 4.2 Override de disciplina (la de la importación, o la activa si es Ambos) y filtros vacíos para el grafo durante la vista previa, sin tocar los ajustes ni los filtros de la página; verificar que al salir vuelven la disciplina y los filtros previos
- [ ] 4.3 Bloquear durante la vista previa: Grafo/Lista, disciplina, Mover nodos, Reorganizar, Guardar organización, FAB Nuevo, icono de historial; verificar uno a uno en `pnpm dev`
- [ ] 4.4 Leyenda fija sobre la BottomNav con recuento (omitiendo tipos a cero) + "Cancelar" + "Aceptar", visible sin tapar lo nuevo en móvil; verificar en ancho de móvil y de tablet
- [ ] 4.5 "Aceptar": `confirmar()`, transferir posiciones de fantasma a ids reales en el cache, `refresh()`, `reset()`, salir del modo quedándose en el mapa; verificar que lo nuevo aparece donde se vio y que la entrada del historial pasa a "Importada"
- [ ] 4.6 "Cancelar": salir del modo y reabrir el diálogo en "Revisar propuesta" con selección, ediciones, detalles y disciplina intactos; verificar que no se ha creado nada
- [ ] 4.7 Navegar a otra pantalla durante la vista previa: sin aviso propio (salvo el de organización sin guardar ya existente), nada escrito, entrada "Sin terminar"; verificar desde la BottomNav

## 5. Verificación y cierre

- [ ] 5.1 `pnpm check`, `pnpm build` y `pnpm preview` con refresh; verificar sin errores en consola
- [ ] 5.2 Validación manual del owner en `pnpm preview` (tablet y escritorio) contra los escenarios de `specs/importar-clase/spec.md` y `specs/mapa/spec.md`
- [ ] 5.3 Archivar el change (`openspec archive vista-previa-importacion`) después de `historial-importaciones`; verificar que `openspec/specs/importar-clase` y `openspec/specs/mapa` contienen los requisitos nuevos

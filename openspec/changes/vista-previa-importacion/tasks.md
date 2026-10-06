# Tasks

> Aplicar después de `selector-coherente` (prop `required` de `Chips`) y de
> `historial-importaciones` (escrituras de historial que se mueven al
> borrador).

## 1. Borrador fuera del diálogo (sin cambio visible)

- [x] 1.1 Crear `src/lib/importacion-borrador.svelte.ts` con la clase `ImportacionBorrador` (`$state` en class fields), moviendo el estado del borrador, `confirmar()`, `reset()` y las escrituras de historial desde `ImportarClaseDialog.svelte`; verificar con `pnpm check`
- [x] 1.2 Instanciar el borrador en `src/routes/mapa/+page.svelte` y pasarlo al diálogo; abrir/cerrar el `Dialog` ya no resetea, solo "Descartar"; verificar en `pnpm dev` el flujo completo de importación de punta a punta igual que antes (incluido el historial)

## 2. Disciplina de la importación

- [ ] 2.1 Añadir en el paso `input` el selector BJJ / Grappling / Ambos (`Chips` con `required`, valor inicial = disciplina activa) y usar `borrador.disciplina` en todos los `create*`; verificar importando con BJJ activo y "Grappling" elegido que todo lo creado aparece con Grappling activo y no con BJJ
- [ ] 2.2 Helper `disciplinasDeCatalogo` y filtrado del catálogo por la disciplina de la importación al generar la propuesta (snapshot enviado a la IA, validación, refinado, comparación "ya existe") y en `confirmar()` (resolución nombre → id), y en los selectores de origen/destino de "+ Añadir" en la revisión; verificar en la pestaña Red de `pnpm dev` que una importación de Grappling no envía posiciones de BJJ (ni las ofrece en "+ Añadir"), que una de "Ambos" solo envía las de "Ambos", y que un "Mount" que solo existe en BJJ se crea como nuevo en una importación de Grappling

## 3. Token y elementos fantasma

- [ ] 3.1 Añadir `--highlight` / `--highlight-foreground` en `:root` y `.dark` de `src/routes/layout.css` y en `@theme inline`; verificar en ambos temas y que no aparece Tailwind crudo nuevo (`grep -rE "(bg|text|border)-(red|blue|green|yellow|amber|lime|gray)-[0-9]" src`)
- [ ] 3.2 Crear `buildPreviewElements` en `src/lib/grafo.ts` (catálogo de la disciplina del paso, fantasma con `nuevo`, `degree` recalculado, recuento por tipo, lista de problemas del paso); verificar con `pnpm check` y en consola de `pnpm dev` con una importación de ejemplo
- [ ] 3.3 Prop `preview` en `GrafoMapa.svelte`: sin taps a fichas, sin arrastre, fantasma fuera de `positionsCache`, de `saveLayout()` y de `dirty`; verificar que con organización sin guardar previa, tras cancelar la vista previa y guardar, `grafo_layout` no contiene ids `new-*`
- [ ] 3.4 Estilos `node.nuevo` / `edge.nuevo` + pulso (`transition-property` + `setInterval` sobre `.pulso-on`) y `prefers-reduced-motion` → color fijo; verificar emulando la preferencia en DevTools y que el tamaño no cambia al latir

## 4. Modo vista previa en /mapa

- [ ] 4.1 Paso `preview`: "Ver en el mapa" en "Añadir detalles" cierra fichas (`attemptCloseAll`) y diálogo, fuerza vista Grafo y activa el modo; verificar desde vista Lista y con una ficha abierta, y que el catálogo no cambia
- [ ] 4.2 Pasos de la vista previa (`pasosPreview`: una disciplina, o BJJ y Grappling si la importación es "Ambos") con override de disciplina por paso y filtros vacíos para el grafo, sin tocar los ajustes ni los filtros de la página; verificar con una importación "Ambos" que el paso 1 muestra BJJ y el 2 Grappling, y que al cancelar vuelven la disciplina y los filtros previos
- [ ] 4.3 Bloquear durante la vista previa: Grafo/Lista, disciplina, Mover nodos, Reorganizar, Guardar organización, FAB Nuevo, icono de historial; verificar uno a uno en `pnpm dev`
- [ ] 4.4 Barra fija sobre la BottomNav con indicador "Vista previa N de M · Disciplina", recuento (omitiendo tipos a cero) y botones del paso ("Cancelar" siempre, "← Atrás" / "Siguiente: … →" según el paso, "Aceptar" solo en el último), visible sin tapar lo nuevo en móvil; verificar en ancho de móvil y de tablet con una importación de una disciplina y otra de "Ambos"
- [ ] 4.5 "Aceptar" (solo último paso): `confirmar()` una sola vez, transferir posiciones de fantasma a ids reales en el cache, disciplina activa = la del último paso, `refresh()`, `reset()`, salir del modo quedándose en el mapa; verificar que lo nuevo aparece donde se vio, que con BJJ activo una importación de Grappling deja Grappling activo, que una de "Ambos" se crea una sola vez y deja Grappling activo, y que la entrada del historial pasa a "Importada"
- [ ] 4.6 "Cancelar" (cualquier paso): salir del modo y reabrir el diálogo en "Revisar propuesta" con selección, ediciones, detalles y disciplina intactos; verificar desde el paso 1 y el paso 2 de "Ambos" que no se ha creado nada y que la disciplina activa no cambió
- [ ] 4.7 Navegar a otra pantalla durante la vista previa: sin aviso propio (salvo el de organización sin guardar ya existente), nada escrito, entrada "Sin terminar"; verificar desde la BottomNav
- [ ] 4.8 Paso que no se puede mostrar: en lugar de la vista previa, "No se puede: <motivo breve>" con "Retroceder" (vuelve a "Revisar propuesta" con todo intacto) y, solo si hay paso siguiente, "Seguir con la siguiente disciplina"; sin "Aceptar" en ese paso; al seguir, acumular en `excluidosPorError` los elementos causantes y, al "Aceptar" en el último paso, crear todo salvo esos (y sus técnicas dependientes) mostrando cuáles no se crearon; verificar en `pnpm dev` forzando temporalmente un fallo en `buildPreviewElements` (cambio local sin commitear) en una importación de una disciplina y en el paso 1 de "Ambos" (seguir y aceptar: se crea todo salvo lo excluido y se avisa)

## 5. Verificación y cierre

- [ ] 5.1 `pnpm check`, `pnpm build` y `pnpm preview` con refresh; verificar sin errores en consola
- [ ] 5.2 Validación manual del owner en `pnpm preview` (tablet y escritorio) contra los escenarios de `specs/importar-clase/spec.md` y `specs/mapa/spec.md`
- [ ] 5.3 Archivar el change (`openspec archive vista-previa-importacion`) después de `historial-importaciones`; verificar que `openspec/specs/importar-clase` y `openspec/specs/mapa` contienen los requisitos nuevos

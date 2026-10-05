# Design

## Context

Ver `proposal.md` — Why. Código relevante (revisado 2026-10-05):

- **`ImportarClaseDialog.svelte`** (~1150 líneas): `Dialog` de
  `ui/dialog`, pasos `input → normalizado → review → detalles`. Todo el
  borrador (`posicionesDraft`, `sumisionesDraft`, `tecnicasDraft`,
  catálogo base, propuesta, textos) es `$state` **local**; cerrar =
  `handleClose()` → `resetState()`. No existe "ocultar sin perder".
  `handleConfirmar` resuelve nombres → ids e inserta con
  `settings.disciplinaActiva` en todos los `create*`.
- **`/mapa/+page.svelte`** (1117 líneas): monta el diálogo
  (`bind:open`, `onCatalogChanged={refresh}`); filtra por disciplina
  **antes** de `buildGrafoElements`; `vistaPrincipal` grafo/lista;
  `grafoDirty` + `beforeNavigate` con "¿Descartar cambios del grafo?";
  FAB "Nuevo"; `MapaModalHost` (fichas en Sheet).
- **`GrafoMapa.svelte`**: `positionsCache` **a nivel de módulo**;
  `layoutstop` vuelca **todos** los nodos al cache; `saveLayout()` persiste
  **todos** los nodos de `cy`; taps abren fichas vía `onAttemptPush`;
  `applyFilters` por tipo/estado/categoría; el lienzo fuerza `.dark`.
- **`src/lib/grafo.ts`** `buildGrafoElements`: ids `pos:<id>`,
  `sum:<id>`, arista = id de técnica; descarta aristas con extremos no
  incluidos; `degree` = nº de aristas.
- `historial-importaciones` (T-2) añade escrituras de historial dentro
  del diálogo; este change se aplica **después** y debe mover esas
  llamadas junto con el borrador (Decisión 1).

## Goals / Non-Goals

**Goals:** vista previa sobre el grafo real de `/mapa` (opción elegida
por el owner), sin escrituras en BD hasta "Aceptar", borrador que
sobrevive al cierre del diálogo, organización guardada intacta, disciplina
de la importación elegida por el usuario.

**Non-Goals:** editar desde el grafo; persistir la organización de nodos
no creados; decidir el emparejamiento con el catálogo por disciplina
(Open Questions).

## Decisions

### 1. El borrador sale del diálogo (rework del ciclo de vida)

Nuevo `src/lib/importacion-borrador.svelte.ts` con una clase
`ImportacionBorrador` cuyos campos son `$state` en class fields (patrón
de CLAUDE.md; nunca `$state` a nivel de módulo). Contiene: paso actual,
texto original, normalización, texto para propuesta, propuesta,
borradores de posiciones/sumisiones/técnicas, catálogo base, disciplina
elegida, `importacionId` del historial, y métodos `confirmar()`
(la lógica actual de `handleConfirmar`, usando `this.disciplina`) y
`reset()`.

- **Instancia por página**, no singleton de módulo: `/mapa` hace
  `const borrador = new ImportacionBorrador()` y la pasa al diálogo como
  prop. Salir de `/mapa` desmonta la página y el borrador se pierde
  (requisito "Salir del mapa durante la vista previa"); el historial
  conserva la entrada.
- El diálogo pasa a ser **vista** del borrador: abrir/cerrar el `Dialog`
  ya no resetea; solo "Cancelar/Descartar" del diálogo llama a
  `borrador.reset()`. Así "Cancelar" en la vista previa reabre el diálogo
  con `borrador.paso = 'review'` y todo intacto.
- Las escrituras de historial de T-2 (crear/actualizar entrada) se mueven
  a métodos del borrador. Alternativa descartada: mantener el estado en el
  diálogo y montarlo oculto (`open=false` sin reset) — funciona, pero deja
  el estado acoplado a un componente de 1150 líneas y obliga a exponer
  métodos imperativos (`bind:this`) para que la página confirme.

### 2. Modo vista previa en `/mapa`

Estado de página `previewActivo` (derivado de `borrador.paso ===
'preview'`). Al entrar:

1. `modalHost.attemptCloseAll()` (cierra fichas, respetando wizards
   sucios), cierra el diálogo, `vistaPrincipal = 'grafo'`.
2. **Disciplina de la vista previa** = `borrador.disciplina`, o la activa
   si es `ambos`. Es un *override* de vista: no se llama a
   `settings.setDisciplinaActiva` (no se persiste).
3. **Filtros:** a `GrafoMapa` se le pasan `tipos/estados/categorias`
   vacíos mientras dura; los arrays de la página no se tocan, así que al
   salir vuelven solos.
4. **Bloqueos:** se ocultan/deshabilitan selector Grafo/Lista, selector de
   disciplina, "Mover nodos", "Reorganizar", "Guardar organización", FAB
   "Nuevo", icono de historial; `GrafoMapa` recibe `preview` y no emite
   `onAttemptPush` en taps ni permite `grabify`. Pan y zoom siguen.
5. **Leyenda:** barra fija `bottom-14` (encima de la BottomNav, mismo
   sitio que la barra de etiquetado masivo) con recuento + "Cancelar" +
   "Aceptar". En móvil el grafo ya ocupa `100dvh − 13rem`; la barra
   tapa la parte baja, así que se añade `padding` inferior al lienzo en
   preview o se hace `fit` descontando la altura de la barra.

Al **Aceptar**: `await borrador.confirmar()` → transferir posiciones
(Decisión 3) → `refresh()` → `borrador.reset()` → sale del modo. Al
**Cancelar**: sale del modo, `borrador.paso = 'review'`, abre el diálogo.

**Navegación durante la vista previa:** `beforeNavigate` no pide
confirmación propia; deja navegar (la entrada queda "Sin terminar" en el
historial porque nunca pasó a "Importada"). El aviso existente de
"¿Descartar cambios del grafo?" sigue aplicando si había organización sin
guardar. Recarga/cierre: igual (no interceptable).

### 3. Elementos fantasma en `GrafoMapa`

- Función pura `buildPreviewElements(catalogoFiltrado, borrador)` en
  `src/lib/grafo.ts`: parte de `buildGrafoElements`, añade nodos
  `new-pos:<nombre-normalizado>` / `new-sum:<…>` y aristas `new-tec:<i>`
  con `data.nuevo = true`, resolviendo nombres con el mismo criterio que
  `confirmar()` (`toLowerCase().trim()` contra catálogo + nuevos). Solo
  técnicas `seleccionado && puedeCrearse`. Recalcula `degree` como
  quedaría el mapa tras aceptar. Devuelve también el recuento por tipo.
- `GrafoMapa` con prop `preview`:
  - `layoutstop` y `dragfree` **no** escriben nodos `nuevo` en
    `positionsCache`; `saveLayout()` los excluye (filtro por
    `data('nuevo')`) — defensa en profundidad aunque guardar esté
    bloqueado.
  - Layout: `fcose` con `fixedNodeConstraint` para todos los nodos
    cacheados (mismo camino que hoy con nodos nuevos), así lo existente no
    se mueve y lo nuevo se coloca alrededor.
  - No marca `dirty` por la llegada de fantasmas.
- Al aceptar: tras crear, se copian las posiciones de los fantasma al
  `positionsCache` con los ids reales (`pos:<id>`), de modo que lo nuevo
  aparece donde se vio; queda "Guardar organización" pendiente, como hoy
  con cualquier nodo nuevo. Nada de los fantasma toca `grafo_layout`.

### 4. Resaltado que late

- Token nuevo en `src/routes/layout.css`: `--highlight` y
  `--highlight-foreground` en `:root` y `.dark`, expuestos como
  `--color-highlight` / `--color-highlight-foreground` en `@theme inline`.
  Tono distinguible de `--primary` (selección) y de los resaltados del
  texto interpretado. El lienzo fuerza `.dark`, así que en el grafo se ve
  el valor oscuro; el claro se usa en la leyenda (muestra de color).
- `readTokens()` añade `highlight`. Estilos `node.nuevo` (borde y relleno
  hacia `highlight`) y `edge.nuevo` (`line-color`, `target-arrow-color`);
  clase `.pulso-on` con `transition-property` de color (~600 ms). Un
  `setInterval` alterna `.pulso-on` en `cy.$('.nuevo')`. Sin cambios de
  tamaño.
- `matchMedia('(prefers-reduced-motion: reduce)')`: si coincide, sin
  intervalo y `.pulso-on` fijo; se escucha `change`. Intervalo limpiado al
  salir del modo y en `onDestroy`.

### 5. Selector de disciplina en el primer paso

En el paso `input` del diálogo: `Chips` con BJJ / Grappling / Ambos y la
prop `required` de `selector-coherente` (por eso este change va después
de T-1). Valor inicial `settings.disciplinaActiva` al crear/resetear el
borrador. `confirmar()` usa `borrador.disciplina` en los cuatro `create*`
(hoy `settings.disciplinaActiva`).

### 6. Flujo del diálogo

`paso` gana `'preview'`. En "Añadir detalles" el botón principal pasa de
"Confirmar e insertar" a "Ver en el mapa". El diálogo no pinta nada en
`'preview'` (está cerrado).

## Risks / Trade-offs

- [Rework del ciclo de vida en el fichero más grande] → se hace en una
  tarea propia, primero, sin cambiar comportamiento visible; verificación
  manual del flujo completo antes de añadir la vista previa.
- [Acoplamiento página ↔ borrador] → acotado a la clase
  `ImportacionBorrador`; el diálogo y la página solo la leen/llaman.
- [Más modos en `/mapa`] → un solo flag `previewActivo` gobierna todos
  los bloqueos; se revisa la lista de controles de la página.
- [Tras "Aceptar" una importación de otra disciplina] → el mapa vuelve a
  la disciplina activa y lo recién creado no se ve. Ver Open Questions.
- [Técnica "idéntica a una existente" que no se creará] → la vista previa
  la pinta como nueva (bug de línea base); aceptado.
- [Usuario con fichas/wizard sucio abierto al pasar a vista previa] →
  `attemptCloseAll` pide "¿Descartar cambios?"; si el usuario no
  descarta, no se entra en vista previa y el diálogo sigue en detalles.

## Migration Plan

Sin migración de BD. Toca `/mapa`, grafo y CSS: antes de pushear,
`pnpm check`, `pnpm build`, `pnpm preview` + refresh, en ancho móvil y
escritorio, con y sin "reducir movimiento" (DevTools → Rendering).

## Open Questions

- **Emparejamiento con el catálogo y catálogo enviado a la IA según la
  disciplina de la importación** (pendiente del owner, vía orquestador).
  Hoy "Reutilización de lo que ya existe en el catálogo" compara con todo
  el catálogo sea cual sea su disciplina, y la IA recibe todas las
  posiciones y sumisiones. Con disciplinas aisladas habrá que decidir si
  se filtra por la disciplina elegida (¿y "Ambos"?). Afecta a specs
  (`importar-clase`) y a `buildPreviewElements`; no se cierra aquí.
- **Disciplina activa tras "Aceptar" una importación de la otra
  disciplina**: propuesta — cambiar la disciplina activa a la de la
  importación para que el usuario vea lo que acaba de crear. Afecta a
  specs; pendiente del owner.

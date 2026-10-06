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
no creados; detectar duplicados entre disciplinas (panel de alertas,
it.8).

## Decisions

### 1. El borrador sale del diálogo (rework del ciclo de vida)

Nuevo `src/lib/importacion-borrador.svelte.ts` con una clase
`ImportacionBorrador` cuyos campos son `$state` en class fields (patrón
de CLAUDE.md; nunca `$state` a nivel de módulo). Contiene: paso actual,
texto original, normalización, texto para propuesta, propuesta,
borradores de posiciones/sumisiones/técnicas, catálogo base, disciplina
elegida, paso de vista previa (`pasoPreview`, índice en la lista de
disciplinas a revisar), `importacionId` del historial, y métodos `confirmar()`
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
2. **Pasos y disciplina de cada paso:** `pasosPreview =
   borrador.disciplina === 'ambos' ? ['bjj', 'grappling'] :
   [borrador.disciplina]`; `pasoPreview` empieza en 0. La disciplina del
   grafo en cada paso es `pasosPreview[pasoPreview]` (catálogo de esa
   disciplina + "Ambos", con lo nuevo encima; lo nuevo de una importación
   "Ambos" sale en los dos pasos). Es un *override* de vista: durante la
   vista previa no se llama a `settings.setDisciplinaActiva`.
3. **Filtros:** a `GrafoMapa` se le pasan `tipos/estados/categorias`
   vacíos mientras dura; los arrays de la página no se tocan, así que al
   salir vuelven solos.
4. **Bloqueos:** se ocultan/deshabilitan selector Grafo/Lista, selector de
   disciplina, "Mover nodos", "Reorganizar", "Guardar organización", FAB
   "Nuevo", icono de historial; `GrafoMapa` recibe `preview` y no emite
   `onAttemptPush` en taps ni permite `grabify`. Pan y zoom siguen.
5. **Barra fija:** `bottom-14` (encima de la BottomNav, mismo sitio que
   la barra de etiquetado masivo) con indicador "Vista previa
   {n} de {total} · {Disciplina}" (siempre visible, también con un solo
   paso), recuento y botones según el paso: "Cancelar" siempre; "← Atrás"
   si `pasoPreview > 0`; "Siguiente: {Disciplina} →" si no es el último;
   "Aceptar" solo en el último. En móvil el grafo ya ocupa
   `100dvh − 13rem`; la barra tapa la parte baja, así que se añade
   `padding` inferior al lienzo en preview o se hace `fit` descontando la
   altura de la barra. En móvil estrecho, cuatro elementos (indicador +
   3 botones en el último paso de "Ambos") pueden no caber en una fila:
   indicador y recuento en una línea, botones en otra.

**Siguiente / Atrás:** solo cambian `pasoPreview`; el grafo se reconstruye
con la disciplina del paso. Nada se escribe.

Al **Aceptar** (solo último paso): `await borrador.confirmar()` (una sola
inserción, con `borrador.disciplina`, también si es `ambos`) → transferir
posiciones (Decisión 3) → `settings.setDisciplinaActiva(
pasosPreview.at(-1))` (la de la importación; Grappling en "Ambos") →
`refresh()` → `borrador.reset()` → sale del modo y se queda en `/mapa`.
Los filtros de la página no se tocaron, así que vuelven solos. Al
**Cancelar** (cualquier paso): sale del modo, `borrador.paso = 'review'`,
abre el diálogo; la disciplina activa no ha cambiado.

**Navegación durante la vista previa:** `beforeNavigate` no pide
confirmación propia; deja navegar (la entrada queda "Sin terminar" en el
historial porque nunca pasó a "Importada"). El aviso existente de
"¿Descartar cambios del grafo?" sigue aplicando si había organización sin
guardar. Recarga/cierre: igual (no interceptable).

### 2b. Paso que no se puede mostrar

`buildPreviewElements` (Decisión 3) devuelve, además de los elementos,
una lista de problemas del paso. Un paso tiene error si preparar su vista
previa falla (p. ej. no se pudo leer el catálogo de esa disciplina o
construir el grafo lanza una excepción) o si algo nuevo y marcado que sí
se va a crear no se puede colocar en el grafo de esa disciplina. Las
técnicas que no se van a crear (origen o destino renombrado o
desmarcado, no resueltas) **no** son error del paso: no se pintan, como
ya prevé el requisito "Confirmar e insertar". Con la comparación por
disciplina (Decisión 5b) todo lo enlazado está en la disciplina del paso
o en "Ambos", así que el segundo caso es defensivo. En caso de error el
lienzo no pinta la vista previa y la barra muestra "No se puede: {motivo
breve}" con:

- "Retroceder" → igual que Cancelar (`borrador.paso = 'review'`, diálogo
  abierto, nada escrito).
- "Seguir con la siguiente disciplina" → solo si no es el último paso;
  `pasoPreview + 1`.

Un paso con error no ofrece "Aceptar" (en el último paso solo queda
"Retroceder"). Cada problema identifica, cuando puede, los elementos que lo
causan; el borrador acumula esos elementos en `excluidosPorError` al
pulsar "Seguir con la siguiente disciplina". Al **Aceptar** en el último
paso, `confirmar()` crea todo lo marcado **excepto** `excluidosPorError`
(y las técnicas que dependen de ellos) y los añade al aviso de "no se
crearon" del requisito "Confirmar e insertar", con el motivo del paso. Si
el error del paso no se puede atribuir a ningún elemento (p. ej. fallo al
leer el catálogo), no se excluye nada. "← Atrás" hasta el paso con error
y "Cancelar"/"Retroceder" vacían `excluidosPorError`. El motivo se redacta para el usuario (nombre del elemento
y qué falta), nunca el error técnico en bruto.

### 3. Elementos fantasma en `GrafoMapa`

- Función pura `buildPreviewElements(catalogoFiltrado, borrador)` (el
  catálogo filtrado por la disciplina **del paso**) en
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

### 4. Resaltado que respira

> Revisado tras la validación del owner (2026-10-06): amarillo limón en
> vez de magenta y transición suave en vez de encendido/apagado.

- Token nuevo en `src/routes/layout.css`: `--highlight` y
  `--highlight-foreground` en `:root` y `.dark`, expuestos como
  `--color-highlight` / `--color-highlight-foreground` en `@theme inline`.
  Amarillo limón (hue ≈ 98; oscuro `oklch(0.88 0.17 98)`, claro
  `oklch(0.80 0.16 98)`), distinguible de `--warning` (ámbar, hue 80), de
  `--primary` (selección) y de los resaltados del texto interpretado. El lienzo fuerza `.dark`, así que en el grafo se ve
  el valor oscuro; el claro se usa en la leyenda (muestra de color).
- `readTokens()` añade `highlight`. Estilos `node.nuevo` (borde y relleno
  hacia `highlight`) y `edge.nuevo` (`line-color`, `target-arrow-color`);
  `.pulso-on` pone relleno/borde/línea en `highlight`; `.pulso-anim`
  añade `transition-property` de color con `ease-in-out` y duración igual
  a medio periodo (900 ms). Un `setInterval` de 900 ms alterna
  `.pulso-on`, así el color va y vuelve sin pausas (ciclo ≈ 1,8 s, efecto
  "respirar" desde el color normal del elemento). Sin cambios de tamaño.
- `matchMedia('(prefers-reduced-motion: reduce)')`: si coincide, sin
  intervalo ni `.pulso-anim` y `.pulso-on` fijo; se escucha `change`. Intervalo limpiado al
  salir del modo y en `onDestroy`.

### 5. Selector de disciplina en el primer paso

En el paso `input` del diálogo: `Chips` con BJJ / Grappling / Ambos y la
prop `required` de `selector-coherente` (por eso este change va después
de T-1). Valor inicial `settings.disciplinaActiva` al crear/resetear el
borrador. `confirmar()` usa `borrador.disciplina` en los cuatro `create*`
(hoy `settings.disciplinaActiva`).

### 5b. Catálogo de la importación filtrado por disciplina

Un helper puro `disciplinasDeCatalogo(d)` devuelve `['bjj','ambos']`,
`['grappling','ambos']` o `['ambos']` (importación "Ambos" → **solo**
"Ambos"). Se aplica en los dos sitios donde hoy se lee el catálogo
entero:

- Generación de la propuesta (`listPosiciones` / `listTecnicas` /
  `listSumisiones` → `CatalogoSnapshot`): se filtra antes de construir el
  snapshot, así que la IA (`generarPropuestaDeClase`,
  `validarPropuesta`, refinado) solo recibe ese catálogo y
  `catalogoPosicionesBase` / `catalogoSumisionesBase` (comparación "ya
  existe" en la revisión) también. Efecto colateral: esas mismas listas
  alimentan los selectores de origen/destino de "+ Añadir" en la
  revisión, que pasan a ofrecer solo el catálogo de la importación
  (decisión del orquestador; MODIFIED "Añadir elementos a mano en la
  revisión").
- `confirmar()`: los mapas nombre → id para resolver orígenes y destinos
  se construyen con el catálogo filtrado; lo que no está ahí se crea con
  `borrador.disciplina`, aunque exista con el mismo nombre en la otra
  disciplina.

Consecuencia aceptada por el owner: pueden aparecer duplicados entre
disciplinas (p. ej. "Mount" de BJJ y "Mount" de Grappling); los avisará
el panel de alertas (it.8). La disciplina elegida es fija una vez
generada la propuesta (el selector está en el primer paso); si el usuario
vuelve al primer paso y la cambia, el catálogo filtrado se recalcula al
generar de nuevo la propuesta.

### 6. Flujo del diálogo

`paso` gana `'preview'`. En "Añadir detalles" el botón principal pasa de
"Confirmar e insertar" a "Ver en el mapa". El diálogo no pinta nada en
`'preview'` (está cerrado).

### 7. Sumisiones únicas por disciplina (schema v11)

Añadido tras la validación del owner (2026-10-06). `sumisiones_terminales`
tenía `nombre TEXT NOT NULL UNIQUE` (DDL de v2), así que la comparación
por disciplina (5b) decidía crear "Kimura" de Grappling/Ambos pero la BD
lo rechazaba y la sumisión (y sus técnicas) no se creaban.

- **Migración nueva v10 → v11** al final de `MIGRATIONS` (las históricas
  no se tocan). SQLite no puede quitar un UNIQUE de columna → se
  reconstruye la tabla con el procedimiento oficial: `PRAGMA
  foreign_keys = OFF` (fuera de transacción) → `BEGIN` → crear
  `sumisiones_terminales_v11` con las mismas columnas y `UNIQUE (nombre,
  disciplina)` → copiar todas las filas con sus ids → `DROP` de la vieja
  → `RENAME` de la nueva → versión 11 → `PRAGMA foreign_key_check(tecnicas)`
  (aviso, no bloquea) → `COMMIT` → `PRAGMA foreign_keys = ON`. Con las FK
  apagadas el `DROP` no dispara `ON DELETE SET NULL` en `tecnicas`; la FK
  `tecnicas.sumision_destino_id` está declarada por nombre de tabla y tras
  el rename apunta a la nueva con los mismos ids. `grafo_layout` e
  `importaciones` referencian por id sin FK: no cambian.
- **Asistente de sumisión:** "Ya existe una sumisión con ese nombre." solo
  si coincide nombre (sin mayúsculas) **y** disciplina.
- **Importar:** sin cambios de código: `confirmar()` ya resolvía con el
  catálogo de la disciplina de la importación; ahora la creación no falla.
- **Copia de seguridad:** el fichero no cambia (mismas columnas), así que
  el formato sigue en 7 y se siguen aceptando v6 y v7; el import inserta
  ids tal cual y la restricción nueva es más laxa que la vieja.
- Las posiciones no tienen UNIQUE en BD; su asistente sigue comprobando el
  nombre en todo el catálogo (fuera de alcance de este cambio).

## Risks / Trade-offs

- [Rework del ciclo de vida en el fichero más grande] → se hace en una
  tarea propia, primero, sin cambiar comportamiento visible; verificación
  manual del flujo completo antes de añadir la vista previa.
- [Acoplamiento página ↔ borrador] → acotado a la clase
  `ImportacionBorrador`; el diálogo y la página solo la leen/llaman.
- [Más modos en `/mapa`] → un solo flag `previewActivo` gobierna todos
  los bloqueos; se revisa la lista de controles de la página.
- [Tras "Aceptar" la disciplina activa cambia sin que el usuario la
  toque] → decisión del owner para que vea lo recién creado; el selector
  de disciplina del mapa refleja el cambio en cuanto sale del modo.
- [Importación "Ambos" con un paso que no se puede mostrar y "Seguir con
  la siguiente disciplina"] → al aceptar se crea todo salvo los elementos
  que causaron el error (Decisión 2b); el usuario ve cuáles no se
  crearon.
- [Técnica "idéntica a una existente" que no se creará] → la vista previa
  la pinta como nueva (bug de línea base); aceptado.
- [Usuario con fichas/wizard sucio abierto al pasar a vista previa] →
  `attemptCloseAll` pide "¿Descartar cambios?"; si el usuario no
  descarta, no se entra en vista previa y el diálogo sigue en detalles.

## Migration Plan

Migración de BD v11 (Decisión 7), aplicada automáticamente al abrir la
app; sin cambio de formato de la copia de seguridad. Probar con una BD
v10 con sumisiones y técnicas (p. ej. importando un JSON de prod en el
Codespace) que tras actualizar todo sigue igual. Toca `/mapa`, grafo y
CSS: antes de pushear,
`pnpm check`, `pnpm build`, `pnpm preview` + refresh, en ancho móvil y
escritorio, con y sin "reducir movimiento" (DevTools → Rendering).

## Open Questions

Ninguna.

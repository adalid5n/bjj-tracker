# Design

## Context

Ver `proposal.md` — Why. Estado actual relevante:

- `ImportarClaseDialog.svelte` (~1150 líneas) guarda todo en `$state`
  local del componente y lo borra en `resetState()` al cerrar. Las fases
  están en `handleNormalizar` (paso "Analizar"), `handleGenerarPropuesta`
  (+ `validarPropuesta` silenciosa), `handleRefinar` y `handleConfirmar`
  (inserta posiciones → sumisiones → técnicas; los fallos solo van a
  `console.warn`).
- `src/lib/ai.ts`: `normalizarDescripcion()` ya pide JSON
  (`response_format: json_object`) con `texto`, `correcciones`,
  `inciertos`. `generarPropuestaDeClase()` ya devuelve un `resumen`
  (≤80 caracteres) que hoy solo se muestra bajo el título de la revisión.
- BD: `src/lib/db/schema.ts`, última migración `SCHEMA_V9_MIGRATION`
  (`{ from: 8, to: 9 }`). API mínima `init` / `run` / `query`.
- Copia de seguridad: `src/lib/sync.ts` (`exportAll` / `importAll`,
  wipe + insert, `CURRENT_SCHEMA_VERSION = 6` validado de forma estricta)
  y botones en `src/routes/ajustes/+page.svelte`.
- `/mapa`: sub-header sticky con Grafo/Lista + disciplina; **no se pinta
  con catálogo vacío** (rama `catalogoVacio`). Fichas en `Sheet`
  (`ui/sheet`, lateral `sm:max-w-md` / inferior `h-[50dvh]`) vía
  `MapaModalHost.svelte`.
- UI instalada en `src/lib/components/ui/`: alert-dialog, button, dialog,
  dropdown-menu, input, label, select, separator, sheet, textarea,
  tooltip. `bits-ui` 2.18 expone `Accordion` (sin wrapper shadcn aún).

## Goals / Non-Goals

**Goals:** persistir cada importación por fases sin llamadas extra a la
IA; panel de consulta coherente con las fichas; copia de seguridad
completa y fiel (historial, etiquetas, disciplina) sin romper copias
antiguas.

**Non-Goals:** revertir importaciones; vincular entrada ↔ ids creados
para un futuro "revertir" (ver Decisión 2, se guardan los ids por si
acaso pero no se usan); arreglar los `console.warn` silenciosos de
`handleConfirmar` (bug de línea base, fuera de la it.7).

## Decisions

### 1. Migración nueva al final de `MIGRATIONS`

`SCHEMA_V10_MIGRATION` + `migrate9To10` + `{ from: 9, to: 10 }` al final
del array. Las migraciones v1–v9 no se tocan (inmutables, CLAUDE.md).

```sql
CREATE TABLE importaciones (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  titulo TEXT NOT NULL,
  titulo_origen TEXT NOT NULL CHECK (titulo_origen IN ('ia','texto')),
  texto_original TEXT NOT NULL,
  texto_interpretado TEXT,
  propuesta_json TEXT,
  aceptado_json TEXT,
  estado TEXT NOT NULL CHECK (estado IN ('importada','sin_terminar','fallo')),
  error TEXT
);
CREATE INDEX idx_importaciones_created_at ON importaciones(created_at);
UPDATE schema_meta SET value = '10' WHERE key = 'version';
```

- `propuesta_json` / `aceptado_json`: JSON serializado (SQL crudo, sin
  ORM). Se guarda JSON (no texto legible) para poder re-formatear o, en
  el futuro, revertir; la conversión a lista legible es solo de UI.
- `aceptado_json` incluye nombres **y** ids creados (`{posiciones:[{id,
  nombre, categoria}], sumisiones:[…], tecnicas:[{id, nombre, tipo,
  origen, destino}]}`). Coste cero hoy; deja la puerta abierta a
  "revertir" (fuera de alcance) sin migración extra.
- `titulo_origen` permite sustituir el título de respaldo por el de la IA
  cuando ésta responde más tarde en la misma importación.

### 2. DAO `src/lib/importaciones.ts`

`createImportacion(textoOriginal)`, `updateImportacion(id, patch)`,
`listImportaciones()` (`ORDER BY created_at DESC`),
`deleteImportacion(id)`. SQL crudo sobre `run` / `query`. Ids con
`crypto.randomUUID()` y fechas ISO, como `sumisiones.ts`.

### 3. Enganche en `ImportarClaseDialog.svelte`

Nuevo `let importacionId = $state<string | null>(null)` (local del
componente, no state compartido):

| Momento | Escritura |
|---|---|
| `handleNormalizar` antes de llamar a la IA | si `importacionId` es null → `create` (título = primeras ~6 palabras, `titulo_origen='texto'`, estado `sin_terminar`); si no → `update texto_original` |
| normalización OK | `texto_interpretado`, `titulo` de la IA (`titulo_origen='ia'`), estado `sin_terminar` |
| normalización / propuesta / refinado KO | estado `fallo`, `error` = mensaje de usuario |
| propuesta OK (tras validación) y refinado OK | `texto_interpretado = textoParaPropuesta` (versión editada por el usuario), `propuesta_json`, estado `sin_terminar` |
| `handleConfirmar` al terminar | `aceptado_json` (lo creado de verdad, recogiendo ids de los `create*`), estado `importada` |
| `resetState()` | `importacionId = null` (cerrar no borra nada). El `AlertDialog` de cierre usa el texto "¿Cerrar? Quedará en el historial como Sin terminar" cuando `importacionId` no es null |

Las escrituras del historial van en `try/catch` propio: un fallo al
guardar historial **no** bloquea la importación (se loguea).

### 4. Título en la petición existente

Se añade `"titulo": "string de máximo 60 caracteres que resuma la clase"`
al JSON pedido por `normalizarDescripcion()` y se devuelve en
`NormalizacionResult.titulo?`. Es la primera petición del flujo, así que
cualquier importación en la que la IA haya respondido al menos una vez
tiene título de IA. Alternativa descartada: reutilizar `resumen` de
`generarPropuestaDeClase()` — llega una fase más tarde y las
importaciones que se quedan en el texto interpretado no lo tendrían. Si
la IA omite el campo, se mantiene el título de respaldo.

### 5. Panel del historial

- Nuevo `src/lib/components/HistorialImportacionesPanel.svelte`.
- Contenedor: `Sheet` (`ui/sheet`) `side="right"` en desktop y
  `side="bottom"` en móvil, con las mismas clases que `MapaModalHost`
  (`top-14! bottom-14!` / `bottom-14! h-[50dvh]!`) y `useMediaQuery`
  `(min-width: 768px)`. En vista Lista también usa sheet (el owner pidió
  el patrón de las fichas en grafo; Lista no tiene nada que dejar a la
  vista, pero un único patrón simplifica). Abrir el historial cierra
  antes el stack de fichas con `modalHost.attemptCloseAll` para no
  apilar dos paneles.
- Lista: `Accordion` de bits-ui (`type="single"` o `"multiple"`, ver
  Open Questions). Se puede añadir el wrapper shadcn-svelte `accordion`
  en `ui/` (son ficheros fuente sobre bits-ui, no dependencia nueva).
- Borrar: `AlertDialog` (`ui/alert-dialog`), patrón controlado
  `open` + `onOpenChange` como en `/mapa`.
- Copiar: `navigator.clipboard.writeText` (contexto seguro: GitHub Pages
  y Codespaces son https). Feedback "Copiado ✓" con timeout ~2 s por
  bloque (estado local del componente). Si `clipboard` falla, mensaje
  "No se pudo copiar".
- Formato legible: helper puro `formatPropuestaLegible()` /
  `formatAceptadoLegible()` en `src/lib/importaciones.ts`:
  `Posiciones nuevas:\n- Nombre (Categoría)`, `Sumisiones nuevas:\n- …`,
  `Técnicas:\n- Nombre: Origen → Destino (Tipo)`.
- Estado con tokens: Importada `bg-success/15 text-success`, Sin
  terminar `bg-muted text-muted-foreground`, Falló
  `bg-destructive/15 text-destructive`. Sin Tailwind crudo.
- Icono `@lucide/svelte/icons/history` en la fila 1 del sub-header,
  junto al selector de disciplina.

### 6. Icono con catálogo vacío

Hoy el sub-header no existe con catálogo vacío. Se mueve **solo** el
icono de historial a un contenedor que se pinta en ambos casos (p. ej.
una fila mínima sobre el aviso "Catálogo vacío."). No se reestructura el
resto del sub-header.

### 7. Reintentar

`ImportarClaseDialog` gana la prop `textoInicial?: string`; al abrirse
con ella hace `textoClase = textoInicial` en el paso `input`. `/mapa`
mantiene `textoReintento` y abre el diálogo tras cerrar el panel.

### 8. Copia de seguridad (incluye arreglo de pérdida de datos)

**Auditoría `sync.ts` vs schema v9** (2026-10-05):

| Tabla | Export (`SELECT *`) | Wipe en import | Insert en import | Problema |
|---|---|---|---|---|
| `companeros` | sí | sí | 7/7 columnas | — |
| `sesiones` | sí | sí | 8/8 | — |
| `rolls` | sí | sí | 12/12 | — |
| `posiciones` | sí | sí | 8/9 | **falta `disciplina`** → vuelve a `'bjj'` |
| `sumisiones_terminales` | sí | sí | 5/6 | **falta `disciplina`** |
| `tecnicas` | sí | sí | 12/13 | **falta `disciplina`** |
| `tecnica_contras` | sí | sí | 3/3 | — |
| `roll_posicion` / `roll_tecnica` | sí | sí | 3/3 | — |
| `grafo_layout` | sí | sí | 4/4 | — |
| `app_settings` | sí | sí | 2/2 | — |
| `tags` (v7) | **no** | **no** | **no** | se pierden; además las del destino sobreviven al import |
| `posicion_tags` (v7) | **no** | **no** | **no** | se pierden; las filas del destino quedan huérfanas (FK OFF durante el import, no hay cascada) |
| `importaciones` (v10, nueva) | — | — | — | se añade |

`schema_meta` no se exporta (correcto: lo gestiona la migración).

Cambios:

- `ExportPayload` gana `tags`, `posicion_tags`, `importaciones`.
  `exportAll` las consulta; `importAll` hace `DELETE` de las tres (hijos
  antes que padres); `insertAll` las inserta y añade `disciplina` a los
  INSERT de `posiciones`, `sumisiones_terminales` y `tecnicas`
  (`p.disciplina ?? 'bjj'` por robustez).
- `CURRENT_SCHEMA_VERSION` (versión del **formato de fichero**, hoy 6 y
  desacoplada de la BD, que va por 9 → 10) pasa a **7**. Se documenta en
  el comentario de cabecera que es versión de formato, no de BD
  (alinearla con la BD obligaría a subirla en cada migración aunque el
  fichero no cambie).
- Compatibilidad: `importAll` acepta 6 y 7. Con 6: `importaciones`,
  `tags` y `posicion_tags` ausentes se tratan como `[]` (los ficheros v6
  no traían etiquetas — se restauran sin ellas, que es lo que el fichero
  contiene). La `disciplina` sí viene en los v6 (el export hace
  `SELECT *`), así que el arreglo del INSERT la recupera también al
  restaurar copias antiguas. Cualquier otra versión se rechaza como hoy.
- `assertExportShape` exige los arrays nuevos solo para v7.
- El resumen de `/ajustes` tras importar/exportar añade etiquetas e
  importaciones al recuento.

### 9. Reactividad

Sin state compartido nuevo: el panel carga la lista al abrirse (`$state`
local del componente). Si hiciera falta compartir (p. ej. contador en el
icono), se crea `ImportacionesState` con `$state` en class fields
(patrón de CLAUDE.md), nunca `$state` a nivel de módulo.

## Risks / Trade-offs

- [Usuarios con copias antiguas ya restauradas perdieron etiquetas o
  disciplina] → el arreglo no recupera lo ya perdido; solo evita perderlo
  en adelante. Restaurar de nuevo una copia v6 sí recupera la disciplina.
- [Aceptar ficheros v6 relaja la validación estricta] → solo se permite
  la diferencia "falta `importaciones`"; cualquier otra versión se
  rechaza como hoy.
- [Escrituras extra en BD en cada fase] → 4–6 `UPDATE` por importación;
  despreciable en SQLite-WASM.
- [Textos largos (dictados de 10 min)] → `TEXT` sin límite; el panel
  muestra los bloques con scroll interno.
- [El diálogo de importación crece aún más] → la lógica de historial va
  al DAO; en el diálogo solo hay llamadas puntuales.

## Migration Plan

Migración v10 se aplica sola al arrancar (`applyPendingMigrations`).
Antes de pushear: `pnpm check`, `pnpm build`, `pnpm preview` + refresh
(toca BD y `sync.ts`). Rollback: revert del código; la tabla extra no
molesta a versiones anteriores del código (no la leen), pero una BD v10
con código v9 no baja de versión — aceptable (mismo caso que v9).

## Open Questions

- Accordion `single` (una tarjeta abierta a la vez) vs `multiple`.
  Propuesta: `single` (menos scroll en el panel inferior de 50 dvh).
  No cambia specs ni tareas.

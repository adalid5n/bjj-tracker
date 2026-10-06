# Design

## Context

Ver `proposal.md` — Why. Código revisado el 2026-10-06 en la rama
`it7/t3-vista-previa` (T-3 implementado, pendiente del OK del owner):

- **`src/lib/db/schema.ts`**: `MIGRATIONS` hasta v11 (v11 = T-3,
  `sumisiones_terminales` con `UNIQUE (nombre, disciplina)`, reconstruida
  con FK OFF). `disciplina TEXT NOT NULL DEFAULT 'bjj'` en `posiciones`,
  `tecnicas`, `sumisiones_terminales` desde v9, **sin CHECK** (el dominio
  lo pone TS). `posiciones` no tiene UNIQUE de nombre; `tecnicas` tiene
  índice único `(nombre, posicion_origen_id, COALESCE(variante,''))` y el
  CHECK de destino según tipo. `sesiones` y `rolls` no tienen disciplina.
  `sesiones.tipo` ∈ `bjj | grappling | open_mat`.
- **`applyPendingMigrations`** corre en el worker con un handle síncrono
  (`db.exec`); cada migración gestiona su transacción (v11 lo hace).
  `crypto.randomUUID()` existe en el worker (contexto seguro).
- **`src/lib/sync.ts`**: formato de copia v7 (acepta v6 y v7); import =
  wipe + insert con FK OFF dentro de `BEGIN/COMMIT`, auditoría
  `PRAGMA foreign_key_check` al final (solo aviso). Inserta `disciplina`
  del catálogo con fallback `'bjj'`; sesiones y rolls sin disciplina.
- **Usos de `'ambos'`**: tipo `Disciplina` (`types/index.ts`); opción
  "Ambos" en `PosicionWizard`, `SumisionWizard`, `TecnicaWizard`,
  `ImportarClaseDialog`; filtro `=== d || === 'ambos'` en
  `/mapa/+page.svelte` (`posicionesFiltradas`…);
  `disciplinasDeCatalogo('ambos') = ['ambos']` en
  `importacion-borrador.svelte.ts` (T-3) y su uso en la vista previa.
  `settings.disciplinaActiva` ya es solo `bjj | grappling`.
- **Selectores sin filtro de disciplina hoy**: origen/destino del
  `TecnicaWizard`, complementaria del `PosicionWizard`, contras en
  `TecnicaModalContent`, posiciones/técnicas del `RollEditor` (cargan
  `listPosiciones()`/`listTecnicas()` enteros). `RollEditor` crea al vuelo
  con `PosicionWizardDialog` / `TecnicaWizardDialog`.
- **Tipo de sesión**: `SesionEditor` (crear, paso "Tipo"), `SesionForm`
  (editar), etiquetas en `/` y `/rolls`, filtro `tipo_sesion` en
  `rolls.ts` (`listRollsConSesion`).
- **T-3 §8**: las dos disciplinas comparten espacio de coordenadas; un
  nodo "Ambos" se ve en BJJ con coordenadas calculadas en Grappling. Sin
  elementos compartidos el problema desaparece: cada nodo pertenece a un
  solo grafo.

## Goals / Non-Goals

**Goals:** ningún elemento del catálogo con disciplina "Ambos"; separación
de los existentes sin pérdida y con la misma lógica en migración y en
restauración de copias antiguas; disciplina en sesiones y rolls; el
catálogo que ve cada roll y cada conexión nueva no cruza disciplinas.

**Non-Goals:** sincronizar copias; fusionar duplicados; estadísticas por
disciplina; corregir conexiones cruzadas antiguas (se conservan).

## Decisions

### 1. Modelo de tipos

- `DisciplinaCatalogo = 'bjj' | 'grappling'` para `Posicion`,
  `SumisionTerminal`, `Tecnica` y `Roll`.
- `Disciplina = 'bjj' | 'grappling' | 'ambos'` queda para lo que sí puede
  ser mixto: `Sesion.disciplina`, la disciplina de una importación y la
  **opción** de los asistentes de creación ("crear en las dos").
- `TipoSesion = 'clase' | 'open_mat'` (P1, aceptado por el owner).
- Sin CHECK en SQL para `disciplina` (añadirlo exigiría reconstruir cuatro
  tablas; mismo criterio que `categoria`, dominio en TS).

### 2. Separación de "Ambos": módulo puro compartido

Nuevo `src/lib/separar-ambos.ts` **sin dependencias de BD ni runas**:

```ts
separarAmbos(datos: DatosSeparables, opts: { nuevoId: () => string; inferirEntrenos: boolean })
  → { datos: DatosSeparables; resumen: ResumenSeparacion }
```

`DatosSeparables` = filas planas (las mismas que `SELECT *` y que el JSON
de copia) de `posiciones`, `sumisiones_terminales`, `tecnicas`,
`tecnica_contras`, `posicion_tags`, `grafo_layout`, `sesiones`, `rolls`,
`roll_posicion`, `roll_tecnica`. Lo usan la migración v12 (Decisión 3) y
el import de copias v6/v7 (Decisión 4), así ambos caminos producen
exactamente lo mismo. Algoritmo, en orden:

1. **Posiciones.** Para cada posición `P` con `disciplina='ambos'`: la
   copia BJJ **conserva el id** (y todo lo que la referencia sin FK:
   `importaciones.aceptado_json`, enlaces externos) y pasa a `'bjj'`; la
   copia Grappling recibe `nuevoId()` y los mismos campos (incl.
   `created_at`/`updated_at`). Se construye
   `copia[P] = { bjj: idBjj, grappling: idGrap }`; para no-Ambos,
   `copia[P] = { [P.disciplina]: P.id }`.
2. **Sumisiones.** Igual. Si la copia choca con `UNIQUE (nombre,
   disciplina)` (solo posible con datos creados con T-3, donde ya cabía
   "Kimura" Ambos + "Kimura" BJJ), la copia se renombra a
   `"<nombre> (Ambos)"` y se anota en `resumen.renombradas`. Posiciones:
   sin UNIQUE en BD → pueden quedar dos "Mount" de BJJ; se aceptan (panel
   de alertas, it.8) y se anotan en `resumen.duplicadas`.
3. **Completar los extremos de las técnicas Ambos** (P2 del owner:
   "Ambos" existe completo en las dos disciplinas). Para cada técnica
   Ambos y cada extremo `e` (origen o destino) sin copia en una
   disciplina `D`: si en `D` hay un elemento del mismo tipo con el mismo
   nombre normalizado (`trim` + minúsculas; si hay varios, el más
   antiguo), se usa como su contraparte; si no, se crea una copia de `e`
   en `D` (`nuevoId()`, mismos campos, mismas etiquetas, misma fila de
   `grafo_layout`). Se anota en `resumen.creadasParaCompletar`. Buscar
   por nombre antes de crear evita choques con `UNIQUE (nombre,
   disciplina)` de sumisiones y duplicados de posiciones. Mismo criterio
   que el asistente de técnica (Decisión 5).
4. **Técnicas.** `copiaEn(e, D)` = id de la copia o contraparte de `e` en
   `D` (pasos 1–3), o `null`.
   - Técnica de una disciplina `D`: cada extremo Ambos se remapea a
     `copiaEn(extremo, D)`; un extremo de la otra disciplina (conexión
     cruzada antigua) se deja tal cual.
   - Técnica Ambos `T` con origen `O` y destino `X`: tras el paso 3
     siempre hay copia de `O` y `X` en las dos disciplinas → **siempre dos
     técnicas**: la de BJJ conserva `T.id` y la de Grappling recibe
     `nuevoId()`, cada una entre los extremos de su disciplina.
   - **Índice único `(nombre, origen, variante)`**: con orígenes copiados
     no puede violarse (antes era global y cada copia nueva tiene un
     origen nuevo). Sí puede chocar cuando el origen es una contraparte
     encontrada por nombre (paso 3) que ya tiene una técnica igual: en
     ese caso no se crea la copia y `copiaEn(T, D)` apunta a la técnica
     existente (contras y rolls se enlazan a ella); se anota en
     `resumen.fusionadas`. La copia del otro lado conserva los detalles.
5. **Contras.** Para cada `(T, C)`: un vínculo `(T_D, C_D)` por cada `D`
   en que existan las dos copias. Si ninguna coincide (contra cruzada
   antigua), se conserva el vínculo original. `created_at` se copia.
6. **Complementarias.** Para cada par mutuo `{P, Q}` (procesado una vez):
   vincular `P_D ↔ Q_D` en cada `D` en que existan las dos copias; si
   ninguna coincide, se conserva el vínculo original. Como cada posición
   tenía una sola complementaria, cada copia acaba con como mucho una:
   el vínculo sigue siendo mutuo y único.
7. **Etiquetas** (`posicion_tags`): cada fila de una posición Ambos se
   duplica para la copia Grappling. Las etiquetas no tienen disciplina.
8. **Organización del grafo** (`grafo_layout`): cada fila de un elemento
   Ambos se duplica para la copia Grappling con las mismas `x, y` y
   `kind`. Cada copia aparece donde estaba, cada una en su grafo.
9. **Rolls** (solo si `inferirEntrenos`): disciplina = la de los
   elementos enlazados de una sola disciplina (estado **anterior** a la
   separación) si todos son Grappling → `grappling`; si hay alguno de BJJ
   → `bjj`; si no hay ninguno (sin enlaces o solo Ambos) → la del tipo
   antiguo de su sesión (`bjj`/`grappling`) o `bjj` si era Open mat
   (P1). Después se remapean sus enlaces: elemento Ambos →
   `copiaEn(e, rollD)` (siempre existe tras los pasos 1–4). Deduplicado
   por PK `(roll_id, *_id, resultado)`.
10. **Sesiones** (solo si `inferirEntrenos`): la de sus rolls si todos
   coinciden; `ambos` si se mezclan; sin rolls → tipo antiguo (`bjj` /
   `grappling`) o `bjj` si era Open mat (P1). Además `tipo`:
   `bjj`/`grappling` → `clase`; `open_mat` se queda.
11. **Intactos:** `app_settings`, `importaciones`, `companeros`, `tags`,
    resto de columnas.

Propiedades: **idempotente** (sin Ambos no crea nada; con
`inferirEntrenos=false` no toca sesiones ni rolls); **conserva filas**
(`resumen` cuenta entradas/salidas por tabla para las comprobaciones).

### 3. Migración v12 (al final de `MIGRATIONS`; v1–v11 intactas)

`migrate11To12(db)`, mismo patrón que v11:

1. `PRAGMA foreign_keys = OFF` (fuera de transacción; no se puede cambiar
   dentro). `BEGIN`.
2. `PRAGMA foreign_key_check` → guardar las violaciones **previas**
   (huérfanos heredados de imports antiguos; no deben bloquear).
3. `ALTER TABLE sesiones ADD COLUMN disciplina TEXT NOT NULL DEFAULT
   'bjj'` y lo mismo en `rolls` (cada uno protegido con `hasColumn`).
4. Leer con `SELECT *` las diez tablas de `DatosSeparables`.
5. `separarAmbos(datos, { nuevoId: () => crypto.randomUUID(),
   inferirEntrenos: true })`.
6. **Reescribir** `posiciones`, `sumisiones_terminales`, `tecnicas`,
   `tecnica_contras`, `posicion_tags`, `grafo_layout`, `roll_posicion`,
   `roll_tecnica`: `DELETE` + `INSERT` de las filas resultantes, con la
   lista de columnas tomada de `PRAGMA table_info` (no a mano, para no
   perder columnas). Con FK OFF los `DELETE` no disparan cascadas.
   `UPDATE` de `sesiones` (disciplina, tipo) y `rolls` (disciplina) por id.
   *Alternativa descartada:* aplicar solo diferencias (insertar copias +
   remapear con `UPDATE`): menos escrituras, pero un segundo camino de
   código distinto del de la copia de seguridad. El volumen es pequeño
   (cientos de filas).
7. Comprobaciones antes de `COMMIT` (si alguna falla → `throw`):
   - recuentos de salida = entrada + copias del `resumen`, tabla a tabla;
   - `SELECT COUNT(*) … WHERE disciplina = 'ambos'` = 0 en las tres tablas
     del catálogo y en `rolls`;
   - `PRAGMA foreign_key_check` **después** sin violaciones nuevas
     respecto a las previas (paso 2).
8. `UPDATE schema_meta SET value = '12'`; `COMMIT`. `resumen` (renombradas,
   duplicadas, técnicas cruzadas) a `console.info`.
9. `catch` → `ROLLBACK` y relanzar; `finally` → `PRAGMA foreign_keys = ON`.

**Fallo:** el `ROLLBACK` deja la BD exactamente en v11 (el DDL de SQLite
es transaccional, incluidos los `ALTER`). `init()` falla y la app muestra
el error de arranque; los datos siguen intactos para una versión
corregida. Por eso la tarea de despliegue pide **exportar una copia antes
de actualizar** en la tablet.
**Idempotencia:** la puerta de versión evita repetirla; la transacción
impide estados a medias; `hasColumn` protege los `ALTER`.

### 4. Copia de seguridad v8

- `CURRENT_SCHEMA_VERSION = 8`; `PREVIOUS_SCHEMA_VERSION` pasa a
  `ACCEPTED_VERSIONS = [6, 7, 8]`; el mensaje de versión incompatible
  lista las aceptadas.
- Export: igual (`SELECT *` ya incluye `sesiones.disciplina` y
  `rolls.disciplina`).
- Import: `normalizarPayload` (v6 → tablas vacías, como hoy) →
  `separarAmbos(payload, { nuevoId: crypto.randomUUID, inferirEntrenos:
  version < 8 })` → `insertAll` (que añade `disciplina` a los INSERT de
  sesiones y rolls). En v8 se llama igualmente con
  `inferirEntrenos=false`: un fichero v8 no debería traer Ambos, pero si
  lo trae (editado a mano) se separa en vez de romper el modelo.
- Restaurar un v7 da el mismo resultado que haber migrado esa BD (mismo
  módulo); los ids nuevos de las copias Grappling difieren entre
  ejecuciones, lo que es irrelevante.

### 5. Asistentes del catálogo

- **Posición / Sumisión, crear:** chips BJJ / Grappling / Ambos (`Chips`
  con `required`). Con Ambos se crean dos elementos dentro de una
  transacción (`SAVEPOINT`, porque `createPosicion` y la sincronización
  de complementaria ya usan `BEGIN` → no se pueden anidar `BEGIN`).
  Primero la copia de la disciplina activa (cuya ficha se abre después),
  luego la otra. Mismas etiquetas en las dos.
- **Nombre repetido** (posición y sumisión): por disciplina; con Ambos,
  en cualquiera de las dos, nombrando dónde ("Ya existe en Grappling").
- **Complementaria:** el selector lista posiciones de la misma
  disciplina. Con Ambos, el selector lista las de la disciplina activa;
  la otra copia se vincula a la posición libre del mismo nombre en la
  otra disciplina si existe, o queda sin complementaria. "Crear nueva
  complementaria" hereda Ambos y vincula cada copia con la suya.
- **Técnica:** la disciplina es la del origen. El selector de disciplina
  muestra esa disciplina y "Ambos" (la otra no se ofrece). Destinos
  filtrados a esa disciplina; crear destino al vuelo hereda la disciplina
  (o Ambos). Con Ambos, la copia de la otra disciplina usa la
  posición/sumisión del mismo nombre normalizado (`trim` + minúsculas) en
  esa disciplina (si hay varias, la más antigua); si falta, se crea como
  copia (nombre, categoría, rol, etiquetas, notas) y se avisa en el
  mensaje de guardado (P2). Duplicado exacto (nombre, origen,
  variante) comprobado en las dos copias.
- **Contra nueva o existente:** selector y origen limitados a la
  disciplina de la técnica contrarrestada.
- **Editar (P3):** sin selector de disciplina; el formulario la muestra
  como dato de solo lectura y `update*` no la cambia (se guarda la que
  ya tenía). "Duplicar en la otra disciplina" queda para el futuro.

### 6. Mapa

`posicionesFiltradas` / `sumisionesFiltradas` / `tecnicasFiltradas`
filtran por `=== disciplinaVista` (fuera `'ambos'`). Nada más cambia: la
organización ya se guarda por id, y sin nodos compartidos cada grafo es
independiente (resuelve T-3 §8, punto 2). Las fichas siguen sin filtrar
(conexiones cruzadas antiguas visibles).

### 7. Sesiones y rolls

- `sesiones.ts`: `disciplina` en INSERT/UPDATE. `SesionEditor` (crear):
  el paso "Tipo" pasa a "Tipo y disciplina": Tipo (Clase / Open mat) +
  Disciplina (BJJ / Grappling / Ambos, por defecto la activa), ambos
  `Chips` obligatorios. `SesionForm` (editar): los mismos dos campos.
  Etiqueta "Clase · BJJ" en el inicio, en la página de la sesión y en
  `/rolls`; filtro "Tipo sesión" de `/rolls` con Clase / Open mat.
- `rolls.ts`: `disciplina` en `createRoll`/`updateRoll` y en `NewRoll`.
- `RollEditor`: prop nueva `sesionDisciplina`. Valor inicial:
  `roll?.disciplina ?? (sesionDisciplina === 'ambos' ?
  settings.disciplinaActiva : sesionDisciplina)`. Chips BJJ / Grappling
  en el paso 1 (que pasa a "Compañero y disciplina") y como campo en el
  formulario de edición.
  - Pickers: `posicionesCatalog` / `tecnicasCatalog` filtrados por la
    disciplina del roll **más** los ya elegidos de otra disciplina (rolls
    antiguos), que se pintan con una marca "· Grappling" y se pueden
    quitar; guardar sin tocarlos los conserva.
  - Cambio de disciplina con selección no vacía → `AlertDialog`
    ("Se quitarán las posiciones y técnicas elegidas") → confirmar vacía
    las cuatro listas; cancelar no cambia nada. Sin selección, cambia
    directo.
  - Sub-asistentes de creación: reciben `disciplinasPermitidas =
    [rollD, 'ambos']` y `disciplinaInicial = rollD`; `onSaved` devuelve
    las entidades creadas y el roll enlaza la de `rollD`.
- Página de sesión: pasa `sesion.disciplina` al `RollEditor`.

### 8. Importación (sobre T-3)

- `disciplinasDeCatalogo` se sustituye por `ladosDeImportacion(d)`:
  `'ambos'` → `['bjj', 'grappling']`; otra → `[d]` (desaparece "Ambos →
  solo Ambos").
- **Catálogo por lado:** `catalogoPorLado[D]` = catálogo filtrado a `D`.
  A la IA (generar, validar, refinar) se envía la **unión** deduplicada
  por nombre normalizado; `+ Añadir` ofrece esa misma unión.
- **Borrador:** cada posición/sumisión propuesta guarda `ladosNuevos`
  (lados donde su nombre no existe). Con `ladosNuevos = []` no es nueva
  (no aparece en la lista, como hoy). La tarjeta muestra "Nueva en BJJ y
  Grappling" o "Nueva solo en <D> · ya existe en <otra>". `puedeCrearse`
  de una técnica = origen y destino existen en la unión o entre los
  nuevos marcados.
- **`confirmar()`**: un bucle por lado con su mapa nombre → id; crea
  posiciones/sumisiones cuyo `ladosNuevos` incluye el lado y técnicas con
  los ids de ese lado. "Técnica idéntica" y "no se creó" se evalúan por
  lado; el motivo indica el lado. Exclusiones por error (T-3 §2b) se
  guardan con su lado. El resumen final nombra también lo que se creó
  solo en un lado para completar la otra disciplina (P2: "Mount creada en
  Grappling").
- **Vista previa:** `buildPreviewElements(catalogoDelLado, borrador,
  lado)`: fantasma solo para lo nuevo **en ese lado**; ids fantasma con
  el lado (`new-pos:<lado>:<nombre>`) para que las posiciones calculadas
  en el paso de BJJ y en el de Grappling convivan en `positionsCache`.
  `ghostToReal` se rellena por lado, así cada copia aparece donde se vio
  en su paso (antes solo valían las del último paso).
- Historial: `aceptado_json` lista lo creado de los dos lados (pueden
  repetirse nombres); sin cambio de formato.

### 9. Secuencia con T-3 (deltas no archivados)

T-3 (`vista-previa-importacion`) aún no está archivado. Los bloques
MODIFIED de `importar-clase` ("Disciplina de la importación", "Generación
de la propuesta", "Reutilización…", "Añadir elementos a mano…",
"Confirmar e insertar…", "Aceptar la vista previa"), de `mapa` ("Vista
previa de importación en el grafo", "Disciplina y filtros durante la
vista previa") y de `catalogo-tecnico` ("Sumisión terminal") copian la
**versión de T-3**, no la de `openspec/specs/`. Por eso `openspec
validate` avisa (INFO) de que hoy el archivado rechazaría dos de ellos:
es esperado. Orden obligatorio: archivar T-3 → aplicar y archivar T-4.
Si T-3 cambia antes de archivarse, revisar estos bloques.

## Risks / Trade-offs

- [Migración sobre la BD real de la tablet, irreversible tras el
  `COMMIT`] → transacción única con comprobaciones (recuentos, cero
  Ambos, FK sin violaciones nuevas) y `ROLLBACK` ante cualquier fallo;
  exportar copia antes de actualizar; probar antes con el JSON de prod
  importado en el Codespace (BD propia).
- [Reescritura completa de ocho tablas] → columnas de `PRAGMA
  table_info`, recuentos por tabla; un solo módulo para migración y
  copias.
- [Duplicados visibles tras separar] (p. ej. "Mount" Ambos + "Mount" BJJ →
  dos "Mount" de BJJ; sumisión renombrada "Kimura (Ambos)") → raro (solo
  con datos de prueba de T-3 o duplicados previos de posiciones);
  aceptado, se registra en consola; lo avisará el panel de alertas
  (it.8).
- [El catálogo crece] donde había Ambos: deseado, pero editar una copia ya
  no corrige la otra; se explica en el CHANGELOG.
- [Conexiones cruzadas antiguas] (técnica de Grappling desde posición de
  BJJ) se conservan y pueden ser invisibles en el grafo (como hoy) →
  backlog: listarlas en el panel de alertas.
- [Transacciones anidadas] al crear dos copias con funciones que ya usan
  `BEGIN` → `SAVEPOINT` en el envoltorio de "Ambos".
- [Tipo de sesión (P1)] toca inicio, `/rolls` y su filtro "Tipo sesión"
  → tareas propias en el grupo 4.
- [Completar extremos (P2) crea elementos que el usuario no pidió
  explícitamente] → se registran en `resumen` (consola) en la migración y
  se nombran en el aviso en asistentes e importación; pueden aparecer
  posiciones nuevas en el grafo de la otra disciplina, en el sitio de su
  original.
- [Cambio grande en `RollEditor` (1282 líneas)] → grupo de tareas propio,
  después de la migración y los DAO.
- [Toca BD]: `pnpm check`, `pnpm build`, `pnpm preview` + refresh antes de
  cada push.

## Migration Plan

1. Antes de desplegar: exportar copia en la tablet (prod).
2. Migración v12 automática al abrir la app; copia de seguridad pasa a v8
   (acepta v6, v7, v8).
3. Prueba previa en el Codespace: importar el JSON real (v7) → comprobar
   la conversión del import; y con una BD v11 sembrada con Ambos
   (crearlos en `pnpm dev` antes de aplicar v12) → comprobar la migración
   con la lista manual de `tasks.md` §1.
4. Rollback: si la migración falla no hay nada que deshacer (BD en v11).
   Si ya se aplicó y hay un problema de datos: restaurar la copia v7
   exportada en el paso 1 (se convertirá con la versión corregida).

## Open Questions

Ninguna. Respuestas del owner (2026-10-06):

- **P1 — Tipo de sesión:** aceptado. Tipo = Clase / Open mat; la
  disciplina (BJJ / Grappling / Ambos) va aparte; las sesiones antiguas
  BJJ/Grappling pasan a Clase con esa disciplina, y el tipo antiguo se usa
  para deducir la disciplina (Decisión 2, pasos 9–10).
- **P2 — "Ambos" existe completo en las dos disciplinas:** lo que falte
  (origen o destino de una técnica, sumisión) se crea en la otra, tanto al
  crear (asistentes e importación, avisando de lo creado) como al separar
  los datos existentes y al restaurar copias antiguas (Decisión 2, paso
  3). Sustituye la regla "dejarla solo donde está completa".
- **P3 — Disciplina fija:** no se puede cambiar al editar, ni siquiera en
  elementos sin conexiones; se muestra como solo lectura. "Duplicar en la
  otra disciplina" es funcionalidad futura (backlog).

Decisiones del agente aceptadas por el orquestador: la técnica toma la
disciplina de su origen y los selectores de destino, complementaria y
contras se limitan a la misma disciplina; sumisión Ambos que choca al
separar → "(Ambos)" en el nombre; complementaria de una posición creada
con Ambos (Decisión 5); conexiones cruzadas antiguas de técnicas de una
sola disciplina se conservan sin tocar.

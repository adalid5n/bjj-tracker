# Tasks

> Aplicar **después de archivar** `vista-previa-importacion` (T-3): este
> change modifica requisitos que T-3 añade y numera su migración tras la
> v11. P1–P3 resueltas por el owner (ver `design.md` → Open Questions).

## 1. Separación de "Ambos" y migración v12 (sin cambio de UI)

- [x] 1.1 Tipos: `DisciplinaCatalogo` (`bjj | grappling`) en `Posicion`, `SumisionTerminal`, `Tecnica`, `Roll`; `Sesion.disciplina: Disciplina`; `TipoSesion = 'clase' | 'open_mat'`; verificar que `pnpm check` lista todos los usos a adaptar (se corrigen en los grupos siguientes)
- [x] 1.2 Crear `src/lib/separar-ambos.ts` (puro, sin BD ni runas) con `separarAmbos(datos, { nuevoId, inferirEntrenos })` según design §2 (posiciones, sumisiones con renombrado "(Ambos)", completar extremos de técnicas Ambos buscando por nombre o creando la copia, técnicas siempre en las dos disciplinas con fusión si choca el índice único, contras, complementarias, etiquetas, organización del grafo, rolls, sesiones) y `resumen`; verificar con `pnpm check`
- [x] 1.3 Migración `migrate11To12` al final de `MIGRATIONS` (v1–v11 sin tocar) según design §3: FK OFF, `BEGIN`, violaciones previas, `ALTER` de `sesiones`/`rolls` con `hasColumn`, lectura, `separarAmbos`, reescritura con columnas de `PRAGMA table_info`, comprobaciones (recuentos, cero Ambos, sin violaciones FK nuevas), versión 12, `COMMIT`/`ROLLBACK`, FK ON; verificar con `pnpm check` y `pnpm build`
- [ ] 1.4 Comprobación manual de la migración en `pnpm dev` (Codespace, BD propia). Preparar en una BD v11 (rama de T-3): una posición Ambos con etiqueta, complementaria Ambos y sitio guardado en el grafo; una sumisión Ambos; un sweep Ambos entre dos posiciones Ambos; una técnica Ambos desde una posición solo BJJ; una técnica de Grappling hacia una posición Ambos; una contra Ambos de una técnica Ambos; una sesión de tipo Grappling con un roll enlazado a la técnica de Grappling y a la posición Ambos; una sesión sin rolls de tipo Open mat; anotar recuentos por tabla (consola: `SELECT COUNT(*)`). Exportar copia. Cambiar a esta rama y recargar. Verificar uno a uno:
  - [ ] ningún elemento del catálogo ni roll con disciplina Ambos; versión 12
  - [ ] cada Ambos → dos elementos con los mismos datos; la copia BJJ conserva el id
  - [ ] el sweep Ambos → uno de BJJ entre las de BJJ y otro de Grappling entre las de Grappling
  - [ ] la técnica Ambos desde la posición solo BJJ → existe en BJJ y en Grappling; en Grappling se creó una copia de esa posición (mismos datos, etiquetas y sitio), o se usó la de Grappling del mismo nombre si ya existía
  - [ ] la técnica de Grappling llega ahora a la copia Grappling de la posición
  - [ ] contras, complementarias (mutuas) y etiquetas presentes en cada copia
  - [ ] en el mapa, cada copia en el mismo sitio que tenía, cada una en su disciplina; mover una no mueve la otra
  - [ ] el roll es Grappling y enlaza con la copia Grappling; la sesión de Grappling es Grappling; la de Open mat sin rolls es BJJ; las sesiones de tipo BJJ/Grappling pasan a tipo Clase
  - [ ] recuentos = anteriores + copias; `PRAGMA foreign_key_check` sin violaciones nuevas
  - [ ] recargar otra vez: nada cambia (no se repite)
  - [ ] forzar un fallo temporal (cambio local sin commitear, p. ej. `throw` tras la reescritura): la app muestra error de arranque y, al quitarlo, la BD sigue en v11 con los datos intactos

## 2. Copia de seguridad v8

- [x] 2.1 `sync.ts`: `CURRENT_SCHEMA_VERSION = 8`, `ACCEPTED_VERSIONS = [6, 7, 8]`, mensaje de versión incompatible; `separarAmbos` tras `normalizarPayload` (`inferirEntrenos` si versión < 8); `disciplina` en los INSERT de sesiones y rolls; verificar con `pnpm check`
- [ ] 2.2 Verificar en `pnpm dev`: importar la copia v7 exportada en 1.4 sobre una BD vacía da el mismo catálogo, sesiones y rolls que la migración (mismos nombres, disciplinas, enlaces y sitios); exportar → importar un v8 deja todo igual; un v6 sigue importando; un fichero con `schema_version` 9 se rechaza sin tocar datos

## 3. Catálogo: crear en las dos disciplinas y conexiones

- [x] 3.1 DAO: envoltorio de creación doble con `SAVEPOINT` (posición con etiquetas, sumisión, técnica con extremos que falten) y búsqueda de contraparte por nombre en la otra disciplina; `update*` sin cambiar la disciplina; verificar con `pnpm check`
- [x] 3.2 `PosicionWizard` y `SumisionWizard`: chips BJJ / Grappling / Ambos al crear; nombre repetido por disciplina (con Ambos, en las dos, nombrando dónde); Ambos crea dos y abre la ficha de la disciplina activa; complementaria limitada a la misma disciplina y regla de Ambos (design §5); verificar en `pnpm dev` crear "Dogfight" Ambos con etiqueta y complementaria, y que renombrar una copia no cambia la otra
- [x] 3.3 `TecnicaWizard`: disciplina = la del origen (chips: esa + Ambos), destinos de esa disciplina, crear destino al vuelo con esa disciplina; Ambos con contrapartes por nombre y creación de las que falten en la otra disciplina con aviso de lo creado; duplicado exacto comprobado en las dos copias; verificar los tres escenarios de "Conexiones dentro de la misma disciplina"
- [x] 3.4 Contras (`TecnicaModalContent` y creación de contra): solo técnicas/orígenes de la misma disciplina; verificar con una técnica de Grappling
- [x] 3.5 Editar (los tres asistentes en modo formulario): sin selector de disciplina, se muestra como dato de solo lectura y se guarda la que tenía; verificar editando una sumisión aislada y una posición con técnicas (en ninguna se puede cambiar)
- [x] 3.6 `/mapa`: filtro por `=== disciplinaVista` (sin Ambos) en grafo y listas; verificar que cambiar de disciplina no muestra elementos de la otra y que las fichas siguen mostrando técnicas cruzadas antiguas

## 4. Sesiones y rolls

- [x] 4.1 `sesiones.ts` y `rolls.ts`: `disciplina` en crear/editar (tipo Clase / Open mat y filtro de tipo); verificar con `pnpm check`
- [x] 4.2 `SesionEditor` y `SesionForm`: Tipo Clase / Open mat + Disciplina BJJ / Grappling / Ambos (por defecto la activa, selector obligatorio); etiqueta "Clase · BJJ" en inicio, página de sesión y `/rolls`; filtro "Tipo sesión" de `/rolls`; verificar crear y editar sesiones y tocar la opción ya elegida
- [x] 4.3 `RollEditor`: prop `sesionDisciplina`, valor inicial (sesión, o activa si la sesión es Ambos), chips BJJ / Grappling en el paso 1 y en el formulario; pickers filtrados más elegidos antiguos marcados; verificar en una sesión de Grappling, en una Ambos con BJJ activo y editando un roll migrado con elementos de otra disciplina (se ven marcados y se conservan al guardar)
- [x] 4.4 Cambio de disciplina con selección → `AlertDialog` (confirmar vacía; cancelar no cambia); sin selección cambia directo; verificar los tres escenarios
- [x] 4.5 Sub-asistentes desde el roll: disciplina del roll o Ambos; el roll enlaza la copia de su disciplina; verificar creando "Dogfight" Ambos desde un roll de BJJ

## 5. Importación de "Ambos" como copias

- [x] 5.1 Borrador: `ladosDeImportacion`, catálogo por lado, unión deduplicada para la IA y `+ Añadir`, `ladosNuevos` en posiciones/sumisiones; verificar en la pestaña Red de `pnpm dev` que una importación Ambos envía BJJ ∪ Grappling sin repetidos y una de Grappling solo Grappling
- [x] 5.2 Revisión: indicador "Nueva en BJJ y Grappling" / "Nueva solo en <D> · ya existe en <otra>"; verificar con "Kimura" existente solo en BJJ
- [x] 5.3 `confirmar()` por lado (mapas, técnicas idénticas y "no se creó" por lado, exclusiones por error con lado, aviso de lo creado solo en un lado); verificar los escenarios "Inserción de Ambos", "Lo que falta en un lado se crea y se avisa" y "Técnica idéntica en un solo lado"
- [x] 5.4 Vista previa por lado: fantasma solo de lo nuevo en el lado, ids fantasma con el lado, `ghostToReal` de los dos pasos; verificar que en el paso BJJ "Kimura" (existente en BJJ) no se resalta y en Grappling sí, y que tras aceptar cada copia aparece donde se vio en su paso

## 5b. Complementarias "Ambos" en las dos disciplinas (decisión del owner 2026-10-16)

- [x] 5b.1 Specs: "Posiciones complementarias" (catalogo-tecnico) con la regla, vinculación por nombre, creación con aviso y caso "ya vinculada con otra"; escenario en copia-seguridad; design §2 paso 6b y §5; `openspec validate --strict`
- [x] 5b.2 `separar-ambos.ts`: paso 6b (en los dos sentidos) con `complementariasVinculadas` y `complementariasSinVincular` en el resumen; log en `sync.ts`/v12; verificar con `pnpm check`
- [x] 5b.3 `catalogo-lados.ts` + `PosicionWizard`: crear la complementaria que falte en la otra disciplina al crear una posición Ambos, aviso de lo creado y de lo que quedó sin vincular; verificar con `pnpm check` y `pnpm build`
- [x] 5b.4 Verificación manual del owner: importar `bjj-tracker-export-20261016.json` en el 4173 (BD vacía) y comprobar "Dog fight under" en Grappling vinculada con la "Dog fight over" de Grappling; crear desde el asistente los tres escenarios de creación

## 5c. Complementaria en "Ambos" desde la otra disciplina (bug del owner 2026-10-16)

- [x] 5c.1 Spec "Posiciones complementarias": selector en "Ambos" con las que solo existen en la otra disciplina (una por nombre, con indicación), crear al vuelo con nombre existente en una disciplina, nombre en las dos; `openspec validate --strict`
- [x] 5c.2 `catalogo-lados.ts`: `crearPosicionEnLados` vincula directamente la complementaria en su disciplina (sea la preferida o la otra) y completa la otra por nombre
- [x] 5c.3 `PosicionWizard`: selector en "Ambos" con las de la otra disciplina y su indicación; al cambiar de disciplina se descarta una elección inválida; "Crear nueva" en "Ambos" (complementaria, técnica y roll, mapa y diálogo) usa la existente o crea solo en la disciplina que falta, con aviso; mensajes de nombre repetido distinguibles; mismo criterio en `SumisionWizard` ("+ Crear nueva sumisión" de una técnica "Ambos")
- [x] 5c.4 Aviso de lo creado acumulable (`avisoCatalogo.append`) para no perder el aviso del sub-asistente al guardar el asistente padre; `pnpm check` y `pnpm build`
- [x] 5c.5 Validación manual del owner en el 4173: P3 "Ambos" con complementaria P2 que solo existe en Grappling, por el selector y por "Crear nueva"

## 5d. Avisos de lo creado más claros (feedback del owner 2026-10-16)

- [x] 5d.1 Spec "Aviso de lo hecho en la otra disciplina" (catalogo-tecnico): una línea corta por evento, informativa o de atención, detalle al tocar el icono; escenarios con la redacción nueva; `openspec validate --strict`
- [x] 5d.2 Token semántico `--info` / `--info-foreground` (claro y oscuro) en `layout.css` y componente `ui/popover` (shadcn-svelte sobre bits-ui)
- [x] 5d.3 `aviso-catalogo.svelte.ts` con líneas estructuradas (texto, detalle, tono); `catalogo-lados.ts` registra también las complementarias enlazadas con una existente y para qué se creó cada elemento; `AvisoCatalogo.svelte` con lista, color por tono y Popover accesible; asistentes de posición, sumisión y técnica; `pnpm check` y `pnpm build`
- [x] 5d.4 Validación manual del owner en el 4173: mapa (posición "Ambos" con complementaria creada / enlazada / sin complementaria), asistente de técnica ("Ambos" sin contraparte) y editor de rolls (crear posición "Ambos")

## 6. Verificación y cierre

- [x] 6.1 `grep -rn "'ambos'" src` solo en sesiones, importación y opción de creación de asistentes; `grep -rE "(bg|text|border)-(red|blue|green|yellow|amber|gray)-[0-9]" src` sin resultados nuevos
- [ ] 6.2 `pnpm check`, `pnpm test:unit` (suite existente), `pnpm build` y `pnpm preview` con refresh; sin errores en consola
- [ ] 6.3 Ensayo con datos reales: importar en el Codespace el JSON de prod (v7) y revisar mapa BJJ/Grappling, sesiones y rolls con el owner
- [ ] 6.4 Validación manual del owner en `pnpm preview` (tablet y escritorio) contra los escenarios de los cinco specs del change
- [ ] 6.5 Antes del despliegue: recordatorio al owner de exportar copia en la tablet; CHANGELOG explica que las copias son independientes
- [ ] 6.6 Archivar el change (`openspec archive ambos-como-copias`) después de T-3; verificar que `openspec/specs/sesiones-y-rolls` existe y que `catalogo-tecnico`, `importar-clase`, `mapa` y `copia-seguridad` contienen los requisitos nuevos

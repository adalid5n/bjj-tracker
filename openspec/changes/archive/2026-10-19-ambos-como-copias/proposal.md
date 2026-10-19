# Proposal

## Why

Hoy un elemento "Ambos" (posición, sumisión o técnica) es **un solo
elemento compartido** por BJJ y Grappling: comparte nombre, notas y sitio
en el grafo. Eso choca con la decisión de la it.7 de que las disciplinas
no se mezclan: al organizar el grafo de BJJ se descoloca el de Grappling
(T-3, diseño §8), una técnica de Grappling puede colgar de una posición de
BJJ, y los entrenos (sesiones y rolls) no dicen de qué disciplina son, así
que al anotar un roll se ofrece el catálogo entero mezclado.

Convertir "Ambos" en un **atajo de creación** (crea dos elementos
independientes, uno por disciplina) y dar disciplina a sesiones y rolls
cierra el aislamiento entre disciplinas de punta a punta.

## What Changes

**Para el usuario:**

- **"Ambos" crea dos copias.** En los asistentes de posición, sumisión y
  técnica y en la importación de clase, elegir "Ambos" crea **dos
  elementos independientes**, uno de BJJ y otro de Grappling, con los
  mismos datos. Después no tienen relación: editar el nombre, las notas o
  la organización del grafo de uno no cambia el otro. Ningún elemento del
  catálogo queda ya como "Ambos".
- **Lo que ya era "Ambos" se separa al actualizar.** Cada posición,
  sumisión o técnica "Ambos" pasa a ser una de BJJ y otra de Grappling,
  sin perder nada: técnicas, contras, complementarias, etiquetas, sitio en
  el grafo y rolls que las usaban quedan enlazados a la copia de su
  disciplina.
- **Cada disciplina tiene su propio grafo.** Al no haber elementos
  compartidos, mover un nodo en BJJ no mueve nada en Grappling (resuelve
  el problema de coordenadas compartidas de T-3).
- **Las conexiones no cruzan disciplinas.** Origen y destino de una
  técnica, complementaria de una posición y contras de una técnica solo
  ofrecen elementos de la misma disciplina. La técnica toma la disciplina
  de su posición de origen.
- **"Ambos" significa completo en las dos.** Si a una técnica "Ambos" le
  falta su origen o destino en una disciplina, se crea allí también (en
  los asistentes, en la importación y al separar los datos existentes) y
  se avisa de lo creado.
- **La disciplina se fija al crear.** Al editar se muestra como dato de
  solo lectura; no se puede cambiar.
- **Sesiones con disciplina:** BJJ, Grappling o Ambos (clase mixta).
- **Rolls con disciplina:** BJJ o Grappling (nunca Ambos). Por defecto, la
  de su sesión; si la sesión es "Ambos", la disciplina activa. Se puede
  cambiar al crear o editar el roll. Los selectores de posiciones y
  técnicas del roll solo ofrecen elementos de su disciplina; cambiar la
  disciplina con elementos ya elegidos pide confirmación y los quita.
- **Sesiones y rolls existentes reciben disciplina al actualizar**,
  deducida de lo que se registró en ellos.
- **Tipo de sesión:** "Tipo" pasa a ser Clase u Open mat, porque BJJ /
  Grappling pasan a ser la disciplina; las sesiones antiguas de tipo BJJ o
  Grappling pasan a Clase con esa disciplina.
- **Importación de "Ambos":** crea las dos copias; cada lado busca lo que
  ya existe solo en su disciplina (sustituye la regla de T-3 "Ambos → solo
  Ambos"). La revisión indica dónde se creará cada elemento nuevo y las
  dos vistas previas muestran lo nuevo de cada lado.
- **Copia de seguridad:** nuevo formato (v8) con la disciplina de
  sesiones y rolls. Los ficheros v6 y v7 se siguen aceptando y se
  convierten con las mismas reglas que la actualización.

**Técnico:** migración de BD nueva (v12) al final de `MIGRATIONS`;
formato de copia v8; lógica de separación compartida entre migración y
restauración de copias antiguas.

## Decisiones (owner, cerradas)

1. "Ambos" en el catálogo = atajo de creación de dos elementos
   independientes; no se guarda "Ambos" en el catálogo. Cada copia tiene
   su propio sitio en el grafo.
2. Los "Ambos" existentes se separan con una migración nueva; la copia de
   BJJ conserva la identidad original; técnicas, contras, complementarias,
   etiquetas, organización del grafo y vínculos de rolls se reparten por
   disciplina sin perder datos.
3. Sesiones: BJJ / Grappling / Ambos. Rolls: BJJ / Grappling; por
   defecto la de la sesión (o la activa si la sesión es Ambos);
   modificable al crear. Selectores del roll filtrados por su disciplina.
4. Sesiones y rolls existentes: disciplina deducida en la migración.
5. Importación de "Ambos" = dos copias; cada lado se compara con su
   disciplina; vista previa de dos pasos mostrando cada lado.
6. Copia de seguridad v8; v6 y v7 siguen importando con conversión.
7. (P1) Tipo de sesión = Clase / Open mat; disciplina aparte; el tipo
   antiguo ayuda a deducir la disciplina.
8. (P2) "Ambos" = existe completo en las dos disciplinas: lo que falta
   (origen, destino, sumisión) se crea en la otra, al crear y al separar
   lo existente, avisando de lo creado.
9. (P3) La disciplina no se puede cambiar al editar (solo lectura).

## Fuera de alcance

- **Filtrar por disciplina los paneles de análisis y estadísticas**
  (inicio, rolls, compañeros). Candidato a backlog.
- **Calendario e inicio:** solo se muestra la disciplina de la sesión
  junto a su tipo; nada de filtros nuevos. Filtro de rolls por disciplina
  → backlog.
- **Fusionar o detectar duplicados** (p. ej. dos "Mount" de BJJ tras la
  separación): panel de alertas de la it.8.
- **Mantener sincronizadas las dos copias** (editar una y propagar a la
  otra): descartado por diseño, son independientes.
- **"Duplicar en la otra disciplina"** un elemento ya creado: funcionalidad
  futura (ya en backlog).
- **Cambiar la disciplina de un elemento ya creado:** no se permite.
- Historial de importaciones: lo aceptado no indica la disciplina de cada
  elemento creado.

## Capabilities

### New Capabilities

- `sesiones-y-rolls`: disciplina de sesiones y rolls (solo ese
  comportamiento): valores, valores por defecto, catálogo que ofrece el
  roll según su disciplina, cambio de disciplina con elementos elegidos,
  rolls antiguos y deducción al actualizar.

### Modified Capabilities

- `catalogo-tecnico`: "Disciplina de cada elemento", "Nombre de posición
  sin duplicados en el asistente", "Sumisión terminal" (versión de T-3),
  "Posiciones complementarias", "Contras de una técnica" (MODIFIED); nuevos
  requisitos para crear en las dos disciplinas, conexiones dentro de la
  disciplina, disciplina fija tras crear y separación de los "Ambos"
  existentes (ADDED).
- `importar-clase`: "Disciplina de la importación", "Generación de la
  propuesta", "Reutilización de lo que ya existe en el catálogo", "Añadir
  elementos a mano en la revisión", "Confirmar e insertar en el catálogo",
  "Aceptar la vista previa" (MODIFIED, sobre las versiones de T-3); dónde
  se crea cada elemento de una importación de "Ambos" (ADDED).
- `mapa`: "Disciplina activa", "Vista previa de importación en el grafo"
  y "Disciplina y filtros durante la vista previa" (MODIFIED; las dos
  últimas sobre la versión de T-3).
- `copia-seguridad`: "Contenido de la copia de seguridad", "Restauración
  fiel", "Ficheros de copia anteriores" (MODIFIED).

## Impact

- **Usuario:** el catálogo se duplica allí donde había "Ambos" (cada copia
  se edita por separado); los rolls se anotan con el catálogo de su
  disciplina; una pregunta más (disciplina) al crear sesiones.
- **Código:** `src/lib/db/schema.ts` (migración v12), módulo puro nuevo de
  separación compartido por migración y copia de seguridad,
  `src/lib/sync.ts` (formato v8, conversión v6/v7), `types/index.ts`,
  `sesiones.ts`, `rolls.ts`, asistentes de posición/sumisión/técnica,
  `SesionEditor`, `SesionForm`, `RollEditor`, página de sesión, `/rolls`
  (filtro de tipo), inicio, `/mapa` (filtro sin "Ambos"),
  `importacion-borrador.svelte.ts`, `ImportarClaseDialog.svelte`,
  `grafo.ts` (vista previa por lado). Sin dependencias nuevas.
- **Depende de** T-3.it7 (`vista-previa-importacion`): se aplica y se
  archiva después de él (modifica requisitos que T-3 añade o modifica, y
  numera su migración tras la v11 de T-3).

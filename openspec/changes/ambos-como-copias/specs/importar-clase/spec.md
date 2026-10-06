## MODIFIED Requirements

### Requirement: Disciplina de la importación
El primer paso de la importación SHALL ofrecer un selector BJJ / Grappling
/ Ambos, con la disciplina activa del mapa elegida por defecto. Tocar una
opción MUST elegirla y tocar la ya elegida no cambia nada. Todo lo que se
cree lleva la disciplina elegida; con "Ambos" cada elemento nuevo se crea
como dos, uno de BJJ y otro de Grappling, independientes entre sí.

#### Scenario: Disciplina por defecto
- **WHEN** con BJJ activo en el mapa el usuario abre la importación
- **THEN** el selector del primer paso tiene "BJJ" elegido

#### Scenario: Importar para otra disciplina
- **WHEN** con BJJ activo el usuario elige "Grappling" en el primer paso y acepta la importación
- **THEN** todas las posiciones, sumisiones y técnicas creadas tienen disciplina Grappling

#### Scenario: Importar para las dos
- **WHEN** el usuario elige "Ambos", la propuesta tiene la posición nueva "Dogfight" y acepta la importación
- **THEN** se crean "Dogfight" de BJJ y "Dogfight" de Grappling, y ningún elemento queda como "Ambos"

#### Scenario: Tocar la disciplina ya elegida
- **WHEN** está elegida "Ambos" y el usuario vuelve a tocar "Ambos"
- **THEN** la disciplina de la importación sigue siendo Ambos

### Requirement: Generación de la propuesta
Al pulsar "Generar propuesta" la app SHALL enviar el texto interpretado y
los nombres de las posiciones y sumisiones ya existentes en el catálogo de
la disciplina de la importación (en una de "Ambos", los de BJJ y los de
Grappling) a la IA, y SHALL mostrar una propuesta de posiciones,
sumisiones y técnicas nuevas con un resumen corto de lo interpretado. La
IA tiene instrucciones de no inventar técnicas no descritas ni tratar
agarres como posiciones.

#### Scenario: Propuesta generada
- **WHEN** la IA responde correctamente
- **THEN** se pasa al paso "Revisar propuesta" con las listas de posiciones, sumisiones y técnicas propuestas y el resumen bajo el título

#### Scenario: Nombres con mayúscula inicial
- **WHEN** la IA propone un nombre que empieza en minúscula
- **THEN** la propuesta lo muestra con la primera letra en mayúscula

#### Scenario: Catálogo enviado según la disciplina
- **WHEN** el usuario genera la propuesta de una importación de Grappling
- **THEN** la IA recibe solo los nombres de las posiciones y sumisiones de Grappling, no los de BJJ

#### Scenario: Catálogo enviado en una importación de "Ambos"
- **WHEN** el usuario genera la propuesta de una importación de "Ambos"
- **THEN** la IA recibe los nombres de BJJ y de Grappling, sin repetir los que existen en las dos

### Requirement: Reutilización de lo que ya existe en el catálogo
Una posición o sumisión propuesta cuyo nombre coincida con una existente
(ignorando mayúsculas y espacios en los extremos) MUST NOT crearse de
nuevo: las técnicas se enlazan a la existente. La comparación es por
nombre exacto. Solo se compara con la disciplina de la importación; en
una de "Ambos", cada lado (BJJ y Grappling) con la suya, y lo que falta
en un lado se crea solo en ese lado.

#### Scenario: Posición ya existente
- **WHEN** en una importación de BJJ la IA propone "mount" y existe "Mount" de BJJ
- **THEN** "Mount" no aparece en la lista de posiciones nuevas y las técnicas que salen de ella se enlazan a la existente

#### Scenario: Nombre parecido pero no igual
- **WHEN** la IA propone "Media guardia" y en el catálogo existe "Media Guardia bottom"
- **THEN** "Media guardia" aparece como posición nueva

#### Scenario: Elemento de "Ambos" en una importación de BJJ
- **WHEN** en una importación de BJJ la IA propone "Mount" y "Mount" era "Ambos" antes de actualizar la app (ahora existe una "Mount" de BJJ y otra de Grappling)
- **THEN** "Mount" no aparece como nueva y las técnicas se enlazan a la "Mount" de BJJ; la de Grappling no se toca

#### Scenario: Mismo nombre solo en la otra disciplina
- **WHEN** en una importación de Grappling la IA propone "Mount" y "Mount" solo existe con disciplina BJJ
- **THEN** "Mount" aparece como posición nueva y, al aceptar, se crea con disciplina Grappling aunque exista la de BJJ

#### Scenario: Importación de "Ambos"
- **WHEN** en una importación de "Ambos" la IA propone "Kimura" y no existe en ninguna disciplina
- **THEN** "Kimura" aparece como sumisión nueva y, al aceptar, se crean dos "Kimura", una de BJJ y otra de Grappling; ninguna queda con disciplina "Ambos"

#### Scenario: Importación de "Ambos" con el elemento en un solo lado
- **WHEN** en una importación de "Ambos" la IA propone "Kimura" y "Kimura" solo existe en BJJ
- **THEN** "Kimura" aparece como nueva solo para Grappling; al aceptar se crea la "Kimura" de Grappling y las técnicas de BJJ se enlazan a la "Kimura" de BJJ existente

#### Scenario: Importación de "Ambos" con el elemento en los dos lados
- **WHEN** en una importación de "Ambos" la IA propone "Mount" y existe "Mount" en BJJ y en Grappling
- **THEN** "Mount" no aparece como nueva y cada técnica se enlaza a la "Mount" de su disciplina

### Requirement: Añadir elementos a mano en la revisión
En el paso de revisión el usuario SHALL poder añadir posiciones,
sumisiones y técnicas manualmente con "+ Añadir". Una técnica manual
MUST elegir tipo, origen y destino entre el catálogo de la disciplina de
la importación (en una de "Ambos", el de BJJ y el de Grappling, sin
repetir nombres) y los elementos nuevos marcados, y solo se puede marcar
cuando origen y destino están resueltos.

#### Scenario: Técnica manual completa
- **WHEN** el usuario añade una técnica manual, le da nombre, tipo "Sumisión", origen y sumisión destino existentes y la marca
- **THEN** la técnica se incluirá en la inserción

#### Scenario: Técnica manual incompleta
- **WHEN** a una técnica manual le falta origen o destino
- **THEN** su casilla está deshabilitada

#### Scenario: Orígenes de la otra disciplina
- **WHEN** en una importación de Grappling el usuario elige el origen de una técnica manual y "Mount" solo existe con disciplina BJJ
- **THEN** "Mount" no aparece entre los orígenes posibles; sí aparecen las posiciones de Grappling y las nuevas marcadas

#### Scenario: Orígenes en una importación de "Ambos"
- **WHEN** en una importación de "Ambos" el usuario elige el origen de una técnica manual y "Mount" solo existe en BJJ
- **THEN** "Mount" aparece una vez entre los orígenes posibles

### Requirement: Confirmar e insertar en el catálogo
"Aceptar" en la vista previa del mapa SHALL crear posiciones, sumisiones y
técnicas marcadas, por ese orden, con la disciplina elegida en la
importación (en "Ambos", lo que falta en cada lado, en BJJ y en
Grappling); las técnicas en "Probando". Luego SHALL refrescar el mapa. Si
un elemento no se puede crear, el resto sigue y el usuario MUST ver
cuáles no se crearon y por qué.

> ⚠️ **Bug conocido:** hoy esos elementos se omiten sin avisar. Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Inserción correcta
- **WHEN** el usuario eligió "Grappling" en la importación y pulsa "Aceptar" en la vista previa
- **THEN** los elementos marcados se crean con disciplina Grappling, las técnicas en estado "Probando", y aparecen en el mapa como elementos normales

#### Scenario: Inserción de "Ambos"
- **WHEN** el usuario eligió "Ambos" y la propuesta tiene un sweep nuevo entre "Guardia cerrada" y "Mount"
- **THEN** se crea un sweep de BJJ entre las posiciones de BJJ y otro de Grappling entre las de Grappling

#### Scenario: Sumisión con nombre ya existente
- **WHEN** una sumisión marcada tiene exactamente el mismo nombre que una existente de la misma disciplina que la importación
- **THEN** no se crea y el usuario ve que esa sumisión no se creó y el motivo

#### Scenario: Sumisión con el mismo nombre en otra disciplina
- **WHEN** en una importación de Grappling una sumisión marcada se llama "Kimura" y "Kimura" solo existe con disciplina BJJ
- **THEN** al aceptar se crea "Kimura" con disciplina Grappling y las técnicas marcadas que llevan a ella se crean enlazadas a la nueva

#### Scenario: Técnica idéntica a una existente
- **WHEN** una técnica marcada tiene el mismo nombre, origen y variante que una ya existente
- **THEN** no se crea, el resto sí se crea y el usuario ve que esa técnica no se creó porque ya existía

#### Scenario: Lo que falta en un lado se crea y se avisa
- **WHEN** en una importación de "Ambos" una técnica sale de "Mount", que solo existe en BJJ
- **THEN** al aceptar se crea "Mount" en Grappling, la técnica existe en las dos disciplinas y el usuario ve que "Mount" se creó en Grappling

#### Scenario: Técnica idéntica en un solo lado de "Ambos"
- **WHEN** en una importación de "Ambos" una técnica marcada ya existe idéntica en BJJ pero no en Grappling
- **THEN** se crea solo la de Grappling y el usuario ve que la de BJJ no se creó porque ya existía

#### Scenario: Técnica cuyo origen se renombró o desmarcó
- **WHEN** el usuario renombró o desmarcó la posición nueva de la que sale una técnica marcada
- **THEN** esa técnica no se crea y el usuario ve que no se creó porque su origen o destino ya no está disponible

### Requirement: Aceptar la vista previa
"Aceptar" en el último paso de la vista previa SHALL insertar lo marcado
una sola vez y dejar al usuario en el mapa, en vista Grafo, fuera del
modo vista previa. La disciplina activa del mapa MUST pasar a ser la de
la importación; en una de "Ambos", la del último paso revisado
(Grappling). La ventana de importación MUST NOT volver a abrirse.

#### Scenario: Aceptar
- **WHEN** el usuario pulsa "Aceptar" en la vista previa
- **THEN** sigue en el mapa, lo importado ya no se resalta porque forma parte del catálogo y la ventana de importación no se abre

#### Scenario: Aceptar una importación de la otra disciplina
- **WHEN** con BJJ activo el usuario acepta la vista previa de una importación de Grappling
- **THEN** el mapa queda con Grappling como disciplina activa y muestra lo recién creado

#### Scenario: Aceptar una importación de "Ambos"
- **WHEN** con BJJ activo el usuario revisa las dos vistas previas de una importación de "Ambos" y pulsa "Aceptar" en la de Grappling
- **THEN** lo marcado se crea una sola vez, como copias de BJJ y de Grappling, cada una donde se vio en su vista previa, y el mapa queda con Grappling activo

## ADDED Requirements

### Requirement: Dónde se crea cada elemento en una importación de "Ambos"
En la revisión de una importación de "Ambos", cada posición o sumisión
nueva SHALL indicar si se creará en las dos disciplinas o solo en una
porque en la otra ya existe ("Nueva en BJJ y Grappling", "Nueva solo en
Grappling · ya existe en BJJ"). Desmarcarla MUST NOT crearla en ningún
lado.

#### Scenario: Nueva en un solo lado
- **WHEN** en una importación de "Ambos" la IA propone "Kimura" y "Kimura" solo existe en BJJ
- **THEN** la tarjeta de "Kimura" indica "Nueva solo en Grappling · ya existe en BJJ"

#### Scenario: Desmarcar una nueva en los dos lados
- **WHEN** el usuario desmarca "Dogfight", nueva en BJJ y Grappling
- **THEN** no se crea en ninguna disciplina y las técnicas que salen de ella no se pueden crear

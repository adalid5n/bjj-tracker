## MODIFIED Requirements

### Requirement: Nombre de posición sin duplicados en el asistente
El asistente de posición MUST impedir avanzar si ya existe otra posición
con el mismo nombre, sin distinguir mayúsculas, en la misma disciplina,
mostrando "Ya existe una posición con ese nombre.". Puede existir una
posición con el mismo nombre en la otra disciplina. Si se elige "Ambos",
el nombre no puede existir en ninguna de las dos.

#### Scenario: Nombre repetido
- **WHEN** el usuario escribe "guardia cerrada" con disciplina BJJ y ya existe "Guardia cerrada" de BJJ
- **THEN** el asistente muestra "Ya existe una posición con ese nombre." y no avanza

#### Scenario: Mismo nombre en la otra disciplina
- **WHEN** el usuario crea "Guardia cerrada" con disciplina Grappling y solo existe "Guardia cerrada" de BJJ
- **THEN** la posición se crea y quedan dos "Guardia cerrada", una por disciplina

#### Scenario: Ambos con el nombre ya usado en una disciplina
- **WHEN** el usuario elige "Ambos" y escribe "Mount", que ya existe en Grappling
- **THEN** el asistente indica que ya existe en Grappling y no avanza

### Requirement: Sumisión terminal
Una sumisión terminal SHALL tener nombre obligatorio, disciplina y notas
opcionales. El nombre MUST ser único dentro de su disciplina (sin
distinguir mayúsculas en el asistente): puede existir una sumisión con el
mismo nombre en la otra disciplina (p. ej. "Kimura" de BJJ y "Kimura" de
Grappling). Si se elige "Ambos", el nombre no puede existir en ninguna de
las dos. Es un punto final: MUST NOT ser origen de ninguna técnica.

#### Scenario: Nombre de sumisión repetido
- **WHEN** el usuario intenta crear "kimura" con disciplina BJJ y ya existe "Kimura" con disciplina BJJ
- **THEN** el asistente muestra "Ya existe una sumisión con ese nombre." y no avanza

#### Scenario: Mismo nombre en otra disciplina
- **WHEN** el usuario crea "Kimura" con disciplina Grappling y "Kimura" solo existe con disciplina BJJ
- **THEN** la sumisión se crea y quedan dos "Kimura", una por disciplina

#### Scenario: Ambos con el nombre ya usado en una disciplina
- **WHEN** el usuario crea "Kimura" eligiendo "Ambos" y "Kimura" ya existe en BJJ
- **THEN** el asistente indica que ya existe en BJJ y no avanza

### Requirement: Disciplina de cada elemento
Cada posición, técnica y sumisión SHALL tener disciplina BJJ o Grappling;
ningún elemento del catálogo queda como "Ambos". Al crear, el asistente
ofrece BJJ, Grappling y "Ambos" (crea dos elementos, ver "Crear para las
dos disciplinas") y MUST partir de la disciplina activa del mapa. Tocar
una disciplina MUST elegirla y tocar la ya elegida MUST NOT cambiarla.
Después de crear no se puede cambiar.

#### Scenario: Disciplina por defecto
- **WHEN** la disciplina activa es Grappling y el usuario crea una posición sin tocar la disciplina
- **THEN** la posición se guarda con disciplina Grappling

#### Scenario: Elemento para ambas disciplinas
- **WHEN** el usuario elige "Ambos" al crear una sumisión "Kimura"
- **THEN** se crean dos sumisiones "Kimura", una de BJJ y otra de Grappling, y ninguna queda como "Ambos"

#### Scenario: Tocar la disciplina ya elegida
- **WHEN** en el asistente de posición está elegida "Grappling" y el usuario vuelve a tocar "Grappling"
- **THEN** la disciplina sigue siendo Grappling

### Requirement: Posiciones complementarias
Una posición SHALL poder vincularse con otra de su misma disciplina como
su complementaria (la misma situación vista desde el otro practicante).
El vínculo MUST ser mutuo y único: al vincular A con B, B queda vinculada
con A y se rompen los vínculos previos de ambas. Solo se ofrecen
posiciones de la misma disciplina libres o ya vinculadas a la que se
edita.

#### Scenario: Vincular dos posiciones
- **WHEN** el usuario edita "Mount top" y elige "Mount bottom" como complementaria
- **THEN** ambas posiciones quedan vinculadas entre sí

#### Scenario: Solo posiciones de la misma disciplina
- **WHEN** el usuario edita "Mount top" de BJJ y abre el paso de complementaria
- **THEN** solo se le ofrecen posiciones de BJJ, no las de Grappling

#### Scenario: Crear la complementaria al vuelo
- **WHEN** en el paso de complementaria el usuario pulsa "Crear nueva posición" y la guarda
- **THEN** la nueva posición se crea en la misma disciplina y queda vinculada como complementaria de la que se estaba creando o editando

#### Scenario: Borrar una de las dos
- **WHEN** se borra una posición que tenía complementaria
- **THEN** la otra queda sin complementaria

### Requirement: Contras de una técnica
Una técnica SHALL poder tener contras: otras técnicas de su misma
disciplina que la responden. La relación MUST ser de un solo sentido (que
A sea contra de B no hace a B contra de A). Desde la ficha de una técnica
se añaden contras eligiendo una técnica existente de la misma disciplina
o creando una nueva, y se quitan con confirmación.

#### Scenario: Añadir contra existente
- **WHEN** en la ficha de una técnica el usuario pulsa "+ Añadir contra" y elige otra técnica
- **THEN** esa técnica aparece en "Contras conocidas" y no vuelve a ofrecerse en el selector

#### Scenario: Solo técnicas de la misma disciplina
- **WHEN** el usuario pulsa "+ Añadir contra" en una técnica de Grappling
- **THEN** el selector solo ofrece técnicas de Grappling

#### Scenario: Crear contra nueva
- **WHEN** el usuario elige "Crear nueva técnica" desde "+ Añadir contra" y la guarda
- **THEN** vuelve a la ficha original con la nueva técnica, de la misma disciplina, añadida como contra; si el origen tiene complementaria, el asistente la propone como origen

#### Scenario: Quitar contra
- **WHEN** el usuario pulsa ✕ en una contra y confirma "Quitar contra"
- **THEN** se elimina solo el vínculo; ambas técnicas siguen existiendo

## ADDED Requirements

### Requirement: Crear para las dos disciplinas
Elegir "Ambos" al crear una posición, sumisión o técnica SHALL crear dos
elementos independientes, uno de BJJ y otro de Grappling, con los mismos
datos (nombre, categoría, rol, etiquetas, notas, tipo, estado…). Después
MUST NOT tener relación: editar o borrar uno no cambia el otro. Tras
guardar se abre la ficha del de la disciplina activa.

#### Scenario: Crear una posición para las dos
- **WHEN** con BJJ activo el usuario crea la posición "Dogfight" con etiqueta "Wrestling" eligiendo "Ambos"
- **THEN** existen "Dogfight" de BJJ y "Dogfight" de Grappling, ambas con la etiqueta, y se abre la ficha de la de BJJ

#### Scenario: Las copias son independientes
- **WHEN** el usuario renombra la "Dogfight" de Grappling a "Dogfight (no-gi)"
- **THEN** la "Dogfight" de BJJ conserva su nombre

#### Scenario: Cada copia en su grafo
- **WHEN** el usuario mueve el nodo "Dogfight" en el grafo de BJJ y guarda la organización
- **THEN** el nodo "Dogfight" del grafo de Grappling sigue donde estaba

### Requirement: Conexiones dentro de la misma disciplina
Una técnica SHALL tener la disciplina de su posición de origen, y el
asistente MUST ofrecer como destino solo posiciones o sumisiones de esa
disciplina. Una técnica "Ambos" MUST existir completa en las dos: la copia
de la otra disciplina une las posiciones o sumisiones del mismo nombre de
esa disciplina y, si alguna no existe, se crea allí también y se avisa al
usuario de lo creado.

#### Scenario: Destinos de la misma disciplina
- **WHEN** el usuario crea una técnica desde "Guardia cerrada" de BJJ
- **THEN** la técnica es de BJJ y el paso de destino solo ofrece posiciones o sumisiones de BJJ

#### Scenario: Técnica Ambos con contrapartes existentes
- **WHEN** el usuario crea un sweep "Ambos" de "Guardia cerrada" a "Mount" de BJJ y en Grappling existen "Guardia cerrada" y "Mount"
- **THEN** se crea el sweep de BJJ entre las de BJJ y el de Grappling entre las de Grappling

#### Scenario: Técnica Ambos sin contraparte
- **WHEN** el usuario crea un sweep "Ambos" de "Guardia cerrada" a "Mount" de BJJ y en Grappling no existe "Mount"
- **THEN** se crean los dos sweeps y una posición "Mount" de Grappling con los datos de la de BJJ, y el usuario ve que esa posición se creó

#### Scenario: Conexiones antiguas entre disciplinas
- **WHEN** una técnica guardada antes de esta regla sale de una posición de otra disciplina
- **THEN** se conserva tal cual y sigue apareciendo en la ficha de su posición de origen

### Requirement: Disciplina fija tras crear
La disciplina de una posición, sumisión o técnica SHALL decidirse al
crearla y MUST NOT poder cambiarse después: al editar, el formulario la
muestra como dato de solo lectura, sin selector.

#### Scenario: Editar una posición
- **WHEN** el usuario edita una posición de BJJ
- **THEN** ve "BJJ" como dato no editable y no hay forma de cambiarlo a Grappling

#### Scenario: Elemento sin conexiones
- **WHEN** el usuario edita una sumisión de BJJ a la que no llega ninguna técnica
- **THEN** tampoco puede cambiar su disciplina

### Requirement: Elementos "Ambos" existentes al actualizar la app
Al actualizar la app, cada posición, sumisión o técnica guardada como
"Ambos" SHALL convertirse en dos, una de BJJ y otra de Grappling, sin
perder datos: cada copia conserva nombre, notas, etiquetas y sitio en el
grafo, y técnicas, contras y complementarias quedan entre elementos de
la misma disciplina. Si el origen o destino de una técnica "Ambos" solo
existe en una disciplina, MUST crearse también en la otra.

#### Scenario: Posición Ambos con técnicas
- **WHEN** existía "Mount" como "Ambos" con un sweep "Ambos" desde "Guardia cerrada" "Ambos" hacia ella
- **THEN** tras actualizar hay "Mount" y "Guardia cerrada" de BJJ unidas por un sweep de BJJ, y las mismas de Grappling unidas por un sweep de Grappling

#### Scenario: Técnica de una disciplina hacia un elemento Ambos
- **WHEN** existía un sweep de Grappling hacia "Mount" "Ambos"
- **THEN** tras actualizar el sweep de Grappling llega a la "Mount" de Grappling

#### Scenario: Sitio en el grafo
- **WHEN** "Mount" "Ambos" tenía un sitio guardado en el grafo
- **THEN** tras actualizar la "Mount" de BJJ y la de Grappling aparecen en ese mismo sitio, cada una en el grafo de su disciplina

#### Scenario: Técnica Ambos desde una posición de una sola disciplina
- **WHEN** existía una técnica "Ambos" que sale de "Mount", posición solo de BJJ, y en Grappling no hay "Mount"
- **THEN** tras actualizar hay una "Mount" de Grappling con los datos de la de BJJ y la técnica existe en BJJ y en Grappling

#### Scenario: Nada se pierde
- **WHEN** el usuario abre la app tras actualizar
- **THEN** todas sus posiciones, sumisiones, técnicas, contras, etiquetas, sesiones y rolls siguen ahí, y no queda ningún elemento "Ambos" en el catálogo

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

#### Scenario: Sumisiones existentes al actualizar la app
- **WHEN** el usuario abre la app tras la actualización con sumisiones y técnicas ya guardadas
- **THEN** todas las sumisiones siguen con su nombre y notas; las de BJJ o Grappling conservan su disciplina, cada sumisión "Ambos" pasa a ser una de BJJ y otra de Grappling (ver "Separación de lo que ya era Ambos"), y las técnicas que llevaban a ellas llevan a la copia de su disciplina

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
edita. Al crear con "Ambos", el selector SHALL ofrecer además las
posiciones libres que solo existen en la otra disciplina, una sola vez
por nombre y con una indicación visible de en qué disciplina están
("solo en Grappling", "solo en BJJ").

Una posición "Ambos" con complementaria MUST quedar con su complementaria
en las dos disciplinas, tanto al crearla con "Ambos" como al separar lo
que ya era "Ambos" (al actualizar la app o al restaurar una copia
anterior). Si la complementaria solo existe en una disciplina, en la
otra se vincula con la posición del mismo nombre (sin distinguir
mayúsculas ni espacios al principio o al final) que no tenga
complementaria; si no hay ninguna con ese nombre, se crea allí con los
datos de la complementaria (categoría, rol, notas y etiquetas) y se
vinculan, y al crear desde el asistente se avisa al usuario de lo
creado. Si la del mismo nombre ya está vinculada con otra posición, MUST
NOT crearse un duplicado ni romperse ese vínculo: en esa disciplina la
copia queda sin complementaria y al crear desde el asistente se avisa al
usuario.

Al crear al vuelo la complementaria de una posición "Ambos" ("Crear nueva
posición"), un nombre que ya existe en una sola disciplina MUST NOT
bloquear: si existe en la otra disciplina, la nueva se crea solo en la
que falta y se vincula como cualquier complementaria elegida; si existe
en la disciplina preferida y está libre, se usa esa en vez de crear otra.
En ambos casos se avisa al usuario de lo que pasará. Si el nombre ya
existe en las dos disciplinas, o solo en la preferida pero vinculada con
otra posición, el asistente MUST indicarlo con un mensaje que diga en
qué disciplina(s) está y que la elija en la lista. Los mismos criterios
se aplican al crear al vuelo una posición "Ambos" desde el asistente de
técnica o desde un roll, y una sumisión "Ambos" desde el asistente de
técnica. Fuera de esos flujos (crear desde el mapa sin nadie que reciba
la posición), un nombre que ya existe en una de las dos disciplinas
sigue bloqueando "Ambos", con un mensaje que dice dónde existe y
propone elegir solo la otra disciplina (crear solo donde falta también
en ese caso queda para más adelante: MF-046).

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

#### Scenario: Crear Ambos con una complementaria de una sola disciplina
- **WHEN** con BJJ activo el usuario crea "Dogfight over" eligiendo "Ambos" y como complementaria "Dogfight under", que solo existe en BJJ
- **THEN** existen "Dogfight over" y "Dogfight under" en BJJ y en Grappling, cada par vinculado en su disciplina, y el usuario ve el aviso informativo `Posición complementaria "Dogfight under" creada en Grappling`

#### Scenario: Crear Ambos con la complementaria ya presente en la otra disciplina
- **WHEN** el usuario crea "Dogfight over" eligiendo "Ambos" con complementaria "Dogfight under" de BJJ y en Grappling ya existe "dogfight under" sin complementaria
- **THEN** la "Dogfight over" de Grappling se vincula con esa "dogfight under", no se crea ninguna posición más y el usuario ve el aviso informativo `"dogfight under" enlazada con la existente en Grappling`

#### Scenario: La del mismo nombre ya está vinculada con otra
- **WHEN** el usuario crea "Dogfight over" eligiendo "Ambos" con complementaria "Dogfight under" de BJJ y en Grappling "Dogfight under" ya está vinculada con "Dogfight neutral"
- **THEN** no se crea otra "Dogfight under" en Grappling, el vínculo con "Dogfight neutral" se mantiene, la "Dogfight over" de Grappling queda sin complementaria y el usuario ve el aviso de atención `"Dogfight over" sin complementaria en Grappling`, cuyo detalle explica que "Dogfight under" ya está emparejada con otra y que puede editarla para elegirle una

#### Scenario: Crear Ambos con una complementaria nueva
- **WHEN** en el paso de complementaria de una posición "Ambos" el usuario pulsa "Crear nueva posición" y la guarda
- **THEN** la nueva se crea también como "Ambos" y cada copia queda vinculada con la copia de su misma disciplina

#### Scenario: Elegir en Ambos una complementaria que solo existe en la otra disciplina
- **WHEN** con BJJ activo el usuario crea "Dogfight over" eligiendo "Ambos" y abre el paso de complementaria, y "Dogfight under" solo existe en Grappling, sin complementaria
- **THEN** "Dogfight under" aparece en la lista una sola vez con la indicación "solo en Grappling"; al elegirla y guardar, la "Dogfight over" de Grappling queda vinculada con esa "Dogfight under", se crea "Dogfight under" en BJJ con sus datos vinculada con la "Dogfight over" de BJJ, y el usuario ve el aviso `Posición complementaria "Dogfight under" creada en BJJ`

#### Scenario: Cambiar la disciplina tras elegir una complementaria de la otra
- **WHEN** el usuario eligió en "Ambos" una complementaria que solo existe en Grappling y vuelve atrás para elegir BJJ como disciplina
- **THEN** la complementaria elegida se descarta y la lista vuelve a ofrecer solo posiciones de BJJ

#### Scenario: Crear al vuelo con un nombre que solo existe en la otra disciplina
- **WHEN** con BJJ activo, en el paso de complementaria de una posición "Ambos" el usuario pulsa "Crear nueva posición" y escribe "Dogfight under", que solo existe en Grappling
- **THEN** no aparece ningún error; el asistente indica que ya existe en Grappling y que se creará solo en BJJ; al guardar se crea solo la de BJJ, el usuario ve los avisos `Posición "Dogfight under" creada solo en BJJ (ya existía en Grappling)` y `"Dogfight under" enlazada con la existente en Grappling`, y cada copia de la posición "Ambos" queda vinculada con la "Dogfight under" de su disciplina

#### Scenario: Crear al vuelo con un nombre libre en la disciplina preferida
- **WHEN** con BJJ activo, en el paso de complementaria de una posición "Ambos" el usuario pulsa "Crear nueva posición" y escribe "Dogfight under", que solo existe en BJJ, sin complementaria
- **THEN** el asistente indica que se usará la existente; al continuar no se crea otra, queda elegida como complementaria y al guardar se completa la de Grappling como en cualquier complementaria de una sola disciplina

#### Scenario: Crear al vuelo con un nombre que existe en las dos disciplinas
- **WHEN** en el paso de complementaria de una posición "Ambos" el usuario pulsa "Crear nueva posición" y escribe un nombre que ya existe en BJJ y en Grappling
- **THEN** el asistente no deja continuar y muestra "Ya existe en BJJ y en Grappling: elígela en la lista.", distinto del mensaje de nombre repetido en una sola disciplina

#### Scenario: Ambos existente con complementaria de una sola disciplina
- **WHEN** existía "Dogfight over" como "Ambos" vinculada con "Dogfight under", solo de BJJ, y en Grappling no había "Dogfight under"
- **THEN** tras actualizar la app hay una "Dogfight under" de Grappling con los datos de la de BJJ vinculada con la "Dogfight over" de Grappling, y en BJJ el vínculo sigue como estaba

#### Scenario: Ambos existente y la del mismo nombre libre en la otra disciplina
- **WHEN** existía "Dogfight over" como "Ambos" vinculada con "Dogfight under" de BJJ y en Grappling había una "Dogfight under" sin complementaria
- **THEN** tras actualizar la app la "Dogfight over" de Grappling queda vinculada con esa "Dogfight under" y no se crea ninguna posición más

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

### Requirement: Aviso de lo hecho en la otra disciplina
Cuando al guardar un elemento "Ambos" la app crea, enlaza o deja sin
completar algo en la otra disciplina, SHALL mostrar un aviso con una
línea corta y llana por cada cosa hecha, en el orden en que ocurrió
(si un asistente abierto desde otro ya dejó su aviso, se añaden debajo,
sin perderlo). Las líneas que solo informan se distinguen visualmente
de las que piden atención (algo quedó sin completar y el usuario puede
querer arreglarlo). Cada línea MUST tener un botón de información que,
al tocarlo o hacer clic (no solo al pasar el ratón, para que funcione en
la tablet) y también con el teclado, muestra la explicación completa:
qué pasó, por qué ("como elegiste Ambos…") y, si procede, qué puede
hacer el usuario. El aviso se cierra entero con su botón de cerrar o al
cerrar el mapa o el roll.

Formas de cada línea:
- Complementaria creada: `Posición complementaria "<nombre>" creada en <disciplina>`.
- Complementaria enlazada con una existente: `"<nombre>" enlazada con la existente en <disciplina>`.
- Copia sin complementaria (pide atención): `"<posición>" sin complementaria en <disciplina>`.
- Origen o destino creado para completar una técnica: `Posición "<nombre>" creada en <disciplina>` o `Sumisión "<nombre>" creada en <disciplina>`.
- "Ambos" creado solo en una disciplina porque en la otra ya existía: `Posición "<nombre>" creada solo en <disciplina> (ya existía en <otra>)` (o `Sumisión …`).

#### Scenario: Una línea por cosa hecha
- **WHEN** el usuario crea un sweep "Ambos" de "Guardia cerrada" a "Mount" de BJJ y en Grappling no existen ni "Guardia cerrada" ni "Mount"
- **THEN** el aviso muestra dos líneas, `Posición "Guardia cerrada" creada en Grappling` y `Posición "Mount" creada en Grappling`

#### Scenario: Ver el detalle tocando el icono
- **WHEN** en la tablet el usuario toca el icono de información de la línea `Posición complementaria "Dogfight under" creada en Grappling`
- **THEN** se abre un recuadro que explica que, como eligió "Ambos", "Dogfight over" existe en BJJ y en Grappling, que en Grappling no había ninguna "Dogfight under" y que por eso se creó una copia y se emparejó con la "Dogfight over" de Grappling

#### Scenario: Distinguir lo que pide atención
- **WHEN** el aviso tiene una línea de complementaria creada y otra de copia sin complementaria
- **THEN** la de copia sin complementaria se ve con el estilo de atención y la otra con el informativo

#### Scenario: Cerrar el aviso
- **WHEN** el usuario pulsa cerrar en el aviso
- **THEN** desaparecen todas sus líneas

### Requirement: Conexiones dentro de la misma disciplina
Una técnica SHALL tener la disciplina de su posición de origen, y el
asistente MUST ofrecer como destino solo posiciones o sumisiones de esa
disciplina. Una técnica "Ambos" MUST existir completa en las dos: la copia
de la otra disciplina une las posiciones o sumisiones del mismo nombre de
esa disciplina y, si alguna no existe, se crea allí también y se avisa al
usuario de lo creado. Si en la otra disciplina ya existe una técnica con
el mismo nombre, origen y variante, no se guarda ninguna de las dos y el
asistente lo indica (crear solo donde falta queda para más adelante:
MF-046).

#### Scenario: Destinos de la misma disciplina
- **WHEN** el usuario crea una técnica desde "Guardia cerrada" de BJJ
- **THEN** la técnica es de BJJ y el paso de destino solo ofrece posiciones o sumisiones de BJJ

#### Scenario: Técnica Ambos con contrapartes existentes
- **WHEN** el usuario crea un sweep "Ambos" de "Guardia cerrada" a "Mount" de BJJ y en Grappling existen "Guardia cerrada" y "Mount"
- **THEN** se crea el sweep de BJJ entre las de BJJ y el de Grappling entre las de Grappling

#### Scenario: Técnica Ambos sin contraparte
- **WHEN** el usuario crea un sweep "Ambos" de "Guardia cerrada" a "Mount" de BJJ y en Grappling no existe "Mount"
- **THEN** se crean los dos sweeps y una posición "Mount" de Grappling con los datos de la de BJJ, y el usuario ve el aviso informativo `Posición "Mount" creada en Grappling`

#### Scenario: Técnica Ambos que ya existe en la otra disciplina
- **WHEN** el usuario crea un sweep "Ambos" desde "Guardia cerrada" de BJJ y en Grappling ya existe ese mismo sweep (mismo nombre, origen y variante)
- **THEN** no se guarda nada, el asistente vuelve al paso del nombre y explica que ya existe en Grappling, que cambie el nombre o la variante o la cree solo en BJJ

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
existe en una disciplina, MUST crearse también en la otra; lo mismo con
la complementaria de una posición "Ambos" (ver "Posiciones
complementarias").

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

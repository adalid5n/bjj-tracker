## MODIFIED Requirements

### Requirement: Texto interpretado revisable
Al pulsar "Analizar clase" la app SHALL pedir a la IA una versión corregida
del texto (términos de BJJ mal transcritos, ortografía) y SHALL mostrar el
original, con las palabras cambiadas resaltadas, junto al texto
interpretado, donde las correcciones se resaltan con una marca y los
términos dudosos con otra distinta. Una leyenda MUST mostrar un ejemplo de
cada marca, con el mismo aspecto que en el texto, y su significado
("corregido", "dudoso, revisa"), sin nombrar colores.
El texto interpretado MUST ser editable antes de seguir.
En esa misma petición la IA SHALL proponer un título corto para el historial.

#### Scenario: Correcciones y dudas resaltadas
- **WHEN** la IA devuelve el texto interpretado con correcciones y términos inciertos
- **THEN** el usuario ve "Original" y "Interpretado" lado a lado, con las correcciones y los términos inciertos resaltados con marcas distintas

#### Scenario: Leyenda de las marcas
- **WHEN** el usuario está en el paso de texto interpretado
- **THEN** la leyenda muestra "corregido" con la misma marca que las correcciones y "dudoso, revisa" con la misma marca que los términos inciertos, sin nombres de colores

#### Scenario: El usuario corrige el texto interpretado
- **WHEN** el usuario edita el texto interpretado y pulsa "Generar propuesta"
- **THEN** la propuesta se genera a partir del texto tal como lo dejó el usuario

#### Scenario: Volver al texto original
- **WHEN** el usuario pulsa "Volver" en el paso de texto interpretado
- **THEN** vuelve al paso de descripción con su texto original intacto

#### Scenario: Título sin petición extra
- **WHEN** el usuario pulsa "Analizar clase" y la IA responde
- **THEN** se ha hecho una sola petición a la IA y la importación ya tiene título en el historial

### Requirement: Revisión y edición de la propuesta
El paso "Revisar propuesta" SHALL mostrar posiciones, sumisiones y
técnicas propuestas, cada una con una casilla de selección (marcadas por
defecto) y un contador seleccionadas/total. SHALL permitir editar nombre,
categoría y rol de las posiciones y el nombre de las sumisiones; las
técnicas propuestas con origen y destino resueltos solo se pueden marcar o
desmarcar. Cada técnica MUST seguir enlazada a la posición o sumisión de la
que sale o a la que llega aunque el usuario la renombre: la revisión, la
vista previa y la inserción muestran y usan el nombre nuevo.

#### Scenario: Desmarcar un elemento
- **WHEN** el usuario desmarca una posición propuesta
- **THEN** la tarjeta se atenúa, el contador baja y esa posición no se insertará

#### Scenario: Editar una posición propuesta
- **WHEN** el usuario cambia el nombre o la categoría de una posición propuesta
- **THEN** la posición se insertará con el nombre y la categoría editados

#### Scenario: Renombrar una posición con técnicas
- **WHEN** la IA propone la posición nueva "Dog fight" y un sweep que sale de ella, y el usuario la renombra a "Dogfight"
- **THEN** el sweep muestra "Dogfight → …", sigue marcado, aparece en la vista previa saliendo de "Dogfight" y al aceptar se crea desde "Dogfight"

#### Scenario: Renombrar a un nombre que ya existe
- **WHEN** el usuario renombra una posición nueva con técnicas a "Mount", que ya existe en el catálogo de la importación
- **THEN** no se crea otra "Mount" y sus técnicas se crean enlazadas a la "Mount" existente

#### Scenario: Nada seleccionado
- **WHEN** no hay ningún elemento marcado
- **THEN** el botón "Continuar" está deshabilitado

### Requirement: Técnicas sin origen o destino resoluble
Una técnica (propuesta o añadida a mano) cuya posición de origen o cuyo
destino no exista ni en el catálogo ni entre los nuevos marcados MUST
mostrarse destacada con el aviso "Origen o destino no resuelto — elige
dónde empieza y dónde acaba", desmarcada y sin posibilidad de marcarla, y
SHALL mostrar los mismos selectores de origen y destino que una técnica
manual para re-apuntarla. Esto se recalcula en cada cambio de la revisión:
al desmarcar la posición o sumisión de la que depende, la técnica pasa a
no resuelta; al volver a marcarla o al elegir un origen y destino válidos,
se puede marcar de nuevo. Abrir un selector MUST NOT abrir el teclado del
móvil.

#### Scenario: Destino no resuelto
- **WHEN** la IA propone un sweep cuyo destino no está en el catálogo ni en las posiciones nuevas
- **THEN** la técnica aparece desmarcada, bloqueada, con el aviso de no resuelto y con los selectores de origen y destino

#### Scenario: Re-apuntar una técnica
- **WHEN** en esa técnica el usuario elige en el selector un destino existente
- **THEN** el aviso desaparece y la técnica se puede marcar e insertar

#### Scenario: Se desmarca la posición de origen
- **WHEN** el usuario desmarca la posición nueva de la que sale una técnica marcada
- **THEN** la técnica pasa a no resuelta (aviso, selectores, sin poder marcarla) y no se insertará

### Requirement: Confirmar e insertar en el catálogo
"Aceptar" en la vista previa del mapa SHALL crear posiciones, sumisiones y
técnicas marcadas, por ese orden, con la disciplina elegida en la
importación (en "Ambos", lo que falta en cada lado, en BJJ y en
Grappling); las técnicas en "Probando". Luego SHALL refrescar el mapa. Si
un elemento no se puede crear, el resto sigue y el usuario MUST ver
cuáles no se crearon y por qué (en "Ambos", en qué disciplina), y lo
creado solo en un lado para completar la otra disciplina.

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
- **WHEN** el usuario renombró la posición nueva de la que sale una técnica marcada y luego acepta; o la desmarcó
- **THEN** si la renombró, la técnica se crea desde la posición con el nombre nuevo; si la desmarcó, la técnica ya aparecía en la revisión como no resuelta y no se crea

#### Scenario: Error inesperado al crear un elemento
- **WHEN** al aceptar falla la creación de un elemento por un motivo no previsto
- **THEN** el resto se crea y el usuario ve ese elemento en "No se creó" con el motivo genérico "no se pudo crear"

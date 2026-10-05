# importar-clase Specification

## Purpose
Permite convertir la descripción libre de una clase (escrita o dictada) en
posiciones, sumisiones terminales y técnicas nuevas del catálogo técnico,
con ayuda de un servicio de IA externo y siempre revisadas por el usuario
antes de guardarse.

## Requirements

### Requirement: Acceso a la importación desde el mapa
La app SHALL ofrecer "Importar de clase" como opción del botón "Nuevo" de
la pantalla del mapa, junto a "Nueva posición" y "Nueva sumisión". Es el
único punto de entrada a este flujo.

#### Scenario: Abrir la importación
- **WHEN** el usuario pulsa "Nuevo" en el mapa y elige "Importar de clase"
- **THEN** se abre la ventana de importación en el paso de introducir la descripción de la clase

#### Scenario: Catálogo vacío
- **WHEN** el catálogo no tiene ninguna posición ni sumisión
- **THEN** la opción "Importar de clase" sigue disponible en el botón "Nuevo"

### Requirement: Descripción de la clase por texto o dictado
El primer paso SHALL aceptar la descripción de la clase como texto libre.
Si el navegador soporta reconocimiento de voz, SHALL ofrecer además un
botón de dictado en español que va añadiendo lo reconocido al final del
texto, sin cortarse en las pausas, hasta que el usuario lo detiene.

#### Scenario: Dictado disponible
- **WHEN** el navegador soporta reconocimiento de voz y el usuario pulsa el micrófono y habla
- **THEN** las frases reconocidas se añaden al final del texto existente y la grabación continúa tras cada pausa hasta pulsar detener

#### Scenario: Dictado no soportado
- **WHEN** el navegador no soporta reconocimiento de voz
- **THEN** no se muestra el botón de micrófono y solo se puede escribir

#### Scenario: Fallo del micrófono
- **WHEN** el reconocimiento de voz falla por un motivo distinto de silencio o cancelación
- **THEN** se detiene la grabación y se muestra "Error de micrófono" con el motivo

#### Scenario: Sin texto no se puede analizar
- **WHEN** el campo de descripción está vacío
- **THEN** el botón "Analizar clase" está deshabilitado

### Requirement: Texto interpretado revisable
Al pulsar "Analizar clase" la app SHALL pedir a la IA una versión corregida
del texto (términos de BJJ mal transcritos, ortografía) y SHALL mostrar el
original, con las palabras cambiadas resaltadas, junto al texto
interpretado, donde las correcciones se resaltan en un color y los términos
dudosos en otro. El texto interpretado MUST ser editable antes de seguir.

#### Scenario: Correcciones y dudas resaltadas
- **WHEN** la IA devuelve el texto interpretado con correcciones y términos inciertos
- **THEN** el usuario ve "Original" y "Interpretado" lado a lado, con las correcciones en amarillo y los términos inciertos en naranja

#### Scenario: El usuario corrige el texto interpretado
- **WHEN** el usuario edita el texto interpretado y pulsa "Generar propuesta"
- **THEN** la propuesta se genera a partir del texto tal como lo dejó el usuario

#### Scenario: Volver al texto original
- **WHEN** el usuario pulsa "Volver" en el paso de texto interpretado
- **THEN** vuelve al paso de descripción con su texto original intacto

### Requirement: Generación de la propuesta
Al pulsar "Generar propuesta" la app SHALL enviar el texto interpretado y
los nombres de las posiciones y sumisiones ya existentes a la IA, y SHALL
mostrar una propuesta de posiciones, sumisiones y técnicas nuevas con un
resumen corto de lo interpretado. La IA tiene instrucciones de no inventar
técnicas no descritas ni tratar agarres como posiciones.

#### Scenario: Propuesta generada
- **WHEN** la IA responde correctamente
- **THEN** se pasa al paso "Revisar propuesta" con las listas de posiciones, sumisiones y técnicas propuestas y el resumen bajo el título

#### Scenario: Nombres con mayúscula inicial
- **WHEN** la IA propone un nombre que empieza en minúscula
- **THEN** la propuesta lo muestra con la primera letra en mayúscula

### Requirement: Verificación automática silenciosa
Tras generar la propuesta, la app SHALL hacer una segunda pasada de la IA
que revisa la propuesta con reglas fijas (quitar agarres tratados como
posiciones, posiciones no mencionadas, variantes duplicadas y técnicas
huérfanas). El resultado de esta revisión MUST sustituir a la propuesta
sin avisar al usuario de qué cambió.

#### Scenario: La verificación corrige la propuesta
- **WHEN** la verificación elimina una posición que es en realidad un agarre
- **THEN** el usuario ve directamente la propuesta corregida, sin lista de correcciones aplicadas

#### Scenario: La verificación falla
- **WHEN** la segunda pasada da error o tarda demasiado
- **THEN** se muestra la propuesta original sin la verificación y sin mensaje de error

### Requirement: Reutilización de lo que ya existe en el catálogo
Una posición o sumisión propuesta cuyo nombre coincida con una existente
(ignorando mayúsculas y espacios en los extremos) MUST NOT aparecer como
nueva: se considera ya existente y las técnicas propuestas se enlazan a
ella. La comparación es por nombre exacto; nombres parecidos pero distintos
se tratan como nuevos. Se compara con todo el catálogo, sea cual sea su
disciplina.

#### Scenario: Posición ya existente
- **WHEN** la IA propone "mount" y en el catálogo existe "Mount"
- **THEN** "Mount" no aparece en la lista de posiciones nuevas y las técnicas que salen de ella se enlazan a la existente

#### Scenario: Nombre parecido pero no igual
- **WHEN** la IA propone "Media guardia" y en el catálogo existe "Media Guardia bottom"
- **THEN** "Media guardia" aparece como posición nueva

### Requirement: Revisión y edición de la propuesta
El paso "Revisar propuesta" SHALL mostrar posiciones, sumisiones y
técnicas propuestas, cada una con una casilla de selección (marcadas por
defecto) y un contador seleccionadas/total. SHALL permitir editar nombre,
categoría y rol de las posiciones y el nombre de las sumisiones; las
técnicas propuestas solo se pueden marcar o desmarcar.

#### Scenario: Desmarcar un elemento
- **WHEN** el usuario desmarca una posición propuesta
- **THEN** la tarjeta se atenúa, el contador baja y esa posición no se insertará

#### Scenario: Editar una posición propuesta
- **WHEN** el usuario cambia el nombre o la categoría de una posición propuesta
- **THEN** la posición se insertará con el nombre y la categoría editados

#### Scenario: Nada seleccionado
- **WHEN** no hay ningún elemento marcado
- **THEN** el botón "Continuar" está deshabilitado

### Requirement: Técnicas sin origen o destino resoluble
Una técnica propuesta cuya posición de origen o cuyo destino no exista ni
en el catálogo ni entre los nuevos propuestos MUST mostrarse destacada con
el aviso "Origen o destino no resuelto — no se puede insertar", desmarcada
y sin posibilidad de marcarla.

#### Scenario: Destino no resuelto
- **WHEN** la IA propone un sweep cuyo destino no está en el catálogo ni en las posiciones nuevas
- **THEN** la técnica aparece desmarcada, bloqueada y con el aviso de no resuelto

### Requirement: Añadir elementos a mano en la revisión
En el paso de revisión el usuario SHALL poder añadir posiciones,
sumisiones y técnicas manualmente con "+ Añadir". Una técnica manual
MUST elegir tipo, origen y destino entre el catálogo y los elementos
nuevos marcados, y solo se puede marcar cuando origen y destino están
resueltos.

#### Scenario: Técnica manual completa
- **WHEN** el usuario añade una técnica manual, le da nombre, tipo "Sumisión", origen y sumisión destino existentes y la marca
- **THEN** la técnica se incluirá en la inserción

#### Scenario: Técnica manual incompleta
- **WHEN** a una técnica manual le falta origen o destino
- **THEN** su casilla está deshabilitada

### Requirement: Refinar la propuesta con IA
En el paso de revisión el usuario SHALL poder escribir correcciones en
lenguaje natural y pulsar "Refinar propuesta". La IA rehace la propuesta
a partir de la descripción original (no del texto interpretado), la
propuesta anterior y las correcciones. La nueva propuesta MUST sustituir
por completo a la anterior, incluidas ediciones y elementos añadidos a
mano.

#### Scenario: Refinado aplicado
- **WHEN** el usuario escribe "Electric Chair es categoría otro" y pulsa "Refinar propuesta"
- **THEN** las listas se regeneran con la propuesta refinada y el campo de correcciones se vacía

#### Scenario: Se pierden ediciones previas
- **WHEN** el usuario había renombrado una posición o añadido una técnica manual antes de refinar
- **THEN** tras el refinado esas ediciones ya no están

### Requirement: Detalles opcionales antes de insertar
Tras la revisión, la app SHALL mostrar un paso opcional "Añadir detalles"
con un campo de detalles por cada técnica marcada (precargado con lo que
la IA extrajo) y un campo de notas por cada sumisión marcada. Este paso
se muestra igual en modo hobbyist y en modo avanzado.

#### Scenario: Detalles precargados
- **WHEN** la IA extrajo detalles de ejecución para una técnica
- **THEN** el campo de detalles de esa técnica aparece ya relleno y editable

#### Scenario: Volver a la revisión
- **WHEN** el usuario pulsa "Volver" en el paso de detalles
- **THEN** regresa a "Revisar propuesta" con su selección intacta

### Requirement: Confirmar e insertar en el catálogo
"Confirmar e insertar" SHALL crear posiciones, sumisiones y técnicas
marcadas, por ese orden, con la disciplina activa; las técnicas en
"Probando". Luego SHALL refrescar el mapa. Si un elemento no se puede
crear, el resto sigue y el usuario MUST ver cuáles no se crearon y por
qué.

> ⚠️ **Bug conocido:** hoy esos elementos se omiten sin avisar. Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Inserción correcta
- **WHEN** el usuario confirma con disciplina activa "Grappling"
- **THEN** los elementos marcados se crean con disciplina Grappling, las técnicas en estado "Probando", la ventana se cierra y aparecen en el mapa

#### Scenario: Sumisión con nombre ya existente
- **WHEN** una sumisión marcada tiene exactamente el mismo nombre que una existente
- **THEN** no se crea y el usuario ve que esa sumisión no se creó y el motivo

#### Scenario: Técnica idéntica a una existente
- **WHEN** una técnica marcada tiene el mismo nombre, origen y variante que una ya existente
- **THEN** no se crea, el resto sí se crea y el usuario ve que esa técnica no se creó porque ya existía

#### Scenario: Técnica cuyo origen se renombró o desmarcó
- **WHEN** el usuario renombró o desmarcó la posición nueva de la que sale una técnica marcada
- **THEN** esa técnica no se crea y el usuario ve que no se creó porque su origen o destino ya no está disponible

### Requirement: Dependencia de conexión y del servicio de IA
Analizar, generar y refinar MUST requerir conexión y la clave del
servicio de IA configurada. Cada petición SHALL cancelarse a los 30 s.
Los errores SHALL mostrarse en la ventana con un mensaje comprensible,
sin perder lo escrito, y se puede reintentar.

> ⚠️ **Bug conocido:** hoy "Analizar" y "Refinar" muestran el error técnico en bruto (p. ej. `GROQ_KEY_MISSING`). Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Petición demasiado lenta
- **WHEN** el servicio no responde en 30 segundos
- **THEN** se muestra "La petición tardó demasiado y se canceló. Revisa tu conexión e inténtalo de nuevo."

#### Scenario: Errores al generar la propuesta
- **WHEN** al generar la propuesta falta la clave, el servicio está saturado, se alcanzó el límite de uso o la respuesta no es válida
- **THEN** se muestra respectivamente el aviso de que no hay clave configurada, el de servidor saturado, el de límite de uso o el de respuesta inesperada

#### Scenario: Sin clave al analizar o refinar
- **WHEN** falta la clave del servicio de IA y el usuario pulsa "Analizar clase" o "Refinar propuesta"
- **THEN** se muestra un mensaje comprensible indicando que no hay clave configurada

#### Scenario: Error genérico del servicio al analizar o refinar
- **WHEN** el servicio devuelve un error (saturado, límite de uso, respuesta inesperada u otro) al analizar o refinar
- **THEN** se muestra un mensaje comprensible en lenguaje de usuario, no el mensaje técnico en bruto

### Requirement: Cancelar con confirmación
Cerrar la ventana (botón Cancelar, tecla Escape o pulsar fuera) SHALL
pedir confirmación "¿Descartar la importación?" si hay texto escrito o
se ha pasado del primer paso. Si no hay nada, MUST cerrarse directamente.

#### Scenario: Cancelar con datos
- **WHEN** el usuario ha escrito texto y pulsa fuera de la ventana
- **THEN** aparece "¿Descartar la importación?" y solo se cierra si elige "Descartar"

#### Scenario: Cancelar sin datos
- **WHEN** el campo de texto está vacío en el primer paso y el usuario pulsa "Cancelar"
- **THEN** la ventana se cierra sin preguntar

### Requirement: Sin historial de importaciones
La importación MUST NOT guardar nada propio: ni el texto, ni la propuesta,
ni un registro de importaciones. Solo persisten los elementos insertados
en el catálogo, sin marca que indique que vinieron de una importación. Al
cerrar o cancelar, todo el contenido de la ventana se pierde.

#### Scenario: Reabrir tras cerrar
- **WHEN** el usuario cierra la importación y vuelve a abrirla
- **THEN** empieza en el primer paso con el texto vacío

## MODIFIED Requirements

### Requirement: Acceso a la importación desde el mapa
La app SHALL ofrecer "Importar de clase" como opción del botón "Nuevo" de
la pantalla del mapa, junto a "Nueva posición" y "Nueva sumisión". El
otro punto de entrada es "Reintentar" desde el historial de
importaciones, que abre el mismo flujo con el texto guardado precargado
y sigue usando la misma entrada del historial.

#### Scenario: Abrir la importación
- **WHEN** el usuario pulsa "Nuevo" en el mapa y elige "Importar de clase"
- **THEN** se abre la ventana de importación en el paso de introducir la descripción de la clase

#### Scenario: Catálogo vacío
- **WHEN** el catálogo no tiene ninguna posición ni sumisión
- **THEN** la opción "Importar de clase" sigue disponible en el botón "Nuevo"

#### Scenario: Abrir desde el historial
- **WHEN** el usuario pulsa "Reintentar" en una entrada del historial de importaciones
- **THEN** se abre la ventana de importación en el primer paso con el texto guardado de esa entrada, editable

### Requirement: Texto interpretado revisable
Al pulsar "Analizar clase" la app SHALL pedir a la IA una versión corregida
del texto (términos de BJJ mal transcritos, ortografía) y SHALL mostrar el
original, con las palabras cambiadas resaltadas, junto al texto
interpretado, donde las correcciones se resaltan en un color y los términos
dudosos en otro. El texto interpretado MUST ser editable antes de seguir.
En esa misma petición la IA SHALL proponer un título corto para el historial.

#### Scenario: Correcciones y dudas resaltadas
- **WHEN** la IA devuelve el texto interpretado con correcciones y términos inciertos
- **THEN** el usuario ve "Original" y "Interpretado" lado a lado, con las correcciones en amarillo y los términos inciertos en naranja

#### Scenario: El usuario corrige el texto interpretado
- **WHEN** el usuario edita el texto interpretado y pulsa "Generar propuesta"
- **THEN** la propuesta se genera a partir del texto tal como lo dejó el usuario

#### Scenario: Volver al texto original
- **WHEN** el usuario pulsa "Volver" en el paso de texto interpretado
- **THEN** vuelve al paso de descripción con su texto original intacto

#### Scenario: Título sin petición extra
- **WHEN** el usuario pulsa "Analizar clase" y la IA responde
- **THEN** se ha hecho una sola petición a la IA y la importación ya tiene título en el historial

### Requirement: Cancelar con confirmación
Cerrar la ventana (botón Cancelar, tecla Escape o pulsar fuera) SHALL
pedir confirmación si hay texto escrito o se ha pasado del primer paso.
Si no hay nada, MUST cerrarse directamente. Si ya se pulsó "Analizar
clase", la confirmación SHALL ser "¿Cerrar? La importación queda guardada en el historial" y cerrar MUST NOT borrar la entrada del historial. Si aún
no se ha analizado, la confirmación sigue siendo "¿Descartar la importación?".

#### Scenario: Cancelar con datos
- **WHEN** el usuario ha escrito texto, no ha pulsado "Analizar clase" y pulsa fuera de la ventana
- **THEN** aparece "¿Descartar la importación?" y solo se cierra si elige "Descartar"

#### Scenario: Cancelar sin datos
- **WHEN** el campo de texto está vacío en el primer paso y el usuario pulsa "Cancelar"
- **THEN** la ventana se cierra sin preguntar

#### Scenario: Cancelar tras analizar
- **WHEN** el usuario analizó la clase, está revisando la propuesta y pulsa "Cancelar"
- **THEN** aparece "¿Cerrar? La importación queda guardada en el historial"; si confirma, la ventana se cierra y la importación sigue en el historial en estado "Sin terminar"

## REMOVED Requirements

### Requirement: Sin historial de importaciones
**Reason**: El owner decide guardar cada importación (el texto analizado y lo aceptado) para poder repetirla y usarla como diario de entreno.
**Migration**: El comportamiento pasa al nuevo spec `historial-importaciones`. Los elementos insertados siguen sin marca de origen en el catálogo; la relación importación → elementos creados vive solo en el historial.

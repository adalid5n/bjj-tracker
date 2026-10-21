## MODIFIED Requirements

### Requirement: Contenido de cada entrada
Cada entrada SHALL guardar el texto analizado, el texto corregido (el
interpretado tal como lo dejó el usuario) enviado a la IA la última vez
que pulsó "Generar propuesta", aunque la IA fallara, y, si se confirmó la inserción, lo aceptado: los elementos que
realmente se crearon en el catálogo. Un nuevo análisis de la entrada MUST
descartar el texto corregido guardado hasta que se genere otra propuesta.
Si una importación reintentada se confirma otra vez, lo nuevo MUST sumarse
a lo aceptado anterior, de modo que la entrada refleja todo lo que esa
importación ha creado. La propuesta de la IA MUST NOT guardarse.

#### Scenario: Importación confirmada
- **WHEN** el usuario confirma la inserción
- **THEN** la entrada guarda como "aceptado" las posiciones, sumisiones y técnicas que se crearon

#### Scenario: Reintentar una importación ya importada
- **WHEN** una entrada "Importada" que creó "Mount" se reintenta y al confirmar se crea la técnica "Armbar"
- **THEN** el bloque "Aceptado" de esa entrada incluye "Mount" y "Armbar"

#### Scenario: Propuesta no guardada
- **WHEN** el usuario genera una propuesta y cierra la ventana sin confirmar
- **THEN** la entrada tiene el texto analizado y el corregido; la propuesta no se puede consultar después

#### Scenario: Se guarda el texto corregido
- **WHEN** el usuario cambia "dog fight" por "Dogfight" en el texto interpretado y pulsa "Generar propuesta"
- **THEN** la entrada guarda el texto con "Dogfight"

### Requirement: Detalle de una importación
Una tarjeta desplegada SHALL mostrar dos bloques: "Texto" (el texto
corregido guardado o, si no lo hay, el último texto analizado) y
"Aceptado" (lista legible de las posiciones, sumisiones y técnicas
creadas). Si la importación no llegó a confirmarse, el bloque "Aceptado"
MUST NOT mostrarse.

#### Scenario: Importación sin terminar
- **WHEN** el usuario despliega una importación que se cerró sin confirmar
- **THEN** ve solo el bloque "Texto"

#### Scenario: Importación confirmada
- **WHEN** el usuario despliega una importación en estado "Importada"
- **THEN** ve los bloques "Texto" y "Aceptado"

#### Scenario: Texto corregido en el historial
- **WHEN** el usuario despliega una importación cuya propuesta se generó con el texto corregido
- **THEN** el bloque "Texto" muestra el texto corregido, no el dictado original

#### Scenario: Importación sin texto corregido
- **WHEN** el usuario despliega una importación anterior a este cambio, o que falló antes de generar la propuesta
- **THEN** el bloque "Texto" muestra el texto analizado

### Requirement: Copiar un bloque
Cada bloque de una tarjeta desplegada SHALL tener un botón de copiar que
copia solo el contenido de ese bloque y muestra "Copiado ✓" durante unos
segundos. La fecha MUST NOT copiarse.

#### Scenario: Copiar el texto
- **WHEN** el usuario pulsa copiar en el bloque "Texto"
- **THEN** el portapapeles contiene exactamente el texto que muestra el bloque y el botón muestra "Copiado ✓"

### Requirement: Reintentar una importación
Cada tarjeta desplegada SHALL tener "Reintentar", que cierra el panel y
abre la importación en el primer paso con el texto del bloque "Texto" (el
corregido o, si no lo hay, el analizado) ya escrito y editable. La
importación reintentada MUST seguir usando la misma entrada del historial,
sin crear otra.

#### Scenario: Reintentar una importación fallida
- **WHEN** el usuario pulsa "Reintentar" en una importación en estado "Falló"
- **THEN** se abre la importación con el texto guardado en el campo de descripción, listo para editar o analizar

#### Scenario: Reintentar parte del texto corregido
- **WHEN** el usuario pulsa "Reintentar" en una importación cuyo texto corregido dice "Dogfight" donde el dictado decía "dog fight"
- **THEN** el campo de descripción contiene el texto con "Dogfight"

#### Scenario: Reintentar con el texto editado
- **WHEN** el usuario reintenta, corrige el texto y pulsa "Analizar clase"
- **THEN** el historial sigue teniendo una sola entrada para esa importación, ahora con el texto corregido

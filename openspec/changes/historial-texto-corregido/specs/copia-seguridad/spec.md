## MODIFIED Requirements

### Requirement: Contenido de la copia de seguridad
Exportar los datos desde Ajustes SHALL generar un único fichero con todo
lo que guarda la app: sesiones y rolls con su disciplina, y compañeros;
posiciones, sumisiones, técnicas y contras con su disciplina; etiquetas y
qué posiciones las llevan; la organización guardada del grafo; los
ajustes; y el historial de importaciones, con el texto analizado y el
texto corregido de cada una.

#### Scenario: Exportar con etiquetas y disciplina
- **WHEN** el usuario tiene posiciones con etiquetas y técnicas de Grappling y exporta sus datos
- **THEN** el fichero contiene esas etiquetas, a qué posiciones se aplican y la disciplina de cada elemento

#### Scenario: Exportar sesiones y rolls
- **WHEN** el usuario tiene una sesión "Ambos" con un roll de BJJ y otro de Grappling y exporta sus datos
- **THEN** el fichero contiene la disciplina de la sesión y la de cada roll

#### Scenario: Exportar el texto corregido
- **WHEN** el usuario exporta con una importación cuyo historial muestra el texto corregido, e importa el fichero en otro dispositivo
- **THEN** en el segundo dispositivo esa importación muestra el mismo texto corregido

### Requirement: Ficheros de copia anteriores
La app SHALL aceptar ficheros de copia de las versiones anteriores
(desde la primera que trae disciplina en el catálogo).
Al restaurarlos, los elementos "Ambos" del catálogo se separan y sesiones
y rolls reciben disciplina con las mismas reglas que al actualizar la
app; lo que el fichero no trae (historial, etiquetas, texto corregido)
queda vacío.
Ficheros de versiones desconocidas o más nuevas MUST rechazarse con un
mensaje que explica la incompatibilidad.

#### Scenario: Copia anterior al historial
- **WHEN** el usuario importa un fichero exportado antes de que existiera el historial
- **THEN** los datos se restauran y el historial de importaciones queda vacío

#### Scenario: Copia anterior al texto corregido
- **WHEN** el usuario importa un fichero exportado antes de que el historial guardara el texto corregido
- **THEN** las importaciones se restauran y cada una muestra su texto analizado

#### Scenario: Copia con elementos "Ambos"
- **WHEN** el usuario importa un fichero exportado antes de este cambio con una posición "Ambos" y rolls sin disciplina
- **THEN** la posición queda como una de BJJ y otra de Grappling, y cada sesión y roll tiene disciplina, igual que si hubiera actualizado la app con esos datos

#### Scenario: Copia con una complementaria de una sola disciplina
- **WHEN** el usuario importa un fichero anterior a este cambio en el que "Dogfight over" es "Ambos" y su complementaria "Dogfight under" solo es de BJJ
- **THEN** quedan "Dogfight over" y "Dogfight under" en BJJ y en Grappling, cada par vinculado en su disciplina, igual que si hubiera actualizado la app con esos datos

#### Scenario: Fichero de una versión más nueva
- **WHEN** el usuario importa un fichero generado por una versión más nueva de la app
- **THEN** la importación se rechaza con un mensaje de versión incompatible y los datos actuales no cambian

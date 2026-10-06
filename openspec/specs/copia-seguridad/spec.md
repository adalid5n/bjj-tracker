# copia-seguridad Specification

## Purpose
Permite sacar todos los datos de la app a un fichero y restaurarlos en
otro dispositivo, sin perder nada: entrenos, catálogo técnico completo,
organización del grafo, ajustes e historial de importaciones.

## Requirements

### Requirement: Contenido de la copia de seguridad
Exportar los datos desde Ajustes SHALL generar un único fichero con todo
lo que guarda la app: sesiones, rolls y compañeros; posiciones,
sumisiones, técnicas y contras con su disciplina; etiquetas y qué
posiciones las llevan; la organización guardada del grafo; los ajustes; y
el historial de importaciones.

#### Scenario: Exportar con etiquetas y disciplina
- **WHEN** el usuario tiene posiciones con etiquetas y técnicas de Grappling y exporta sus datos
- **THEN** el fichero contiene esas etiquetas, a qué posiciones se aplican y la disciplina de cada elemento

### Requirement: Restauración fiel
Importar un fichero de copia SHALL sustituir todos los datos actuales por
los del fichero, previa confirmación. Tras importar, la app MUST mostrar
exactamente lo exportado: mismas etiquetas en las mismas posiciones,
misma disciplina en cada elemento y mismo historial de importaciones.

#### Scenario: Cambio de dispositivo
- **WHEN** el usuario exporta en un dispositivo y luego importa ese fichero en otro
- **THEN** en el segundo dispositivo el mapa con BJJ y con Grappling activo, las etiquetas de las posiciones y el historial de importaciones son iguales que en el primero

#### Scenario: No quedan restos del dispositivo de destino
- **WHEN** el dispositivo de destino tenía etiquetas o importaciones que no están en el fichero
- **THEN** tras importar ya no aparecen

### Requirement: Ficheros de copia anteriores
La app SHALL aceptar ficheros de copia de la versión inmediatamente
anterior, que no traen historial de importaciones: se restauran sus datos
y el historial queda vacío. Ficheros de versiones desconocidas o más
nuevas MUST rechazarse con un mensaje que explica la incompatibilidad.

#### Scenario: Copia anterior al historial
- **WHEN** el usuario importa un fichero exportado antes de que existiera el historial
- **THEN** los datos se restauran y el historial de importaciones queda vacío

#### Scenario: Fichero de una versión más nueva
- **WHEN** el usuario importa un fichero generado por una versión más nueva de la app
- **THEN** la importación se rechaza con un mensaje de versión incompatible y los datos actuales no cambian

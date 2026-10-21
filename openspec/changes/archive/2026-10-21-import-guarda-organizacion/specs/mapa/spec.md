## MODIFIED Requirements

### Requirement: Organizar el grafo a mano
La disposición inicial del grafo SHALL calcularse automáticamente. Con el
modo "Mover nodos" activo, el usuario puede arrastrar nodos (tocar un nodo
no abre su ficha) y pulsar "Reorganizar" para recalcular todo. Los cambios
MUST NOT guardarse hasta pulsar "Guardar organización", que aparece
mientras haya cambios pendientes.
Excepción: al aceptar una importación de clase, el sitio en el que se vio
cada posición o sumisión creada en la vista previa SHALL guardarse
automáticamente, en la disciplina de su paso. Ese guardado MUST NOT cambiar
el sitio guardado de los elementos que ya existían ni guardar cambios de
organización que estuvieran pendientes antes de la importación.

#### Scenario: Mover y guardar
- **WHEN** el usuario activa "Mover nodos", arrastra un nodo y pulsa "Guardar organización"
- **THEN** la nueva posición del nodo se mantiene en visitas posteriores

#### Scenario: Fuera del modo mover
- **WHEN** el modo "Mover nodos" está desactivado y el usuario arrastra sobre un nodo
- **THEN** se desplaza el lienzo, no el nodo

#### Scenario: Nodos nuevos
- **WHEN** se añade a mano un elemento nuevo al catálogo que no tiene posición guardada
- **THEN** se coloca automáticamente sin mover los nodos ya guardados y aparece "Guardar organización"

#### Scenario: Aceptar una importación guarda la organización
- **WHEN** sin cambios de organización pendientes, el usuario acepta una importación que crea las posiciones "Dogfight" y "Leg drag"
- **THEN** ambas quedan en el sitio donde se vieron en la vista previa, no aparece "Guardar organización" y siguen en ese sitio en visitas posteriores

#### Scenario: Salir del mapa tras importar
- **WHEN** tras aceptar esa importación el usuario pulsa otra pantalla en la barra de navegación, o sale y vuelve al mapa y sale de nuevo
- **THEN** navega sin preguntar "¿Descartar cambios del grafo?"

#### Scenario: Importación de "Ambos"
- **WHEN** el usuario acepta una importación de "Ambos" que crea elementos en BJJ y en Grappling
- **THEN** lo creado en cada disciplina queda guardado donde se vio en su paso, y al cambiar de disciplina no aparece "Guardar organización"

#### Scenario: Cambios pendientes antes de importar
- **WHEN** el usuario había movido un nodo sin guardar y después acepta una importación
- **THEN** lo importado queda guardado, "Guardar organización" sigue visible por el nodo movido, y si al salir elige descartar, al volver al mapa ese nodo está en su sitio guardado y lo importado sigue donde se vio

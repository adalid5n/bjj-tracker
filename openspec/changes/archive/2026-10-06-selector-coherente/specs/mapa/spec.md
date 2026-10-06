## MODIFIED Requirements

### Requirement: Vistas Grafo y Lista
La pantalla del mapa SHALL ofrecer dos vistas, Grafo y Lista, con un
selector siempre visible arriba. Al entrar en la pantalla MUST mostrarse
la vista Grafo. La vista elegida no se recuerda al salir de la pantalla.
Tocar la vista que ya está activa MUST NOT cambiar nada.

#### Scenario: Entrar en el mapa
- **WHEN** el usuario abre la pantalla del mapa
- **THEN** ve la vista Grafo

#### Scenario: Cambiar a Lista
- **WHEN** el usuario pulsa "Lista"
- **THEN** ve la lista con las pestañas Posiciones, Técnicas y Sumisiones

#### Scenario: Tocar la vista activa
- **WHEN** la vista Grafo está activa y el usuario pulsa "Grafo"
- **THEN** sigue en la vista Grafo, sin confirmaciones ni cambios

### Requirement: Disciplina activa
El mapa SHALL tener un selector BJJ / Grappling. Con una disciplina activa,
grafo y listas MUST mostrar solo los elementos de esa disciplina más los
marcados como "Ambos". La elección se guarda y se mantiene entre visitas.
Las fichas de detalle no filtran por disciplina. Tocar una opción del
selector MUST elegir esa opción; tocar la que ya está activa no cambia nada.

#### Scenario: Cambiar a Grappling
- **WHEN** con BJJ activo el usuario pulsa "Grappling" en el selector
- **THEN** el grafo y las listas muestran solo elementos de Grappling o de Ambos

#### Scenario: Tocar la disciplina activa
- **WHEN** con BJJ activo el usuario pulsa "BJJ"
- **THEN** BJJ sigue activo y el grafo y las listas no cambian

#### Scenario: Ficha de posición con técnicas de otra disciplina
- **WHEN** con BJJ activo se abre una posición de la que sale una técnica solo de Grappling
- **THEN** esa técnica aparece igualmente en la ficha de la posición

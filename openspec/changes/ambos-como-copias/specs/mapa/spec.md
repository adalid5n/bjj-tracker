## MODIFIED Requirements

### Requirement: Disciplina activa
El mapa SHALL tener un selector BJJ / Grappling. Con una disciplina activa,
grafo y listas MUST mostrar solo los elementos de esa disciplina (ningún
elemento es ya "Ambos"). Cada disciplina tiene su propia organización del
grafo. La elección se guarda y se mantiene entre visitas. Las fichas de
detalle no filtran por disciplina. Tocar una opción del selector MUST
elegir esa opción; tocar la que ya está activa no cambia nada.

#### Scenario: Cambiar a Grappling
- **WHEN** con BJJ activo el usuario pulsa "Grappling" en el selector
- **THEN** el grafo y las listas muestran solo elementos de Grappling

#### Scenario: Tocar la disciplina activa
- **WHEN** con BJJ activo el usuario pulsa "BJJ"
- **THEN** BJJ sigue activo y el grafo y las listas no cambian

#### Scenario: Organización independiente
- **WHEN** el usuario reorganiza y guarda el grafo de BJJ y luego cambia a Grappling
- **THEN** el grafo de Grappling se ve con su organización de siempre

#### Scenario: Ficha de posición con técnicas de otra disciplina
- **WHEN** con BJJ activo se abre una posición de la que sale una técnica antigua de Grappling
- **THEN** esa técnica aparece igualmente en la ficha de la posición

### Requirement: Vista previa de importación en el grafo
Durante la vista previa, el grafo SHALL mostrar el catálogo de la
disciplina del paso con lo que se va a añadir en ella: posiciones y
sumisiones nuevas como nodos y técnicas nuevas como flechas. Lo nuevo MUST destacarse con un color que respira:
pasa suavemente de su color normal al de resaltado (amarillo dorado, más
oscuro que el blanco de las sumisiones) y vuelve, sin cambiar de tamaño.
Una posición o sumisión existente que recibe una técnica nueva no se
resalta; solo la flecha.

#### Scenario: Técnica nueva entre posiciones existentes
- **WHEN** la importación añade un sweep de "Guardia cerrada" a "Mount", que ya existen
- **THEN** solo la flecha del sweep se resalta; los nodos "Guardia cerrada" y "Mount" se ven como siempre

#### Scenario: Posición nueva
- **WHEN** la importación añade la posición nueva "Dogfight" y una técnica que llega a ella
- **THEN** el nodo "Dogfight" y la flecha pasan suavemente de su color normal al de resaltado y vuelven, sin hacerse más grandes

#### Scenario: Elemento nuevo en un solo lado de "Ambos"
- **WHEN** en una importación de "Ambos" la propuesta usa "Kimura", que solo existe en BJJ
- **THEN** en el paso de BJJ "Kimura" se ve como siempre y en el paso de Grappling aparece como nodo nuevo resaltado

### Requirement: Disciplina y filtros durante la vista previa
Durante cada paso de la vista previa el grafo SHALL mostrar la disciplina
de ese paso (la de la importación; en una de "Ambos", BJJ y luego
Grappling), con lo nuevo de ese lado, e ignorar los filtros de tipo,
estado y categoría. Al cancelar o salir MUST volver la disciplina activa
y los filtros que había, sin cambiarlos. Al aceptar, los filtros vuelven y
la disciplina activa pasa a la del último paso.

#### Scenario: Importación de la otra disciplina
- **WHEN** con BJJ activo y un filtro de tipo "Sweep" el usuario llega a la vista previa de una importación de Grappling
- **THEN** el grafo muestra los elementos de Grappling con lo nuevo, sin aplicar el filtro de tipo

#### Scenario: Volver tras cancelar
- **WHEN** el usuario cancela esa vista previa
- **THEN** el mapa vuelve a BJJ con el filtro "Sweep" aplicado

#### Scenario: Volver tras aceptar
- **WHEN** el usuario acepta esa vista previa
- **THEN** el mapa queda en Grappling con el filtro "Sweep" aplicado

#### Scenario: Pasos de una importación de "Ambos"
- **WHEN** con Grappling activo el usuario llega a la vista previa de una importación de "Ambos"
- **THEN** el primer paso muestra el grafo de BJJ con lo nuevo de BJJ y el segundo el de Grappling con lo nuevo de Grappling

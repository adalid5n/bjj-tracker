## MODIFIED Requirements

### Requirement: Confirmar e insertar en el catálogo
"Aceptar" en la vista previa del mapa SHALL crear posiciones, sumisiones y
técnicas marcadas, por ese orden, con la disciplina elegida en la
importación; las técnicas en "Probando". Luego SHALL refrescar el mapa. Si
un elemento no se puede crear, el resto sigue y el usuario MUST ver
cuáles no se crearon y por qué.

> ⚠️ **Bug conocido:** hoy esos elementos se omiten sin avisar. Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Inserción correcta
- **WHEN** el usuario eligió "Grappling" en la importación y pulsa "Aceptar" en la vista previa
- **THEN** los elementos marcados se crean con disciplina Grappling, las técnicas en estado "Probando", y aparecen en el mapa como elementos normales

#### Scenario: Sumisión con nombre ya existente
- **WHEN** una sumisión marcada tiene exactamente el mismo nombre que una existente
- **THEN** no se crea y el usuario ve que esa sumisión no se creó y el motivo

#### Scenario: Técnica idéntica a una existente
- **WHEN** una técnica marcada tiene el mismo nombre, origen y variante que una ya existente
- **THEN** no se crea, el resto sí se crea y el usuario ve que esa técnica no se creó porque ya existía

#### Scenario: Técnica cuyo origen se renombró o desmarcó
- **WHEN** el usuario renombró o desmarcó la posición nueva de la que sale una técnica marcada
- **THEN** esa técnica no se crea y el usuario ve que no se creó porque su origen o destino ya no está disponible

## ADDED Requirements

### Requirement: Disciplina de la importación
El primer paso de la importación SHALL ofrecer un selector BJJ / Grappling
/ Ambos, con la disciplina activa del mapa elegida por defecto. Tocar una
opción MUST elegirla y tocar la ya elegida no cambia nada. Todo lo que se
cree en esa importación lleva la disciplina elegida.

#### Scenario: Disciplina por defecto
- **WHEN** con BJJ activo en el mapa el usuario abre la importación
- **THEN** el selector del primer paso tiene "BJJ" elegido

#### Scenario: Importar para otra disciplina
- **WHEN** con BJJ activo el usuario elige "Grappling" en el primer paso y acepta la importación
- **THEN** todas las posiciones, sumisiones y técnicas creadas tienen disciplina Grappling

#### Scenario: Tocar la disciplina ya elegida
- **WHEN** está elegida "Ambos" y el usuario vuelve a tocar "Ambos"
- **THEN** la disciplina de la importación sigue siendo Ambos

### Requirement: Paso a la vista previa en el mapa
Tras "Añadir detalles", continuar SHALL cerrar la ventana de importación y
cualquier ficha abierta y llevar al usuario al mapa en vista Grafo, en
modo vista previa, con lo que se va a añadir. Nada MUST escribirse en el
catálogo al pasar a la vista previa.

#### Scenario: Llegar a la vista previa desde la vista Lista
- **WHEN** el usuario abrió la importación con la vista Lista activa y continúa desde "Añadir detalles"
- **THEN** la ventana se cierra, el mapa pasa a vista Grafo en modo vista previa y el catálogo no ha cambiado

### Requirement: Aceptar la vista previa
"Aceptar" en la vista previa SHALL insertar lo marcado y dejar al usuario
en el mapa, en vista Grafo, fuera del modo vista previa. La ventana de
importación MUST NOT volver a abrirse.

#### Scenario: Aceptar
- **WHEN** el usuario pulsa "Aceptar" en la vista previa
- **THEN** sigue en el mapa, lo importado ya no late porque forma parte del catálogo y la ventana de importación no se abre

### Requirement: Cancelar la vista previa
"Cancelar" en la vista previa SHALL salir del modo vista previa y volver a
abrir la ventana de importación en "Revisar propuesta", con la selección,
las ediciones, los detalles y la disciplina tal como estaban. Nada MUST
haberse escrito en el catálogo.

#### Scenario: Cancelar y corregir
- **WHEN** el usuario ve en la vista previa una técnica mal enlazada y pulsa "Cancelar"
- **THEN** vuelve a "Revisar propuesta" con todo lo que tenía y puede desmarcar esa técnica

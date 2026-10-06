## MODIFIED Requirements

### Requirement: Generación de la propuesta
Al pulsar "Generar propuesta" la app SHALL enviar el texto interpretado y
los nombres de las posiciones y sumisiones ya existentes en el catálogo de
la disciplina de la importación (el mismo con el que se compara, ver
"Reutilización de lo que ya existe en el catálogo") a la IA, y SHALL
mostrar una propuesta de posiciones, sumisiones y técnicas nuevas con un
resumen corto de lo interpretado. La IA tiene instrucciones de no inventar
técnicas no descritas ni tratar agarres como posiciones.

#### Scenario: Propuesta generada
- **WHEN** la IA responde correctamente
- **THEN** se pasa al paso "Revisar propuesta" con las listas de posiciones, sumisiones y técnicas propuestas y el resumen bajo el título

#### Scenario: Nombres con mayúscula inicial
- **WHEN** la IA propone un nombre que empieza en minúscula
- **THEN** la propuesta lo muestra con la primera letra en mayúscula

#### Scenario: Catálogo enviado según la disciplina
- **WHEN** el usuario genera la propuesta de una importación de Grappling
- **THEN** la IA recibe solo los nombres de las posiciones y sumisiones de Grappling y de "Ambos", no los de BJJ

### Requirement: Reutilización de lo que ya existe en el catálogo
Una posición o sumisión propuesta cuyo nombre coincida con una existente
(ignorando mayúsculas y espacios en los extremos) MUST NOT aparecer como
nueva: se considera ya existente y las técnicas propuestas se enlazan a
ella. La comparación es por nombre exacto; nombres parecidos pero distintos
se tratan como nuevos. Solo se compara con el catálogo de la disciplina de
la importación: BJJ o Grappling → esa disciplina y "Ambos"; "Ambos" → solo
"Ambos". Lo que falta se crea con la disciplina de la importación.

#### Scenario: Posición ya existente
- **WHEN** la IA propone "mount" y en el catálogo existe "Mount"
- **THEN** "Mount" no aparece en la lista de posiciones nuevas y las técnicas que salen de ella se enlazan a la existente

#### Scenario: Nombre parecido pero no igual
- **WHEN** la IA propone "Media guardia" y en el catálogo existe "Media Guardia bottom"
- **THEN** "Media guardia" aparece como posición nueva

#### Scenario: Elemento de "Ambos" en una importación de BJJ
- **WHEN** en una importación de BJJ la IA propone "Mount" y "Mount" existe con disciplina "Ambos"
- **THEN** "Mount" no aparece como nueva y las técnicas se enlazan a la existente

#### Scenario: Mismo nombre solo en la otra disciplina
- **WHEN** en una importación de Grappling la IA propone "Mount" y "Mount" solo existe con disciplina BJJ
- **THEN** "Mount" aparece como posición nueva y, al aceptar, se crea con disciplina Grappling aunque exista la de BJJ

#### Scenario: Importación de "Ambos"
- **WHEN** en una importación de "Ambos" la IA propone "Kimura" y "Kimura" solo existe con disciplina BJJ
- **THEN** "Kimura" aparece como sumisión nueva y, al aceptar, se crea con disciplina "Ambos"

### Requirement: Añadir elementos a mano en la revisión
En el paso de revisión el usuario SHALL poder añadir posiciones,
sumisiones y técnicas manualmente con "+ Añadir". Una técnica manual
MUST elegir tipo, origen y destino entre el catálogo de la disciplina de
la importación (la misma regla que en "Reutilización de lo que ya existe
en el catálogo") y los elementos nuevos marcados, y solo se puede marcar
cuando origen y destino están resueltos.

#### Scenario: Técnica manual completa
- **WHEN** el usuario añade una técnica manual, le da nombre, tipo "Sumisión", origen y sumisión destino existentes y la marca
- **THEN** la técnica se incluirá en la inserción

#### Scenario: Técnica manual incompleta
- **WHEN** a una técnica manual le falta origen o destino
- **THEN** su casilla está deshabilitada

#### Scenario: Orígenes de la otra disciplina
- **WHEN** en una importación de Grappling el usuario elige el origen de una técnica manual y "Mount" solo existe con disciplina BJJ
- **THEN** "Mount" no aparece entre los orígenes posibles; sí aparecen las posiciones de Grappling, las de "Ambos" y las nuevas marcadas

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

### Requirement: Pasos de la vista previa según la disciplina
Una importación de BJJ o de Grappling SHALL tener una sola vista previa,
en esa disciplina. Una de "Ambos" SHALL tener dos vistas previas
seguidas: primero BJJ ("Vista previa 1 de 2 · BJJ") y luego Grappling
("Vista previa 2 de 2 · Grappling"). "Siguiente" avanza y "Atrás" vuelve
al paso anterior sin perder nada. "Aceptar" MUST ofrecerse solo en el
último paso, y nada se escribe en el catálogo antes de pulsarlo.

#### Scenario: Importación de una sola disciplina
- **WHEN** el usuario llega a la vista previa de una importación de Grappling
- **THEN** ve una única vista previa, en Grappling, con "Cancelar" y "Aceptar"

#### Scenario: Importación de "Ambos"
- **WHEN** el usuario llega a la vista previa de una importación de "Ambos"
- **THEN** ve "Vista previa 1 de 2 · BJJ" con "Cancelar" y "Siguiente: Grappling →", sin "Aceptar"

#### Scenario: Avanzar y volver
- **WHEN** en "Vista previa 1 de 2 · BJJ" pulsa "Siguiente: Grappling →" y después "← Atrás"
- **THEN** pasa a "Vista previa 2 de 2 · Grappling" con "← Atrás", "Cancelar" y "Aceptar", y al pulsar "← Atrás" vuelve a la de BJJ sin que se haya escrito nada

### Requirement: Aceptar la vista previa
"Aceptar" en el último paso de la vista previa SHALL insertar lo marcado
una sola vez y dejar al usuario en el mapa, en vista Grafo, fuera del
modo vista previa. La disciplina activa del mapa MUST pasar a ser la de
la importación; en una de "Ambos", la del último paso revisado
(Grappling). La ventana de importación MUST NOT volver a abrirse.

#### Scenario: Aceptar
- **WHEN** el usuario pulsa "Aceptar" en la vista previa
- **THEN** sigue en el mapa, lo importado ya no se resalta porque forma parte del catálogo y la ventana de importación no se abre

#### Scenario: Aceptar una importación de la otra disciplina
- **WHEN** con BJJ activo el usuario acepta la vista previa de una importación de Grappling
- **THEN** el mapa queda con Grappling como disciplina activa y muestra lo recién creado

#### Scenario: Aceptar una importación de "Ambos"
- **WHEN** con BJJ activo el usuario revisa las dos vistas previas de una importación de "Ambos" y pulsa "Aceptar" en la de Grappling
- **THEN** lo marcado se crea una sola vez, con disciplina "Ambos", y el mapa queda con Grappling activo

### Requirement: Cancelar la vista previa
"Cancelar", en cualquier paso de la vista previa, SHALL salir del modo
vista previa y volver a abrir la ventana de importación en "Revisar
propuesta", con la selección, las ediciones, los detalles y la disciplina
tal como estaban. Nada MUST haberse escrito en el catálogo.

#### Scenario: Cancelar y corregir
- **WHEN** el usuario ve en la vista previa una técnica mal enlazada y pulsa "Cancelar"
- **THEN** vuelve a "Revisar propuesta" con todo lo que tenía y puede desmarcar esa técnica

#### Scenario: Cancelar en el segundo paso
- **WHEN** en "Vista previa 2 de 2 · Grappling" el usuario pulsa "Cancelar"
- **THEN** vuelve a "Revisar propuesta" con todo intacto y no se ha creado nada

### Requirement: Paso de vista previa que no se puede mostrar
Si un paso de la vista previa no se puede preparar o algo de la
importación no cabe en el mapa de esa disciplina, el paso SHALL mostrar
"No se puede: <breve descripción>" en lugar de la vista previa, con
"Retroceder" (vuelve a "Revisar propuesta" con todo intacto) y, solo si
hay un paso siguiente, "Seguir con la siguiente disciplina". Ese paso
MUST NOT ofrecer "Aceptar" ni escribir nada en el catálogo.

#### Scenario: Error en el primer paso de "Ambos"
- **WHEN** en una importación de "Ambos" la vista previa de BJJ no se puede preparar
- **THEN** se ve "No se puede:" con el motivo, "Retroceder" y "Seguir con la siguiente disciplina"; al seguir pasa a "Vista previa 2 de 2 · Grappling"

#### Scenario: Error en el único o último paso
- **WHEN** la vista previa de una importación de Grappling no se puede preparar
- **THEN** se ve "No se puede:" con el motivo y solo "Retroceder", sin "Aceptar"

#### Scenario: Retroceder
- **WHEN** el usuario pulsa "Retroceder" en un paso con error
- **THEN** vuelve a "Revisar propuesta" con la selección, las ediciones, los detalles y la disciplina intactos, sin nada creado

### Requirement: Aceptar tras un paso con error
Si el usuario pulsó "Seguir con la siguiente disciplina" en un paso con
error y después pulsa "Aceptar" en el último paso, la app SHALL crear todo
lo marcado excepto los elementos que causaron el error, y el usuario MUST
ver cuáles no se crearon y por qué.

#### Scenario: Seguir y aceptar
- **WHEN** en una importación de "Ambos" el paso de BJJ dio error por la técnica "Armbar", el usuario sigue a Grappling y pulsa "Aceptar"
- **THEN** se crea todo lo marcado salvo "Armbar", y el usuario ve que "Armbar" no se creó y el motivo

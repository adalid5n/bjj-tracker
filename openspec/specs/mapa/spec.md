# mapa Specification

## Purpose
Describe cómo se consulta y se recorre el catálogo técnico en la pantalla
del mapa: vista grafo y vista lista, filtros, disciplina activa,
organización manual del grafo, fichas de detalle y navegación encadenada
entre ellas.

## Requirements

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

### Requirement: Catálogo vacío
Si no hay ninguna posición ni sumisión en el catálogo, la pantalla SHALL
mostrar "Catálogo vacío." con la indicación de pulsar "+ Nuevo", en lugar
de las vistas.

#### Scenario: Primer uso
- **WHEN** el catálogo no tiene posiciones ni sumisiones
- **THEN** se muestra el aviso de catálogo vacío y el botón "Nuevo" sigue disponible

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

### Requirement: Representación del grafo
En el grafo, cada posición y cada sumisión SHALL ser un nodo y cada
técnica MUST ser una flecha de origen a destino. Las sumisiones se
distinguen por un relleno oscuro y solo reciben flechas. El tamaño del
nodo crece con el número de técnicas que entran o salen. Las contras no
se dibujan.

#### Scenario: Técnica de sumisión
- **WHEN** existe una técnica de tipo Sumisión de "Guardia cerrada" a "Kimura"
- **THEN** el grafo muestra una flecha desde el nodo "Guardia cerrada" hasta el nodo oscuro "Kimura"

#### Scenario: Posición sin técnicas
- **WHEN** una posición no tiene técnicas y no hay filtros activos
- **THEN** aparece como nodo aislado de tamaño mínimo

### Requirement: Estilo de las flechas
Todas las flechas SHALL tener el mismo color. Las transiciones MUST
dibujarse con línea discontinua y las técnicas descartadas con línea
punteada, fina y atenuada; el resto de tipos y estados se ven igual. Un
botón "?" SHALL abrir una leyenda con estas convenciones.

#### Scenario: Técnica descartada
- **WHEN** una técnica está en estado "Descartada"
- **THEN** su flecha se ve punteada, más fina y semitransparente

#### Scenario: Consultar la leyenda
- **WHEN** el usuario pulsa el botón "?" del grafo
- **THEN** ve la leyenda: acción (ataque, sweep, escape, sumisión) en línea continua y transición en discontinua

### Requirement: Filtros del grafo
El grafo SHALL ofrecer filtros de selección múltiple por tipo de técnica,
estado de técnica y categoría de posición; sin selección no se filtra. Una
flecha se ve si pasa los filtros y sus dos extremos están visibles. Con
algún filtro activo, MUST ocultarse cualquier nodo sin flechas visibles.

#### Scenario: Filtrar por tipo
- **WHEN** el usuario selecciona solo "Sweep" en el filtro de tipo
- **THEN** solo se ven las flechas de sweep y los nodos que conectan

#### Scenario: Filtrar por categoría
- **WHEN** el usuario selecciona solo la categoría "Guardia"
- **THEN** se ocultan las posiciones de otras categorías y las flechas que las tocan

### Requirement: Organizar el grafo a mano
La disposición inicial del grafo SHALL calcularse automáticamente. Con el
modo "Mover nodos" activo, el usuario puede arrastrar nodos (tocar un nodo
no abre su ficha) y pulsar "Reorganizar" para recalcular todo. Los cambios
MUST NOT guardarse hasta pulsar "Guardar organización", que aparece
mientras haya cambios pendientes.

#### Scenario: Mover y guardar
- **WHEN** el usuario activa "Mover nodos", arrastra un nodo y pulsa "Guardar organización"
- **THEN** la nueva posición del nodo se mantiene en visitas posteriores

#### Scenario: Fuera del modo mover
- **WHEN** el modo "Mover nodos" está desactivado y el usuario arrastra sobre un nodo
- **THEN** se desplaza el lienzo, no el nodo

#### Scenario: Nodos nuevos
- **WHEN** se añade un elemento nuevo al catálogo que no tiene posición guardada
- **THEN** se coloca automáticamente sin mover los nodos ya guardados y aparece "Guardar organización"

### Requirement: Aviso al abandonar cambios del grafo
Con cambios de organización sin guardar, cambiar a la vista Lista o
navegar a otra pantalla de la app MUST pedir confirmación "¿Descartar
cambios del grafo?". Recargar o cerrar la página no avisa.

#### Scenario: Ir a Lista con cambios
- **WHEN** hay cambios sin guardar y el usuario pulsa "Lista"
- **THEN** aparece la confirmación y solo cambia de vista si elige "Descartar"

### Requirement: Lista de posiciones
La pestaña Posiciones SHALL listar las posiciones agrupadas por categoría
en el orden Guardia, Control, Transición, Otro, omitiendo grupos vacíos.
Cada posición MUST mostrar nombre, tipo de rol si lo tiene, categoría y
sus etiquetas.

#### Scenario: Ver posiciones
- **WHEN** el usuario abre Lista › Posiciones
- **THEN** ve las posiciones agrupadas por categoría con sus etiquetas de color

### Requirement: Lista de técnicas
La pestaña Técnicas SHALL listar las técnicas por orden alfabético de
nombre y variante, mostrando origen → destino, el tipo y el estado solo
si no es "Probando". SHALL permitir filtrar por uno o varios tipos. No
hay botón de crear en esta pestaña.

#### Scenario: Filtrar por tipo en la lista
- **WHEN** el usuario marca "Escape" en los chips de tipo
- **THEN** solo ve las técnicas de tipo Escape

### Requirement: Lista de sumisiones
La pestaña Sumisiones SHALL listar las sumisiones por orden alfabético.
Pulsar una MUST abrir su ficha.

#### Scenario: Abrir sumisión desde la lista
- **WHEN** el usuario pulsa una sumisión en Lista › Sumisiones
- **THEN** se abre la ficha de esa sumisión

### Requirement: Buscador de la vista Lista
La vista Lista SHALL incluir un buscador que filtra por nombre (y por
variante en Técnicas) sin distinguir mayúsculas, en la pestaña activa.
Sin coincidencias MUST mostrar "Sin resultados para …". El grafo no
tiene buscador.

#### Scenario: Búsqueda sin resultados
- **WHEN** el usuario escribe un texto que no coincide con ninguna posición
- **THEN** ve "Sin resultados para" seguido de lo que escribió

### Requirement: Etiquetado masivo de posiciones
En Lista › Posiciones, el modo "Seleccionar" SHALL permitir marcar varias
posiciones y aplicarles o quitarles una etiqueta existente de una vez. No
existe filtro por etiqueta.

#### Scenario: Añadir etiqueta a varias
- **WHEN** el usuario pulsa "Seleccionar", marca tres posiciones, elige una etiqueta en "+ Añadir tag…" y pulsa "Aplicar"
- **THEN** las tres posiciones muestran esa etiqueta

### Requirement: Ficha de posición
Al abrir una posición SHALL mostrarse su rol, categoría, etiquetas y
notas (si hay), y sus técnicas salientes en pestañas por tipo (solo las
que tienen contenido), cada una con destino y número de contras. Si tiene
complementaria, MUST mostrar "Vista del oponente" con las técnicas que
salen de ella y un botón para ir a ella.

#### Scenario: Posición con complementaria
- **WHEN** el usuario abre "Mount top" vinculada con "Mount bottom"
- **THEN** ve sus técnicas por tipo y la sección "Vista del oponente — desde Mount bottom"

#### Scenario: Posición sin técnicas
- **WHEN** de la posición no sale ninguna técnica
- **THEN** ve "Aún no hay técnicas desde esta posición." y el botón para crear una

### Requirement: Ficha de técnica
Al abrir una técnica SHALL mostrarse tipo, estado, variante, origen y
destino (navegables), detalles y errores comunes si existen, sus contras
conocidas y las otras técnicas con el mismo nombre ("Otras variantes de
…"), cada una con su origen y el nombre de su variante si la tiene.

> ⚠️ **Bug conocido:** hoy "Otras variantes de …" muestra el texto literal "(variante)" en lugar del nombre de la variante. Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Técnica sin contras
- **WHEN** la técnica no tiene contras
- **THEN** la sección muestra "Contras conocidas (0)", "Sin contras registradas." y el botón "+ Añadir contra"

#### Scenario: Otras variantes con nombre de variante
- **WHEN** existe otra técnica con el mismo nombre y variante "del profe X"
- **THEN** en "Otras variantes de …" aparece con "(del profe X)" junto a su origen

### Requirement: Ficha de sumisión
Al abrir una sumisión SHALL mostrarse sus notas (si hay) y las técnicas
que llegan a ella agrupadas por posición de origen.

#### Scenario: Sumisión sin técnicas
- **WHEN** ninguna técnica llega a la sumisión
- **THEN** se muestra "Aún no hay técnicas que lleven aquí."

### Requirement: Navegación encadenada entre fichas
Tocar un nodo, flecha o elemento de lista SHALL abrir su ficha. Desde
una ficha, pulsar otra entidad MUST abrirla encima, con ruta de migas y
"Atrás"; volver a una entidad ya en la ruta retrocede hasta ella. Salir
de un asistente con cambios sin guardar, también por las migas, MUST
pedir confirmación.

> ⚠️ **Bug conocido:** hoy pulsar una miga con un asistente sin guardar retrocede sin confirmar. Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Recorrido encadenado
- **WHEN** el usuario abre una posición, luego una de sus técnicas y luego una contra
- **THEN** la ruta muestra los tres pasos y "Atrás" vuelve a la técnica anterior

#### Scenario: Volver al origen desde la técnica
- **WHEN** desde la posición A el usuario abre una técnica que sale de A y pulsa su origen
- **THEN** vuelve a la ficha de A sin añadir un tercer paso a la ruta

#### Scenario: Miga con asistente sin guardar
- **WHEN** hay un asistente abierto con cambios sin guardar y el usuario pulsa una miga de la ruta
- **THEN** aparece "¿Descartar cambios?" y solo retrocede si confirma

### Requirement: Fichas junto al grafo
En la vista Grafo las fichas SHALL abrirse en un panel lateral (pantalla
ancha) o inferior (móvil) que deja el grafo visible y usable. El grafo
MUST desplazarse para centrar el nodo o la flecha de la ficha abierta y
resaltarlo, sin cambiar el zoom. En la vista Lista las fichas se abren
como ventana centrada.

#### Scenario: Abrir técnica desde el grafo en móvil
- **WHEN** en móvil el usuario toca una flecha del grafo
- **THEN** la ficha se abre en un panel inferior y el grafo centra y resalta esa flecha en la parte visible

#### Scenario: Cerrar la ficha
- **WHEN** el usuario cierra la ficha
- **THEN** el grafo se queda donde estaba

### Requirement: Vista previa de importación en el grafo
Durante la vista previa de una importación, el grafo del mapa SHALL
mostrar el catálogo existente junto con lo que se va a añadir: posiciones
y sumisiones nuevas como nodos y técnicas nuevas como flechas. Lo nuevo
MUST destacarse con un color que respira: pasa suavemente de su color
normal al color de resaltado (amarillo vivo, en el borde de los nodos con un halo exterior, y en la línea de las flechas) y vuelve, de forma continua y sin
cambiar de tamaño. Una posición o sumisión existente que recibe una
técnica nueva no se resalta; solo la flecha.

#### Scenario: Técnica nueva entre posiciones existentes
- **WHEN** la importación añade un sweep de "Guardia cerrada" a "Mount", que ya existen
- **THEN** solo la flecha del sweep se resalta; los nodos "Guardia cerrada" y "Mount" se ven como siempre

#### Scenario: Posición nueva
- **WHEN** la importación añade la posición nueva "Dogfight" y una técnica que llega a ella
- **THEN** el nodo "Dogfight" y la flecha pasan suavemente de su color normal al de resaltado y vuelven, sin hacerse más grandes

### Requirement: Leyenda de la vista previa
Durante la vista previa, el mapa SHALL mostrar una barra fija, siempre
visible también en móvil, con el indicador del paso ("Vista previa 1 de
1 · Grappling", "Vista previa 1 de 2 · BJJ"…), el recuento de lo nuevo
por tipo (p. ej. "2 posiciones, 1 sumisión y 3 técnicas nuevas",
omitiendo los tipos a cero) y los botones del paso: "Cancelar" siempre;
"← Atrás" si hay paso anterior; "Siguiente: <disciplina> →" si hay paso
siguiente; "Aceptar" solo en el último.

#### Scenario: Recuento
- **WHEN** la importación añade 2 posiciones, ninguna sumisión y 3 técnicas
- **THEN** la leyenda indica 2 posiciones y 3 técnicas nuevas y no menciona sumisiones

#### Scenario: Barra del primer paso de "Ambos"
- **WHEN** empieza la vista previa de una importación de "Ambos"
- **THEN** la barra muestra "Vista previa 1 de 2 · BJJ", "Cancelar" y "Siguiente: Grappling →", sin "Aceptar"

#### Scenario: Barra del último paso de "Ambos"
- **WHEN** el usuario pasa al segundo paso de una importación de "Ambos"
- **THEN** la barra muestra "Vista previa 2 de 2 · Grappling", "← Atrás", "Cancelar" y "Aceptar"

### Requirement: Movimiento reducido en la vista previa
Si el sistema del usuario pide reducir el movimiento, la vista previa
SHALL destacar lo nuevo con el mismo color de resaltado fijo, sin
animación.

#### Scenario: Reducir movimiento activado
- **WHEN** el dispositivo tiene activada la preferencia de reducir movimiento y empieza una vista previa
- **THEN** lo nuevo se ve con el color de resaltado fijo, sin animación

### Requirement: Disciplina y filtros durante la vista previa
Durante cada paso de la vista previa el grafo SHALL mostrar la disciplina
de ese paso (la de la importación; en una de "Ambos", BJJ y luego
Grappling) e ignorar los filtros de tipo, estado y categoría. Al cancelar
o salir MUST volver la disciplina activa y los filtros que había, sin
cambiarlos. Al aceptar, los filtros vuelven y la disciplina activa pasa a
la del último paso.

#### Scenario: Importación de la otra disciplina
- **WHEN** con BJJ activo y un filtro de tipo "Sweep" el usuario llega a la vista previa de una importación de Grappling
- **THEN** el grafo muestra los elementos de Grappling y Ambos con lo nuevo, sin aplicar el filtro de tipo

#### Scenario: Volver tras cancelar
- **WHEN** el usuario cancela esa vista previa
- **THEN** el mapa vuelve a BJJ con el filtro "Sweep" aplicado

#### Scenario: Volver tras aceptar
- **WHEN** el usuario acepta esa vista previa
- **THEN** el mapa queda en Grappling con el filtro "Sweep" aplicado

#### Scenario: Pasos de una importación de "Ambos"
- **WHEN** con Grappling activo el usuario llega a la vista previa de una importación de "Ambos"
- **THEN** el primer paso muestra el grafo de BJJ (BJJ y Ambos) y el segundo el de Grappling (Grappling y Ambos), ambos con lo nuevo

### Requirement: Acciones bloqueadas durante la vista previa
Durante la vista previa el mapa MUST NOT permitir acciones que cambien
datos u organización ni que salgan del grafo: mover nodos, reorganizar,
guardar organización, crear elementos, abrir fichas, abrir el historial,
cambiar a Lista ni cambiar de disciplina. Desplazar y hacer zoom sí.

#### Scenario: Tocar un nodo en la vista previa
- **WHEN** durante la vista previa el usuario toca un nodo
- **THEN** no se abre ninguna ficha

#### Scenario: Organización sin guardar
- **WHEN** había cambios de organización sin guardar antes de la vista previa
- **THEN** durante la vista previa no se puede guardar, y al terminar los cambios pendientes siguen ahí sin incluir posiciones de elementos no creados

### Requirement: Salir del mapa durante la vista previa
Navegar a otra pantalla, recargar o cerrar la app durante la vista previa
SHALL equivaler a cancelarla sin volver a la ventana: no se escribe nada
en el catálogo, se pierde el borrador en curso y la importación queda en
el historial como "Sin terminar".

#### Scenario: Ir al inicio durante la vista previa
- **WHEN** durante la vista previa el usuario pulsa otra pantalla en la barra de navegación
- **THEN** navega sin crear nada y la importación aparece en el historial como "Sin terminar", lista para "Reintentar"

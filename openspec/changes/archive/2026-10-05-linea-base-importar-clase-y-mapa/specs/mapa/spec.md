# Spec Delta

## Purpose

Describe cómo se consulta y se recorre el catálogo técnico en la pantalla
del mapa: vista grafo y vista lista, filtros, disciplina activa,
organización manual del grafo, fichas de detalle y navegación encadenada
entre ellas.

## ADDED Requirements

### Requirement: Vistas Grafo y Lista
La pantalla del mapa SHALL ofrecer dos vistas, Grafo y Lista, con un
selector siempre visible arriba. Al entrar en la pantalla MUST mostrarse
la vista Grafo. La vista elegida no se recuerda al salir de la pantalla.

#### Scenario: Entrar en el mapa
- **WHEN** el usuario abre la pantalla del mapa
- **THEN** ve la vista Grafo

#### Scenario: Cambiar a Lista
- **WHEN** el usuario pulsa "Lista"
- **THEN** ve la lista con las pestañas Posiciones, Técnicas y Sumisiones

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
Las fichas de detalle no filtran por disciplina.

#### Scenario: Cambiar a Grappling
- **WHEN** el usuario pulsa el selector y pasa de BJJ a Grappling
- **THEN** el grafo y las listas muestran solo elementos de Grappling o de Ambos

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

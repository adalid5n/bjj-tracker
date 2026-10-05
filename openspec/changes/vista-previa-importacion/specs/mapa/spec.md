## ADDED Requirements

### Requirement: Vista previa de importación en el grafo
Durante la vista previa de una importación, el grafo del mapa SHALL
mostrar el catálogo existente junto con lo que se va a añadir: posiciones
y sumisiones nuevas como nodos y técnicas nuevas como flechas. Lo nuevo
MUST destacarse con un color que late, sin cambiar de tamaño. Una posición
o sumisión existente que recibe una técnica nueva no late; solo late la
flecha.

#### Scenario: Técnica nueva entre posiciones existentes
- **WHEN** la importación añade un sweep de "Guardia cerrada" a "Mount", que ya existen
- **THEN** solo la flecha del sweep late; los nodos "Guardia cerrada" y "Mount" se ven como siempre

#### Scenario: Posición nueva
- **WHEN** la importación añade la posición nueva "Dogfight" y una técnica que llega a ella
- **THEN** el nodo "Dogfight" y la flecha laten con el color de resaltado y no son más grandes por ello

### Requirement: Leyenda de la vista previa
Durante la vista previa, el mapa SHALL mostrar una leyenda fija, siempre
visible también en móvil, con el recuento de lo nuevo por tipo (p. ej. "2
posiciones, 1 sumisión y 3 técnicas nuevas", omitiendo los tipos a cero)
y los botones "Aceptar" y "Cancelar".

#### Scenario: Recuento
- **WHEN** la importación añade 2 posiciones, ninguna sumisión y 3 técnicas
- **THEN** la leyenda indica 2 posiciones y 3 técnicas nuevas y no menciona sumisiones

### Requirement: Movimiento reducido en la vista previa
Si el sistema del usuario pide reducir el movimiento, la vista previa
SHALL destacar lo nuevo con el mismo color de resaltado fijo, sin
animación.

#### Scenario: Reducir movimiento activado
- **WHEN** el dispositivo tiene activada la preferencia de reducir movimiento y empieza una vista previa
- **THEN** lo nuevo se ve con el color de resaltado, sin latir

### Requirement: Disciplina y filtros durante la vista previa
Durante la vista previa el grafo SHALL mostrar la disciplina elegida en la
importación (si es "Ambos", la disciplina activa) e ignorar los filtros de
tipo, estado y categoría. Al salir de la vista previa MUST volver la
disciplina activa y los filtros que había, sin haberlos cambiado.

#### Scenario: Importación de la otra disciplina
- **WHEN** con BJJ activo y un filtro de tipo "Sweep" el usuario llega a la vista previa de una importación de Grappling
- **THEN** el grafo muestra los elementos de Grappling y Ambos con lo nuevo, sin aplicar el filtro de tipo

#### Scenario: Volver tras cancelar
- **WHEN** el usuario cancela esa vista previa
- **THEN** el mapa vuelve a BJJ con el filtro "Sweep" aplicado

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

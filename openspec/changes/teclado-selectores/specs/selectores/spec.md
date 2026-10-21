## ADDED Requirements

### Requirement: Abrir una lista con buscador sin teclado
En los selectores que despliegan una lista con buscador (origen y destino
de una técnica, sumisión destino, posición complementaria, añadir contra),
abrir el selector SHALL mostrar la lista sin poner el cursor en el buscador,
de modo que en el móvil MUST NOT abrirse el teclado. El teclado SHALL
abrirse solo cuando el usuario toca el campo de búsqueda. Con teclado
físico, las flechas y Enter SHALL seguir moviéndose por la lista y eligiendo,
y teclear una letra SHALL empezar a buscar. Los campos donde escribir es la
acción principal (compañero del roll) mantienen su comportamiento.

#### Scenario: Elegir el origen en el móvil
- **WHEN** el usuario abre el selector de posición de origen en el asistente de técnica desde el móvil
- **THEN** ve la lista de posiciones sin que se abra el teclado y puede elegir una tocándola

#### Scenario: Buscar en la lista
- **WHEN** con el selector abierto el usuario toca "Buscar posición…"
- **THEN** se abre el teclado y lo que escribe filtra la lista

#### Scenario: Teclado físico
- **WHEN** el usuario abre el selector en un ordenador y pulsa flecha abajo y Enter, o teclea letras
- **THEN** las flechas recorren la lista y Enter elige; las letras escriben en el buscador y filtran

#### Scenario: Compañero del roll
- **WHEN** el usuario toca el campo de compañero de un roll
- **THEN** el campo recibe el cursor para escribir, como hasta ahora

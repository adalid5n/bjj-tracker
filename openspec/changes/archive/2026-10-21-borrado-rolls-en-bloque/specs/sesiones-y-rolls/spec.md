## ADDED Requirements

### Requirement: Seleccionar varios rolls
La pantalla de rolls SHALL ofrecer un modo selección, al que se entra
con el botón "Seleccionar" o manteniendo pulsado un roll (≈ medio
segundo, con dedo o ratón). Mantener pulsado un roll fuera del modo MUST
entrar en él con ese roll ya marcado, sin abrir su editor; desplazar la
lista MUST NOT activar la selección. En ese modo, tocar un roll MUST marcarlo o desmarcarlo
sin abrir su editor, y la app MUST mostrar cuántos hay marcados. Solo se
pueden marcar los rolls visibles con los filtros actuales: cambiar un
filtro vacía la selección.

#### Scenario: Marcar dos rolls
- **WHEN** el usuario toca "Seleccionar" y después toca dos rolls
- **THEN** ambos se ven marcados, se indica "2 seleccionados" y no se abre ningún editor

#### Scenario: Entrar en selección manteniendo pulsado un roll
- **WHEN** fuera del modo selección el usuario mantiene pulsado un roll y lo suelta
- **THEN** la app entra en modo selección con ese roll marcado, indica "1 seleccionado" y no se abre ningún editor

#### Scenario: Desplazar la lista no selecciona
- **WHEN** el usuario apoya el dedo sobre un roll y desplaza la lista
- **THEN** la lista se desplaza, no se entra en modo selección y no se abre ningún editor

#### Scenario: Desmarcar un roll
- **WHEN** el usuario vuelve a tocar un roll marcado
- **THEN** el roll queda desmarcado y el contador baja en uno

#### Scenario: Cambiar un filtro con rolls marcados
- **WHEN** hay rolls marcados y el usuario cambia un filtro
- **THEN** la selección queda vacía

### Requirement: Borrar varios rolls con confirmación
Con rolls marcados, la app SHALL ofrecer "Borrar (N)", desactivado si no
hay ninguno marcado. Al pulsarlo MUST pedir confirmación con el diálogo
de la app, avisando de que no se puede deshacer y de que se borran
también sus posiciones y técnicas marcadas. Al confirmar se borran todos
o ninguno, la app sale del modo selección y la lista y el análisis se
actualizan.

#### Scenario: Confirmar el borrado
- **WHEN** hay tres rolls marcados, el usuario pulsa "Borrar (3)" y confirma
- **THEN** los tres rolls desaparecen de la lista junto con sus posiciones y técnicas marcadas, y la app sale del modo selección

#### Scenario: Cancelar la confirmación
- **WHEN** en la misma situación el usuario cancela la confirmación
- **THEN** no se borra nada y los tres rolls siguen marcados

#### Scenario: Sin rolls marcados
- **WHEN** el usuario está en modo selección sin ningún roll marcado
- **THEN** "Borrar" está desactivado

### Requirement: Salir del modo selección
El usuario SHALL poder salir del modo selección con "Cancelar"; al salir
MUST quedar la selección vacía y tocar un roll vuelve a abrir su editor.

#### Scenario: Cancelar la selección
- **WHEN** hay dos rolls marcados y el usuario toca "Cancelar"
- **THEN** no se borra nada, no queda ningún roll marcado y tocar un roll abre su editor

### Requirement: Borrar un roll desde su editor
Al borrar un roll desde su editor (en la pantalla de rolls o en la de una
sesión), la app SHALL pedir confirmación con su propio diálogo, no con un
aviso del navegador. Si el usuario confirma, el roll se borra y el editor
se cierra; si cancela, el editor sigue abierto sin cambios.

#### Scenario: Confirmar el borrado de un roll
- **WHEN** el usuario pulsa "Borrar" en el editor de un roll y confirma
- **THEN** el roll se borra y el editor se cierra

#### Scenario: Cancelar el borrado de un roll
- **WHEN** el usuario pulsa "Borrar" en el editor de un roll y cancela
- **THEN** el editor sigue abierto con el roll sin cambios

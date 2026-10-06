# Spec Delta

## Purpose

Define la disciplina (BJJ, Grappling o ambas) de las sesiones de entreno y
de sus rolls, y cómo condiciona qué parte del catálogo técnico se ofrece al
anotar un roll. Solo cubre ese comportamiento; el resto de sesiones y
rolls sigue descrito en `docs/spec/REQUISITOS.md`.

## ADDED Requirements

### Requirement: Disciplina de una sesión
Cada sesión SHALL tener disciplina BJJ, Grappling o Ambos (clase mixta).
Al crear una sesión la disciplina MUST partir de la disciplina activa del
mapa y el usuario puede cambiarla, también al editarla. Es un selector
obligatorio: tocar una opción la elige y tocar la ya elegida no cambia
nada. La disciplina se muestra junto al tipo en la sesión y en el inicio.

#### Scenario: Disciplina por defecto
- **WHEN** con Grappling activo en el mapa el usuario crea una sesión sin tocar la disciplina
- **THEN** la sesión se guarda con disciplina Grappling

#### Scenario: Clase mixta
- **WHEN** el usuario crea una sesión eligiendo "Ambos"
- **THEN** la sesión se guarda como Ambos y en el inicio se ve su disciplina junto al tipo

#### Scenario: Tocar la disciplina ya elegida
- **WHEN** el usuario edita una sesión con BJJ elegido y vuelve a tocar "BJJ"
- **THEN** la disciplina sigue siendo BJJ

### Requirement: Tipo de sesión
El tipo de una sesión SHALL ser Clase u Open mat, independiente de su
disciplina (BJJ y Grappling dejan de ser tipos). El filtro "Tipo sesión"
de la pantalla de rolls MUST ofrecer Clase y Open mat. Las sesiones
existentes de tipo BJJ o Grappling pasan a Clase con esa disciplina.

#### Scenario: Crear una clase de Grappling
- **WHEN** el usuario crea una sesión de tipo Clase con disciplina Grappling
- **THEN** en el inicio se ve como "Clase · Grappling"

#### Scenario: Sesión antigua de tipo BJJ
- **WHEN** existía una sesión de tipo BJJ antes de actualizar
- **THEN** tras actualizar es de tipo Clase y disciplina BJJ, salvo que sus rolls indiquen otra cosa (ver "Disciplina de sesiones y rolls existentes")

### Requirement: Disciplina de un roll
Cada roll SHALL tener disciplina BJJ o Grappling, nunca Ambos. Al crearlo
MUST partir de la disciplina de su sesión; si la sesión es Ambos, de la
disciplina activa del mapa. El usuario puede cambiarla al crear o editar
el roll, con el mismo selector obligatorio.

#### Scenario: Roll en una sesión de Grappling
- **WHEN** el usuario añade un roll a una sesión de Grappling
- **THEN** el roll empieza con disciplina Grappling

#### Scenario: Roll en una clase mixta
- **WHEN** con BJJ activo en el mapa el usuario añade un roll a una sesión Ambos
- **THEN** el roll empieza con disciplina BJJ y puede cambiarla a Grappling

#### Scenario: Sin opción Ambos
- **WHEN** el usuario elige la disciplina de un roll
- **THEN** solo puede elegir BJJ o Grappling

### Requirement: Catálogo que ofrece el roll
Los selectores de posiciones y técnicas de un roll ("Fue bien" y "Fue
mal") SHALL ofrecer solo elementos de la disciplina del roll.

#### Scenario: Roll de Grappling
- **WHEN** el usuario elige posiciones en un roll de Grappling
- **THEN** solo ve posiciones de Grappling, aunque existan otras con el mismo nombre en BJJ

### Requirement: Cambiar la disciplina de un roll con elementos elegidos
Si el roll ya tiene posiciones o técnicas elegidas y el usuario cambia su
disciplina, la app MUST pedir confirmación avisando de que se quitarán.
Si confirma, la disciplina cambia y la selección queda vacía; si no, nada
cambia.

#### Scenario: Confirmar el cambio
- **WHEN** un roll de BJJ tiene dos posiciones elegidas, el usuario toca "Grappling" y confirma
- **THEN** el roll pasa a Grappling sin posiciones ni técnicas elegidas

#### Scenario: Cancelar el cambio
- **WHEN** en la misma situación el usuario cancela la confirmación
- **THEN** el roll sigue en BJJ con sus dos posiciones

#### Scenario: Sin elementos elegidos
- **WHEN** el roll no tiene nada elegido y el usuario cambia su disciplina
- **THEN** cambia sin pedir confirmación

### Requirement: Crear elementos desde el roll
Al crear una posición o técnica desde el roll, el asistente SHALL ofrecer
como disciplina la del roll o "Ambos". El roll MUST quedar enlazado con el
elemento de su disciplina (con "Ambos", con la copia de su disciplina).

#### Scenario: Crear posición Ambos desde un roll de BJJ
- **WHEN** en un roll de BJJ el usuario crea la posición "Dogfight" eligiendo "Ambos"
- **THEN** se crean "Dogfight" de BJJ y de Grappling y el roll queda enlazado con la de BJJ

### Requirement: Rolls con elementos de otra disciplina
Un roll guardado antes de esta regla que esté enlazado con elementos de
otra disciplina SHALL conservarlos: al editarlo se muestran elegidos,
marcados como de otra disciplina, y el usuario puede quitarlos. Guardar
sin tocarlos MUST NOT quitarlos.

#### Scenario: Editar un roll antiguo
- **WHEN** el usuario edita un roll de BJJ enlazado con una técnica de Grappling
- **THEN** ve la técnica elegida con la indicación de que es de Grappling y, si guarda sin quitarla, sigue enlazada

### Requirement: Disciplina de sesiones y rolls existentes
Al actualizar la app, cada roll existente SHALL recibir la disciplina de
sus elementos enlazados de una sola disciplina si todos coinciden en
Grappling, y BJJ en otro caso; si no tiene ninguno, la del tipo antiguo de
su sesión (BJJ o Grappling) o BJJ si era Open mat. Sus enlaces a
elementos "Ambos" pasan a la copia de su disciplina. Cada sesión SHALL
recibir la de sus rolls si coinciden, Ambos si se mezclan y, sin rolls, la
de su tipo antiguo (BJJ si era Open mat).

#### Scenario: Roll con técnicas de Grappling
- **WHEN** un roll tenía enlazadas solo técnicas de Grappling
- **THEN** tras actualizar el roll es de Grappling

#### Scenario: Roll con elementos Ambos
- **WHEN** un roll de Grappling estaba enlazado con "Mount" "Ambos"
- **THEN** tras actualizar está enlazado con la "Mount" de Grappling

#### Scenario: Roll sin elementos en una sesión de Grappling
- **WHEN** un roll sin posiciones ni técnicas enlazadas pertenece a una sesión de tipo Grappling
- **THEN** tras actualizar el roll es de Grappling

#### Scenario: Sesión con rolls de las dos disciplinas
- **WHEN** una sesión tiene un roll que pasa a BJJ y otro que pasa a Grappling
- **THEN** tras actualizar la sesión es Ambos

#### Scenario: Sesión sin rolls
- **WHEN** una sesión de tipo Open mat no tiene rolls
- **THEN** tras actualizar la sesión es BJJ

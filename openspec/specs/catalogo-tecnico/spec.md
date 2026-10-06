# catalogo-tecnico Specification

## Purpose
Define las piezas del mapa técnico (posiciones, técnicas, sumisiones
terminales, contras, complementarias, etiquetas y disciplina) y las reglas
que la app aplica al crearlas, editarlas y borrarlas.

## Requirements

### Requirement: Datos de una posición
Una posición SHALL tener nombre obligatorio, categoría (Guardia, Control,
Transición u Otro; "Otro" si no se elige), tipo de rol opcional (Ofensiva,
Defensiva o Neutral), disciplina, etiquetas opcionales, complementaria
opcional y notas opcionales.

#### Scenario: Crear posición con lo mínimo
- **WHEN** el usuario crea una posición indicando solo el nombre y avanza sin elegir categoría ni rol
- **THEN** la posición se guarda con categoría "Otro" y sin tipo de rol

### Requirement: Nombre de posición sin duplicados en el asistente
El asistente de posición MUST impedir avanzar si ya existe otra posición
con el mismo nombre, sin distinguir mayúsculas, mostrando "Ya existe una
posición con ese nombre.".

#### Scenario: Nombre repetido
- **WHEN** el usuario escribe "guardia cerrada" y ya existe "Guardia cerrada"
- **THEN** el asistente muestra "Ya existe una posición con ese nombre." y no avanza

### Requirement: Datos de una técnica
Una técnica SHALL tener nombre obligatorio, variante opcional, posición de
origen obligatoria, tipo obligatorio (Ataque, Sumisión, Sweep, Transición
o Escape), destino obligatorio, estado (Probando, Funciona o Descartada;
"Probando" si no se elige), disciplina, y detalles y errores comunes
opcionales.

#### Scenario: Estado por defecto
- **WHEN** el usuario crea una técnica y pasa el paso de estado sin elegir
- **THEN** la técnica se guarda en estado "Probando"

### Requirement: Toda técnica lleva a un destino según su tipo
Una técnica de tipo Sumisión MUST tener como destino una sumisión
terminal. Una técnica de cualquier otro tipo MUST tener como destino una
posición. No se puede guardar una técnica sin destino. La app no impide
que el destino sea la misma posición de origen.

#### Scenario: Técnica de sumisión
- **WHEN** el usuario elige tipo "Sumisión"
- **THEN** el paso de destino solo ofrece sumisiones terminales

#### Scenario: Cambio de tipo entre ramas
- **WHEN** el usuario tenía tipo "Sweep" con destino elegido y cambia a "Sumisión"
- **THEN** el destino elegido se borra y debe elegir una sumisión

#### Scenario: Destino igual al origen
- **WHEN** el usuario elige como destino la misma posición que el origen
- **THEN** la técnica se guarda sin aviso

### Requirement: Técnica única por nombre, origen y variante
La app MUST impedir que existan dos técnicas con el mismo nombre, la
misma posición de origen y la misma variante (sin variante cuenta como variante vacía). Un
nombre ya usado con otro origen o variante SHALL permitirse, con un aviso
informativo que no bloquea.

#### Scenario: Duplicado exacto
- **WHEN** el usuario crea una técnica con nombre, origen y variante iguales a una existente
- **THEN** el asistente vuelve al paso de nombre con "Ya existe una técnica con ese mismo nombre, origen y variante." y no guarda

#### Scenario: Mismo nombre desde otro origen
- **WHEN** el usuario escribe un nombre que ya existe desde otra posición
- **THEN** ve un aviso "Ya existe … desde …" pero puede continuar y guardar

### Requirement: Sumisión terminal
Una sumisión terminal SHALL tener nombre obligatorio y único (sin
distinguir mayúsculas en el asistente), disciplina y notas opcionales. Es
un punto final: MUST NOT ser origen de ninguna técnica.

#### Scenario: Nombre de sumisión repetido
- **WHEN** el usuario intenta crear "kimura" y ya existe "Kimura"
- **THEN** el asistente muestra "Ya existe una sumisión con ese nombre." y no avanza

### Requirement: Posiciones complementarias
Una posición SHALL poder vincularse con otra como su complementaria (la
misma situación vista desde el otro practicante). El vínculo MUST ser
mutuo y único: al vincular A con B, B queda vinculada con A y se rompen
los vínculos previos de ambas. Solo se ofrecen posiciones libres o ya
vinculadas a la que se edita.

#### Scenario: Vincular dos posiciones
- **WHEN** el usuario edita "Mount top" y elige "Mount bottom" como complementaria
- **THEN** ambas posiciones quedan vinculadas entre sí

#### Scenario: Crear la complementaria al vuelo
- **WHEN** en el paso de complementaria el usuario pulsa "Crear nueva posición" y la guarda
- **THEN** la nueva posición queda vinculada como complementaria de la que se estaba creando o editando

#### Scenario: Borrar una de las dos
- **WHEN** se borra una posición que tenía complementaria
- **THEN** la otra queda sin complementaria

### Requirement: Contras de una técnica
Una técnica SHALL poder tener contras: otras técnicas que la responden. La
relación MUST ser de un solo sentido (que A sea contra de B no hace a B
contra de A). Desde la ficha de una técnica se añaden contras eligiendo
una técnica existente o creando una nueva, y se quitan con confirmación.

#### Scenario: Añadir contra existente
- **WHEN** en la ficha de una técnica el usuario pulsa "+ Añadir contra" y elige otra técnica
- **THEN** esa técnica aparece en "Contras conocidas" y no vuelve a ofrecerse en el selector

#### Scenario: Crear contra nueva
- **WHEN** el usuario elige "Crear nueva técnica" desde "+ Añadir contra" y la guarda
- **THEN** vuelve a la ficha original con la nueva técnica añadida como contra; si el origen tiene complementaria, el asistente la propone como origen

#### Scenario: Quitar contra
- **WHEN** el usuario pulsa ✕ en una contra y confirma "Quitar contra"
- **THEN** se elimina solo el vínculo; ambas técnicas siguen existiendo

### Requirement: Etiquetas de posición
Las posiciones SHALL poder llevar etiquetas de color. Desde el asistente
de posición se marcan etiquetas existentes o se crea una nueva con nombre
y color de una paleta fija. Las etiquetas solo se aplican a posiciones.

#### Scenario: Crear etiqueta en el asistente
- **WHEN** en el paso de etiquetas el usuario pulsa "+ Crear tag", escribe un nombre, elige color y pulsa "Crear"
- **THEN** la etiqueta se crea y queda marcada para la posición

### Requirement: Disciplina de cada elemento
Cada posición, técnica y sumisión SHALL tener disciplina BJJ, Grappling o
Ambos. Al crear desde los asistentes, la disciplina MUST partir de la
disciplina activa del mapa y el usuario puede cambiarla. En el asistente,
tocar una disciplina MUST elegirla y tocar la ya elegida MUST NOT cambiarla.

#### Scenario: Disciplina por defecto
- **WHEN** la disciplina activa es Grappling y el usuario crea una posición sin tocar la disciplina
- **THEN** la posición se guarda con disciplina Grappling

#### Scenario: Elemento para ambas disciplinas
- **WHEN** el usuario elige "Ambos" al crear una técnica
- **THEN** la técnica se verá tanto con BJJ como con Grappling activo

#### Scenario: Tocar la disciplina ya elegida
- **WHEN** en el asistente de posición está elegida "Grappling" y el usuario vuelve a tocar "Grappling"
- **THEN** la disciplina sigue siendo Grappling

### Requirement: Puntos de creación
Posiciones y sumisiones SHALL crearse desde el botón "Nuevo" del mapa. Las
técnicas MUST crearse desde la ficha de una posición ("+ Nueva técnica
desde esta posición", con el origen ya elegido) o como contra desde la
ficha de una técnica. Durante el asistente de técnica se pueden crear al
vuelo la posición o sumisión de destino.

#### Scenario: Crear destino al vuelo
- **WHEN** en el paso de destino del asistente de técnica el usuario pulsa "Crear nueva posición" y la guarda
- **THEN** vuelve al asistente de técnica con lo ya rellenado y la nueva posición elegida como destino

#### Scenario: Tras crear
- **WHEN** el usuario guarda una posición, sumisión o técnica nueva desde el mapa (sin venir de otro asistente)
- **THEN** se abre la ficha del elemento recién creado

### Requirement: Asistente al crear, formulario al editar
Crear SHALL hacerse con un asistente paso a paso (con pasos opcionales que
se pueden pasar con "Continuar"). Editar SHALL mostrar todos los campos a
la vez en un formulario. Salir con cambios sin guardar MUST pedir
confirmación "¿Descartar cambios?".

#### Scenario: Editar
- **WHEN** el usuario pulsa "Editar" en la ficha de una técnica
- **THEN** ve un formulario con todos los campos; al guardar vuelve a la ficha

#### Scenario: Salir con cambios
- **WHEN** el usuario ha escrito en un asistente y pulsa cerrar o atrás
- **THEN** aparece "¿Descartar cambios?" y solo sale si confirma

### Requirement: Campos extra en modo avanzado
En modo avanzado los asistentes SHALL mostrar pasos adicionales: notas en
posición y sumisión; detalles y errores comunes en técnica. En modo
hobbyist esos pasos MUST NOT mostrarse y, al editar, se conserva el valor
que ya tuviera. Las fichas muestran esos textos si existen, en ambos modos.

#### Scenario: Técnica en modo hobbyist
- **WHEN** el modo avanzado está desactivado y el usuario crea una técnica
- **THEN** el asistente no ofrece detalles ni errores comunes y se guardan vacíos

#### Scenario: Editar en hobbyist conserva notas
- **WHEN** una posición tiene notas y el usuario la edita con modo hobbyist
- **THEN** las notas no se muestran en el formulario y se conservan al guardar

### Requirement: Borrar una posición
Borrar una posición MUST estar bloqueado mientras salgan técnicas de ella
o lleguen técnicas a ella (se listan para poder ir a ellas) o esté marcada
como problema en algún roll (se explica el motivo). En otro caso SHALL
pedir confirmación y, tras borrar, cerrar la ficha.

> ⚠️ **Bug conocido:** hoy una posición que solo es destino de técnicas no se bloquea; al confirmar el borrado falla con un error técnico. Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Posición con técnicas salientes
- **WHEN** la posición tiene técnicas que salen de ella
- **THEN** el botón Borrar está deshabilitado y se muestra "Borra antes…" con enlaces a esas técnicas

#### Scenario: Posición que es solo destino
- **WHEN** la posición no tiene técnicas salientes ni rolls pero es destino de alguna técnica
- **THEN** el botón Borrar está deshabilitado y se explica el motivo nombrando las técnicas que llegan a ella, con enlaces a ellas

### Requirement: Borrar una técnica
Borrar una técnica MUST estar bloqueado si es contra de otra técnica
(se explica el motivo). En otro caso SHALL pedir confirmación; al borrar
desaparecen también sus propias contras como vínculos.

#### Scenario: Técnica que es contra de otra
- **WHEN** la técnica figura como contra de otra técnica
- **THEN** el botón Borrar está deshabilitado con el motivo "Esta técnica es contra de … técnica(s)"

### Requirement: Borrar una sumisión
Borrar una sumisión MUST estar bloqueado mientras alguna técnica llegue a
ella (se listan esas técnicas). En otro caso SHALL pedir confirmación.

#### Scenario: Sumisión con técnicas que llegan
- **WHEN** alguna técnica tiene esa sumisión como destino
- **THEN** el botón Borrar está deshabilitado y se listan las técnicas a borrar antes

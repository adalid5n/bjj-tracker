## MODIFIED Requirements

### Requirement: Borrar una posición
Borrar una posición MUST estar bloqueado mientras salgan técnicas de ella
o lleguen técnicas a ella (se listan para poder ir a ellas) o esté marcada
como problema en algún roll (se explica el motivo). El mensaje de bloqueo
SHALL empezar por "Si quieres borrar esta posición, …" y decir qué hay que
hacer antes. En otro caso SHALL pedir confirmación y, tras borrar, cerrar la
ficha.

> ⚠️ **Bug conocido:** hoy una posición que solo es destino de técnicas no se bloquea; al confirmar el borrado falla con un error técnico. Ver `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)".

#### Scenario: Posición con técnicas salientes
- **WHEN** la posición tiene técnicas que salen de ella
- **THEN** el botón Borrar está deshabilitado y se muestra "Si quieres borrar esta posición, borra antes las técnicas que salen de ella:" (o "la técnica que sale de ella" si es una) con enlaces a esas técnicas

#### Scenario: Posición que es solo destino
- **WHEN** la posición no tiene técnicas salientes ni rolls pero es destino de alguna técnica
- **THEN** el botón Borrar está deshabilitado y se explica el motivo nombrando las técnicas que llegan a ella, con enlaces a ellas

#### Scenario: Posición marcada como problema en rolls
- **WHEN** la posición no tiene técnicas pero algún roll la marca como problema
- **THEN** el botón Borrar está deshabilitado con el motivo "Si quieres borrar esta posición, quítala antes de los … rolls que la usan"

### Requirement: Borrar una técnica
Borrar una técnica MUST estar bloqueado si es contra de otra técnica
(se explica el motivo). En otro caso SHALL pedir confirmación; al borrar
desaparecen también sus propias contras como vínculos.

#### Scenario: Técnica que es contra de otra
- **WHEN** la técnica figura como contra de otra técnica
- **THEN** el botón Borrar está deshabilitado con el motivo "Si quieres borrar esta técnica, quítala antes como contra de las … técnicas que la tienen como contra"

### Requirement: Borrar una sumisión
Borrar una sumisión MUST estar bloqueado mientras alguna técnica llegue a
ella (se listan esas técnicas). En otro caso SHALL pedir confirmación.

#### Scenario: Sumisión con técnicas que llegan
- **WHEN** alguna técnica tiene esa sumisión como destino
- **THEN** el botón Borrar está deshabilitado y se muestra "Si quieres borrar esta sumisión, borra antes las técnicas que llegan a ella:" (o "la técnica que llega a ella" si es una) con enlaces a esas técnicas

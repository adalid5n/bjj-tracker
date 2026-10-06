## MODIFIED Requirements

### Requirement: Sumisión terminal
Una sumisión terminal SHALL tener nombre obligatorio, disciplina y notas
opcionales. El nombre MUST ser único dentro de su disciplina (sin
distinguir mayúsculas en el asistente): puede existir una sumisión con el
mismo nombre en otra disciplina (p. ej. "Kimura" de BJJ y "Kimura" de
Grappling, o "Kimura" de Ambos). Es un punto final: MUST NOT ser origen de
ninguna técnica.

#### Scenario: Nombre de sumisión repetido
- **WHEN** el usuario intenta crear "kimura" con disciplina BJJ y ya existe "Kimura" con disciplina BJJ
- **THEN** el asistente muestra "Ya existe una sumisión con ese nombre." y no avanza

#### Scenario: Mismo nombre en otra disciplina
- **WHEN** el usuario crea "Kimura" con disciplina Grappling y "Kimura" solo existe con disciplina BJJ
- **THEN** la sumisión se crea y quedan dos "Kimura", una por disciplina

#### Scenario: Sumisiones existentes al actualizar la app
- **WHEN** el usuario abre la app tras la actualización con sumisiones y técnicas ya guardadas
- **THEN** todas las sumisiones siguen con su nombre, notas y disciplina, y las técnicas que llevaban a ellas siguen llevando a ellas

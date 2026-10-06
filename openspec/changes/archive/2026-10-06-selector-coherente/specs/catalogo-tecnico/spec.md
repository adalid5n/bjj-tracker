## MODIFIED Requirements

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

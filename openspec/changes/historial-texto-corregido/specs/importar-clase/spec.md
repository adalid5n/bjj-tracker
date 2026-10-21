## MODIFIED Requirements

### Requirement: Refinar la propuesta con IA
En el paso de revisión el usuario SHALL poder escribir correcciones en
lenguaje natural y pulsar "Refinar propuesta". La IA rehace la propuesta
a partir del texto interpretado tal como lo dejó el usuario (el mismo con
el que se generó la propuesta, no la descripción original), la propuesta
anterior y las correcciones. La nueva propuesta MUST sustituir por
completo a la anterior, incluidas ediciones y elementos añadidos a mano.

#### Scenario: Refinado aplicado
- **WHEN** el usuario escribe "Electric Chair es categoría otro" y pulsa "Refinar propuesta"
- **THEN** las listas se regeneran con la propuesta refinada y el campo de correcciones se vacía

#### Scenario: Refinar respeta las correcciones del texto
- **WHEN** el usuario cambió "dog fight" por "Dogfight" en el texto interpretado, generó la propuesta y pulsa "Refinar propuesta"
- **THEN** la IA recibe el texto con "Dogfight", no el dictado original

#### Scenario: Se pierden ediciones previas
- **WHEN** el usuario había renombrado una posición o añadido una técnica manual antes de refinar
- **THEN** tras el refinado esas ediciones ya no están

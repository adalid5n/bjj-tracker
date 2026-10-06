## Purpose
Regla común para todos los selectores de opción única de la app (vistas, disciplina, campos obligatorios), para que se comporten igual en todas las pantallas.

## ADDED Requirements

### Requirement: Selector de opción única obligatoria
En cualquier selector de opción única donde siempre debe haber una opción elegida (vista Grafo/Lista, disciplina, tipo de sesión, resultado de un roll), tocar una opción SHALL elegir esa opción, y tocar la opción ya elegida MUST NOT cambiar nada ni dejar el campo vacío. Los selectores de campos opcionales mantienen su comportamiento: volver a tocar la opción elegida la desmarca.

#### Scenario: Tocar el tipo de sesión ya elegido
- **WHEN** el usuario edita una sesión con tipo elegido y vuelve a tocar ese mismo tipo
- **THEN** el tipo sigue elegido y el usuario puede continuar

#### Scenario: Tocar el resultado de un roll ya elegido
- **WHEN** el usuario edita un roll con resultado elegido y vuelve a tocar ese mismo resultado
- **THEN** el resultado sigue elegido y no aparece el aviso de campo obligatorio

#### Scenario: Campo opcional
- **WHEN** el usuario vuelve a tocar la categoría ya elegida de una posición
- **THEN** la categoría se desmarca, como hasta ahora

## ADDED Requirements

### Requirement: Refinar los detalles de una técnica con IA
Donde se editan los detalles de una técnica (paso Detalles del asistente y
formulario de edición), SHALL haber un botón "Refinar con IA" que envía el
texto a la IA para corregir ortografía y gramática y, si ayuda, ordenarlo en
pasos cortos o viñetas, conservando el vocabulario del usuario. La IA MUST
NOT añadir técnicas, pasos, detalles ni consejos que no estén en el texto
original, ni quitar información. El nombre, tipo, origen y destino de la
técnica se usan solo como contexto. El resultado SHALL mostrarse como
propuesta antes de sustituir nada; el texto del campo MUST NOT cambiar hasta
que el usuario acepte.

#### Scenario: Refinar y aceptar
- **WHEN** el usuario escribe detalles, pulsa "Refinar con IA" y, tras el indicador de carga, pulsa "Aceptar" en la propuesta
- **THEN** el campo Detalles pasa a contener el texto propuesto

#### Scenario: Refinar y descartar
- **WHEN** el usuario pulsa "Descartar" en la propuesta
- **THEN** la propuesta desaparece y el campo conserva el texto original

#### Scenario: No inventa contenido
- **WHEN** el texto original menciona solo dos pasos de la técnica
- **THEN** la propuesta contiene esos dos pasos, mejor redactados, sin pasos ni consejos nuevos

#### Scenario: Sin texto, sin conexión o sin IA
- **WHEN** el campo Detalles está vacío, no hay conexión o la IA no está configurada
- **THEN** el botón "Refinar con IA" está desactivado y un texto explica el motivo

#### Scenario: Error de la IA
- **WHEN** la IA tarda demasiado o responde con error
- **THEN** se muestra un aviso explicando el problema y el campo conserva su texto

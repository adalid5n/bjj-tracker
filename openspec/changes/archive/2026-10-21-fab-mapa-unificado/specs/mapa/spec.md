## MODIFIED Requirements

### Requirement: Catálogo vacío
Si no hay ninguna posición ni sumisión en el catálogo, la pantalla SHALL
mostrar "Catálogo vacío." con la indicación de pulsar el botón "+", en lugar
de las vistas. El botón de crear del mapa SHALL ser el mismo botón flotante
redondo "+" que en Inicio y Compañeros.

#### Scenario: Primer uso
- **WHEN** el catálogo no tiene posiciones ni sumisiones
- **THEN** se muestra el aviso de catálogo vacío y el botón "+" sigue disponible

#### Scenario: Mismo botón de crear que el resto de la app
- **WHEN** el usuario abre el mapa
- **THEN** el botón de crear es el botón flotante redondo "+" de Inicio y Compañeros, y al pulsarlo ofrece Nueva posición, Nueva sumisión e Importar de clase

#### Scenario: El botón "+" no parpadea al cambiar de pantalla
- **WHEN** el usuario pasa de Inicio a Compañeros o al Mapa
- **THEN** el botón "+" se mantiene fijo en su sitio, como el menú inferior, sin desaparecer y volver a aparecer; mientras la pantalla carga no responde

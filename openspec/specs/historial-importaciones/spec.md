# historial-importaciones Specification

## Purpose
Guarda cada importación de clase (el texto analizado y lo que se creó en
el catálogo) para poder consultarla, copiarla, repetirla sin volver a
dictar y usarla como diario de entreno.

## Requirements

### Requirement: Registro al analizar
Al pulsar "Analizar clase", la app SHALL guardar una entrada de historial
con la fecha y el texto analizado antes de esperar la respuesta de la IA,
en estado "Sin terminar". Volver a analizar en la misma ventana, o en una
importación abierta con "Reintentar", MUST actualizar esa misma entrada:
el texto guardado pasa a ser el último analizado.

#### Scenario: Se guarda aunque la IA no responda
- **WHEN** el usuario pulsa "Analizar clase" y cierra la ventana antes de que la IA conteste
- **THEN** el historial tiene una entrada con ese texto

#### Scenario: Volver y analizar de nuevo
- **WHEN** el usuario analiza, pulsa "Volver", cambia el texto y analiza otra vez sin cerrar la ventana
- **THEN** el historial tiene una sola entrada, con el último texto analizado

### Requirement: Contenido de cada entrada
Cada entrada SHALL guardar solo el texto analizado y, si se confirmó la
inserción, lo aceptado: los elementos que realmente se crearon en el
catálogo. Si una importación reintentada se confirma otra vez, lo nuevo
MUST sumarse a lo aceptado anterior, de modo que la entrada refleja todo
lo que esa importación ha creado. El texto interpretado y la propuesta de
la IA MUST NOT guardarse.

#### Scenario: Importación confirmada
- **WHEN** el usuario confirma la inserción
- **THEN** la entrada guarda como "aceptado" las posiciones, sumisiones y técnicas que se crearon

#### Scenario: Reintentar una importación ya importada
- **WHEN** una entrada "Importada" que creó "Mount" se reintenta y al confirmar se crea la técnica "Armbar"
- **THEN** el bloque "Aceptado" de esa entrada incluye "Mount" y "Armbar"

#### Scenario: Propuesta no guardada
- **WHEN** el usuario genera una propuesta y cierra la ventana sin confirmar
- **THEN** la entrada solo tiene el texto analizado; la propuesta no se puede consultar después

### Requirement: Estado de cada importación
Cada entrada SHALL tener uno de tres estados: "Importada" si se confirmó
la inserción; "Falló" si el último paso intentado terminó en error y no
se avanzó después; "Sin terminar" en cualquier otro caso (en curso,
cerrada o cancelada sin insertar).

#### Scenario: Error de la IA sin reintento
- **WHEN** al generar la propuesta la IA da error y el usuario cierra la ventana
- **THEN** la entrada queda en estado "Falló"

#### Scenario: Error y reintento con éxito
- **WHEN** la IA da error, el usuario vuelve a pulsar el botón y esta vez la propuesta se genera
- **THEN** la entrada queda en estado "Sin terminar"

#### Scenario: Cancelar la importación
- **WHEN** el usuario cierra la ventana en la revisión de la propuesta sin confirmar
- **THEN** la entrada queda en estado "Sin terminar"

### Requirement: Título de la importación
Cada entrada SHALL tener un título corto. Lo propone la IA en la misma
petición con la que interpreta el texto, sin peticiones adicionales, y se
actualiza con cada nuevo análisis de la entrada. Si la IA nunca llegó a
responder, el título MUST ser las primeras palabras del texto analizado.

#### Scenario: Título de la IA
- **WHEN** la IA interpreta el texto correctamente
- **THEN** la entrada muestra el título corto propuesto por la IA

#### Scenario: Sin respuesta de la IA
- **WHEN** el análisis falla y la IA no ha respondido nunca en esa importación
- **THEN** el título son las primeras palabras del texto analizado

### Requirement: Acceso al historial desde el mapa
La barra superior del mapa SHALL tener un icono de historial que abre el
panel de importaciones: lateral en pantalla ancha e inferior en móvil,
como las fichas. El icono MUST estar disponible también con el catálogo
vacío.

#### Scenario: Abrir el historial en móvil
- **WHEN** en móvil el usuario pulsa el icono de historial
- **THEN** se abre el panel inferior con la lista de importaciones

#### Scenario: Catálogo vacío con importaciones fallidas
- **WHEN** el catálogo está vacío y existe una importación que falló
- **THEN** el icono de historial está visible y el panel muestra esa importación

### Requirement: Lista del historial
El panel SHALL listar las importaciones de la más reciente a la más
antigua, como tarjetas plegadas que muestran título, fecha y estado. Tocar
una tarjeta MUST desplegarla o plegarla; solo hay una desplegada a la vez. Sin importaciones, el panel
muestra un aviso de historial vacío.

#### Scenario: Orden de las tarjetas
- **WHEN** hay importaciones del lunes y del miércoles
- **THEN** la del miércoles aparece primero

#### Scenario: Una tarjeta abierta a la vez
- **WHEN** hay una tarjeta desplegada y el usuario toca otra
- **THEN** la nueva se despliega y la anterior se pliega

#### Scenario: Historial vacío
- **WHEN** nunca se ha analizado ninguna clase
- **THEN** el panel indica que aún no hay importaciones

### Requirement: Detalle de una importación
Una tarjeta desplegada SHALL mostrar dos bloques: "Texto" (el último
texto analizado) y "Aceptado" (lista legible de las posiciones,
sumisiones y técnicas creadas). Si la importación no llegó a confirmarse,
el bloque "Aceptado" MUST NOT mostrarse.

#### Scenario: Importación sin terminar
- **WHEN** el usuario despliega una importación que se cerró sin confirmar
- **THEN** ve solo el bloque "Texto"

#### Scenario: Importación confirmada
- **WHEN** el usuario despliega una importación en estado "Importada"
- **THEN** ve los bloques "Texto" y "Aceptado"

### Requirement: Copiar un bloque
Cada bloque de una tarjeta desplegada SHALL tener un botón de copiar que
copia solo el contenido de ese bloque y muestra "Copiado ✓" durante unos
segundos. La fecha MUST NOT copiarse.

#### Scenario: Copiar el texto
- **WHEN** el usuario pulsa copiar en el bloque "Texto"
- **THEN** el portapapeles contiene exactamente el texto analizado y el botón muestra "Copiado ✓"

### Requirement: Formato legible al copiar lo aceptado
Al copiar el bloque "Aceptado", el contenido SHALL ser una lista en texto
legible (posiciones, sumisiones y técnicas con su origen y destino),
nunca datos en formato técnico.

#### Scenario: Copiar lo aceptado
- **WHEN** el usuario copia el bloque "Aceptado" de una importación que creó "Armbar" de "Mount" a la sumisión "Armbar"
- **THEN** el texto copiado incluye una línea legible como "Armbar: Mount → Armbar (Sumisión)" y no contiene llaves ni comillas de datos

### Requirement: Reintentar una importación
Cada tarjeta desplegada SHALL tener "Reintentar", que cierra el panel y
abre la importación en el primer paso con el texto guardado ya escrito y
editable. La importación reintentada MUST seguir usando la misma entrada
del historial, sin crear otra.

#### Scenario: Reintentar una importación fallida
- **WHEN** el usuario pulsa "Reintentar" en una importación en estado "Falló"
- **THEN** se abre la importación con el texto guardado en el campo de descripción, listo para editar o analizar

#### Scenario: Reintentar con el texto editado
- **WHEN** el usuario reintenta, corrige el texto y pulsa "Analizar clase"
- **THEN** el historial sigue teniendo una sola entrada para esa importación, ahora con el texto corregido

### Requirement: Borrar una importación
Cada tarjeta desplegada SHALL tener una opción para borrarla que pide
confirmación antes de borrar. Borrar una entrada MUST NOT tocar los
elementos que esa importación creó en el catálogo.

#### Scenario: Borrar con confirmación
- **WHEN** el usuario pulsa borrar en una entrada y confirma
- **THEN** la entrada desaparece del historial y las posiciones, sumisiones y técnicas que creó siguen en el mapa

#### Scenario: Cancelar el borrado
- **WHEN** el usuario pulsa borrar y luego cancela
- **THEN** la entrada sigue en el historial

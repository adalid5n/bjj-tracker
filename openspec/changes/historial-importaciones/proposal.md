# Proposal

## Why

Hoy importar una clase no deja rastro: el texto dictado, lo que entendió
la IA y lo que se creó se pierden al cerrar la ventana. Si la IA se
equivoca o falla la conexión, hay que volver a dictar la clase entera, y
no hay forma de saber después qué creó cada importación. Guardar cada
importación resuelve las dos cosas y, de paso, convierte el historial en
un **diario de entreno**: qué se trabajó cada día, contado con tus
palabras.

## What Changes

- Cada importación se guarda **en cuanto el usuario pulsa "Analizar
  clase"** (con el texto original) y se va completando según avanza:
  texto interpretado, propuesta de la IA, lo aceptado (lo que se creó en
  el catálogo) y su estado: **Importada**, **Sin terminar** o **Falló**.
- Cada entrada lleva un **título corto** que la IA genera en la misma
  petición que ya hace al analizar (sin llamadas extra). Si la IA nunca
  llegó a responder, el título son las primeras palabras del texto
  original.
- Nuevo **icono de historial en la barra del mapa** que abre un panel
  (lateral en pantalla ancha, inferior en móvil, como las fichas). Las
  entradas salen de más reciente a más antigua como tarjetas desplegables:
  plegada muestra título, fecha y estado.
- Al desplegar una tarjeta se ven los bloques **texto original**, **texto
  interpretado**, **propuesta** y **aceptado**, cada uno con botón de
  copiar ("Copiado ✓"). La propuesta y lo aceptado se copian como lista
  legible, no como datos técnicos. La fecha no se copia.
- **Reintentar**: abre la importación con el texto original ya escrito y
  editable.
- **Borrar** una entrada, con confirmación.
- El historial viaja en la **copia de seguridad** (Exportar / Importar
  datos de Ajustes), así sobrevive a un cambio de dispositivo.
- **Se arregla la copia de seguridad**, que hoy pierde datos: no exporta
  las etiquetas ni qué posiciones las llevan, y al restaurar todas las
  posiciones, sumisiones y técnicas vuelven a "BJJ". Tras este cambio la
  copia restaura el catálogo completo con etiquetas y disciplina, y el
  historial. Se siguen aceptando ficheros de la versión anterior (con
  historial vacío).
- El aviso al cerrar una importación ya analizada pasa a ser "¿Cerrar?
  Quedará en el historial como Sin terminar".
- **BREAKING (spec):** desaparece la regla actual "Sin historial de
  importaciones" del spec `importar-clase`.

## Decisiones (owner, cerradas)

- Se guarda al pulsar "Analizar"; se actualiza por fases; tres estados:
  Importada / Sin terminar / Falló.
- Título generado por la IA en la petición que ya existe; sin llamada
  extra. Respaldo: primeras palabras del texto original.
- Acceso desde un icono en la barra del mapa; panel lateral (escritorio) o
  inferior (móvil), mismo patrón que las fichas.
- Tarjetas desplegables, más recientes primero; plegada = título + fecha +
  estado.
- Desplegada: cuatro bloques copiables con "Copiado ✓"; propuesta y
  aceptado como lista legible; la fecha no se copia.
- "Reintentar" abre el importador con el texto original precargado y
  editable.
- Borrar una entrada con confirmación.
- El historial entra en la exportación/importación de datos existente.
- En este mismo change se arregla la pérdida de datos de la copia de
  seguridad (etiquetas y disciplina) y se siguen aceptando ficheros de la
  versión anterior con historial vacío.
- Texto del aviso al cerrar tras analizar: "¿Cerrar? Quedará en el
  historial como Sin terminar".
- Sirve como diario de entreno.

## Fuera de alcance

- Revertir (deshacer) una importación ya confirmada.
- Editar entradas del historial.
- Buscar o filtrar en el historial.
- Enlazar entradas con el calendario o con sesiones.
- Arreglar los fallos conocidos de la línea base de importar (ver
  `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación (baseline)").

## Capabilities

### New Capabilities

- `historial-importaciones`: registro persistente de cada importación de
  clase, su consulta, copia, reintento y borrado.
- `copia-seguridad`: qué contiene el fichero de exportar/importar datos de
  Ajustes y cómo se restaura (incluido el historial). Capacidad propia y
  plana (no anidada en el historial) porque la copia es transversal: cubre
  entrenos, catálogo, ajustes e historial, y ningún spec existente la
  describe; meterla en `historial-importaciones` escondería requisitos
  que no son del historial.

### Modified Capabilities

- `importar-clase`:
  - "Acceso a la importación desde el mapa": deja de ser el único punto de
    entrada (se añade "Reintentar" desde el historial).
  - "Texto interpretado revisable": la misma petición devuelve también un
    título corto.
  - "Cancelar con confirmación": cerrar ya no borra el rastro; la entrada
    queda en el historial y el aviso cambia de texto.
  - Se elimina "Sin historial de importaciones".

## Impact

- **Usuario:** nada se pierde al cerrar la importación; puede repetir una
  importación sin redictar y consultar sus clases pasadas.
- **Datos:** nueva tabla en la BD local (migración nueva). El fichero de
  copia gana el historial, las etiquetas y la disciplina restaurada; los
  ficheros de la versión anterior siguen importándose.
- **Código:** `ImportarClaseDialog.svelte`, `src/lib/ai.ts`,
  `src/routes/mapa/+page.svelte`, `src/lib/db/schema.ts`,
  `src/lib/sync.ts`, nuevo DAO y nuevo componente de panel.

# Iteración 7 — Importar clase 2.0

**Versión:** 1.0 (sesión 50, 2026-10-05)
**Estado:** 📝 Abierta — plan
**Predecesor:** Iteración 6 (cerrada con `v0.6-it6`, 2026-05-20) + pulido entre iteraciones (cambio de modelo de IA a `openai/gpt-oss-120b`, línea base OpenSpec de `importar-clase`, `catalogo-tecnico` y `mapa`).

---

## OBJETIVO

Que importar una clase deje de ser un disparo a ciegas y de un solo uso:

1. **Selector coherente.** BJJ / Grappling se comporta como Grafo / Lista
   (tocar = elegir esa opción). Pequeño, va primero.
2. **Historial de importaciones.** Cada importación se guarda desde que se
   pulsa "Analizar" (solo el texto analizado y lo aceptado, más título y
   estado), se consulta desde el mapa, se copia, se reintenta sin
   redictar (en la misma entrada) y viaja en la copia de seguridad, que además se arregla
   (hoy pierde etiquetas y disciplina). Sirve de diario de entreno.
3. **Vista previa en el mapa + disciplina de la importación.** El usuario
   elige BJJ / Grappling / Ambos al empezar la importación; antes de
   escribir nada ve en el grafo real del mapa lo que se va a añadir,
   resaltado con un color que late, y acepta o vuelve a la revisión. Lo
   que ya existe se busca solo en el catálogo de esa disciplina; una
   importación de "Ambos" se revisa en dos vistas previas (BJJ y
   Grappling).
4. **"Ambos" como copias y disciplina en los entrenos.** "Ambos" deja de
   ser un elemento compartido: crea dos elementos independientes (uno de
   BJJ y otro de Grappling) y los existentes se separan al actualizar.
   Sesiones (BJJ / Grappling / Ambos) y rolls (BJJ / Grappling) pasan a
   tener disciplina, y el roll solo ofrece el catálogo de la suya.

**Por qué ahora:**
- Tras el primer uso real con `gpt-oss-120b` (sesión 50) quedó claro que
  la IA se equivoca de formas que solo se ven en el grafo (origen =
  destino, técnica colgando de la posición equivocada) y que, cuando falla,
  hay que redictar la clase entera porque no queda nada guardado.
- La línea base OpenSpec de `importar-clase` ya está escrita: es el
  momento de probar el flujo SDD sobre la capacidad que más va a cambiar.
- El selector de disciplina que alterna confunde justo en el flujo que
  depende de la disciplina; y las disciplinas deben quedar aisladas, así
  que la importación tiene que elegir la suya explícitamente.

**Lo que NO entra en esta iteración:**
- **Revertir importaciones** ya confirmadas (queda en backlog; decisión
  abierta sobre qué hacer si lo creado ya se editó o se usó en un roll).
- **Bugs de la línea base** listados en `.claude/MEJORAS_FUTURAS.md` →
  "Fallos catálogo e importación (baseline)" (inserción que omite en
  silencio, error técnico `GROQ_KEY_MISSING`, "(variante)" literal, miga
  sin confirmación, borrar posición que solo es destino). Siguen marcados
  como "⚠️ Bug conocido" en los specs.
- **Panel de alertas** de calidad del catálogo (origen = destino, nombres
  casi duplicados): it.8.
- **Técnicas sin destino.** Se mantiene la regla "toda técnica lleva a
  algún sitio".
- Editar entradas del historial, buscar/filtrar en él o enlazarlo con el
  calendario.

**Criterio de cierre:**
1. T-1.it7 … T-4.it7 cerradas con commit en `main` y **sus cuatro
   changes archivados** (`openspec/specs/` actualizado).
2. Tag `v0.7-it7` aplicado y bump `0.6.x` → `0.7.0` (migración de schema +
   cambios funcionales visibles).
3. `ESTADO_ACTUAL.md` y `CHANGELOG.md` actualizados.
4. Verificación manual del owner en `pnpm preview` (tablet y escritorio).
5. Evaluación del piloto SDD/OpenSpec anotada (ver Riesgos).

---

## ALCANCE FUNCIONAL

### T-1.it7 — Selector coherente

**Estado:** ✅ Cerrada 2026-10-06 — change archivado (`openspec/changes/archive/2026-10-06-selector-coherente`). Ampliada por decisión del owner a "Tipo *" (sesión) y "Resultado *" (roll); nueva capacidad transversal `selectores`.
**Change OpenSpec:** [`openspec/changes/selector-coherente/`](../../openspec/changes/selector-coherente/proposal.md)

**Qué entrega:** regla única para selectores de "una opción obligatoria
entre varias": tocar elige esa opción; tocar la activa no hace nada.
Afecta al selector BJJ / Grappling del mapa y al selector de disciplina
de los asistentes de posición, sumisión y técnica (hoy, re-tocar
"Grappling" o "Ambos" lo cambia a BJJ). Inventario completo de selectores
revisados en el `design.md` del change.

**Specs:** MODIFIED `mapa` ("Vistas Grafo y Lista", "Disciplina activa"),
MODIFIED `catalogo-tecnico` ("Disciplina de cada elemento").

---

### T-2.it7 — Historial de importaciones

**Estado:** ✅ Cerrada 2026-10-06 — validada por el owner en preview; change archivado (`openspec/changes/archive/2026-10-06-historial-importaciones`). Nuevas capacidades `historial-importaciones` y `copia-seguridad`.
**Change OpenSpec:** [`openspec/changes/historial-importaciones/`](../../openspec/changes/historial-importaciones/proposal.md)

**Qué entrega:** registro de cada importación desde "Analizar" que guarda
solo el texto (el último analizado) y lo aceptado (lo creado de verdad),
más título, estado (Importada / Sin terminar / Falló), error y fechas; el
texto interpretado y la propuesta no se guardan. Título corto de la IA en
la petición existente, icono en la barra del mapa que abre un panel
(lateral/inferior) con tarjetas desplegables, copiar por bloque (Texto y
Aceptado), Reintentar (reutiliza la misma entrada), borrar con confirmación, nuevo aviso al
cerrar ("¿Cerrar? La importación queda guardada en el historial") e inclusión
en la copia de seguridad. **Arregla la copia de seguridad**: hoy no
exporta etiquetas (`tags`, `posicion_tags`) y al restaurar pierde la
disciplina de posiciones, sumisiones y técnicas; se siguen aceptando
ficheros de la versión anterior (historial vacío). Migración de BD nueva
(v10) al final de `MIGRATIONS`.

**Specs:** nuevas capacidades `historial-importaciones` y
`copia-seguridad` (ADDED); `importar-clase` MODIFIED ("Acceso a la
importación desde el mapa", "Texto interpretado revisable", "Cancelar con
confirmación") y REMOVED ("Sin historial de importaciones").

---

### T-3.it7 — Vista previa en el mapa y disciplina de la importación

**Estado:** 🟡 Pendiente. Tras T-1 (selector) y T-2 (comparten el diálogo).
**Change OpenSpec:** [`openspec/changes/vista-previa-importacion/`](../../openspec/changes/vista-previa-importacion/proposal.md)

**Qué entrega:**
- Selector BJJ / Grappling / Ambos en el primer paso de la importación
  (por defecto la disciplina activa; tocar elige, tocar la activa no hace
  nada); todo lo creado lleva esa disciplina. Va en este change porque la
  vista previa depende de ella.
- Comparación con el catálogo (y catálogo enviado a la IA) por
  disciplina: BJJ o Grappling → esa + "Ambos"; "Ambos" → solo "Ambos". Lo
  que falta se crea con la disciplina de la importación (pueden aparecer
  duplicados entre disciplinas; los avisará el panel de alertas de la
  it.8).
- Al confirmar, la ventana (y cualquier ficha) se cierra y el usuario
  queda en `/mapa`, vista Grafo, viendo el grafo real con lo nuevo
  latiendo (color, no tamaño; las posiciones existentes no laten; color
  fijo con "reducir movimiento"; token semántico nuevo).
- Pasos: BJJ o Grappling → una vista previa; "Ambos" → dos seguidas
  ("Vista previa 1 de 2 · BJJ" → "Vista previa 2 de 2 · Grappling", con
  "Siguiente" / "← Atrás"). Indicador de paso siempre visible.
- Barra fija con indicador, recuento, "Cancelar" (vuelve a "Revisar
  propuesta" con el borrador intacto) y "Aceptar" solo en el último paso
  (inserta una sola vez, se queda en el mapa y la disciplina activa pasa a
  la de la importación; en "Ambos", Grappling).
- Si un paso no se puede mostrar: "No se puede: <breve>" con
  "Retroceder" (a la revisión) o "Seguir con la siguiente disciplina";
  aceptar después crea todo salvo lo que causó el error y avisa.
- "+ Añadir" en la revisión ofrece origen/destino solo del catálogo de la
  disciplina de la importación.
- Durante la vista previa: se ve la disciplina del paso, se
  ignoran los filtros, se bloquean las acciones que cambian datos u
  organización; salir del mapa = cancelar (queda "Sin terminar").
- Técnico: el borrador sale del diálogo para sobrevivir a su cierre; los
  elementos fantasma nunca se guardan en la organización del grafo.

**Specs:** `importar-clase` MODIFIED ("Generación de la propuesta",
"Reutilización de lo que ya existe en el catálogo", "Añadir elementos a
mano en la revisión", "Confirmar e insertar en el catálogo") + ADDED (disciplina de la importación, paso a la vista
previa, pasos según la disciplina, aceptar, cancelar, paso que no se
puede mostrar, aceptar tras un paso con error); `mapa` ADDED (vista previa en el grafo, leyenda con
indicador de paso, movimiento reducido, disciplina y filtros, acciones
bloqueadas, salir del mapa).

**Puntos abiertos:** ninguno.

---

### T-4.it7 — "Ambos" como copias y disciplina en sesiones y rolls

**Estado:** 📝 Planificada (2026-10-06) — change propuesto; P1–P3
resueltas por el owner. Se aplica después de archivar T-3.
**Change OpenSpec:** [`openspec/changes/ambos-como-copias/`](../../openspec/changes/ambos-como-copias/proposal.md)

**Qué entrega:**
- "Ambos" en los asistentes de posición, sumisión y técnica y en la
  importación = **atajo de creación**: crea dos elementos independientes,
  uno de BJJ y otro de Grappling, con los mismos datos. Ningún elemento
  del catálogo queda como "Ambos"; cada copia tiene su sitio en el grafo
  (resuelve las coordenadas compartidas de T-3).
- **Separación de lo existente** al actualizar (migración v12): cada
  elemento "Ambos" → copia BJJ (conserva su identidad) + copia Grappling;
  técnicas, contras, complementarias, etiquetas, sitio en el grafo y
  enlaces de rolls repartidos por disciplina, sin perder datos.
- **Conexiones dentro de la disciplina:** la técnica toma la disciplina
  de su origen; destino, complementaria y contras solo ofrecen elementos
  de la misma disciplina. Las conexiones cruzadas antiguas se conservan.
- **"Ambos" = completo en las dos:** si a una técnica "Ambos" le falta
  su origen o destino en una disciplina, se crea allí (asistentes,
  importación y separación de lo existente) y se avisa de lo creado.
- **Disciplina fija:** se elige al crear; al editar se muestra como solo
  lectura.
- **Sesiones** con tipo Clase / Open mat y disciplina BJJ / Grappling /
  Ambos (por defecto la activa); las de tipo BJJ/Grappling pasan a Clase
  con esa disciplina; **rolls** con BJJ / Grappling (por defecto la de la sesión, o
  la activa si la sesión es Ambos). Los selectores del roll solo ofrecen
  su disciplina; cambiarla con elementos elegidos pide confirmación y los
  quita. Sesiones y rolls existentes reciben disciplina deducida.
- **Importación de "Ambos"**: cada lado se compara con su disciplina; la
  revisión indica dónde se creará cada elemento; cada vista previa
  muestra lo nuevo de su lado.
- **Copia de seguridad v8** (disciplina de sesiones y rolls); v6 y v7 se
  siguen aceptando y se convierten con las mismas reglas que la
  migración.

**Specs:** nueva capacidad `sesiones-y-rolls` (ADDED); `catalogo-tecnico`
MODIFIED ("Disciplina de cada elemento", "Nombre de posición sin
duplicados en el asistente", "Sumisión terminal", "Posiciones
complementarias", "Contras de una técnica") + ADDED (crear para las dos
disciplinas, conexiones dentro de la misma disciplina, disciplina fija
tras crear, elementos "Ambos" existentes al actualizar);
`importar-clase` MODIFIED (disciplina de la importación, generación,
reutilización, añadir a mano, confirmar e insertar, aceptar la vista
previa) + ADDED (dónde se crea cada elemento en una importación de
"Ambos"); `mapa` MODIFIED ("Disciplina activa", vista previa en el grafo,
disciplina y filtros durante la vista previa); `copia-seguridad` MODIFIED
(contenido, restauración fiel, ficheros anteriores).

**Puntos abiertos:** ninguno (P1–P3 resueltas el 2026-10-06, ver
decisiones).

---

## DECISIONES DE PRODUCTO TOMADAS

- **Selectores:** tocar una opción la elige; tocar la activa no hace nada.
  Se aplica a todos los selectores equivalentes, no solo al del mapa.
- **Historial — cuándo se guarda:** al pulsar "Analizar"; volver a
  analizar en la misma ventana actualiza la misma entrada.
- **Historial — contenido:** solo el texto (el último analizado, también
  si se editó al reintentar) y lo aceptado (lo insertado), más título,
  estado, error y fechas. El texto interpretado y la propuesta no se
  guardan.
- **Historial — estados:** Importada / Sin terminar / Falló.
- **Historial — título:** lo genera la IA en la petición que ya hace (sin
  llamada extra); si la IA nunca respondió, primeras palabras del texto.
- **Historial — acceso y forma:** icono en la barra del mapa; panel lateral
  (escritorio) o inferior (móvil), como las fichas; tarjetas desplegables,
  más recientes primero, una desplegada a la vez; plegada = título +
  fecha + estado.
- **Historial — detalle:** bloques Texto y Aceptado, cada uno con copiar
  ("Copiado ✓"); aceptado como lista legible; la fecha no se copia.
- **Historial — acciones:** Reintentar (abre el importador con el texto
  guardado precargado y editable, y reutiliza la misma entrada; si se
  reconfirma una entrada "Importada", lo aceptado se acumula) y borrar con confirmación. Sin editar,
  sin búsqueda, sin revertir, sin enlace al calendario.
- **Historial — copia de seguridad:** se incluye en exportar/importar
  datos para sobrevivir al cambio de dispositivo. En T-2 se arregla
  también la pérdida de etiquetas y disciplina de la copia; se siguen
  aceptando ficheros de la versión anterior (historial vacío).
- **Aviso al cerrar tras analizar:** "¿Cerrar? La importación queda guardada en el historial".
- **Vista previa:** sobre el grafo real de `/mapa` (la ventana se
  cierra); lo nuevo late en color (no tamaño); técnicas = flechas,
  posiciones/sumisiones = nodos; las posiciones existentes que reciben
  técnica nueva no laten; barra fija con indicador de paso, recuento,
  "Cancelar" (vuelve a la revisión con todo intacto) y "Aceptar" solo en
  el último paso (inserta una vez y se queda en el mapa); nada se
  escribe hasta "Aceptar"; `prefers-reduced-motion` → color fijo; color
  por token semántico nuevo.
- **Vista previa — pasos:** BJJ o Grappling → una vista previa y, al
  aceptar, la disciplina activa pasa a ser la de la importación. "Ambos"
  → dos vistas previas ("1 de 2 · BJJ" → "2 de 2 · Grappling") con
  Siguiente / Atrás / Cancelar y Aceptar solo en la última; después la
  disciplina activa es Grappling.
- **Vista previa — errores:** un paso que no se puede mostrar enseña "No
  se puede: <breve>" con "Retroceder" o "Seguir con la siguiente
  disciplina" (solo si hay paso siguiente). Aceptar después de seguir
  crea todo salvo los elementos que causaron el error y avisa de cuáles
  no se crearon (decisión del orquestador).
- **"+ Añadir" en la revisión:** origen/destino solo del catálogo de la
  disciplina de la importación (decisión del orquestador).
- **Disciplinas aisladas:** la importación elige BJJ / Grappling / Ambos
  en el primer paso (por defecto la activa); todo lo creado la lleva.
- **Comparación con el catálogo por disciplina:** BJJ o Grappling → esa +
  "Ambos"; "Ambos" → solo "Ambos" (también para lo que se envía a la
  IA). Lo que falta se crea con la disciplina de la importación aunque
  exista con el mismo nombre en la otra; los duplicados entre
  disciplinas los avisará el panel de alertas (it.8). **T-4 sustituye**
  la regla de "Ambos": cada lado se compara con su disciplina.
- **"Ambos" = atajo de creación (T-4):** crea dos elementos
  independientes (BJJ y Grappling); editar uno no cambia el otro; no se
  guarda "Ambos" en el catálogo; cada copia con su sitio en el grafo.
- **Separación de los "Ambos" existentes (T-4):** migración nueva; la
  copia BJJ conserva la identidad; todo se reparte por disciplina sin
  perder datos.
- **Disciplina de sesiones y rolls (T-4):** sesión BJJ / Grappling /
  Ambos (clase mixta); roll BJJ / Grappling, por defecto el de su sesión
  (o la activa si la sesión es Ambos), modificable al crear; los
  selectores del roll filtran por su disciplina. Existentes: roll según
  sus elementos (todos Grappling → Grappling; si no, BJJ); sesión según
  sus rolls (iguales → esa; mezclados → Ambos; sin rolls → la de su tipo
  antiguo, BJJ si era Open mat). Un roll sin elementos enlazados toma la
  del tipo antiguo de su sesión.
- **Tipo de sesión (T-4, P1):** Clase / Open mat; la disciplina va
  aparte; las sesiones antiguas BJJ/Grappling pasan a Clase con esa
  disciplina.
- **"Ambos" existe completo en las dos disciplinas (T-4, P2):** lo que
  falte en una (origen o destino de una técnica, sumisión) se crea allí,
  al crear (asistentes e importación, avisando de lo creado) y al separar
  lo existente o restaurar copias antiguas.
- **Disciplina fija (T-4, P3):** no se cambia al editar, ni en elementos
  sin conexiones; se muestra como solo lectura.
- **Importación de "Ambos" (T-4):** crea las dos copias; vista previa de
  dos pasos con lo de cada lado.
- **Copia de seguridad v8 (T-4):** v6 y v7 siguen importando, convertidas
  con las reglas de la migración.
- **Fuera de T-4 (backlog):** paneles de análisis y estadísticas por
  disciplina, filtro de rolls por disciplina, "duplicar en la otra
  disciplina" un elemento ya creado (funcionalidad futura).

---

## ORDEN SUGERIDO

```
T-1.it7 (selector coherente, pequeño)
   └─→ T-2.it7 (historial: BD + flujo + panel + backup)
          └─→ T-3.it7 (disciplina + vista previa en el mapa: toca el mismo
                       diálogo y usa el selector de T-1)
                 └─→ T-4.it7 ("Ambos" como copias + disciplina en sesiones
                              y rolls: modifica requisitos de T-3 y
                              numera su migración tras la v11)
```

T-2 y T-3 modifican `ImportarClaseDialog.svelte` y el mismo spec
`importar-clase` (requisitos distintos). Ir en serie evita conflictos y
permite archivar los changes en orden. T-4 **no se aplica hasta archivar
T-3**: sus deltas copian las versiones de T-3 de varios requisitos.

---

## RIESGOS Y NOTAS

- **Primera iteración con flujo SDD/OpenSpec — se evalúa el piloto al
  cerrar.** Preguntas para la evaluación: ¿los specs ayudaron al owner a
  revisar el alcance antes del código? ¿los deltas se mantuvieron al día
  durante la implementación? ¿el coste de escribir/validar compensa? Si no
  compensa, los specs (markdown) se conservan igual.
- **Copia de seguridad.** T-2 arregla la pérdida de etiquetas y
  disciplina; no recupera lo ya perdido en restauraciones anteriores
  (restaurar de nuevo una copia antigua sí recupera la disciplina).
- **Rework del ciclo de vida de la importación (T-3).** El borrador sale
  del diálogo para sobrevivir a su cierre durante la vista previa; es la
  parte más delicada de la iteración y se hace primero, sin cambio
  visible.
- **Duplicados entre disciplinas (T-3):** la comparación por disciplina
  puede crear "Mount" de Grappling junto a "Mount" de BJJ. Aceptado; los
  avisará el panel de alertas (it.8).
- **Diálogo de importación grande** (~1150 líneas) y tocado por T-2 y T-3:
  mantener la lógica nueva fuera (DAO, clase del borrador, helpers de
  `grafo.ts`).
- **Migración de separación (T-4) sobre datos reales.** Reescribe el
  catálogo y los enlaces de rolls en una sola transacción con
  comprobaciones y vuelta atrás si algo falla; aun así, exportar copia en
  la tablet antes de actualizar y ensayar antes con el JSON de prod en el
  Codespace.
- **Duplicados tras separar (T-4):** donde ya había, p. ej., "Mount" Ambos
  y "Mount" BJJ quedarán dos "Mount" de BJJ (una sumisión que choque se
  renombra "… (Ambos)"). Raro; lo avisará el panel de alertas (it.8).
- **Alcance de T-4:** toca muchos sitios (asistentes, `RollEditor`,
  sesiones, importación, copia). Grupos de tareas en orden: migración y
  copia primero, sin cambio de UI.
- **Toca BD, layout del grafo y CSS:** verificación obligatoria con
  `pnpm preview` + refresh antes de cada push (CLAUDE.md).

---

## REFERENCIAS

- `.claude/MEJORAS_FUTURAS.md` → "Importar clase 2.0 — historial,
  reintentar, vista previa y revertir" (origen, sesión 50).
- `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación
  (baseline)" (excluidos de esta iteración).
- Specs vivos: `openspec/specs/importar-clase/`, `openspec/specs/mapa/`,
  `openspec/specs/catalogo-tecnico/`, `openspec/specs/copia-seguridad/`.
- `CLAUDE.md` → "Flujo SDD", "Restricciones", "Criterios técnicos".

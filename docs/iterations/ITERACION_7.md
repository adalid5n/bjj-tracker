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
   pulsa "Analizar" (texto, interpretación, propuesta, lo aceptado,
   estado y título), se consulta desde el mapa, se copia, se reintenta
   sin redictar y viaja en la copia de seguridad, que además se arregla
   (hoy pierde etiquetas y disciplina). Sirve de diario de entreno.
3. **Vista previa en el mapa + disciplina de la importación.** El usuario
   elige BJJ / Grappling / Ambos al empezar la importación; antes de
   escribir nada ve en el grafo real del mapa lo que se va a añadir,
   resaltado con un color que late, y acepta o vuelve a la revisión.

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
1. T-1.it7 … T-3.it7 cerradas con commit en `main` y **sus tres changes
   archivados** (`openspec/specs/` actualizado).
2. Tag `v0.7-it7` aplicado y bump `0.6.x` → `0.7.0` (migración de schema +
   cambios funcionales visibles).
3. `ESTADO_ACTUAL.md` y `CHANGELOG.md` actualizados.
4. Verificación manual del owner en `pnpm preview` (tablet y escritorio).
5. Evaluación del piloto SDD/OpenSpec anotada (ver Riesgos).

---

## ALCANCE FUNCIONAL

### T-1.it7 — Selector coherente

**Estado:** 🟡 Pendiente.
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

**Estado:** 🟡 Pendiente. Recomendado tras T-1.
**Change OpenSpec:** [`openspec/changes/historial-importaciones/`](../../openspec/changes/historial-importaciones/proposal.md)

**Qué entrega:** registro por fases de cada importación (texto original →
interpretado → propuesta → aceptado; estados Importada / Sin terminar /
Falló), título corto de la IA en la petición existente, icono en la barra
del mapa que abre un panel (lateral/inferior) con tarjetas desplegables,
copiar por bloque, Reintentar, borrar con confirmación, nuevo aviso al
cerrar ("¿Cerrar? Quedará en el historial como Sin terminar") e inclusión
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
- Al confirmar, la ventana (y cualquier ficha) se cierra y el usuario
  queda en `/mapa`, vista Grafo, viendo el grafo real con lo nuevo
  latiendo (color, no tamaño; las posiciones existentes no laten; color
  fijo con "reducir movimiento"; token semántico nuevo).
- Leyenda fija con recuento + "Aceptar" (inserta y se queda en el mapa) +
  "Cancelar" (vuelve a "Revisar propuesta" con el borrador intacto).
- Durante la vista previa: se ve la disciplina de la importación, se
  ignoran los filtros, se bloquean las acciones que cambian datos u
  organización; salir del mapa = cancelar (queda "Sin terminar").
- Técnico: el borrador sale del diálogo para sobrevivir a su cierre; los
  elementos fantasma nunca se guardan en la organización del grafo.

**Specs:** `importar-clase` MODIFIED ("Confirmar e insertar en el
catálogo") + ADDED (disciplina de la importación, paso a la vista previa,
aceptar, cancelar); `mapa` ADDED (vista previa en el grafo, leyenda,
movimiento reducido, disciplina y filtros, acciones bloqueadas, salir del
mapa).

**Puntos abiertos (pendientes del owner):** cómo se compara con el
catálogo y qué catálogo recibe la IA según la disciplina de la
importación; qué disciplina queda activa tras aceptar una importación de
la otra disciplina.

---

## DECISIONES DE PRODUCTO TOMADAS

- **Selectores:** tocar una opción la elige; tocar la activa no hace nada.
  Se aplica a todos los selectores equivalentes, no solo al del mapa.
- **Historial — cuándo se guarda:** al pulsar "Analizar", y se actualiza
  por fases (interpretado, propuesta, aceptado = lo insertado).
- **Historial — estados:** Importada / Sin terminar / Falló.
- **Historial — título:** lo genera la IA en la petición que ya hace (sin
  llamada extra); si la IA nunca respondió, primeras palabras del texto.
- **Historial — acceso y forma:** icono en la barra del mapa; panel lateral
  (escritorio) o inferior (móvil), como las fichas; tarjetas desplegables,
  más recientes primero; plegada = título + fecha + estado.
- **Historial — detalle:** bloques texto original, interpretado,
  propuesta y aceptado, cada uno con copiar ("Copiado ✓"); propuesta y
  aceptado como lista legible; la fecha no se copia.
- **Historial — acciones:** Reintentar (abre el importador con el texto
  original precargado y editable) y borrar con confirmación. Sin editar,
  sin búsqueda, sin revertir, sin enlace al calendario.
- **Historial — copia de seguridad:** se incluye en exportar/importar
  datos para sobrevivir al cambio de dispositivo. En T-2 se arregla
  también la pérdida de etiquetas y disciplina de la copia; se siguen
  aceptando ficheros de la versión anterior (historial vacío).
- **Aviso al cerrar tras analizar:** "¿Cerrar? Quedará en el historial
  como Sin terminar".
- **Vista previa:** sobre el grafo real de `/mapa` (la ventana se
  cierra); lo nuevo late en color (no tamaño); técnicas = flechas,
  posiciones/sumisiones = nodos; las posiciones existentes que reciben
  técnica nueva no laten; leyenda fija con recuento + "Aceptar" (inserta
  y se queda en el mapa) + "Cancelar" (vuelve a la revisión con todo
  intacto); nada se escribe hasta "Aceptar"; `prefers-reduced-motion` →
  color fijo; color por token semántico nuevo.
- **Disciplinas aisladas:** la importación elige BJJ / Grappling / Ambos
  en el primer paso (por defecto la activa); todo lo creado la lleva.

---

## ORDEN SUGERIDO

```
T-1.it7 (selector coherente, pequeño)
   └─→ T-2.it7 (historial: BD + flujo + panel + backup)
          └─→ T-3.it7 (disciplina + vista previa en el mapa: toca el mismo
                       diálogo y usa el selector de T-1)
```

T-2 y T-3 modifican `ImportarClaseDialog.svelte` y el mismo spec
`importar-clase` (requisitos distintos). Ir en serie evita conflictos y
permite archivar los changes en orden.

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
- **Puntos abiertos de disciplina (T-3):** emparejamiento con el catálogo
  y catálogo enviado a la IA por disciplina; disciplina activa tras
  aceptar una importación de la otra disciplina.
- **Diálogo de importación grande** (~1150 líneas) y tocado por T-2 y T-3:
  mantener la lógica nueva fuera (DAO, clase del borrador, helpers de
  `grafo.ts`).
- **Toca BD, layout del grafo y CSS:** verificación obligatoria con
  `pnpm preview` + refresh antes de cada push (CLAUDE.md).

---

## REFERENCIAS

- `.claude/MEJORAS_FUTURAS.md` → "Importar clase 2.0 — historial,
  reintentar, vista previa y revertir" (origen, sesión 50).
- `.claude/MEJORAS_FUTURAS.md` → "Fallos catálogo e importación
  (baseline)" (excluidos de esta iteración).
- Specs vivos: `openspec/specs/importar-clase/`, `openspec/specs/mapa/`,
  `openspec/specs/catalogo-tecnico/`.
- `CLAUDE.md` → "Flujo SDD", "Restricciones", "Criterios técnicos".

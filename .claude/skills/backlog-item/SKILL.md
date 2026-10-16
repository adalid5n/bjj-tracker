---
name: backlog-item
description: Alta, cierre y repriorización de entradas del backlog interno del BJJ Tracker (`.claude/MEJORAS_FUTURAS.md`) con IDs estables `MF-NNN` y clasificación Tipo / Impacto / Esfuerzo / Prioridad / Estado. Úsala siempre que el owner o el orquestador quiera apuntar, registrar o añadir un bug, mejora, refactor o decisión pendiente al backlog — "apunta en el backlog", "añade esto a mejoras", "registra este bug", "déjalo anotado para más adelante", "/backlog-item" — y también para cerrar una entrada ("marca MF-012 como hecha") o cambiar su prioridad. Procedimiento determinista, delegable a un subagente; nunca toca código.
---

# backlog-item

Procedimiento fijo para mantener `.claude/MEJORAS_FUTURAS.md`. El esquema
completo está en la cabecera de ese fichero; esta skill dice **cómo** se
escribe en él para que cualquier agente lo haga igual.

## Reglas fijas

- **Nunca tocar código** ni specs. Solo `.claude/MEJORAS_FUTURAS.md`.
- **Prioridad solo la decide el owner.** Si no la ha dado: `Prioridad —`.
  Puedes *sugerir* una en tu respuesta, nunca escribirla.
- **IDs:** `MF-NNN`, tres dígitos, secuenciales, nunca se reutilizan ni se
  renumeran (tampoco al cerrar o descartar).
- **Público vs interno:** `ROADMAP.md` es la vista pública filtrada. No se
  toca salvo que el owner lo pida explícitamente.
- **Commits:** el alta/cierre va en el siguiente commit rutinario de docs
  (regla "agrupar commits" de `CLAUDE.md`). Excepción: si la entrada recoge
  una **decisión del owner**, commit + push inmediato (con su update de
  `.claude/ESTADO_ACTUAL.md`, que exige todo push).
- Lenguaje de negocio y en castellano, como el resto del documento.

## Valores permitidos

| Campo | Valores |
|---|---|
| Tipo | `Bug` · `Mejora` · `Refactor` · `Decisión` (decisión de producto pendiente, aún sin código) |
| Impacto | `Alto` · `Medio` · `Bajo` (gravedad en bugs; valor en el resto) |
| Esfuerzo | `S` (<1 h) · `M` (una sesión) · `L` (varias sesiones o migración de esquema). En duda, el mayor. |
| Prioridad | `P1` · `P2` · `P3` · `—` (sin asignar) |
| Estado | `Abierta` · `Abierta · pendiente de refinar` · `En curso (T-x.itN)` · `Hecha (fecha, commit/tarea)` · `Descartada (fecha, motivo)` |

## Alta de una entrada

Entradas: descripción del owner (o del orquestador) y, opcionalmente,
tipo / impacto / esfuerzo / prioridad.

1. **Siguiente ID libre.** `grep -o 'MF-[0-9]\{3\}' .claude/MEJORAS_FUTURAS.md | sort -u | tail -1` → sumar 1.
2. **Duplicados / solapes.** `grep -n -i` por 2-4 palabras clave de la
   descripción (y sinónimos: "ficha"/"panel"/"sheet", "asistente"/"wizard"…)
   sobre los títulos `###` y el cuerpo. Si una entrada existente cubre lo
   mismo o se solapa claramente: **no crear otra**; ampliar la existente
   (nueva viñeta `- **Ampliación (fecha, fuente):** …`, ajustar sus campos
   si cambian) y decirlo en la salida. Si el solape es parcial y dudoso,
   preguntar antes.
3. **Clasificar.** Usar lo que diga el owner; lo que falte, decidirlo
   leyendo la descripción. Para Esfuerzo, mirar el código por encima
   (`grep`) si no es obvio; conservador.
4. **Sección.** `## UX` (pantallas, interacción, flujos), `## Performance /
   build`, `## Tech debt / dev experience` (deuda interna, tooling, CI),
   `## Proyecto / repositorio` (decisiones de proyecto, no de app). Si
   ninguna encaja, crear una `##` nueva antes de `## Cómo usar este
   documento`. La entrada va **al final de su sección**.
5. **Escribir la entrada** con esta plantilla exacta:

   ```markdown
   <a id="mf-NNN"></a>
   ### <Título corto en lenguaje de negocio>

   **MF-NNN** · <Tipo> · Impacto <X> · Esfuerzo <Y> · Prioridad <Z|—> · Abierta

   - **Origen:** <quién>, <AAAA-MM-DD> (<fuente: validación de T-x.itN, uso real, auditoría…>).
   - **Qué:** <qué pasa hoy / qué se propone>. En bugs: **Esperado:** <comportamiento correcto>.
   - **Por qué:** <valor o daño>.
   - **Cuándo:** <disparador o momento>.
   - **Notas técnicas:** <`fichero:línea`, ADR o spec afectados; "requiere change de OpenSpec" si cambia comportamiento visible>.
   ```

   Omitir "Notas técnicas" solo si no hay nada útil que poner.
6. **Índice.** Añadir la fila en la tabla "Índice de entradas abiertas":
   `| MF-NNN | [Título](#mf-NNN) | Tipo | Impacto | Esfuerzo | Prioridad | Estado |`
   en su sitio según el orden: Prioridad (`P1`, `P2`, `P3`, `—`), luego
   Impacto (`Alto`, `Medio`, `Bajo`), luego ID ascendente.
7. **Salida** (una línea, nada más salvo el aviso de solape o una
   prioridad sugerida):

   `MF-NNN · <Tipo> · <título> · Impacto X · Esfuerzo Y · Prioridad Z`

## Cerrar una entrada

1. En la línea de campos: Estado → `Hecha (AAAA-MM-DD, <commit corto o T-x.itN>)`
   (o `Descartada (AAAA-MM-DD, <motivo>)`).
2. Tachar el título: `### ~~<título>~~`. No cambiar el texto del título
   (hay specs y docs que lo citan) ni borrar el cuerpo.
3. Quitar la fila del índice y añadir `[MF-NNN](#mf-NNN) <título corto>`
   al final de la lista **Hechas**.
4. Si había una marca `⚠️ Bug conocido` en `openspec/specs/` que apunta a
   la entrada, avisar al orquestador: quitarla es parte del cambio que
   arregla el bug, no de esta skill.
5. Salida: `MF-NNN cerrada · <Hecha|Descartada> · <título>`.

## En curso

Estado → `En curso (T-x.itN)` en la línea de campos y en la fila del índice.

## Repriorizar (solo por orden del owner)

1. Cambiar `Prioridad` en la línea de campos de cada entrada indicada.
2. Recolocar sus filas en el índice según el orden del paso 6 del alta.
3. Salida: una línea por entrada, `MF-NNN · Prioridad <antes> → <después>`.
4. Es una decisión del owner → commit + push inmediato.

# T-2 — Capa de datos (CRUD) para schema v2 — Reporte de implementación

**Fecha:** 2026-05-12
**Ámbito:** Iteración 1, tarea T-2 (`.claude/ITERACION_1.md`)
**Autor:** subagente Claude

---

## Resumen ejecutivo

Capa de datos pura (sin UI) para las cinco entidades que introduce el
schema v2: `posiciones`, `sumisiones_terminales`, `tecnicas`,
`tecnica_contras` y `roll_posicion_problema`. Cuatro módulos nuevos
(`posiciones.ts`, `sumisiones.ts`, `tecnicas.ts`, `contras.ts`) con el
mismo estilo que `companeros.ts`/`sesiones.ts`: `await init()` al inicio
de cada función, `crypto.randomUUID()` para IDs, timestamps ISO 8601,
SQL crudo sobre la API mínima `init`/`run`/`query`. `rolls.ts` extendido
con `setPosicionesProblema` y `getPosicionesProblema`. Tipos añadidos al
barrel `$lib/types`. `pnpm check` pasa limpio (0 errores, 0 warnings).

---

## Decisiones tomadas

### D-1. Tipos nuevos en `src/lib/types/index.ts`, no en fichero aparte

**Opción elegida:** ampliar el barrel existente `src/lib/types/index.ts`
con los seis tipos nuevos al final, separados por un comentario de
sección `// --- Mapa técnico (schema v2) ---`.

**Razón:**
- El directorio `src/lib/types/` actualmente tiene un único fichero
  (`index.ts`), no hay precedente de split por dominio.
- Todos los imports existentes usan `import type { ... } from '$lib/types'`
  (no `$lib/types/<algo>`). Mantener un barrel único conserva ese patrón
  sin tocar nadie más.
- Si en el futuro el barrel se hace incómodo, refactorizar a múltiples
  ficheros (`mapa.ts`, `core.ts`, ...) que re-exporten desde `index.ts`
  es trivial y aislado.

**Alternativa descartada:** `src/lib/types/mapa.ts` con re-export desde
`index.ts`. Habría introducido una mezcla de estilos (algunos types en
sub-ficheros, otros sueltos al raíz) sin beneficio real a este volumen
(seis nombres más).

### D-2. Validación de tipo de destino en TS antes del INSERT/UPDATE

`createTecnica` y `updateTecnica` llaman a un helper privado
`assertDestinoCoherente(data)` antes de tocar BD. El helper aplica las
reglas:

- `tipo === 'sumision'` → `sumision_destino_id` requerido, `posicion_destino_id`
  debe ser falsy.
- `tipo !== 'sumision'` → `posicion_destino_id` requerido, `sumision_destino_id`
  debe ser falsy.

Si falla, throw `Error` con mensaje claro (cuatro mensajes distintos
según qué regla concreta se viola, p.ej. `'Tipo "sumision" requiere
sumision_destino_id'` vs `'Tipo "ataque" no admite sumision_destino_id
(debe ser null)'`).

**Por qué:** el CHECK del schema ya bloquea el INSERT a nivel BD, pero el
error que devuelve SQLite-WASM es críptico (`SQLITE_CONSTRAINT_CHECK`
con la expresión SQL volcada). Validando primero en TS, la capa de UI
(T-10 wizard de técnica) recibe un mensaje accionable que se puede
mostrar al usuario tal cual. El CHECK del schema queda como defensa en
profundidad para invariantes que se inserten por export/import u otra
ruta.

### D-3. Naming del inverso de `getContras` → `getTecnicasQueContrarresta`

El plan sugería `getContrasOf` pero invitaba a proponer otro nombre.

**Elegido:** `getTecnicasQueContrarresta(tecnicaId)`.

**Razón:**
- `getContrasOf` mantiene la palabra "contras" en ambos lados de la
  relación, lo que ambigua justamente la cosa que la API quiere
  distinguir: "contras DE esta" (la otra función) vs "esta ES contra
  de quiénes" (esta).
- `QueContrarresta` es una cláusula relativa activa: la técnica `X` es
  el sujeto, "X contrarresta a Y, Z, ..." y la función devuelve esas Y, Z.
  Coincide con el caso de uso típico ("estoy viendo una defensa, ¿qué
  ataques responde?").
- Misma simetría léxica que `getContras`: ambas devuelven `Tecnica[]` y
  ambas toman un `tecnicaId`, lo que distingue es el verbo (`getContras`
  = "qué tiene como contras", `getTecnicasQueContrarresta` = "a qué
  contrarresta").

Documentado en JSDoc del módulo + en cada función.

### D-4. Atomicidad de `setPosicionesProblema` con BEGIN/COMMIT explícitos

`setPosicionesProblema(rollId, posicionIds[])` no es un único statement
posible (es un DELETE + N INSERTs). Envuelvo:

```ts
await run('BEGIN');
try {
  await run('DELETE FROM roll_posicion_problema WHERE roll_id = ?', [rollId]);
  for (const id of uniqueIds) await run('INSERT ... VALUES (?, ?)', [...]);
  await run('COMMIT');
} catch (err) {
  await run('ROLLBACK').catch(() => { /* swallow */ });
  throw err;
}
```

**Detalles:**
- El worker (`db-worker.ts`) serializa todas las operaciones con
  `enqueue`, así que los `BEGIN/DELETE/INSERT.../COMMIT` enviados
  consecutivamente desde la misma promise chain llegan en orden y no
  pueden interleavearse con otras consultas. Eso es importante porque
  SQLite trataría un BEGIN de otro caller como nested transaction.
- De-duplico `posicionIds` con `new Set` antes del bucle: la PK
  compuesta `(roll_id, posicion_id)` rechazaría duplicados con
  `UNIQUE constraint failed` y abortaría la transacción a mitad. Mejor
  prevenirlo aquí.
- El ROLLBACK en `catch` está envuelto en su propio `.catch(()=>{})`
  porque si la transacción ya quedó cerrada por algún motivo (p.ej. error
  de "no transaction is active"), priorizamos propagar el error original.

### D-5. ORDER BY para "otras variantes" — NULLS FIRST sin la cláusula

`getOtrasVariantes` ordena por `posicion_origen_id, variante IS NOT NULL, variante`.

SQLite no implementa `NULLS FIRST`/`NULLS LAST` antes de la versión 3.30
(que sí tenemos en 3.53, pero la sintaxis no estaba soportada con DDL
crudo en el momento del primer plan). El truco `variante IS NOT NULL`
produce `0` para NULL y `1` para no-NULL, lo que ordena NULLs primero
de forma portable y sin sintaxis especial. Equivalente al "NULLS FIRST"
que pide el plan.

### D-6. `init()` en `assertDestinoCoherente` — fuera de `init()`

`assertDestinoCoherente` se llama ANTES de `await init()` en
`createTecnica`/`updateTecnica`. Es validación pura sobre el objeto
recibido, no toca BD. Si la validación falla, no hay razón de cargar el
worker. Cambio de orden trivial pero útil para tests/uso desde código
que no haya inicializado BD aún.

---

## Ficheros modificados / creados

| Ruta | Tipo | Resumen |
|---|---|---|
| `src/lib/types/index.ts` | Modificado | Añadidos `CategoriaPosicion`, `TipoRolPosicion`, `TipoTecnica`, `EstadoTecnica`, `Posicion`, `SumisionTerminal`, `Tecnica`, `TecnicaContra`. |
| `src/lib/posiciones.ts` | Creado | CRUD básico: list/get/create/update/delete. ORDER BY categoria, nombre. |
| `src/lib/sumisiones.ts` | Creado | CRUD básico sobre `sumisiones_terminales`. ORDER BY nombre. UNIQUE en nombre se propaga sin envoltura. |
| `src/lib/tecnicas.ts` | Creado | CRUD + `getTecnicasByPosicion`, `getTecnicasByPosicionYTipo`, `getOtrasVariantes`, `getTecnicasQueLleganASumision`. Validación de destino en TS. |
| `src/lib/contras.ts` | Creado | `addContra` (INSERT OR IGNORE), `removeContra`, `getContras`, `getTecnicasQueContrarresta`. |
| `src/lib/rolls.ts` | Modificado | Añadidos `setPosicionesProblema` (transaccional) y `getPosicionesProblema`. Import de `Posicion` añadido. Resto del fichero intacto. |
| `.claude/agent-reports/20260512-t2-crud/implementation.md` | Creado | Este reporte. |

**Ficheros NO tocados** (respetando restricciones de `CONTEXTO_AGENTE`):
`vite.config.ts`, `svelte.config.js`, `+layout.svelte`, `+layout.ts`,
`.github/workflows/deploy.yml`, `package.json`, `src/lib/db/schema.ts`,
`src/lib/db/db-worker.ts`, `src/lib/db/index.ts`.

**No se ha ampliado el smoke** (`/dev/db-migration-smoke`): era opcional
y, dado que la implementación es pura plumbing sobre el schema ya
verificado por T-1, no aporta valor proporcional al ruido que añade
al smoke existente. Si Adalid lo quiere, queda como follow-up trivial.

---

## Resultado de `pnpm check`

```
> bjj-tracker@0.0.2 check /home/adalid/projects/bjj-tracker
> svelte-kit sync && svelte-check --tsconfig ./tsconfig.json

1778612768160 START "/home/adalid/projects/bjj-tracker"
1778612768164 COMPLETED 964 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
EXIT=0
```

0 errores, 0 warnings, 964 files. Salida limpia a la primera (no hubo
correcciones intermedias).

**Nota sobre Node:** el entorno actual solo tiene Node 24 instalado vía
fnm (no Node 22 como pide `.nvmrc`). `pnpm check` solo ejecuta
`svelte-kit sync` + `svelte-check` y no instala dependencias, por lo que
funciona idéntico con Node 24. Adalid (que sí tiene Node 22) verá el
mismo resultado al correrlo en su máquina.

---

## Cuestiones pendientes / deuda detectada

### Pequeñas

- **`sync.ts` (export/import) sigue sin cubrir las tablas nuevas.** Ya
  estaba anotado en el reporte de T-1 como deuda. Esta tarea (T-2) no lo
  arregla — pertenece a T-2.5 según `ITERACION_1.md`. Mencionar para que
  no se olvide al planificar la siguiente sub-tarea.

- **No hay tests automatizados que ejerciten las funciones nuevas.** El
  proyecto no tiene infra Vitest funcionando (existe `vitest-examples/`
  como ruina histórica). El reporte de T-1 ya descartó montarla como
  parte de su alcance. La verificación práctica viene en T-3 cuando la
  página `/mapa` empiece a usar estas funciones y en T-14 (semilla con
  datos reales).

- **`getOtrasVariantes` no filtra por origen distinto al de la técnica
  llamante.** El plan dice "aristas hermanas con mismo nombre y distinto
  origen y/o variante", pero hoy devuelve todas las técnicas con el
  mismo nombre que no sean la propia. En la práctica, si una técnica
  tiene varias variantes con el mismo origen (legítimo: hay UNIQUE
  `(nombre, origen, variante)` pero no `(nombre, origen)` solo), las
  devuelve también. Eso parece deseable: "ver otras variantes" debería
  incluir las del mismo origen con `variante` distinta. Si Adalid
  prefiere otra semántica, ajustar el WHERE.

### Mayores

Ninguna identificada. La capa de datos cierra T-2 sin requerir
decisiones de producto pendientes.

---

## Notas finales

- Sin commits, sin push. Working tree con cambios listos para revisión.
- `pnpm dev` no se quedó corriendo.
- `package.json` y `pnpm-lock.yaml` no se han tocado.
- El smoke de migración `/dev/db-migration-smoke` (de T-1) sigue válido
  y no requiere actualización: verifica el schema, no la capa CRUD.

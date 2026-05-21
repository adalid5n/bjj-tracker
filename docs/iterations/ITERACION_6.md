# Iteración 6 — Modo hobbyist vs avanzado

**Versión:** 1.0 (sesión 37, 2026-05-20)
**Estado:** 🟡 Planificada — pendiente de aprobación del owner
**Predecesor:** Iteración 5 (cerrada con `v0.5-it5`, 2026-05-19) + pulido post-it.5 (sesión 36).

---

## OBJETIVO

Introducir un **toggle "Vista avanzada"** en `/ajustes` que controle dos
caras de la misma decisión de producto:

1. **Home enriquecida.** En vista avanzada se monta el componente
   `AnalisisHome.svelte` (ya construido en T-4.it5, hoy desconectado)
   con C1 + top 3 posiciones + top 3 técnicas. En hobbyist la home
   queda como hoy.
2. **Captura ampliada.** En vista avanzada vuelven a estar disponibles
   los 9 campos opcionales recortados en sesión 36 (notas de
   Posicion/Sumision/Companero, detalles + errores comunes de Tecnica,
   foco + técnica clase + observaciones de Sesion, duración de Roll, y
   `s.foco` en cards del home). En hobbyist se mantiene la UI
   simplificada actual.

**Default:** hobbyist. El user se gradúa cuando lo necesita.

**Por qué ahora:**
- La sesión 36 dejó `AnalisisHome` listo para reusar y simplificó la
  captura quitando 9 campos. El siguiente paso natural es ofrecer al
  user la palanca para subir un escalón sin reabrir la pelea de
  "todo-o-nada".
- La entrada de backlog `Modo "hobbyist" vs "avanzado"` (sesión 26)
  pedía una auditoría previa "campo por campo". Sesión 36 la hizo de
  facto con un criterio explícito ("solo lo que alimenta el grafo o lo
  conecta a rolls/sesiones se queda"). Con esa auditoría ejecutada,
  ya no hay arbitrariedad: el "delta" entre los dos modos es exactamente
  el recorte de s36, ni más ni menos.

**Lo que NO entra en esta iteración:**
- No se reabre el debate de qué campos son ornamentales. El conjunto
  está cerrado: los 9 de s36.
- No se exponen nuevos campos en avanzado que no existieran antes
  de s36. Si en el futuro queremos más metadata, va en otra entrada
  de backlog.
- No se toca el BottomNav, la navegación general, el modelo de
  rolls/sesiones, ni el grafo.
- No se introducen otras flags ni una pantalla de "preferencias"
  general. La tabla `app_settings` se diseña key/value para futuras
  flags, pero solo se usa `modo_avanzado` aquí.

**Criterio de cierre:**
1. Las 3 tareas T-1.it6 … T-3.it6 cerradas con commit en `main`.
2. Tag `v0.6-it6` aplicado.
3. Bump de versión `0.5.0` → `0.6.0` en `package.json` (minor — la
   iteración introduce migración de schema + cambios funcionales
   visibles).
4. `ESTADO_ACTUAL.md` actualizado.
5. Verificación manual del owner en `pnpm preview`: toggle on/off en
   `/ajustes` muestra/oculta las dos caras (home + wizards).

---

## ALCANCE FUNCIONAL

### T-1.it6 — Migración + tabla `app_settings` + `SettingsState` + toggle en `/ajustes`

**Estado:** 🟡 Pendiente.

**Qué entrega:**

1. **Migración SCHEMA_V6** en `src/lib/db/schema.ts`. DDL:

   ```sql
   CREATE TABLE app_settings (
     key TEXT PRIMARY KEY,
     value TEXT NOT NULL
   );
   INSERT INTO app_settings (key, value) VALUES ('modo_avanzado', 'false');
   ```

   Añadir entrada al array `MIGRATIONS` con `from: 5, to: 6`.
   `LATEST_SCHEMA_VERSION` pasa a 6 automáticamente.

2. **DAO de settings** — nuevo fichero `src/lib/settings.ts` con API
   mínima: `getSetting(key)`, `setSetting(key, value)`. Sin abstracción
   ORM, SQL crudo siguiendo la convención del proyecto.

3. **`SettingsState` reactivo** — nuevo `src/lib/settings.svelte.ts`
   siguiendo el patrón canónico (class field con `$state`, singleton
   exportado). API: `settings.modoAvanzado` (getter), `setModoAvanzado(v)`.
   Hidratación: en boot del cliente lee de BD; los componentes consumen
   el getter reactivo.

4. **`sync.ts`** — actualizar `CURRENT_SCHEMA_VERSION = 6`, incluir
   `app_settings` en el payload de `exportAll()`, y en `importAll()`
   wipe+insert como las demás tablas.

5. **Toggle en `/ajustes`** — añadir bloque a `src/routes/ajustes/+page.svelte`
   con un `Switch` de bits-ui (o equivalente shadcn), label
   "Vista avanzada" + texto de ayuda corto ("Muestra estadísticas en
   el inicio y campos opcionales en formularios"). Al togglear,
   llamar a `setModoAvanzado()` que persiste en BD y actualiza el state.

**No entrega:** ningún consumidor del toggle aún (los wizards y home
no leen el setting todavía — eso es T-2 y T-3). Tras T-1 el toggle
existe pero no afecta visualmente a nada salvo a su propio estado.

**Validación:**
- `pnpm check` sin nuevos errores.
- Botón se ve en `/ajustes`, el estado se persiste tras reload (verifica
  que la BD reinicia con el valor guardado).
- Export en `pnpm preview` incluye el array `app_settings`. Import de
  JSON v6 funciona.

---

### T-2.it6 — Conectar `AnalisisHome` en home

**Estado:** 🟡 Pendiente. Bloqueada por T-1.

**Qué entrega:**

1. En `src/routes/+page.svelte`, importar `AnalisisHome` y `settings`.
2. Bajo el chip de stats semanales (sin desplazar el calendario),
   añadir un bloque `{#if settings.modoAvanzado}<AnalisisHome ... />{/if}`.
3. `reloadKey` ya está soportado por el componente; pasarle el mismo
   valor que ya se usa para reactividad en home.

**No entrega:** ninguna modificación al propio `AnalisisHome` (queda tal
cual lo dejó T-4.it5). Si en uso real aparece ajuste necesario, va en
una tarea de pulido aparte.

**Validación:**
- En `pnpm preview`, toggle off → home sin cambios. Toggle on → bloque
  con C1, top posiciones y top técnicas aparece.
- Sin warnings del compilador.

---

### T-3.it6 — Re-condicionar los 9 campos en wizards/editors/modales

**Estado:** 🟡 Pendiente. Bloqueada por T-1.

**Qué entrega:** re-introducir, bajo `{#if settings.modoAvanzado}`,
los pasos/inputs/bloques retirados en sesión 36. Lista cerrada:

| Wizard/Editor                        | Campo                            | Tipo de cambio              |
| ------------------------------------ | -------------------------------- | --------------------------- |
| `PosicionWizard.svelte`              | Notas                            | Paso opcional               |
| `SumisionWizard.svelte`              | Notas                            | Paso opcional (1→2 pasos)   |
| `TecnicaWizard.svelte`               | Detalles + Errores comunes       | 2 pasos opcionales (6→8)    |
| `SesionEditor.svelte` + `SesionForm` | Foco + Técnica clase + Obs       | 3 pasos opcionales (2→5)    |
| `CompaneroEditor.svelte`             | Notas                            | Paso opcional (3→4)         |
| `RollEditor.svelte`                  | Duración                         | Paso opcional (5→6)         |
| `+page.svelte` (home)                | Bloque `{#if s.foco}` en cards   | Re-añadir condicionado      |
| `PosicionModalContent.svelte`        | Bloque notas read-only           | Re-añadir condicionado      |
| `SumisionModalContent.svelte`        | Bloque notas read-only           | Re-añadir condicionado      |
| `TecnicaModalContent.svelte`         | Bloques detalles + errores       | Re-añadir condicionado      |

**Restricciones a respetar:**
- Las variables `*Original` ya presentes en cada editor se conservan
  y siguen reenviando el valor de BD aunque el campo esté oculto.
  Esto ya está hecho en s36; T-3 solo añade el camino de visibilidad
  para escribirlos manualmente cuando el modo lo permite.
- En modo hobbyist, los wizards no muestran los pasos extra y
  `totalSteps` debe recalcularse dinámicamente (no hardcodear el
  número de pasos). Mantener oculto el indicador de progreso cuando
  `totalSteps === 1`.
- Migraciones BD inmutables — no se tocan.
- Sin Tailwind crudo, sin nuevas deps.

**Validación:**
- `pnpm check` sin nuevos errores.
- `pnpm preview` — owner verifica los 6 wizards/editores en ambos
  modos. Toggle off → captura simplificada de s36. Toggle on → todos
  los campos disponibles, datos legacy editables.

---

## ORDEN Y DEPENDENCIAS

```
T-1.it6 (fontanería)
   ├─→ T-2.it6 (home — paralelizable con T-3)
   └─→ T-3.it6 (wizards/editors — paralelizable con T-2)
```

T-2 y T-3 son independientes entre sí; pueden cerrarse en cualquier
orden tras T-1.

---

## RIESGOS Y TRADE-OFFS

- **Riesgo:** un user con BD viviendo del export v5 importa en una app
  ya migrada a v6. Hoy el `importAll()` rechaza versiones no
  coincidentes. Decisión: mantener el comportamiento estricto y exigir
  re-export. Migrar JSONs viejos a v6 a mano es trivial (añadir
  `schema_version: 6` y `app_settings: [{key: "modo_avanzado", value:
  "false"}]`). El JSON `bjj-tracker-export-20260520-v6.json` ya está
  generado en root como referencia.
- **Riesgo:** las variables `*Original` en los editores asumen un dato
  legacy presente. Si un user nunca lo capturó (porque hobbyist no
  expone el campo), `*Original` será `''` o `undefined` y al pasar al
  modo avanzado verá el campo vacío. Comportamiento correcto.
- **Trade-off declarado:** los pasos opcionales recargan UI en modo
  avanzado. Aceptado — eso es lo que el modo significa.

---

## REFERENCIAS

- Sesión 26 (2026-05-19) — entrada original en backlog.
- Sesión 36 (2026-05-20) — auditoría de facto de campos opcionales.
- T-4.it5 — construcción de `AnalisisHome`.
- `MEJORAS_FUTURAS.md §Modo hobbyist vs avanzado` — entrada activa
  del backlog, a marcar como HECHA al cerrar it.6.

# Estado actual del proyecto

**Última actualización:** 2026-05-12 (cierre sesión 4)
**Fase activa:** Iteración 1 — Mapa técnico básico
**Iteración en curso:** it.1 (5.5/15 tareas cerradas: T-1, T-2, T-2.5, T-3, T-4, T-5)

---

## Dónde estamos en macro

Iteración 0 ✅ cerrada en `v0.1-it0` (2026-05-10). App permite capturar
sesiones, rolls, compañeros, ver tabla filtrable y exportar/importar JSON.

Iteración 0.5 ✅ funcionalmente cerrada (auto-update PWA + wizards + chips
+ DateField). Falta solo T-9 (verificación en uso real con 1 sesión
capturada con el flujo nuevo) y tag `v0.1-it0.5`. Pendiente, no bloquea.

Estamos en **iteración 1** — base estructural del mapa técnico. Plan
completo en `ITERACION_1.md`. 5 tareas y media cerradas (T-1 a T-5,
T-2.5 intercalada). Queda toda la mitad visible (modales de técnica y
sumisión, editores wizard, contras, captura inline en roll).

---

## Última sesión (2026-05-12, sesión 4)

**Hecho:**
- **Discusión de diseño del mapa** con stakeholder. Cerradas las 3
  cuestiones abiertas de `REQUISITOS.md §7`:
    - Sumisiones = nodos terminales del grafo (no salen aristas).
    - Mismo nombre técnico desde distintos orígenes = aristas distintas
      que comparten el `nombre`. UI las agrupa.
    - Variantes ("la cross choke de mi profe") = aristas paralelas con
      campo `variante` distinto. No hay plantilla/instancia separadas.
  Commit `f345d2e`.
- **Tipos de técnica** confirmados: ataque / sweep / escape / transicion
  / sumision. "Defensa" fuera (vive como contra de otra técnica).
- **Plan de iteración 1** escrito en `.claude/ITERACION_1.md` — 15 tareas
  (F-1 a F-6), criterios, riesgos, decisiones confirmadas. Commit
  `50e31da`. T-2.5 (sync v2) añadida tras descubrir deuda en T-1.
- **T-1** ✅ Schema v2 + migración v1→v2 + smoke `/dev/db-migration-smoke`
  + `PRAGMA foreign_keys = ON` global. Migraciones como array
  `{from,to,run}` extensible. BDs nuevas aplican V1 + migraciones siempre
  (no schema_v2_fresh paralelo). Verificado por Adalid: 23/23 checks OK
  (subió de 17/17 tras añadir verificación FK). Commit `f93b72f`.
- **Fix sync.ts** ✅ — al activar FK, importar JSONs v1 antiguos con
  referencias huérfanas fallaba. Patrón estándar de bulk-import: PRAGMA
  OFF + BEGIN/COMMIT + PRAGMA ON + `foreign_key_check` para auditar sin
  abortar. Lección documentada en ADR mental: cuando activas invariantes
  hay que revisar callers que dependían del comportamiento permisivo.
  Commit `e5f2462`.
- **T-2** ✅ Capa de datos CRUD para schema v2: `posiciones.ts`,
  `sumisiones.ts`, `tecnicas.ts` (CRUD + 4 consultas para modal),
  `contras.ts` (N:N asimétrica), extensión de `rolls.ts` con
  `setPosicionesProblema`/`getPosicionesProblema`. Validación TS en
  `createTecnica` con `assertDestinoCoherente` para evitar el CHECK
  críptico de SQLite. Commit `e62b19a`.
- **T-2.5** ✅ `sync.ts` cubre schema v2 (8 tablas en export/import).
  `CURRENT_SCHEMA_VERSION → 2`. Validación strict. Commit `df61670`.
- **T-3** ✅ Página `/mapa` read-only: header + buscador + posiciones
  agrupadas por categoría + sumisiones aparte + chips de tipo/categoría
  con tokens semánticos. Tab "Mapa" añadido al `BottomNav` entre Rolls
  y Compañeros (orden final: Home → Rolls → Mapa → Compañeros → Ajustes).
  Items en read-only con `cursor-default`. Commit `f65bf4c`.
- **T-4 + T-5** ✅ Stack de modales del mapa + modal de posición:
    - `mapa-modal-stack.svelte.ts`: store singleton con `$state` en class
      field privado. Operaciones push/pop/popTo/closeAll.
    - `MapaModalHost.svelte`: UN solo Dialog controlado por el store (no
      Dialogs anidados, evita problemas de focus/overlay). Breadcrumb si
      stack>1, botón ← si stack>1, botón ✕ siempre. Esc/click overlay/✕
      van por `onOpenChange` → `closeAll`.
    - `PosicionModalContent.svelte`: chips de tipo+categoría, notas,
      tabs por tipo de técnica (a mano con botones-chip, shadcn-svelte
      no tiene Tabs primitive instalado). Item de técnica clickable →
      push modal de técnica (placeholder T-6).
    - Seed temporal `/dev/seed-mapa` para validar inmediatamente sin
      esperar a T-8: 3 posiciones + 2 sumisiones + 6 técnicas idempotente.
      Se elimina al cerrar it.1 (T-15).
  Validado por Adalid: lista, modales, breadcrumb, navegación, ← / ✕,
  placeholders correctos. Commit `2542d71`.

**Decisiones tomadas (con peso):**
- Las 3 cuestiones abiertas de REQUISITOS §7 cerradas (ver arriba).
- Tipos de técnica: ataque/sweep/escape/transicion/sumision. Sin
  "defensa".
- `PRAGMA foreign_keys = ON` activado globalmente. Bulk imports usan
  PRAGMA OFF + transacción + foreign_key_check para tolerar huérfanos
  heredados.
- Stack de modales = UN Dialog controlado por store (no Dialogs anidados).
  Patrón potencialmente reusable en otras pantallas si hace falta.
- Wizard de técnica en 7 pasos sin fusión (decisión producto).
- Móvil del mapa en it.1 (lectura), no esperar a it.4.
- Linkear rolls a técnicas se queda para it.2 (respeta REQUISITOS §6).
- Posiciones semilla para T-14: guardia cerrada bottom + mount bottom
  (las que sugería REQUISITOS).
- Validación de destino exclusivo en TS además del CHECK en BD, para
  devolver mensajes accionables a la UI.
- Naming asimétrico de contras: `getContras(X)` = "contras DE X";
  `getTecnicasQueContrarresta(X)` = "técnicas para las que X es la
  contra". Direccion explícita en el nombre.

---

## Sesión previa (2026-05-11 → 12, sesión 3)

Fix de bugs introducidos por it.0.5 + cierre de la fase de pulido.

**Hecho (resumen):**
- Bug `pwa.svelte.ts` con `$state` module-level → refactor a class fields.
- Bug `sqlite3-opfs-async-proxy.js` no copiado al deploy → ampliado
  `copy-sqlite-wasm.mjs`.
- Bug pre-existente del refresh resuelto con bump de patches svelte/
  kit/vite. ADR-001 documenta. Eliminado `package-lock.json` (lockfile
  autoritativo es `pnpm-lock.yaml`).
- Indicador de versión en home, criterios técnicos ampliados en
  `CONTEXTO_AGENTE.md`.

**Decisiones con peso (vigentes):**
- `$state` solo dentro de class fields, nunca module-level.
- Verificar con `pnpm preview` + refresh antes de pushear cambios a
  SW/PWA/bundle.
- `pnpm-lock.yaml` es el único lockfile autoritativo.

---

## Próximo paso

**T-6 + T-7 — Modales de técnica y sumisión.** Son placeholders hoy en
`MapaModalHost.svelte` (líneas que dicen "Modal de técnica llega en T-6"
y "Modal de sumisión llega en T-7"). T-5 ya hace el push correcto al
stack al hacer click, así que solo hay que rellenar el contenido.

**Modal de técnica (T-6) — REQUISITOS §3.5:**
- Header: nombre [+ variante] + chip de tipo + chip de estado.
- Origen → link al nodo de posición (push).
- Destino → link al nodo (posición o sumisión, push).
- Setup / detalles.
- Errores comunes.
- Contras conocidas (lista clickable de técnicas que la responden, push).
- "Otras variantes de [nombre]" si hay aristas hermanas (push).

**Modal de sumisión (T-7):**
- Header: nombre.
- Notas.
- Variaciones agrupadas por posición de origen (lista clickable, push).

Ambos siguen el patrón de `PosicionModalContent.svelte`: componente que
recibe la entidad como prop, carga lo necesario en `onMount`, render con
tokens semánticos. Cuando estén ambos, el recorrido encadenado completo
(nodo → técnica → contra → respuesta → ...) funciona end-to-end.

Después de T-6/T-7: T-8 a T-10 (editores wizard de posición/sumisión/
técnica desktop), T-11 (UI de contras), T-12 (captura inline en wizard
de roll), T-13 (chips en detalle de sesión + filtro nuevo en /rolls),
T-14 (semilla real con guardia cerrada bottom + mount bottom + uso real),
T-15 (cierre con tag `v0.2-it1`).

---

## Decisiones recientes con peso

- **2026-05-12 (s4) — REQUISITOS §7 cerrado.** Sumisiones nodos
  terminales, variantes como aristas paralelas con campo `variante`,
  mismo nombre técnico desde distintos orígenes = aristas hermanas.
- **2026-05-12 (s4) — Tipos de técnica finales.** ataque / sweep /
  escape / transicion / sumision. "Defensa" eliminada (vive como
  contra).
- **2026-05-12 (s4) — PRAGMA foreign_keys = ON globalmente.** Bulk
  imports usan PRAGMA OFF + transacción + foreign_key_check para
  tolerar huérfanos sin abortar.
- **2026-05-12 (s4) — Stack de modales = UN Dialog + store.** No
  Dialogs anidados. Evita problemas de focus/overlay y queda como
  patrón reusable.
- **2026-05-12 (s4) — Wizard de técnica en 7 pasos sin fusión.**
- **2026-05-12 (s3) — Bump de patches svelte/kit/vite** para resolver
  bug pre-existente del refresh en prod. ADR `decisiones/001`.
- **2026-05-12 (s3) — `pnpm-lock.yaml` es el único lockfile autoritativo**.
- **2026-05-12 (s3) — `$state` solo dentro de class fields**, nunca
  module-level.
- **2026-05-12 (s3) — Verificación con `pnpm preview` + refresh** antes
  de pushear cambios que toquen SW/PWA/bundle.
- **2026-05-11 (s2) — `bits-ui DateField`** para inputs de fecha.
- **2026-05-11 (s2) — Wizard de sesión como Dialog modal** abierto desde
  home, no como página `/sesion/nueva`.
- **2026-05-11 (s2) — FAB extended (icono + label)** cuando el `+` solo
  sea ambiguo (detalle de sesión).
- **2026-05-10 — Auto-update PWA: opción B (prompt)** sobre opción A
  (skipWaiting).

---

## Notas internas para próxima sesión

- **Node 22 obligatorio** (`.nvmrc`). `nvm use 22` antes de cualquier
  comando.
- **pnpm, no npm.** Dev: `pnpm dev -- --host`. Preview: `pnpm preview
  -- --host`. Install: `pnpm install`.
- **Path quirk de dev:** en `pnpm dev` la app sirve en `/`, no en
  `/bjj-tracker/`. El base path solo aplica en build de producción.
  Las URLs de smoke/seed durante dev son `/dev/db-migration-smoke` y
  `/dev/seed-mapa` (sin prefijo).
- **Seed temporal vigente en `/dev/seed-mapa`** — botones "sembrar" y
  "limpiar". Útil para validar T-6/T-7. Se elimina en T-15.
- **Smoke de migración vigente en `/dev/db-migration-smoke`** — útil
  para sanidad de schema. Se evalúa mantener o eliminar al cerrar it.1.
- **Tareas que faltan de it.1:** T-6, T-7, T-8, T-9, T-10, T-11, T-12,
  T-13, T-14, T-15. La mitad visible aún por hacer.
- **Bug pendiente de cerrar de it.0.5:** falta T-9 (captura de 1 sesión
  real con el flujo nuevo) + tag `v0.1-it0.5`. No bloquea it.1.
- Push: SSH con `id_ed25519_personal` (alias `github-personal`). Si
  falla con "ssh_askpass", `ssh-add ~/.ssh/id_ed25519_personal`.

---

## Cómo usar este fichero

- Al iniciar una sesión de trabajo: leer este fichero primero para
  ponerse al día.
- Al cerrar una sesión: actualizar las secciones "Última sesión",
  "Próximo paso" y "Decisiones recientes con peso".
- Las secciones macro ("Dónde estamos") cambian con poca frecuencia,
  solo al cerrar / abrir iteración.

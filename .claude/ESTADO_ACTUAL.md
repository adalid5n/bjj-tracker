# Estado actual del proyecto

**Última actualización:** 2026-05-12 (cierre sesión 3)
**Fase activa:** Iteración 0.5 — pulido pre-iteración 1
**Iteración en curso:** it.0.5 (8/9 tareas cerradas; falta verificación en uso real)

---

## Dónde estamos en macro

Iteración 0 ✅ cerrada en `v0.1-it0` (2026-05-10). La app permite capturar
sesiones, rolls, compañeros, ver tabla filtrable y exportar/importar JSON.
Desplegada en https://adalid5n.github.io/bjj-tracker/ — versión publicada
**v0.0.2** con auto-update PWA funcional.

Estamos al final de **iteración 0.5** — fase de pulido. Plan completo en
`ITERACION_0_5.md`. T-1 a T-8 cerradas + cleanup de T-9 hecho. Falta
solo la verificación en uso real (capturar 1 sesión con el flujo nuevo
y anotar fricción residual si aparece) para cerrar iteración.

---

## Última sesión (2026-05-11 → 12, sesión 3)

**Hecho:**
- **Bug `pwa.svelte.ts` con `$state` module-level** rompía el bundle prod
  (TypeError al cargar la app, "Cargando…" eterno). Refactor a class
  fields, patrón canónico Svelte 5. Commit `066321e`.
- **Bug `sqlite3-opfs-async-proxy.js` no se copiaba** al deploy (el script
  `copy-sqlite-wasm.mjs` solo copiaba el `.wasm`). Causaba 404 en runtime
  y pantalla en blanco en Chrome móvil al refrescar la PWA. Añadidos
  proxy y `sqlite3-worker1.mjs` al script. Commit `b923766`.
- **Bug pre-existente del refresh** (no introducido por it.0.5):
  TypeError dentro del initializer de la clase `Page` interna de SvelteKit
  al re-evaluarse el módulo. Reproducido con Playwright que la app
  funcionaba en `pnpm dev` y siempre cascaba en `pnpm preview` tras el
  primer goto. Diagnóstico de ~2h descartó: SW, minify, modo prompt vs
  autoUpdate, sessionStorage, dual package. **Fix: `pnpm install` con
  patches recientes** (kit `2.57→2.59.1`, vite `8.0.7→8.0.12`,
  svelte `5.55.2→5.55.5`). Eliminado `package-lock.json` del repo (el
  CI usa `pnpm-lock.yaml`, ese es el único lockfile autoritativo).
  Commit `8c7c62c`. ADR completo en `decisiones/001-bump-deps-fix-refresh.md`.
- **Indicador de versión** `v0.0.2` añadido como footer discreto de la
  home. Sirve para confirmar qué versión está activa tras un update y
  como cambio mínimo para disparar el toast en el segundo deploy.
  Commit `0815106`.
- **Documentación de criterios técnicos** ampliada en `CONTEXTO_AGENTE.md`:
  sección nueva "Entorno y herramientas" (Node 22 + pnpm),
  `$state` solo dentro de class fields, regla de verificar con
  `pnpm preview` + refresh antes de pushear cambios a SW/PWA/bundle,
  y el truco de `pnpm install` para bugs solo-en-prod. Commit `1eb9784`.

**Decisiones tomadas:**
- Subir patches de svelte/kit/vite en lugar de bisectar código para el
  bug pre-existente del refresh. Razón: bug claramente del framework,
  los patches resuelven sin tocar nuestro código. ADR-001 documenta.
- `package-lock.json` no se versiona; el lockfile autoritativo es
  `pnpm-lock.yaml`. CI usa `pnpm install --frozen-lockfile`.
- `$state` solo dentro de class fields, nunca en module-level. Patrón
  canónico documentado en `CONTEXTO_AGENTE.md`.
- Antes de pushear cambios que toquen SW/PWA/bundle config, verificar
  con `pnpm preview` + refresh (no solo `check` + `build`).

---

## Sesión previa (2026-05-11 sesión 2)

**Hecho:**
- **T-6** ✅ Wizard de `CompaneroEditor.svelte` (4 pasos: nombre →
  cinturón → peso → notas) + form de edición migrado a Chips/
  CinturonChips. Schema BD intacto (campo "experiencia en años" del
  plan inicial descartado por la regla "no tocar schema"). Commit
  `eb4a51b`.
- **Fix cinturones** Stripe visible en blanco (punta negra) y negro
  (punta roja, convención faixa preta) vía token nuevo
  `--cinturon-tip-rojo`. Commit `9569705`.
- **FAB nuevo roll** en detalle de sesión sustituye al botón inline
  `+ Añadir roll`. Acabó como FAB extended (icono + texto "Nuevo roll")
  porque en pantalla con form de sesión + lista de rolls un `+` redondo
  solo era ambiguo. Commits `b6a336d`, `44058c4`.
- **T-7** ✅ Wizard de sesión como `SesionEditor.svelte` (Dialog modal
  abierto desde el FAB de home). Pasos: fecha → tipo → foco → técnica
  → observaciones; pasos 1-2 obligatorios. Ruta `/sesion/nueva`
  eliminada. Edición sigue inline con `SesionForm` en `/sesion/[id]`.
  Commit `bc96af4`.
- **DateField (bits-ui)** Inputs de fecha migrados de `<Input type="date">`
  a `DateInput.svelte`, un wrapper de `bits-ui DateField` con locale
  es-ES — segmentos DD/MM/YYYY navegables, auto-corrección y bisiestos
  heredados del framework. Commit `e36cf6a`. Display de tabla rolls
  alineado con home ("mié, 11 may"). Commit `6c620e2`.
- **T-8** ✅ Auto-update PWA. `registerType: 'autoUpdate'` → `'prompt'`
  en `vite.config.ts`. Nuevo `$lib/pwa.svelte.ts` con state reactivo
  (`needRefresh`, `update`, `dismiss`) y `initPWA()`. `UpdateToast.svelte`
  renderiza snackbar fijo bottom-left con "Recargar" y "Cerrar" cuando
  hay nueva versión disponible — descartable por sesión. Commit `0a68351`.
- **T-9 cleanup** Eliminados `/dev/chips` y `/dev/combobox` (playgrounds
  temporales de T-3 y T-4, ya cumplido su propósito). Commit `903e196`.
- **Regla nueva** "Antes de construir un primitive de UI desde cero,
  revisar qué hay disponible en los paquetes UI ya instalados (bits-ui,
  shadcn-svelte)" añadida a `CONTEXTO_AGENTE.md` sección "Criterios
  técnicos". Motivación: en T-7 perdimos un rework completo construyendo
  un DateInput a mano antes de comprobar que bits-ui exponía DateField.
  Commit `cbaa6ef`.

**Decisiones tomadas:**
- Wizard de sesión arquitectura final = Dialog modal (NO página entera
  con card). Igual patrón que RollEditor y CompaneroEditor: abierto
  inline desde el FAB de la pantalla padre, sin cambiar URL.
- `tipo` de sesión obligatorio en el wizard (paso 2 sin preselección).
  El plan original decía "solo fecha obligatoria"; se actualizó F-4
  y T-7 en `ITERACION_0_5.md` para reflejar realidad del modelo.
- FAB extended (icono + texto) cuando el `+` redondo solo sea ambiguo
  (pantallas multi-entidad como detalle de sesión).
- `bits-ui DateField` sobre componente custom con máscara. Razón:
  validación de rangos, segmentos navegables, auto-corrección,
  soporte de locales — todo gratis. Custom desde cero es deuda técnica
  innecesaria.

---

## Próximo paso

**T-9 — Verificación en uso real.** Único pendiente para cerrar it.0.5:

1. Capturar 1 sesión real con el flujo nuevo (FAB → wizard sesión →
   detalle → FAB extended → wizard roll → guardar).
2. Anotar fricción residual en `MEJORAS_FUTURAS.md` si aparece.
3. Toast de auto-update ya verificado funcional en sesión 3 (apareció
   tras el segundo deploy y la recarga limpia la app sin pantalla
   blanca). Subir `version` en `package.json` antes de cada deploy
   permitirá ver con claridad qué versión está activa.
4. Cerrar iteración con tag `v0.1-it0.5` y actualización macro del
   estado.

---

## Decisiones recientes con peso

- **2026-05-12 (s3) — Bump de patches svelte/kit/vite** para resolver
  bug pre-existente del refresh en prod (TypeError en clase Page de
  SvelteKit). ADR completo en `decisiones/001-bump-deps-fix-refresh.md`.
- **2026-05-12 (s3) — `pnpm-lock.yaml` es el único lockfile autoritativo**;
  `package-lock.json` no se versiona y se eliminó del repo. CI usa
  `pnpm install --frozen-lockfile`.
- **2026-05-12 (s3) — `$state` solo dentro de class fields**, nunca a
  nivel de módulo en `.svelte.ts`. Patrón canónico documentado en
  `CONTEXTO_AGENTE.md`. Reventó la PWA en prod por module-level.
- **2026-05-12 (s3) — Verificación con `pnpm preview` + refresh** antes
  de pushear cambios que toquen SW/PWA/bundle config. `check` + `build`
  no detectan bugs de runtime ni de bundle minificado.
- **2026-05-11 (s2) — `bits-ui DateField` para inputs de fecha.** Razón:
  la regla recién documentada de "framework primitives antes de custom".
  El DateField hereda toda la UX de validación/navegación/locale.
- **2026-05-11 (s2) — Wizard de sesión como Dialog modal abierto desde
  home, no como página `/sesion/nueva`.** Razón: coherencia con los
  otros dos wizards (roll y compañero) que viven como modal abierto
  inline desde su pantalla padre. La ruta `/sesion/nueva` se eliminó.
- **2026-05-11 (s2) — FAB extended (icono + label) cuando el `+` solo
  sea ambiguo.** Aplica a pantallas con varias entidades visibles a la
  vez (detalle de sesión = sesión + rolls). El FAB redondo de home y
  /companeros se queda sin texto porque la pantalla es lista única.
- **2026-05-11 (s2) — Cinturones blanco y negro llevan stripe** (negro
  el blanco, rojo el negro). Antes se veían como bloques de color sin
  contraste. Token nuevo `--cinturon-tip-rojo`.
- **2026-05-11 — bits-ui Combobox sobre implementación a mano** para el
  combobox dentro de Dialog. Razón: portal + focus management coordinado
  con el Dialog padre es exactamente lo que el headless component
  resuelve. La implementación a mano se complicó mucho con interacciones
  cruzadas (interact outside, blur, focus stealing).
- **2026-05-11 — `Dialog.Footer` global cambiado a `flex-row justify-between`**
  en lugar del `flex-col-reverse sm:flex-row` que traía shadcn-svelte por
  defecto. Botones a `size="sm"` para caber en una fila incluso en mobile
  (S20 Ultra). Aplica a TODOS los dialog footers de la app.
- **2026-05-10 — Auto-update PWA: opción B (prompt) sobre opción A
  (skipWaiting).** Razón: más respetuoso con flujo de captura,
  sin riesgo de recarga forzada en mitad de edición.
- **2026-05-10 — Sync de docs por git, no Syncthing.**

---

## Notas internas para próxima sesión

- **Node 22 obligatorio** (`.nvmrc`). Si entras a una shell fresca:
  `nvm use 22` antes de cualquier comando.
- **Usar pnpm, no npm.** Dev: `pnpm dev -- --host`. Preview: `pnpm preview
  -- --host`. Install: `pnpm install`. El `--host` es necesario para
  acceder desde el navegador de Windows al server de WSL.
- Push: SSH con `id_ed25519_personal` (alias `github-personal`).
  Si falla con "ssh_askpass", `ssh-add ~/.ssh/id_ed25519_personal` antes
  de intentar.
- Auto-update PWA confirmado funcional en sesión 3. Para verificar update
  en futuros deploys: subir `version` en `package.json`, push, y al abrir
  la app debe aparecer el snackbar.
- Falta crear `docs/diseño.md` con la guía del sistema de tokens.
  Decidido posponerlo: toda la info está en `layout.css`,
  `CONTEXTO_AGENTE.md`, `ITERACION_0_5.md` y `MEJORAS_FUTURAS.md`.

---

## Cómo usar este fichero

- Al iniciar una sesión de trabajo: leer este fichero primero para
  ponerse al día.
- Al cerrar una sesión: actualizar las secciones "Última sesión",
  "Próximo paso" y "Decisiones recientes con peso".
- Las secciones macro ("Dónde estamos") cambian con poca frecuencia,
  solo al cerrar / abrir iteración.

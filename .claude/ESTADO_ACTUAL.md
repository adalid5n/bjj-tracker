# Estado actual del proyecto

**Última actualización:** 2026-05-11 (cierre sesión 2)
**Fase activa:** Iteración 0.5 — pulido pre-iteración 1
**Iteración en curso:** it.0.5 (8/9 tareas cerradas; falta verificación en uso real)

---

## Dónde estamos en macro

Iteración 0 ✅ cerrada en `v0.1-it0` (2026-05-10). La app permite capturar
sesiones, rolls, compañeros, ver tabla filtrable y exportar/importar JSON.
Desplegada en https://adalid5n.github.io/bjj-tracker/

Estamos al final de **iteración 0.5** — fase de pulido. Plan completo en
`ITERACION_0_5.md`. T-1 a T-8 cerradas + cleanup de T-9 hecho. Falta
solo la verificación en uso real (capturar 1 sesión con el flujo nuevo
y anotar fricción residual si aparece) para cerrar iteración.

---

## Última sesión (2026-05-11 sesión 2)

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
3. Probar el toast de auto-update tras un segundo deploy posterior al
   actual (este deploy mete `prompt`; el siguiente disparará el toast).
4. Cerrar iteración con tag `v0.1-it0.5` y actualización macro del
   estado.

---

## Decisiones recientes con peso

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

- Dev server: cuando se retome, levantar con `npm run dev -- --host` (sin
  `--host`, el localhost del WSL no es accesible desde el navegador del
  host Windows).
- Push: usa SSH con la clave `id_ed25519_personal` (alias `github-personal`).
  Si falla con "ssh_askpass", `ssh-add ~/.ssh/id_ed25519_personal` antes
  de intentar.
- Toast de update: la versión recién deployada (con `prompt`) reemplaza
  a la `autoUpdate` instalada en clientes existentes vía recarga
  silenciosa. **Para ver el toast en acción hace falta un SEGUNDO deploy
  posterior** — el commit que cierra esta sesión actualizando
  `ESTADO_ACTUAL.md` sirve a este propósito.
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

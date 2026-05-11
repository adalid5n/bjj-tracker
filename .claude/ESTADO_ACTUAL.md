# Estado actual del proyecto

**Última actualización:** 2026-05-11
**Fase activa:** Iteración 0.5 — pulido pre-iteración 1
**Iteración en curso:** it.0.5 (en progreso, 5/9 tareas cerradas)

---

## Dónde estamos en macro

Iteración 0 ✅ cerrada en `v0.1-it0` (2026-05-10). La app permite capturar
sesiones, rolls, compañeros, ver tabla filtrable y exportar/importar JSON.
Desplegada en https://adalid5n.github.io/bjj-tracker/

Estamos en mitad de **iteración 0.5** — fase de pulido. Plan completo en
`ITERACION_0_5.md`. Llevamos 5 de 9 tareas cerradas.

---

## Última sesión (2026-05-11)

**Hecho:**
- Plan `ITERACION_0_5.md` redactado y aprobado.
- **T-1 + T-2** ✅ Migración a design tokens shadcn. `--primary` redefinido
  a azul oklch (~ blue-600); tokens custom `--success`, `--warning` añadidos
  en `:root` y `.dark`. 10 ficheros migrados (Fab, BottomNav, 3 editores,
  5 páginas). Regla "sin colores Tailwind crudos" en `CONTEXTO_AGENTE.md`.
  Commit `3c0beb0`.
- **T-3** ✅ Componentes `Chips.svelte` (selección única con toggle off,
  soporta `dotColor`) y `CinturonChips.svelte` (chip específico para
  cinturones BJJ — sin texto, mini-rectángulo con punta negra en
  azul/morado/marrón). Tokens de dominio `--cinturon-{blanco,azul,morado,
  marron,negro}` en `layout.css`. Playground temporal en `/dev/chips`.
  Commit `560a2e0`.
- **T-4** ✅ `CompaneroCombobox.svelte` con bits-ui Combobox como base
  (tras intentar implementarlo a mano y chocar con problemas de portal
  + Dialog focus management). "+ Crear nuevo: 'X'" como Item con value
  especial. Playground en `/dev/combobox`. Commit `804cbee`.
- **T-5** ✅ Refactor de `RollEditor.svelte` a wizard (5 pasos con
  auto-avance) para alta nueva + form para edición. Pasos: compañero,
  tamaño, duración, resultado, notas. Resultado obligatorio. Botón
  "← Atrás" en footer. Si al crear nuevo compañero se indica peso, salta
  paso 2. `Dialog.Footer` base cambiado a `flex-row justify-between` global
  (botones también en una fila en mobile). Commit `9362e46`.
- Entrada "Modo oscuro con toggle en Ajustes" añadida a
  `MEJORAS_FUTURAS.md`.

**Decisiones tomadas:**
- Plan acordado de it.0.5 con las 6 decisiones cerradas:
  wizard con auto-avance; "Saltar" eliminado a favor de "← Atrás" +
  "Continuar" únicos; chip seleccionado en `bg-primary` saturado;
  form para editar, wizard solo para alta nueva; resultado obligatorio.
- Color primary mantenido azul (no neutro shadcn) para preservar
  identidad visual.
- bits-ui Combobox elegido sobre implementación a mano para casos
  dentro de Dialog (portal + focus management complicado a mano).
- `Dialog.Footer` con `flex-row justify-between` por defecto en TODA
  la app (no solo wizard). Botones a `size="sm"` para caber en mobile.
- Tokens de dominio (`--cinturon-*`) son legítimos junto a los
  semánticos (`--primary`, `--success`, etc.); no son Tailwind crudo.

---

## Próximo paso

**T-6 — Wizard de compañero (P4).** Refactor de `CompaneroEditor.svelte`
siguiendo el mismo patrón que el wizard de roll en T-5:

- 5 pasos con auto-avance:
  1. Nombre (input texto, Enter / Continuar)
  2. Cinturón (CinturonChips)
  3. Experiencia en años (input numérico)
  4. Peso relativo (Chips)
  5. Notas (textarea + Guardar)
- Solo el paso 1 (nombre) es obligatorio; resto skipeable.
- Edición existente sigue como form (no obligar a pasar por pasos).
- Mismo indicador de progreso + botón "← Atrás" que en RollEditor.

Tareas pendientes después de T-6:
- **T-7**: wizard de sesión nueva (P2) — solo alta, edición sigue inline.
- **T-8**: auto-update PWA (`registerType: 'prompt'` + UpdateToast).
  Requiere tocar `vite.config.ts` (fichero protegido, pedir OK).
- **T-9**: verificación en uso real + posible limpieza de `/dev/*` y
  cierre de iteración.

---

## Decisiones recientes con peso

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
- **2026-05-10 — Combobox de compañero entra en la fase de pulido
  (no esperar a feedback de uso real).** Razón: es el momento donde
  se crean más compañeros nuevos.
- **2026-05-10 — Sync de docs por git, no Syncthing.**

---

## Notas internas para próxima sesión

- Dev server: cuando se retome, levantar con `npm run dev -- --host` (sin
  `--host`, el localhost del WSL no es accesible desde el navegador del
  host Windows).
- Push: usa SSH con la clave `id_ed25519_personal` (alias `github-personal`).
  Si falla con "ssh_askpass", `ssh-add ~/.ssh/id_ed25519_personal` antes
  de intentar.
- `/dev/chips` y `/dev/combobox` siguen viviendo en el repo como playgrounds.
  Se eliminan al cerrar it.0.5 (en T-9 o como cleanup final).
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

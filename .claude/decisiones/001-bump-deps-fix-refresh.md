# ADR-001 — Bump de svelte/kit/vite para resolver TypeError en refresh

**Fecha:** 2026-05-12
**Estado:** Aceptada
**Commit del bump:** `8c7c62c`

## Contexto

Al cierre de iteración 0.5, al actualizar la PWA instalada en móvil
(Edge Android y Chrome), la app quedaba en blanco tras hacer F5/refresh
o tras pulsar "Recargar" en el toast de auto-update (T-8). Reproducible
también en desktop accediendo directamente a la URL pública y refrescando.

Síntoma exacto en consola del browser:

```
TypeError: Cannot read properties of undefined (reading 'push')
  at push_reaction_value (CQF_DeoU.js:3224)
  at state (CQF_DeoU.js:2266)
  at <instance_members_initializer> (CnbaS1Yo.js:777)
  at new Page (CnbaS1Yo.js:776)
```

El crash ocurría dentro del `instance_members_initializer` de la clase
`Page` interna de SvelteKit (`#data = state({})`), al re-evaluarse el
módulo durante un refresh.

## Diagnóstico (resumen, ~2h con Playwright)

Bajo Playwright headless emulando Pixel 7:

| Configuración | Primera carga | Segundo `goto` mismo URL | `reload()` |
|---|---|---|---|
| `pnpm dev` | OK | OK | OK |
| `pnpm preview` (sin SW) | OK | TypeError | TypeError |
| `pnpm preview` (con SW autoUpdate) | OK | TypeError | TypeError |
| `pnpm preview` (con SW prompt) | OK | TypeError | TypeError |
| `pnpm preview` sin minify | OK | TypeError | TypeError |

Descartado:
- Service Worker (mismo bug con SW completamente desactivado).
- Modo `autoUpdate` vs `prompt`.
- Minificación (esbuild).
- `sessionStorage` / `localStorage` (vacíos, limpiarlos no cambia nada).
- Dual package de svelte (solo un chunk contiene `push_reaction_value`).
- Cambios recientes propios (reproducible en `e09ecad`, anterior a T-6).

Confirmado bug pre-existente del proyecto, latente porque nadie había
refrescado en producción hasta esta iteración.

## Decisión

Actualizar las patch versions de las dependencias del framework:

- `@sveltejs/kit`: `^2.57.0` → `^2.59.1`
- `svelte`: `^5.55.2` → `^5.55.5`
- `vite`: `^8.0.7` → `^8.0.12`

Regenerar `pnpm-lock.yaml`. **Eliminar `package-lock.json`** del repo
(estaba duplicado y no se usa — CI corre `pnpm install --frozen-lockfile`).

## Consecuencias

- Bug resuelto: 0 errores en cualquier secuencia de navegación tras el
  upgrade.
- `pnpm-lock.yaml` actualizado con transitive dependencies recientes.
- Se reafirma como criterio técnico (ver `CONTEXTO_AGENTE.md`): **antes
  de bisectar código por un bug solo-en-prod, probar `pnpm install` para
  subir a patches recientes**. Habría ahorrado ~2h aquí.
- Política reafirmada: `package-lock.json` no se versiona en este repo.

## Alternativas consideradas

- **Workaround vía `data-sveltekit-reload`** — desactivar nav SPA. Descartado,
  no resuelve el reload (el bug también aparece en F5).
- **Downgrade a vite 7.x** — más invasivo, sin garantía de fix.
- **Esperar fix oficial y workaround temporal** — no había workaround
  identificado.
- **Reportar issue a sveltejs/kit** — válido pero no urgente: el bump
  ya resuelve.

## Referencias

- Commit del fix: `8c7c62c`
- Commits intermedios de diagnóstico (no aplicaron, solo pruebas):
  `b923766` (sqlite-wasm assets, fix legítimo pero no relacionado con
  este bug), `066321e` (refactor pwa.svelte.ts a clase, también fix
  legítimo de otro bug del mismo bundle).
- Memoria personal del agente: `feedback_verify_with_preview.md`
  (transversal a otros proyectos).

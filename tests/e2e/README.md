# Tests E2E manuales

Scripts standalone para validación visual end-to-end. **No entran en CI**
ni en `pnpm test:e2e` (extensión `.e2e.mjs` queda fuera del `testMatch`
de `playwright.config.ts`). Se usan a mano cuando una tarea no triviale
de UI necesita verificación reproducible.

Si en el futuro se decide promocionar alguno a CI, hay que reescribirlo
con el API `@playwright/test` y renombrarlo a `*.e2e.ts`.

## Scripts disponibles

- `grafo-layout.e2e.mjs` — flujo completo del layout persistido del
  grafo (T-9.it3): carga / creación de posiciones / auto-dirty / Guardar
  / persistencia tras reload / drag / Reorganizar / AlertDialog
  Cancelar+Descartar.

## Cómo correr uno

Requiere la app sirviendo en `pnpm preview` o `pnpm dev`. Playwright y
sus binarios ya están instalados (vienen como dev deps del proyecto).

```bash
# Contra preview (default):
pnpm build && pnpm preview &
node tests/e2e/grafo-layout.e2e.mjs

# Contra dev:
pnpm dev -- --host &
BJJ_E2E_URL=http://localhost:5173/mapa node tests/e2e/grafo-layout.e2e.mjs
```

Variables de entorno:

- `BJJ_E2E_URL` — URL base de la página a probar. Default para preview:
  `http://localhost:4173/bjj-tracker/mapa` (incluye el base path de
  producción).
- `BJJ_E2E_OUT` — carpeta para los screenshots. Default:
  `tests/e2e/output/grafo_shots/` (gitignored).

## Convenciones

- **Consentimiento previo**: estos scripts NO se ejecutan ni se crean
  por subagentes sin OK explícito del owner. Ver `CONTEXTO_AGENTE.md`.
- **Sin tocar `pnpm-lock.yaml`** ni añadir deps: Playwright ya está
  instalado.
- Los screenshots viven en `output/` (gitignored). Para revisarlos
  basta con abrirlos tras la ejecución.

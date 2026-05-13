# Contexto para agente de IA trabajando en este repo

## Roles

- El owner del proyecto actúa como stakeholder / PM: decide alcance,
  prioridades y trade-offs de producto. No implementa código directamente.
- El agente actúa como orquestador: lee el contexto, propone, delega
  cuando hace falta, y reporta. Sigue el ciclo Plan + checkpoint +
  ejecución + verificación + aprobación en cada paso no trivial.

## Cómo trabajar en este proyecto

- No avanzar sin aprobación explícita en pasos no triviales.
- Antes de ejecutar un paso, dar resumen claro de qué se va a hacer y por qué.
- Cuando aparezca un término técnico nuevo (Worker, OPFS, prerender, etc.),
  explicarlo brevemente — "X es Y que sirve para Z" — antes de seguir.
- Comunicación concisa. Si una desviación técnica no impacta producto,
  resumir en 2-3 líneas y seguir. Si impacta producto, abrir la decisión
  explícitamente con framing de stakeholder primero.

## Estado del proyecto

- Iteración 0 ✅ cerrada (tag `v0.1-it0`, 2026-05-10). Captura mínima
  funcional desplegada en GitHub Pages.
- Fase de pulido pre-iteración 1 en preparación. Plan detallado en
  `ITERACION_0_5.md` (pendiente de crear).
- Para el estado de detalle día a día, ver `ESTADO_ACTUAL.md`.

## Entorno y herramientas

- **Node 22 obligatorio** (declarado en `.nvmrc`). Algunas dependencias
  (SQLite-WASM 3.53+) lo requieren explícitamente y fallan con `EBADENGINE`
  en Node 20. Asegurar Node 22 activo antes de cualquier
  `install`/`build`/`dev` (con `nvm use 22`, `fnm use 22`, o el gestor que
  uses).
- **Gestor de paquetes: pnpm**, no npm. El lockfile autoritativo es
  `pnpm-lock.yaml`; CI ejecuta `pnpm install --frozen-lockfile`. **No
  crear ni comitear `package-lock.json`** — está duplicado y solo sirve
  para confundir. Si necesitas cambiar deps: `pnpm install`/`pnpm add`.

## Restricciones que respetar

- No tocar `vite.config.ts`, `svelte.config.js`, `+layout.svelte`,
  `+layout.ts`, `.github/workflows/deploy.yml` sin pedirlo explícitamente.
- No añadir dependencias no acordadas. Sin Drizzle, Prisma, Dexie, Kysely.
- SQL crudo. API mínima de DB: `init`, `run`, `query`.
- SQLite-WASM solo en cliente, nunca durante SSR/prerender.
- **Sin colores Tailwind crudos en componentes propios.** Prohibido
  `bg-blue-500`, `text-red-700`, `border-gray-200`, etc. en cualquier
  fichero de `src/`. Usar siempre tokens semánticos:
  `bg-primary`, `text-destructive`, `bg-muted`, `text-muted-foreground`,
  `border-border`, `bg-success`, `bg-warning`, etc. Los tokens están
  definidos en `src/routes/layout.css` (vars CSS `:root` y `.dark`) y
  expuestos como utilidades Tailwind vía `@theme inline`. Si hace falta
  una variante semántica nueva, se añade el token en `layout.css`, no se
  vuelve a Tailwind crudo.

## Criterios técnicos

- **Antes de construir un primitive de UI (input, date picker,
  combobox, popover, calendar, etc.) desde cero, revisar qué hay
  disponible en los paquetes UI ya instalados (bits-ui,
  shadcn-svelte, etc.). Solo construir custom cuando no haya nada
  que cubra el caso.** Al proponer cambios de UI, plantear primero
  opciones del framework. Referencia: `bits-ui` expone Accordion,
  AlertDialog, Calendar, Checkbox, Combobox, Command, DateField,
  DatePicker, DateRangeField, Dialog, DropdownMenu, Menubar,
  NavigationMenu, Pagination, PinInput, Popover, RadioGroup,
  RangeCalendar, ScrollArea, Select, Separator, Slider, Switch,
  Tabs, TimeField, Toggle, ToggleGroup, Toolbar, Tooltip y más.

- **`$state` (y demás runas) solo dentro de class fields o
  componentes `.svelte`, nunca a nivel de módulo en `.svelte.ts`.**
  Patrón canónico para state compartido:

  ```ts
  class FooState {
    #value = $state(initial);
    get value() { return this.#value; }
    setValue(v) { this.#value = v; }
  }
  export const foo = new FooState();
  ```

  Lo que NO funciona (rompe el bundle minificado en prod):

  ```ts
  let value = $state(initial); // ← TypeError en prod
  ```

  Histórico: T-8 (commit `0a68351` → fix `066321e`).

- **Antes de pushear cambios que toquen Service Worker, PWA, bundle
  config (`vite.config.ts`) o el layout raíz, verificar con
  `pnpm run preview` Y hacer al menos un refresh** — no basta con
  `pnpm run check` + `pnpm run build`. Algunos bugs (runtime del
  framework, runas en module-level, SW cacheando assets stale) solo
  se manifiestan en build de producción y/o tras un reload. El check
  y el build solo validan tipos y que el bundler termine.

- **Si la app funciona en `pnpm dev` pero casca solo en `pnpm preview`/
  prod, antes de bisectar el código probar `pnpm install` para subir
  a versiones patch recientes de svelte/sveltekit/vite.** Bugs del
  framework en patches específicas son frecuentes y un patch upgrade
  los resuelve. Histórico: bug de refresh resuelto con kit 2.57→2.59.1
  + vite 8.0.7→8.0.12 (commit `8c7c62c`, ADR `decisiones/001-...`).

## Preferencias del owner (transversales a la app)

Estas reglas se vivirían "en memoria del agente" si trabajáramos en una
sola máquina, pero como el owner alterna entre dos equipos distintos
viven aquí — en un fichero versionado — para que cualquier sesión (en
cualquier máquina) las herede.

- **Aplica fixes con consistencia.** Cuando el owner reporta un bug en
  un wizard/editor concreto (p. ej. "Enter no funciona en el wizard de
  técnica"), aplica el fix por defecto a TODOS los wizards/editores
  equivalentes (Posicion, Sumision, Tecnica, RollEditor, SesionEditor,
  CompaneroEditor). Si tienes duda sobre el alcance, pregunta ANTES; no
  toques solo el componente nombrado y dejes los demás sin actualizar.
  En el resumen final lista qué archivos tocaste para que pueda objetar
  si te pasaste.
- **Doble entorno (dual machine).** El owner trabaja en dos máquinas:
  una con `nvm` + bash (paths `~/.nvm/...`), otra con `fnm`. Antes de
  proponer cambios a `~/.bashrc` o init de shell, verifica qué gestor
  está realmente instalado (`command -v nvm`, `command -v fnm`).
- **Reglas que viven en otros sitios** (no aquí):
  - Convenciones de código del proyecto y restricciones de stack →
    secciones superiores de este mismo fichero.
  - Backlog de ideas descartadas → `MEJORAS_FUTURAS.md`.
  - Plan de iteración actual → `ITERACION_X.md`.
  - Estado vivo entre sesiones → `ESTADO_ACTUAL.md`.

## Continuidad entre sesiones

- Existe `ESTADO_ACTUAL.md` con el estado vivo del proyecto.
- Al cierre de cada sesión de trabajo, actualizar ese fichero con:
  qué se completó, qué decisiones se tomaron, en qué punto exacto
  quedamos, cuál es el siguiente paso concreto.
- Las decisiones técnicas con peso van a `.claude/decisiones/NNN-tema.md`
  (ADR cortos), para referencia futura.
- Las reglas permanentes del proyecto se reflejan aquí, en este fichero.

## Cómo explicar cosas

- No dar código sin contexto. Antes del código, decir qué hace y por qué.
- Si un fichero tiene más de 50 líneas, resumirlo en 3-4 puntos.

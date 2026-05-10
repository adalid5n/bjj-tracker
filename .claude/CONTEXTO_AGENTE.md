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

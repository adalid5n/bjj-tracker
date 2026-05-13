# Mejoras futuras (post-PoC)

**Estado:** documento vivo
**Propósito:** anotar ideas, sugerencias y deuda que NO bloquean el PoC funcional pero conviene tener guardadas para iteraciones de pulido / refactor.

Cada entrada debería responder:
1. ¿Qué se cambia?
2. ¿Por qué?
3. ¿Cuándo abordar?

---

## UX

### Roll editor — sugerir compañero por defecto + selector inteligente

- **Origen:** T-6, feedback Adalid 2026-05-09
- **Idea (sugerencia):** al añadir un roll nuevo, pre-seleccionar un compañero como sugerencia. Algoritmo a decidir: último compañero de la sesión actual, o más frecuente del usuario, o último de la app en general.
- **Idea (selector):** sustituir el `Select` simple por un autocompletado tipo combobox. El usuario escribe un nombre, se filtran las coincidencias. Si no hay match, opción "Crear como nuevo compañero" inline (sin abrir modal).
- **Por qué:** captura más rápida en el caso primario (CU-1 tras clase). Reducir taps y modales anidados.
- **Cuándo:** tras cerrar Iteración 0 si la fricción de los modales anidados se nota en uso real.

### ~~Botón "+ Nuevo compañero" debe ser FAB igual que "+ Nueva sesión"~~ — HECHO en T-9+T-10 (commit pendiente)

La nueva ruta `/companeros` usa FAB consistente con `/`. La página dev `/dev/companeros-smoke` se queda con el botón normal porque es solo sanity check.

### Editor de compañero (y formularios similares) — captura por pasos con auto-avance + sugerencias en lugar de dropdowns

- **Origen:** T-4, feedback Adalid 2026-05-09
- **Idea:** rediseñar el editor de compañero para que en lugar de un formulario único con todos los campos visibles, sea una secuencia de "pasos" o "tabs" que avancen **automáticamente** cuando el usuario rellena cada campo. Para campos con valores cerrados (cinturón, peso relativo, tipo, resultado, etc.), reemplazar `Select` (dropdown) por **chips de sugerencia** que el usuario tappee directamente. Objetivo: 1 tap por campo, idealmente sin abrir teclados ni desplegables.
- **Por qué:**
  - CU-1 (capturar sesión tras clase) es el caso de uso primario y debe ser ágil en móvil.
  - Cada dropdown abre un overlay extra → 2-3 taps para cada selección.
  - Auto-avance reduce el "¿qué falta?" cognitivo y mantiene flow.
- **Aplica también a:** editor de roll (T-6) y posiblemente editor de sesión (T-5) — todos tienen patrón formulario con campos enum.
- **Cuándo:** tras cerrar Iteración 0 con captura básica funcionando, antes de empezar Iteración 1.

---

### Orden de la tabla `/rolls` — más reciente arriba

- **Origen:** Adalid, 2026-05-11
- **Estado actual:** se ordena por `sesion.fecha DESC`, y dentro de la
  misma sesión por `rolls.orden ASC` (1, 2, 3…). Eso significa que un
  roll nuevo añadido a una sesión existente aparece *después* de los
  rolls anteriores de la misma sesión, no arriba del todo.
- **Idea:** ordenar primero por `created_at DESC` (o `updated_at DESC`)
  para que el último capturado aparezca siempre el primero — esa es la
  expectativa del usuario al revisar "qué acabo de meter".
- **Por qué:** captura post-clase típica: añades 3 rolls a una sesión
  de hoy y quieres ver el último que metiste en el tope, no enterrado
  bajo el primero.
- **Cuándo:** post-it.0.5, sin urgencia.

### Botón "Forzar actualización" en `/ajustes`

- **Origen:** Adalid, 2026-05-11 — tras incidente del service worker
  atascado sirviendo HTML viejo que apuntaba a chunks JS borrados
  (página en blanco).
- **Idea:** botón en `/ajustes` que ejecute en orden:
  1. `navigator.serviceWorker.getRegistrations()` → `unregister()` en cada uno.
  2. `caches.keys()` → `caches.delete()` en cada uno.
  3. `window.location.reload()`.
- **Por qué:** el toast "nueva versión disponible" de T-8 cubre el caso
  normal. Pero si el SW está atascado de verdad (no detecta que hay
  versión nueva), el toast nunca aparece y el usuario se queda colgado.
  Un botón "salida de emergencia" en Ajustes evita que el usuario tenga
  que ir a Ajustes del sistema Android → Borrar almacenamiento de Chrome.
- **Cuándo:** junto con T-8 (auto-update PWA) o inmediatamente después.

### Modo oscuro con toggle en Ajustes

- **Origen:** Adalid, 2026-05-11 (durante planificación de it.0.5)
- **Idea:** soportar tema claro/oscuro y exponer un toggle en `/ajustes`.
  Los tokens shadcn ya están preparados para esto (CSS vars con
  variantes `:root` y `.dark`), así que el grueso del trabajo es:
  (1) tener todos los componentes propios pasando por tokens
  (cubierto por it.0.5), (2) añadir el switch + persistencia de la
  preferencia en localStorage o BD, (3) respetar `prefers-color-scheme`
  como default si no hay preferencia guardada.
- **Por qué:** uso real (la app se abre tras entrenar, a menudo de
  noche). También accesibilidad.
- **Cuándo:** post-it.0.5, cuando los tokens ya estén coherentes. Es un
  añadido pequeño una vez la base de tokens está limpia.

### Sistema de diseño coherente — usar design tokens en lugar de Tailwind raw

- **Origen:** T-6, feedback Adalid 2026-05-09
- **Estado actual mixto:**
  - Componentes shadcn-svelte (Button, Dialog, Input, Select, etc.) ya usan los design tokens del sistema definidos en `src/routes/layout.css` como CSS vars (`--primary`, `--destructive`, `--muted`, etc.). Coherentes entre sí.
  - Componentes propios (`Fab.svelte`, badges de resultado en P2, mensajes "Sin compañero"/"vacío") usan Tailwind crudo (`bg-blue-600`, `text-green-800`, etc.). Improvisado.
- **Idea:**
  1. Migrar componentes custom para que usen los tokens semánticos shadcn (`bg-primary`, `text-destructive`, `bg-muted`, `text-muted-foreground`, etc.). Así el cambio de tema (light/dark, color base) refresca toda la app coherentemente.
  2. Añadir tokens del dominio cuando haga falta (color para "dominé" / "equilibrado" / "perdí", color para empty state, color para "vacío"/sin datos). Definirlos como CSS vars en `layout.css` y referenciarlos por nombre semántico, no por color literal.
- **Por qué:** consistencia visual, theming futuro (light/dark), facilita cambio de paleta global sin tocar componentes uno a uno.
- **Cuándo:** cuando arranque la fase de pulido visual de Iteración 0 o antes de "release público" si llega.

### Vista grafo del mapa técnico debe estar disponible (lectura) en móvil

- **Origen:** T-9+T-10 polish, feedback Adalid 2026-05-09
- **Idea:** cuando llegue iteración 3 (vista grafo con Cytoscape.js), no limitarla a desktop. El móvil debe poder VERLA (lectura, sin edición). Razón explícita de Adalid: "necesito tener el conocimiento a mano" — durante o tras una clase quiere consultar técnicas/contras/posiciones desde el móvil, no solo en casa.
- **Refinamiento de REQUISITOS:** §4.1 dice "Móvil: captura + lectura del mapa técnico (no edición)". Esto ya cubre lectura, pero deja ambiguo si lectura incluye la vista grafo o solo lista. Aclarar como sí: vista grafo en móvil = sí (read-only).
- **Implicación técnica:** Cytoscape.js debe rendear bien en móvil (touch gestures, zoom). Validarlo cuando se aborde iteración 3.
- **Cuándo:** iteración 3.

### Una técnica con múltiples destinos posibles

- **Origen:** T-10, feedback Adalid 2026-05-13
- **Idea:** hoy una técnica tiene UN destino (`posicion_destino_id`
  o `sumision_destino_id`, exclusivo). En BJJ real el mismo movimiento
  puede terminar en sitios distintos según reacción del rival (ej.
  "Hip bump sweep" puede dejarte en mount, en knee-on-belly o en side
  control top según cómo reaccione). Soportarlo permitiría modelar la
  arista realmente como una "ejecución" con varios resultados.
- **Modos de modelarlo:**
  - **A) Refactor schema N:M**: tabla `tecnica_destino` con un row
    por (técnica, destino). Cambio grande: schema, migración,
    `tecnicas.ts`, sync.ts, wizard de técnica (paso 5 pasa a ser
    multi-select), modal de técnica, vista grafo (it.3) genera N
    aristas hermanas. Más fiel a la realidad.
  - **B) Sin tocar nada**: una técnica por destino, mismo nombre,
    distintas filas (variantes). Ya soportado por el modelo. El
    catálogo tiene más entradas pero la UI las puede agrupar por
    nombre (igual que hace con variantes).
- **Por qué:** depende del uso real. Si al rellenar el catálogo
  empieza a sentirse forzado tener "técnica X→A" + "técnica X→B" +
  "técnica X→C" como entradas independientes, refactor a A.
- **Cuándo:** decisión post-T-14 (uso real con catálogo poblado) o
  cuando llegue iteración 3 (vista grafo) y veamos si las aristas
  hermanas se ven raras.

## Performance / build

### Reducir el precache PWA (~2.3 MB) eliminando la duplicación del `.wasm`

- **Origen:** T-2, deuda anotada en `T2_PLAN_v2.md`
- **Idea:** Vite emite una copia hasheada de `sqlite3.wasm` además de la nuestra estática. Eliminarla usando `?url` import o cambiando `locateFile` para apuntar a la versión bundleada.
- **Cuándo:** si el peso de instalación de la PWA empieza a molestar en uso real, o antes de cualquier release "público".

---

## Tech debt / dev experience

### ~~Resolver el error preexistente de `virtual:pwa-register` en `+layout.svelte`~~ — HECHO en T-9+T-10 (commit pendiente)

Resuelto añadiendo `/// <reference types="vite-plugin-pwa/vanillajs" />` en `src/app.d.ts` (no toca `+layout.svelte`, sortea la regla de fichero prohibido).

### Loop de refresh en primera carga tras deploy con cambios grandes en SW

- **Origen:** T-2, observado en producción
- **Idea:** evaluar `registerType: 'prompt'` en lugar de `'autoUpdate'`, o reducir tamaño del precache, o añadir lógica de "skipWaiting" controlada.
- **Cuándo:** si afecta a usuarios reales o aparece en algún test posterior.

### Esquema BD legacy: columna `experiencia_anos` en `companeros`

- **Origen:** T-4, eliminada del schema_v1 actualizado por feedback de Adalid.
- **Detalle:** las BDs OPFS de instalaciones previas a T-4 todavía tienen la columna `experiencia_anos` (REAL nullable). El código actual no la referencia, no se inserta, no se lee — queda como dead column.
- **Cuándo:** cuando aparezca el primer schema_v2 (probablemente Iteración 1, al añadir tabla de Posiciones), aprovechar la migración para limpiar también esta columna huérfana.

---

## Cómo usar este documento

- Cuando sugiramos algo durante una iteración pero decidamos no hacerlo en el momento, lo anotamos aquí.
- Cuando arranque una iteración de pulido / refactor, este documento es la primera referencia para decidir qué entra.
- Cuando se aborda una entrada, mover a un cambio incremental en T-X de la iteración correspondiente y eliminar de aquí (o marcar `~~tachada~~ — hecho en commit XXX`).

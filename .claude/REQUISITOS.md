# BJJ Tracker — Documento de Requisitos

**Versión:** 1.0 (post licitación inicial)
**Fecha:** 2026-05-01
**Estado:** Aprobado para diseño técnico

> **Nota sobre el documento:** este es el resultado de la licitación de requisitos. Es un documento vivo — cambiará en iteraciones siguientes. Lo importante de esta versión es fijar el alcance y la coherencia interna antes de pasar a stack y diseño.

---

## 1. RESUMEN EJECUTIVO

Aplicación personal para registrar entrenamientos de BJJ y estructurar el conocimiento técnico, con dos partes diferenciadas pero conectadas:

1. **Logbook de rolls** — captura por sesión y por roll individual
2. **Mapa técnico** — base de conocimiento de posiciones y técnicas, visualizable como grafo

Ambas partes están relacionadas: un roll puede referenciar posiciones y técnicas del mapa técnico. El análisis cruza ambas fuentes de datos.

---

## 2. CASOS DE USO PRIMARIOS

### CU-1 — Capturar una sesión tras la clase
**Actor:** yo
**Dispositivo:** móvil (caso principal) o desktop
**Flujo:**
1. Crear nueva sesión con datos de cabecera (fecha, tipo, foco que traía)
2. Anotar técnica enseñada en clase y observaciones del profesor
3. Añadir N rolls, cada uno con sus campos
4. Al guardar, ver resumen automático con análisis (ver CU-3)
**Tiempo objetivo:** ≤10 min para sesión con 4-5 rolls

### CU-2 — Consultar y editar el mapa técnico
**Actor:** yo
**Dispositivo:** móvil o desktop (ambos lectura + edición)
**Flujo:**
1. Seleccionar una posición
2. Ver: ataques disponibles desde esa posición, defensas/escapes, contras conocidas
3. Navegar al detalle de una técnica concreta
4. Crear/editar/eliminar posiciones y técnicas
5. Definir relaciones entre técnicas (qué contra a qué)

### CU-3 — Ver análisis tras capturar sesión
**Actor:** yo
**Dispositivo:** mismo donde se capturó la sesión
**Flujo:**
1. Tras guardar la sesión, mostrar automáticamente:
   - Resumen en texto con los problemas más repetidos en sesiones recientes
   - Compañeros contra los que se pierde más + posiciones implicadas
2. Acceso a tabla filtrable de todos los rolls

### CU-4 — Sincronizar entre móvil y desktop
**Actor:** yo
**Frecuencia:** manual, según necesidad
**Flujo:**
1. Móvil: exportar sesiones nuevas a JSON
2. Pasar JSON a desktop (correo, Drive, AirDrop, USB — lo que toque)
3. Desktop: importar JSON, mergea con datos existentes

### CU-5 — Backup automático
**Actor:** sistema
**Disparador:** cada N sesiones capturadas
**Flujo:** generar JSON con todos los datos en una carpeta local

---

## 3. REQUISITOS FUNCIONALES

### 3.1 Logbook — Sesiones

**Campos por sesión (cabecera):**
- Fecha (auto: hoy, editable)
- Tipo: BJJ / Grappling / Open mat
- Foco que traía (texto libre)
- Técnica enseñada en clase (texto libre)
- Observaciones del profesor (texto libre)

**Campos generados automáticamente por la app tras guardar:**
- Problema principal (sugerido a partir de los rolls)
- Foco para la siguiente sesión (a definir o sugerido)

### 3.2 Logbook — Rolls

Cada sesión contiene N rolls. Por cada roll:

- Compañero (selección de lista existente o crear nuevo)
- Cinturón / experiencia del compañero (atributo del compañero, se rellena solo)
- Tamaño relativo (similar / +5kg / -5kg / mucho mayor / mucho menor)
- Duración aproximada en minutos
- Resultado general: dominé / equilibrado / me dominaron
- Qué intenté (texto libre)
- Qué falló (texto libre)
- Posiciones donde tuve problema (selección múltiple, referencia al mapa técnico)
- Técnicas que intenté (selección múltiple, referencia al mapa técnico — opcional)

### 3.3 Mapa técnico — Posiciones

Cada posición tiene:
- Nombre (ej: "Guardia cerrada bottom", "Mount bottom", "Side control top")
- Categoría (ej: guardia, control superior, espalda, transición)
- Tipo: ofensiva / defensiva / neutral (depende del rol del practicante en esa posición)
- Notas / principios (texto libre)
- Lista de técnicas asociadas (calculada: técnicas cuya posición de origen es esta)

### 3.4 Mapa técnico — Técnicas

Cada técnica tiene:
- Nombre (ej: "Hip bump sweep", "Cross choke", "Upa")
- Variante (opcional, texto corto): distingue versiones del mismo nombre con el mismo origen (ej. "clásica", "del profe X", "propia"). Cuando el mismo nombre se ejecuta desde distintos orígenes, son técnicas distintas que comparten nombre; la UI las agrupa por nombre.
- Posición de origen (referencia obligatoria a una Posición)
- Posición de destino (referencia a Posición o a nodo terminal de sumisión — ver §3.5)
- Tipo: ataque / sweep / escape / transición / sumisión
  - Las "defensas" se modelan como contras de otra técnica, no como técnicas independientes — ver "contras conocidas" al final de esta sección.
- Estado: probando / funciona / descartada
- Detalles / setup / ejecución (texto libre estructurado)
- Errores comunes (texto libre)
- Contras conocidas (referencias a otras Técnicas que la responden — pueden ser defensas del rival, escapes a ese ataque, o cualquier respuesta navegable desde el modal de detalle)

### 3.5 Visualización del mapa técnico

**Vista lista (MVP, it.1):**
- Lista de posiciones agrupadas por categoría.
- Al seleccionar una posición, modal con tabs por tipo: Ataques / Sweeps / Escapes / Transiciones / Sumisiones (solo aparecen los tabs con contenido).
- Por cada técnica: nombre, variante (si aplica), destino, número de contras.

**Vista grafo (it.3):**
- **Nodos:** posiciones + sumisiones. Las sumisiones son **nodos terminales** — no salen aristas de ellos, solo entran.
- **Aristas:** cada técnica es una arista dirigida origen→destino. Estilo visual por tipo:
  - Línea sólida para ataques y sumisiones.
  - **Línea punteada para transiciones.**
  - Color/grosor distinto para escapes y sweeps (decisión visual fina al implementar).
- **Las contras NO se dibujan en el mapa** (sería ilegible — aristas conectando aristas). Solo viven dentro de los modales como hipervínculos navegables.

**Navegación encadenada por modales (aplica a vista lista y vista grafo):**

Cada cosa que se pulsa abre un modal flotante con detalle y "salidas" navegables a otras entidades. El recorrido es potencialmente infinito mientras la información esté poblada.

| Pulsas… | Modal muestra… |
|---|---|
| Nodo posición | Notas + tabs por tipo (Ataques / Sweeps / Escapes / Transiciones / Sumisiones). Cada item del tab abre el modal de esa técnica. |
| Arista (técnica) | Setup, errores, estado, variante. Salidas: nodo origen, nodo destino, contras conocidas, "ver otras variantes de [nombre]". |
| Nodo sumisión | Lista de variaciones agrupadas por posición de origen. |
| Una contra dentro del modal | Modal de la técnica que responde, que a su vez tiene sus propias contras → continúa el recorrido. |

Recorrido típico ejemplo: nodo guardia cerrada bottom → ataque "hip bump sweep" → contra "rival posta brazo" → respuesta "kimura desde guardia cerrada" → destino "nodo sumisión kimura" o nueva posición → continúa.

**Cuando un campo está vacío** (ej. "Contras: ninguna registrada"), el modal lo muestra explícito con acceso rápido a editar desde desktop. La app enseña los huecos del catálogo para irlos poblando.

**Filtros (it.3):**
- Por tipo de técnica.
- Por estado (probando / funciona / descartada).
- Por categoría de posición.

### 3.6 Análisis y consultas

**Consultas obligatorias en MVP:**
- C1: Problemas que se repiten en las últimas X sesiones (X configurable, default 5)
- C2: Compañeros contra los que pierdo > 50% de los rolls + posición donde pierdo

**Salida:**
- Resumen en texto tras captura de sesión
- Tabla filtrable de todos los rolls (filtros: fecha, compañero, tipo, posición)

**Backlog (no MVP):**
- Gráfico evolución: foco semanal cumplido vs no cumplido
- Heatmap calendario de actividad
- Patrones temporales: rendimiento por día/energía

### 3.7 Gestión de datos auxiliares

- CRUD de Compañeros (nombre, cinturón, peso relativo)
- CRUD de Posiciones
- CRUD de Técnicas
- Import / Export de toda la BD a JSON

---

## 4. REQUISITOS NO FUNCIONALES

### 4.1 Plataformas
- **Desktop:** uso completo (captura, mapa, análisis, gestión)
- **Móvil:** captura de rolls/sesiones + lectura y edición del mapa técnico

### 4.2 Conectividad
- 100% offline para uso normal en ambas plataformas
- Sin servidor backend
- Sin login

### 4.3 Sincronización
- **Modelo:** desktop es fuente de verdad
- **Mecanismo:** export manual JSON desde móvil → import manual en desktop
- **Frecuencia:** cuando el usuario decida (no automática)

### 4.4 Backup
- Export automático a JSON local cada N sesiones (N configurable, default 5)
- Export manual a JSON disponible en cualquier momento
- Ubicación del backup: carpeta local del usuario (configurable)

### 4.5 Privacidad
- Datos solo en dispositivos del usuario
- Sin cuentas, sin telemetría, sin servicios externos
- (Decisión pendiente: ¿cifrado local de la BD? — postergado a fase de diseño técnico)

### 4.6 Mantenibilidad
- Datos exportables en formato abierto (JSON) en cualquier momento
- Esquema de datos versionado (campo `schema_version` en exports) para futuras migraciones
- Código del proyecto debe ser comprensible para el autor (requisito explícito de aprendizaje)

### 4.7 Rendimiento
- Captura de sesión sin lags perceptibles en móvil
- Análisis tras captura: ≤2 segundos
- Datos esperados a 1 año: ~150 sesiones × 5 rolls = ~750 rolls. No hay problemas de escala.

---

## 5. MODELO CONCEPTUAL DE DATOS

```
COMPAÑERO
├── id
├── nombre
├── cinturón
└── peso_relativo (default)

POSICIÓN
├── id
├── nombre
├── categoría
├── tipo (ofensiva/defensiva/neutral)
└── notas

TÉCNICA
├── id
├── nombre
├── variante (texto corto, nullable)
├── posición_origen_id (FK → POSICIÓN)
├── posición_destino_id (FK → POSICIÓN o nodo terminal sumisión, nullable)
├── tipo (ataque/sweep/escape/transición/sumisión)
├── estado (probando/funciona/descartada)
├── detalles
└── errores_comunes

TÉCNICA_CONTRA (relación N:N auto-referencial)
├── técnica_id (FK → TÉCNICA)
└── contra_técnica_id (FK → TÉCNICA)

SESIÓN
├── id
├── fecha
├── tipo (BJJ/Grappling/OpenMat)
├── foco
├── técnica_clase
└── obs_profesor

ROLL
├── id
├── sesión_id (FK → SESIÓN)
├── compañero_id (FK → COMPAÑERO)
├── tamaño_relativo
├── duración_min
├── resultado
├── qué_intenté
└── qué_falló

ROLL_POSICIÓN_PROBLEMA (relación N:N)
├── roll_id (FK → ROLL)
└── posición_id (FK → POSICIÓN)

ROLL_TÉCNICA (relación N:N)
├── roll_id (FK → ROLL)
└── técnica_id (FK → TÉCNICA)
```

**Notas del modelo:**
- Las relaciones N:N permiten flexibilidad. Un roll puede tener múltiples posiciones problema, una técnica puede tener múltiples contras.
- `posición_destino_id` apunta a Posición o a nodo terminal de sumisión. Modelo concreto del "nodo terminal" (tabla SUMISIÓN separada vs flag en POSICIÓN) se decide al diseñar it.1.
- `TÉCNICA_CONTRA` es asimétrica: A es contra de B no implica B es contra de A.
- `variante` permite múltiples filas en TÉCNICA con mismo nombre + mismo origen pero distinta versión (ej. "armbar desde guardia cerrada — clásica" y "armbar desde guardia cerrada — del profe X" son dos filas).
- Aristas con mismo `nombre` pero distinto `posición_origen_id` son técnicas distintas en BD; la UI las agrupa por nombre cuando aplica ("ver otras variaciones de armbar").

---

## 6. ALCANCE POR ITERACIONES

Propuesta inicial. Iteraremos sobre esto.

### Iteración 0 — Esqueleto y captura mínima
- Stack elegido y proyecto inicializado
- BD con esquema completo definido
- Desktop: captura de sesiones y rolls (sin mapa técnico aún, posiciones como texto libre)
- Tabla filtrable de rolls

**Criterio de éxito:** capturar 3-4 sesiones reales sin que la app rompa.

### Iteración 1 — Mapa técnico básico (lista)
- CRUD de Posiciones y Técnicas
- Vista lista del mapa
- Linkear rolls a posiciones (las técnicas vienen en iteración 2)

**Criterio de éxito:** mapear 2 posiciones (guardia cerrada bottom, mount bottom) con sus técnicas.

### Iteración 2 — Análisis y linkeo completo
- Linkear rolls a técnicas
- Consultas C1 (problemas repetidos) y C2 (compañeros)
- Resumen en texto post-sesión

**Criterio de éxito:** la app sugiere algo accionable tras 2 semanas de uso.

### Iteración 3 — Visualización grafo
- Vista grafo del mapa técnico
- Filtros por tipo y estado

**Criterio de éxito:** la vista grafo me hace ver una técnica/contra que en lista no había notado.

### Iteración 4 — Pulido post-grafo y consistencia UX
- Pulido y consistencia UX tras cerrar el grafo (it.3).
- Tareas concretas: long-press → modo edición en grafo + UX móvil del
  grafo, combobox compañero en RollEditor, orden `/rolls` por
  `created_at DESC`, auditoría de tokens semánticos en `src/`.
- Plan detallado en `ITERACION_4.md`.

**Criterio de éxito:** las 4 tareas cerradas con commit en `main` + tag
`v0.4.1-it4` aplicado.

> **Nota — la "it.4 = Móvil" original quedó fusionada:** la propuesta
> inicial de esta sección (2026-05-09) hablaba de "app móvil con
> captura + edición del mapa + export/import JSON". El uso real
> reveló que conviene tratar móvil como responsive (no app separada).
> El export/import JSON se entregó en it.0 (F-5). La edición del mapa
> en móvil se decidió en sesión 6 (2026-05-13: *Móvil del mapa
> también edita*) y entró en it.1. El contenido actual de it.4 surge
> por tanto de pulido emergido durante it.1-it.3, no del plan original.

### Iteración 5+ — Backlog
- Backup automático (si no se hizo antes)
- Visualizaciones avanzadas (gráficos, heatmap, calendario)
- Lo que el uso real revele

---

## 7. CUESTIONES ABIERTAS

Estas no son bloqueantes para empezar pero hay que cerrarlas en algún momento:

1. **¿Cifrado local de la BD?** Decisión post-stack.
2. **¿Borrado de datos?** Lógica de soft-delete vs hard-delete (importante si en futuro hay sync).
3. ~~**¿Vista del mapa técnico cuando se "baja" desde una posición?**~~ **Cerrada (2026-05-12):** las sumisiones son **nodos terminales** del grafo. No salen aristas de ellas, solo entran. Las aristas que llegan a un nodo sumisión son las variaciones de esa sumisión desde distintos orígenes. Ver §3.5.
4. ~~**¿Cómo manejar técnicas que vienen de múltiples posiciones?**~~ **Cerrada (2026-05-12):** son aristas distintas que comparten el `nombre` técnico. La UI las agrupa por nombre ("ver otras variantes de armbar"). En BD son filas independientes en TÉCNICA con distinto `posición_origen_id`.
5. ~~**¿Plantilla de técnica vs instancia?**~~ **Cerrada (2026-05-12):** no hay plantilla separada. Las versiones personalizadas ("la cross choke de mi profe") son aristas paralelas con el mismo origen + nombre pero distinto campo `variante`. Si el grafo se llena de aristas paralelas en el mismo par origen-destino-nombre, se evaluará refactor a "una arista con sub-variantes" más adelante.

---

## 8. EXPLICITAMENTE FUERA DE ALCANCE

Para evitar scope creep:

- Energía pre/post sesión, estado físico (lo lleva el usuario en Garmin/health snapshot)
- Multi-usuario, login, roles
- Compartir mapa técnico con otros (coach, compañeros)
- Sync automático
- Notificaciones / recordatorios
- Integración con calendario
- Vídeos asociados a técnicas (descartado en MVP, posible backlog lejano)
- Análisis de patrones temporales avanzados (gráficos, heatmap, calendario)

---

## 9. PRINCIPIOS DE DISEÑO

Recordatorios para evitar derivas durante el desarrollo:

1. **Captura sin fricción gana sobre análisis perfecto.** Si capturar una sesión cuesta más de 10 min, sobran campos.
2. **Datos exportables siempre.** El usuario nunca queda atrapado.
3. **Construir cada iteración mínima, usarla 1-2 semanas, decidir la siguiente con datos reales.**
4. **No añadir feature sin caso de uso concreto del usuario actual** (no especular con futuros usuarios o futuros yo).
5. **El programa es herramienta, no proyecto.** Si el desarrollo desplaza al BJJ en horas reales, hay que parar.

---

---

## 10. ARQUITECTURA TÉCNICA

Resultado del análisis de stack contra los requisitos.

### 10.1 Stack confirmado

| Capa | Tecnología | Razón |
|---|---|---|
| Lenguaje | TypeScript | Tipado, transferible, ya conocido por el usuario |
| Framework | Svelte 5 + SvelteKit | Curva baja, código limpio, gestiona PWA y build |
| Estilos | Tailwind CSS + shadcn-svelte | Componentes bonitos sin diseñarlos a mano |
| Build | Vite (incluido en SvelteKit) | Estándar moderno |
| BD | SQLite-WASM (oficial de SQLite) | SQL completo, fichero portable |
| Persistencia | OPFS (Origin Private File System) | Sin caveats en Android |
| Empaquetado | PWA con manifest + service worker | "Instala" como app en Android |
| Hosting | GitHub Pages | Gratis, no requiere PC encendido |
| Visualización (futura) | Cytoscape.js | Para grafo del mapa técnico |
| Testing | Vitest (unit), Playwright (e2e, futuro) | Estándar moderno |
| Versiones | Git + GitHub | Obvio |

**Coste total recurrente: 0€**

### 10.2 Modelo de despliegue

- **Una sola codebase, una sola URL** desplegada en GitHub Pages
- Móvil y desktop acceden a la misma URL desde su navegador
- En Android: "Instalar como app" desde Chrome → icono en pantalla de inicio
- En desktop: abrir en Chrome/Firefox, opcionalmente "Instalar app"
- La app funciona offline tras primera carga (service worker cachea código)
- Updates: push a GitHub → GitHub Pages despliega → próxima carga del usuario obtiene la versión nueva

### 10.3 Modelo de sincronización entre dispositivos

**Principio:** cada dispositivo tiene su BD local (OPFS) independiente. La sync es manual por export/import de ficheros JSON. No hay merge automático complejo.

**Convención de uso (no restricción técnica):**

| Dispositivo | Escribe (autoritativo) | Lee (importado) |
|---|---|---|
| Móvil | Sesiones, Rolls, relaciones de rolls | Posiciones, Técnicas, Contras, Compañeros (importados desde desktop) |
| Desktop | Posiciones, Técnicas, Contras, Compañeros | Sesiones y Rolls (importados desde móvil) |

**Flujo de sync:**

1. **Móvil → Desktop:** móvil exporta `{sesiones, rolls, roll_posiciones_problema, roll_técnicas, compañeros_nuevos}` a JSON. Usuario pasa el fichero (Drive, mail, USB). Desktop importa. Desktop hace upsert por ID — los registros nuevos se añaden, los existentes se actualizan si timestamp es más reciente.

2. **Desktop → Móvil:** desktop exporta `{posiciones, técnicas, contras, compañeros}` a JSON. Usuario pasa fichero. Móvil importa con la misma lógica.

**Caso especial — compañeros creados en móvil:** cuando capturas un roll en móvil con un compañero nuevo, se crea localmente con UUID. La sync móvil→desktop incluye el nuevo compañero. Desktop lo recibe y lo añade a su lista. La próxima sync desktop→móvil ya devuelve el catálogo unificado.

**Schema versioning:** cada export incluye `schema_version`. Import valida compatibilidad antes de aplicar.

### 10.4 Estructura del proyecto (esperada)

```
bjj-tracker/
├── src/
│   ├── lib/
│   │   ├── db/                    (SQLite setup, queries, migraciones)
│   │   ├── components/            (componentes UI reutilizables)
│   │   ├── stores/                (estado Svelte)
│   │   ├── types/                 (tipos TS)
│   │   └── sync/                  (export/import JSON)
│   ├── routes/                    (páginas SvelteKit)
│   │   ├── +page.svelte           (home: lista sesiones)
│   │   ├── sesion/
│   │   ├── rolls/
│   │   ├── mapa/                  (mapa técnico, futuro)
│   │   └── ajustes/
│   ├── app.html
│   └── service-worker.ts
├── static/                        (manifest.json, iconos)
├── tests/
├── package.json
└── vite.config.ts
```

### 10.5 Decisiones técnicas pendientes para iteración 0

- Librería SQLite-WASM concreta (`@sqlite.org/sqlite-wasm` oficial vs alternativas)
- Estrategia de migraciones de schema (manual con números de versión vs librería)
- Estrategia de IDs (UUID v4 vs ULID vs autoincremental)

Estas se cierran al diseñar iteración 0 con detalle.

---

*Documento cerrado. Próximo paso: diseño detallado de iteración 0.*

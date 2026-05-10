# Iteración 0 — Esqueleto y captura mínima

**Versión:** 1.0
**Estado:** ✅ Cerrada — 2026-05-10

---

## OBJETIVO

Tener una app PWA funcional que permita:
- Capturar sesiones y rolls
- Ver y filtrar todos los rolls registrados
- Exportar e importar todos los datos a/desde JSON

**Lo que NO entra en esta iteración** (para evitar scope creep):
- Mapa técnico estructurado (posiciones y técnicas como entidades) — iteración 1
- Análisis automático ni resúmenes — iteración 2
- Vista grafo — iteración 3
- Diferenciar UI por dispositivo — la misma UI funciona en ambos
- Sync con merge inteligente — solo export/import básico

**Criterio de éxito:** capturar 3-4 sesiones reales en uso normal sin que la app rompa, pierda datos o requiera que toque código para arreglar algo.

---

## ALCANCE FUNCIONAL

### F-1 — Gestionar sesiones
- Crear nueva sesión con: fecha (default hoy), tipo, foco, técnica clase, observaciones
- Editar sesión existente
- Eliminar sesión (con confirmación)
- Listar sesiones ordenadas por fecha descendente

### F-2 — Gestionar rolls dentro de una sesión
- Añadir roll a una sesión
- Editar roll existente
- Eliminar roll
- Campos del roll: compañero (selector), tamaño relativo, duración aprox, resultado, qué intenté, qué falló, posiciones problema (texto libre por ahora — la entidad llega en it. 1)

### F-3 — Gestionar compañeros
- Crear compañero al vuelo desde el formulario de roll (modal)
- Listar compañeros existentes
- Editar y eliminar (con confirmación si tiene rolls asociados)

### F-4 — Tabla de rolls
- Ver todos los rolls en una tabla
- Filtros: por fecha (rango), por compañero, por resultado
- Ordenar por fecha (default), compañero, resultado

### F-5 — Export e Import JSON
- Botón "Exportar todo" — genera JSON con toda la BD
- Botón "Importar JSON" — selector de fichero, sobrescribe BD actual (con confirmación)
- Por ahora, **sin merge selectivo**: import = reemplazar todo
- El JSON incluye `schema_version`

---

## ESQUEMA DE BASE DE DATOS (it. 0)

Subset del modelo completo. Solo lo necesario para esta iteración.

```sql
CREATE TABLE schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO schema_meta (key, value) VALUES ('version', '1');

CREATE TABLE companeros (
  id TEXT PRIMARY KEY,                        -- UUID v4
  nombre TEXT NOT NULL,
  cinturon TEXT,                              -- 'blanco' | 'azul' | 'morado' | 'marron' | 'negro' | NULL
  experiencia_anos REAL,
  peso_relativo TEXT,                         -- 'similar' | 'mas' | 'menos' | 'mucho_mas' | 'mucho_menos' | NULL
  notas TEXT,
  created_at TEXT NOT NULL,                   -- ISO 8601
  updated_at TEXT NOT NULL
);

CREATE TABLE sesiones (
  id TEXT PRIMARY KEY,
  fecha TEXT NOT NULL,                        -- ISO date YYYY-MM-DD
  tipo TEXT NOT NULL,                         -- 'bjj' | 'grappling' | 'open_mat'
  foco TEXT,
  tecnica_clase TEXT,
  obs_profesor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE rolls (
  id TEXT PRIMARY KEY,
  sesion_id TEXT NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  companero_id TEXT REFERENCES companeros(id) ON DELETE SET NULL,
  orden INTEGER NOT NULL,                     -- orden dentro de la sesión (1, 2, 3...)
  tamano_relativo TEXT,                       -- mismo enum que companero.peso_relativo
  duracion_min INTEGER,
  resultado TEXT,                             -- 'domine' | 'equilibrado' | 'me_dominaron'
  que_intente TEXT,
  que_fallo TEXT,
  posiciones_problema TEXT,                   -- texto libre en it. 0 (entidad en it. 1)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_rolls_sesion ON rolls(sesion_id);
CREATE INDEX idx_rolls_companero ON rolls(companero_id);
CREATE INDEX idx_sesiones_fecha ON sesiones(fecha DESC);
```

**Decisiones tomadas:**
- IDs como UUID v4 (TEXT). Razón: necesarios para sync entre dispositivos sin colisiones. Más simples que ULID para esta etapa.
- Timestamps como TEXT ISO 8601. Razón: legibles en JSON, comparables como string, suficientes.
- Enums como TEXT con validación en aplicación (Svelte). Razón: SQLite no tiene ENUM nativo. Documentar valores válidos en código TS.
- `ON DELETE CASCADE` en rolls cuando se borra sesión. Razón: rolls sin sesión no tienen sentido.
- `ON DELETE SET NULL` en compañero. Razón: si borras un compañero, no quieres perder los rolls — solo quedan sin compañero.

---

## PANTALLAS

5 pantallas en iteración 0. Las describo textualmente — los wireframes formales los dibujo si los pides explícitamente.

### P1 — Home (lista de sesiones)
- **Ruta:** `/`
- **Elementos:**
  - Header con título "BJJ Tracker"
  - Botón flotante "+ Nueva sesión"
  - Lista de sesiones (más reciente arriba): fecha, tipo, foco (preview), número de rolls
  - Click en sesión → P2
- **Empty state:** "Aún no hay sesiones. Empieza creando una."

### P2 — Detalle de sesión
- **Ruta:** `/sesion/:id`
- **Elementos:**
  - Cabecera editable inline: fecha, tipo, foco, técnica clase, observaciones
  - Lista de rolls dentro de la sesión
  - Botón "+ Añadir roll" → P3
  - Acciones: guardar cambios, eliminar sesión (con confirmación)

### P3 — Editor de roll (modal o ruta hija)
- **Ruta:** `/sesion/:id/roll/:rollId` o modal en P2
- **Elementos:**
  - Selector de compañero (autocompletado de existentes + opción "crear nuevo" → modal P4)
  - Campos: tamaño relativo, duración, resultado, qué intenté, qué falló, posiciones problema
  - Botones: guardar, eliminar, cancelar

### P4 — Editor de compañero (modal)
- **Elementos:**
  - Campos: nombre (obligatorio), cinturón, experiencia (años), peso relativo default, notas
  - Botones: guardar, cancelar

### P5 — Tabla de rolls (todos)
- **Ruta:** `/rolls`
- **Elementos:**
  - Tabla con columnas: fecha, compañero, tipo sesión, resultado, qué falló (truncado)
  - Filtros: rango fecha, compañero, resultado
  - Click en roll → P3

### P6 — Ajustes
- **Ruta:** `/ajustes`
- **Elementos:**
  - Botón "Exportar todo" → descarga `bjj-tracker-export-YYYYMMDD.json`
  - Botón "Importar JSON" → selector fichero + confirmación
  - Versión de la app
  - Versión del schema BD

### Navegación
- Bottom nav (móvil) o sidebar (desktop): Home, Tabla rolls, Ajustes

---

## CRITERIOS DE ACEPTACIÓN

Para considerar iteración 0 cerrada, todos estos deben pasar:

**Funcionales:**
- [x] Puedo crear una sesión nueva con todos sus campos
- [x] Puedo añadir 5 rolls a esa sesión
- [x] Puedo crear un compañero al vuelo desde el formulario de roll
- [x] Puedo editar la sesión y los rolls después de crearlos
- [x] Puedo eliminar un roll, una sesión, un compañero (con confirmación)
- [x] La tabla de rolls me muestra todo lo introducido
- [x] Puedo filtrar la tabla por compañero y por rango de fecha
- [x] Puedo exportar todo a un fichero JSON
- [x] Puedo importar un fichero JSON (que reemplaza la BD)
- [x] Tras importar, todos los datos del JSON están presentes

**Técnicos:**
- [x] La app está desplegada en GitHub Pages y accesible desde una URL
- [x] Funciona offline tras primera carga (service worker cachea)
- [x] Funciona en Android Chrome instalada como PWA
- [x] Funciona en desktop Chrome/Firefox
- [x] Los datos persisten tras cerrar y reabrir la app
- [x] Los datos persisten tras reiniciar el dispositivo
- [x] No hay errores en consola durante uso normal

**Uso real:**
- [x] He capturado al menos 3 sesiones reales con sus rolls usando la app
- [x] He hecho un export y un import sin pérdida de datos

---

## PLAN DE TAREAS

Ordenadas por dependencias. Cada tarea debería ser un commit (o pocos commits).

### T-1 — Setup proyecto ✅
- [x] Inicializar SvelteKit + TS
- [x] Configurar Tailwind
- [x] Configurar shadcn-svelte
- [x] Configurar build estático para GitHub Pages
- [x] Repo en GitHub, primer despliegue (página vacía)

### T-2 — SQLite-WASM con OPFS ✅
- [x] Integrar `@sqlite.org/sqlite-wasm`
- [x] Crear módulo `lib/db/index.ts` con init, run, query
- [x] Aplicar schema inicial al primer inicio
- [x] Probar persistencia: añadir registro, recargar página, sigue ahí

### T-3 — Tipos TypeScript del dominio ✅
- [x] Crear `lib/types/`: Companero, Sesion, Roll, enums

### T-4 — CRUD de Compañeros ✅
- [x] Funciones DB: createCompanero, listCompaneros, updateCompanero, deleteCompanero
- [x] Modal de editor (P4)
- [x] Probar manualmente

### T-5 — CRUD de Sesiones ✅
- [x] Funciones DB
- [x] P1 (home con lista)
- [x] P2 (editor)

### T-6 — CRUD de Rolls ✅
- [x] Funciones DB
- [x] P3 (editor)
- [x] Integración con P2 (lista de rolls dentro de sesión)
- [x] Selector de compañero con creación al vuelo

### T-7 — Tabla de rolls ✅
- [x] P5 con filtros básicos

### T-8 — Export / Import JSON ✅
- [x] P6 (ajustes)
- [x] Función exportAll: dump de todas las tablas a JSON con schema_version
- [x] Función importAll: parse JSON, validar schema_version, reemplazar BD
- [x] Confirmación destructiva antes de import

### T-9 — PWA setup ✅
- [x] manifest.json
- [x] Service worker que cachea assets
- [x] Iconos
- [x] Probar "Add to Home Screen" en Android

### T-10 — Pulido y deploy final ✅
- [x] Loading states
- [x] Error states
- [x] Empty states
- [x] Despliegue final a GitHub Pages
- [x] Documentar en README cómo instalar como PWA en Android

### T-11 — Uso real ✅
- [x] Capturar 3 sesiones reales y verificar criterios de aceptación

**Estimación honesta:** 30-50 horas de trabajo. A 5h/semana, 6-10 semanas. A 10h/semana, 3-5 semanas. Depende mucho de cuánto te pelees con cada cosa nueva (SQLite-WASM, OPFS, service workers).

---

## RIESGOS IDENTIFICADOS

| Riesgo | Mitigación |
|---|---|
| SQLite-WASM tiene quirks con OPFS y rutas | Empezar con un proof-of-concept aislado en T-2. Si tarda más de 1 día, reconsiderar (IndexedDB como fallback). |
| Service worker cacheando versiones antiguas y "no veo mis cambios" | Estrategia de cache-busting documentada desde el inicio. Update manual del SW al cambiar de versión. |
| GitHub Pages no soporta SPAs limpiamente con SvelteKit | Configurar `adapter-static` con `fallback: 'index.html'`. Probar pronto. |
| Diseño insuficiente y la app es fea / molesta de usar | shadcn-svelte da componentes ya bonitos. No diseñar desde cero. |
| Scope creep: querer añadir mapa técnico antes de cerrar it. 0 | Volver a leer este documento. Anotar lo que querría añadir en una lista para it. 1+, no construirlo ahora. |

---

## DECISIONES PENDIENTES (cerrar antes de empezar T-1)

1. **¿Repo público o privado?** GitHub Pages funciona en ambos casos. Privado preserva la libertad de poner notas personales en commits. Público te obliga a más cuidado pero permite enseñarlo.
2. **¿Nombre del proyecto y la URL?** Ej: `bjj-tracker`, `mat-log`, etc. Afecta al subdominio de GitHub Pages.
3. **¿Locale del UI?** Español, inglés, ambos. Recomendación: español-only en it. 0, inglés cuando crezca.

---

## CIERRE — 2026-05-10

Iteración 0 cerrada. Todos los criterios verificados.

- 3 sesiones reales capturadas en uso normal sin incidencias.
- Export + Import JSON probados sin pérdida de datos.
- Filtros de tabla de rolls (rango fecha, compañero) verificados.
- Deploy estable en GitHub Pages, build TypeScript limpio (0 errors / 0 warnings).
- Limpieza de scaffolding del template inicial (`/demo`, `/dev/*`).
- Tag git: `v0.1-it0`.

**Próximo paso:** fase de pulido pre-it.1 — design tokens coherentes, rediseño de formularios con autoavance + chips + combobox de compañero, auto-update PWA con UI de "nueva versión disponible". Plan detallado en `ITERACION_0_5.md` (pendiente).

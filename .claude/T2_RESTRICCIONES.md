# Restricciones técnicas — capa de datos (SQLite-WASM + OPFS)

**Estado:** activas desde T-2 en adelante.
**Audiencia:** yo y cualquier futuro Claude que toque la integración de BD.

Constraints duros para cualquier trabajo sobre la integración de SQLite-WASM. Sirven de checklist al revisar cambios y al diseñar nuevas tareas que toquen la capa de datos. Si alguna se rompe, hay que avisar y justificar antes de avanzar.

---

## 1. Hard constraints

1. **Nada del módulo de BD se ejecuta en SSR/prerender.** La app usa `adapter-static` y tiene `prerender = true` en `src/routes/+layout.ts`. Cualquier `import` directo (a nivel de módulo) de `@sqlite.org/sqlite-wasm` o de `$lib/db` desde código que se evalúe en build-time romperá el build. Importar siempre con `await import('$lib/db')` desde `onMount`, o tras un guard `import { browser } from '$app/environment'; if (browser) { ... }`.

2. **No se usa SharedArrayBuffer.** GitHub Pages no permite cabeceras COOP/COEP (no hay forma de configurar headers en Pages). Cualquier VFS/feature que requiera Cross-Origin Isolation queda fuera.

3. **Persistencia siempre en OPFS.** Nada de `localStorage`/`sessionStorage`/IndexedDB/`kvvfs` para almacenar datos de dominio. Si un día hace falta cache de UI puede ir en `localStorage`, pero no datos del dominio.

4. **SQL crudo.** Nada de ORMs (Drizzle / Prisma / Dexie / Kysely). Nada de "repository pattern" ni capas de DAO. Las queries viven en los archivos que las usan o en helpers de dominio si la query se reutiliza ≥3 veces.

5. **API de BD mínima:** `init()`, `run(sql, params)`, `query(sql, params)`. Cualquier helper adicional debe justificarse por necesidad real, no por "pattern".

6. **Stack §10.1 cerrado.** Cualquier dependencia adicional se justifica por escrito en el plan de la tarea correspondiente y se aprueba antes de añadirse.

---

## 2. Ficheros que requieren aprobación previa para modificarlos

Tocar cualquiera de estos sin avisar es un strike:

- `vite.config.ts`
- `svelte.config.js`
- `src/routes/+layout.svelte`
- `src/routes/+layout.ts`
- `.github/workflows/deploy.yml`

La regla cubre cualquier cambio, incluso "una línea". Si el cambio es necesario, se documenta en el plan con diff exacta + justificación + checkpoint de verificación.

---

## 3. Anti-patterns prohibidos

- `import { init } from '$lib/db'` a nivel de módulo en cualquier `+page.svelte`/`+layout.svelte`/`+page.ts`/`+layout.ts`. Siempre dinámico.
- `await init()` en top-level de un `<script>` de Svelte. Tiene que ir en `onMount` o en handlers.
- Asumir que `run`/`query` son síncronos. Son `Promise<…>` por la naturaleza Worker + Promiser.
- Asumir que la BD existe en el primer render del componente. Diseñar UI con loading state.
- Construir URLs absolutas a `/sqlite/...` ignorando el `base` del adapter. Siempre `${base}/sqlite/...` con `base` de `$app/paths`.
- Usar `crypto.subtle` o `SharedArrayBuffer` en cualquier código que también deba correr en GH Pages.

---

## 4. Decisiones permanentes ya tomadas

| Tema | Elegido |
|---|---|
| Librería | `@sqlite.org/sqlite-wasm` (oficial) |
| VFS | `opfs` (no `OPFS-SAHPool`, no `kvvfs`) |
| Modo de ejecución | Dedicated Worker + Promiser API |
| Distribución del `.wasm` | Copia a `static/sqlite/` vía `scripts/copy-sqlite-wasm.mjs`, llamado desde npm `prepare` |
| IDs | UUID v4 vía `crypto.randomUUID()` (sin librería) |
| Timestamps | TEXT ISO 8601 |
| Migraciones | Aplicar `SCHEMA_V1` en primer init. Sin runner generalizado hasta v2. |

---

*Documento vivo. Si una restricción cambia, se actualiza aquí + se anota razón al final.*

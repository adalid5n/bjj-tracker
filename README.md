# BJJ Tracker

Aplicación personal para registrar entrenamientos de Brazilian Jiu-Jitsu y estructurar el conocimiento técnico.

**App desplegada:** https://adalid5n.github.io/bjj-tracker/

## Qué hace (iteración 0)

- Registrar **sesiones** de BJJ / Grappling / Open mat con cabecera (fecha, foco, técnica enseñada, observaciones del profesor).
- Anotar **rolls** dentro de cada sesión: compañero, tamaño relativo, duración, resultado, qué intenté, qué falló, posiciones donde tuve problema.
- Gestionar el catálogo de **compañeros** (nombre, cinturón, peso relativo, notas).
- **Tabla global de rolls** filtrable por fecha, compañero, resultado y tipo de sesión.
- **Export / Import JSON** de toda la BD para backup manual y para mover datos entre dispositivos.

## Lo que aún NO hace

- Mapa técnico estructurado (posiciones y técnicas como entidades). Llega en iteración 1.
- Análisis automático de patrones (problemas que se repiten, compañeros contra los que pierdo). Llega en iteración 2.
- Vista grafo del mapa técnico. Llega en iteración 3.

## Stack

- **Framework:** SvelteKit + Svelte 5 + TypeScript
- **UI:** Tailwind CSS v4 + shadcn-svelte
- **BD cliente:** SQLite-WASM con VFS OPFS-SAH-Pool (persistencia local sin servidor)
- **Build / hosting:** Vite + adapter-static + GitHub Pages (deploy automático en cada push a `main`)
- **PWA:** vite-plugin-pwa (manifest + service worker)
- **Lenguaje:** español

Detalle de decisiones técnicas en `.claude/REQUISITOS.md` §10.

## Privacidad

100% local. Sin login, sin servidor, sin telemetría. Los datos viven solo en tu dispositivo (almacenamiento OPFS del navegador). Si quieres backup: `/ajustes` → Exportar todo.

## Instalar como app en Android

1. Abre **https://adalid5n.github.io/bjj-tracker/** en Chrome (o Edge) Android.
2. Espera unos segundos a que el service worker termine de instalarse en primera carga (puede haber un pequeño "loop" de refresh tras un deploy con cambios grandes; cancela y recarga si pasa).
3. Menú del navegador (3 puntos) → **"Instalar app"** o **"Añadir a pantalla de inicio"**.
4. Aparecerá el icono de BJJ Tracker en el lanzador. Al abrirlo, arranca en modo standalone (sin barra de navegador), igual que cualquier app nativa.
5. Funciona offline tras la primera carga.

## Backup recomendado

OPFS es local al navegador y, bajo presión de almacenamiento, el navegador puede llegar a evictarlo. Para no perder datos:

- **Exporta cada N sesiones**: `/ajustes` → Exportar todo. Te descarga `bjj-tracker-export-YYYYMMDD.json`.
- Guarda ese fichero donde quieras (Drive, USB, mail a uno mismo).
- **Restaurar**: `/ajustes` → Importar JSON → seleccionas el fichero → confirmas. Reemplaza toda la BD con lo del fichero.

El mismo mecanismo sirve para mover datos entre dispositivos: exporta en uno, importa en otro.

## Desarrollo local

Requisitos: Node 22+ y pnpm 10+.

```sh
pnpm install
pnpm dev          # arranca en http://localhost:5173/
pnpm check        # type check (svelte-check + tsc)
pnpm lint         # prettier + eslint
pnpm build        # build estático en build/
pnpm preview      # sirve build/ en :4173
```

El `prepare` hook copia `sqlite3.wasm` desde `node_modules/@sqlite.org/sqlite-wasm/dist/` a `static/sqlite/` automáticamente vía `scripts/copy-sqlite-wasm.mjs`.

## Despliegue

Push a `main` → GitHub Actions ejecuta `.github/workflows/deploy.yml` → publica el contenido de `build/` en GitHub Pages. Sin pasos manuales.

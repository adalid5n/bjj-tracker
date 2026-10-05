# Tasks

## 1. Base de datos y acceso a datos

- [ ] 1.1 Añadir `SCHEMA_V10_MIGRATION` + `migrate9To10` y la entrada `{ from: 9, to: 10 }` AL FINAL de `MIGRATIONS` en `src/lib/db/schema.ts`, sin tocar migraciones anteriores; verificar en `pnpm dev` que "Versión BD" en Ajustes muestra 10 y que `git diff` no toca `SCHEMA_V1`…`SCHEMA_V9`
- [ ] 1.2 Crear `src/lib/importaciones.ts` (tipos + `createImportacion`, `updateImportacion`, `listImportaciones`, `deleteImportacion`, SQL crudo sobre `run`/`query`); verificar con `pnpm check`
- [ ] 1.3 Añadir en el mismo fichero los helpers puros `formatAceptadoLegible` y `mergeAceptado` (suma lo nuevo a lo aceptado previo sin duplicar por id); verificar con `pnpm check` y revisando a mano la salida de un ejemplo en consola de `pnpm dev` (sin JSON, una línea por elemento)

## 2. Título en la petición existente

- [ ] 2.1 Ampliar el prompt y el tipo `NormalizacionResult` de `normalizarDescripcion()` en `src/lib/ai.ts` con `titulo` opcional (≤60 caracteres), sin añadir peticiones; verificar en la pestaña Red de `pnpm dev` que "Analizar clase" sigue haciendo una sola petición y que la respuesta trae `titulo`

## 3. Registro desde el flujo de importación

- [ ] 3.1 En `ImportarClaseDialog.svelte` crear la entrada al primer "Analizar clase" (antes de la IA) y, en los siguientes análisis de la misma ventana, actualizar su `texto`; guardar solo el título al responder la IA (ni texto interpretado ni propuesta); verificar que cerrar durante la carga deja una entrada "Sin terminar" con título de respaldo y que "Volver" + analizar otra vez deja una sola entrada con el último texto
- [ ] 3.2 Marcar "Falló" en cualquier error de IA y volver a "Sin terminar" cuando un paso posterior sale bien; verificar sin clave de IA (quitar `VITE_GROQ_KEY` en local) que la entrada queda en "Falló"
- [ ] 3.3 En `handleConfirmar` recoger lo realmente creado (ids + nombres), fusionarlo con el `aceptado` previo de la entrada (`mergeAceptado`) y guardar + estado "Importada"; verificar que lo aceptado coincide con lo que aparece en el mapa y que reintentar una entrada "Importada" y confirmar de nuevo deja en "Aceptado" lo de ambos intentos
- [ ] 3.4 Proteger las escrituras de historial con `try/catch` propio para que un fallo de historial no bloquee la importación; verificar leyendo el código y con `pnpm check`
- [ ] 3.5 Cambiar el aviso de cierre: si ya se pulsó "Analizar clase", "¿Cerrar? Quedará en el historial como Sin terminar"; si no, se mantiene "¿Descartar la importación?"; verificar ambos casos en `pnpm dev`

## 4. Panel del historial en /mapa

- [ ] 4.1 Añadir el wrapper shadcn-svelte `accordion` en `src/lib/components/ui/` (sobre bits-ui ya instalado, sin dependencias nuevas); verificar que `package.json` no cambia
- [ ] 4.2 Crear `HistorialImportacionesPanel.svelte` (Sheet lateral/inferior según `useMediaQuery`, `Accordion` `type="single"` (una tarjeta abierta a la vez), tarjetas plegadas con título + fecha + estado, más recientes primero, aviso de vacío, tokens semánticos); verificar en `pnpm dev` en ancho de escritorio y de móvil
- [ ] 4.3 Bloques desplegados "Texto" y "Aceptado" (este solo en estado Importada) con botón copiar y "Copiado ✓"; verificar pegando en otra app que se copia solo el bloque, sin fecha y, en "Aceptado", en formato legible
- [ ] 4.4 Borrar con `AlertDialog` de confirmación; verificar que el catálogo no cambia al borrar
- [ ] 4.5 Icono `history` en la barra del mapa, visible también con catálogo vacío, que cierra las fichas abiertas antes de abrir el panel; verificar con un catálogo vacío en el Codespace
- [ ] 4.6 "Reintentar": props `textoInicial` + `importacionIdInicial` en `ImportarClaseDialog` y apertura desde `/mapa` tras cerrar el panel; verificar que el texto llega editable y que, tras editarlo y analizar, el historial sigue con una sola entrada para esa importación, ahora con el texto editado

## 5. Copia de seguridad

- [ ] 5.1 Restaurar `disciplina` en los INSERT de `posiciones`, `sumisiones_terminales` y `tecnicas` de `insertAll` (`src/lib/sync.ts`); verificar exportando con elementos de Grappling, importando el fichero y comprobando el mapa con Grappling activo
- [ ] 5.2 Incluir `tags` y `posicion_tags` en `ExportPayload`, `exportAll`, el wipe de `importAll` e `insertAll`; verificar que tras exportar, borrar una etiqueta e importar, la etiqueta vuelve en las mismas posiciones, y que las etiquetas que solo existían en el destino desaparecen
- [ ] 5.3 Incluir `importaciones` en payload, export, wipe e insert; verificar exportando, borrando una entrada del historial e importando (la entrada vuelve)
- [ ] 5.4 Subir `CURRENT_SCHEMA_VERSION` a 7 (comentario: versión de formato de fichero), aceptar ficheros v6 tratando `tags`/`posicion_tags`/`importaciones` ausentes como vacíos y rechazar cualquier otra versión; verificar importando un export v6 real y un JSON con `schema_version: 99`
- [ ] 5.5 Añadir etiquetas e importaciones al resumen de exportar/importar de `/ajustes`; verificar visualmente en `pnpm dev`

## 6. Verificación y cierre

- [ ] 6.1 `pnpm check`, `pnpm build` y `pnpm preview` con al menos un refresh (toca BD); verificar sin errores en consola
- [ ] 6.2 Validación manual del owner en `pnpm preview` contra los escenarios de `specs/historial-importaciones/spec.md` y `specs/copia-seguridad/spec.md`
- [ ] 6.3 Archivar el change (`openspec archive historial-importaciones`) tras la validación; verificar que existen `openspec/specs/historial-importaciones/spec.md` y `openspec/specs/copia-seguridad/spec.md` y que `importar-clase` ya no tiene "Sin historial de importaciones"

# Tasks

## 1. Guardar la organización al aceptar una importación

- [x] 1.1 `GrafoMapa.transferPreviewPositions` guarda en la organización persistida solo las filas de lo recién creado (posición en pantalla o última vista en un paso anterior de "Ambos"); si falla, deja el grafo con cambios pendientes para reintentar con "Guardar organización"
- [x] 1.2 Elementos creados sin posición conocida al aceptar: se guardan en cuanto un layout los coloca y no disparan el aviso de cambios sin guardar
- [x] 1.3 `aceptarPreview` en `src/routes/mapa/+page.svelte` espera el guardado antes de refrescar
- [x] 1.4 `pnpm check` y `pnpm build`

## 2. Validación del owner (preview 4173)

- [x] 2.1 Importar una clase de BJJ con posiciones nuevas, Aceptar, ir a Home: no aparece "¿Descartar cambios del grafo?"; volver al mapa: los nodos nuevos siguen donde se vieron y no aparece "Guardar organización"
- [x] 2.2 Importación "Ambos": Aceptar, salir y volver; cambiar a BJJ: lo nuevo de cada disciplina en su sitio, sin "Guardar organización"
- [x] 2.3 Mover un nodo sin guardar, importar y Aceptar: "Guardar organización" sigue visible (lo movido sigue pendiente); "Descartar" al salir y volver: lo movido vuelve a su sitio, lo importado se queda
- [x] 2.4 Cancelar una vista previa: no aparece "Guardar organización" ni aviso al salir
- [x] 2.5 "Reorganizar" sigue dejando el grafo pendiente de guardar — no probado a mano por el owner; el código de "Reorganizar" no cambia
- [ ] 2.6 Archivar el change (`/opsx:archive`)

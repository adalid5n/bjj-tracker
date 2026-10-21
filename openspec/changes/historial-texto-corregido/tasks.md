# Tasks

## 1. Datos

- [x] 1.1 Migración v13 (nueva, al final de `MIGRATIONS`): columna `importaciones.texto_interpretado` (TEXT, nullable)
- [x] 1.2 `importaciones.ts`: tipo de fila, INSERT y `updateImportacion` con `texto_interpretado`; helper `textoVisible` (corregido → analizado)
- [x] 1.3 Copia de seguridad: formato de fichero 9 con `texto_interpretado`; se aceptan 6–9 (en 6–8 queda null)

## 2. Flujo de importación

- [x] 2.1 "Generar propuesta" guarda el texto corregido en la entrada; "Analizar clase" lo pone a null
- [x] 2.2 "Refinar propuesta" envía a la IA el texto corregido (antes, el bruto)
- [x] 2.3 Historial: bloque "Texto" y copiar muestran `textoVisible`; "Reintentar" precarga ese texto
- [x] 2.4 `pnpm check` y `pnpm build`

## 3. Validación del owner (preview 4173)

- [ ] 3.1 Importar, corregir una palabra en "Interpretado", Generar: el historial muestra el texto corregido; copiar copia ese texto
- [ ] 3.2 "Reintentar" precarga el texto corregido
- [ ] 3.3 Refinar tras corregir el texto: la propuesta respeta la corrección
- [ ] 3.4 Exportar copia, importarla: la entrada sigue mostrando el corregido; una copia anterior se importa sin error
- [ ] 3.5 Archivar el change (`/opsx:archive`)

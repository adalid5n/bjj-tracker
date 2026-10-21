# Tasks

## 1. Referencias estables

- [x] 1.1 `uid` en posiciones/sumisiones del borrador; `origenRef`/`destinoRef` en técnicas (resueltas al aplicar la propuesta)
- [x] 1.2 Nombres actuales desde las referencias en revisión, detalles, vista previa (`tecnicasResueltas`) e inserción (`confirmar`)

## 2. Técnicas sin resolver

- [x] 2.1 Validez en vivo para todas las técnicas; selección efectiva = marcada ∧ válida
- [x] 2.2 Técnica de la IA sin resolver: aviso con token `warning`, desmarcada y con los selectores de origen/destino de la técnica manual (sin teclado)

## 3. Leyenda

- [x] 3.1 Leyenda del texto interpretado con las mismas marcas que el texto: "corregido" · "dudoso, revisa"
- [x] 3.2 `pnpm check` y `pnpm build`

## 4. Validación del owner (preview 4173)

- [ ] 4.1 Importar, renombrar una posición nueva con técnicas: la técnica muestra el nombre nuevo, sale en la vista previa y se crea al aceptar
- [ ] 4.2 Renombrarla a una posición que ya existe: no se duplica y la técnica se enlaza a la existente
- [ ] 4.3 Desmarcar la posición: la técnica pasa a aviso + selectores; elegir otro origen la deja marcable
- [ ] 4.4 Los selectores no abren el teclado en la tablet
- [ ] 4.5 Leyenda: muestra las dos marcas con su significado
- [ ] 4.6 Archivar el change (`/opsx:archive`)

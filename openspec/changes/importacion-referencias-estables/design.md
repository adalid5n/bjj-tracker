# Design

## Referencias estables en el borrador

- Cada posición y sumisión del borrador lleva un `uid` local (no se
  persiste; el borrador vive en memoria por página, así que no hay formas
  antiguas que migrar).
- Cada técnica guarda `origenRef` y `destinoRef` (`RefExtremo`):
  `{ uid }` → elemento del borrador; `{ catalogo: nombre }` → elemento del
  catálogo de la importación; `null` → sin resolver. El destino es posición
  o sumisión según el tipo; al cambiar el tipo (técnica manual) el destino
  se vacía. Se conservan `origenTexto`/`destinoTexto` (lo que dijo la IA)
  solo para mostrar qué no se resolvió.
- Al aplicar la propuesta, el nombre de la IA se resuelve una vez: primero
  contra el borrador (gana, para que renombrarlo lo arrastre) y luego
  contra el catálogo.
- `nombreRef(ref)` da el nombre ACTUAL. La vista previa (`buildPreviewElements`)
  y `confirmar()` reciben técnicas con los nombres ya resueltos
  (`tecnicasResueltas`), así que el resto del algoritmo por nombre
  (enlace a existente del lado, "Ambos" `completarPos`, idénticas) no
  cambia: un elemento renombrado a un nombre del catálogo se enlaza como
  hasta ahora.
- Validez en vivo (`tecnicaValida`): referencia a un elemento del borrador
  marcado y con nombre, o a uno del catálogo. Selección efectiva =
  marcada ∧ válida (contadores, "Continuar", vista previa, inserción).

## Selectores

Los de la técnica manual (`Select` de bits-ui, sin campo de búsqueda: no
abre teclado). Valor codificado `d:<uid>` / `c:<nombre>`; opciones = nuevos
marcados + catálogo sin repetir nombres (el nuevo gana).

# Proposal

## Why

Hoy el comportamiento del mapa técnico y de "Importar de clase" solo está
escrito en el código y, a trozos, en documentos que ya no coinciden del todo
con lo que hace la app. Antes de seguir cambiando cosas con el piloto de
OpenSpec necesitamos una **línea base**: una foto fiel de lo que la app hace
*hoy*, para que los próximos cambios se escriban como diferencias contra
algo verificable y no contra la memoria de cada sesión.

## What Changes

- Se documenta, tal cual funciona hoy, el flujo de **importar una clase**
  con ayuda de la IA (desde el texto o dictado hasta la inserción en el
  catálogo).
- Se documenta, tal cual funciona hoy, el **catálogo técnico**: qué es una
  posición, una técnica, una sumisión terminal, una contra y una
  complementaria; qué reglas se cumplen al crear, editar y borrar.
- Se documenta, tal cual funciona hoy, la **pantalla del mapa**: vista
  grafo y vista lista, filtros, disciplina, organización del grafo,
  fichas de detalle y la navegación encadenada entre ellas.
- No cambia ningún comportamiento de la app. Las rarezas detectadas se
  describen de forma neutral como comportamiento actual y se listan aparte
  para que el owner decida si abrir cambios.

## Capabilities

### New Capabilities

- `importar-clase`: convertir la descripción de una clase (escrita o
  dictada) en posiciones, sumisiones y técnicas nuevas del catálogo,
  revisadas por el usuario antes de insertarse.
- `catalogo-tecnico`: las entidades del mapa técnico (posición, técnica,
  sumisión terminal, contra, complementaria, etiqueta, disciplina) y las
  reglas para crearlas, editarlas y borrarlas.
- `mapa`: cómo se consulta y recorre el catálogo en la pantalla del mapa
  (grafo, lista, filtros, organización del grafo, fichas y navegación).

Se separa el catálogo de la pantalla del mapa porque un único spec
superaría las ~25 requirements y mezclaría reglas de datos con reglas de
presentación.

### Modified Capabilities

(ninguna — no existen specs previas)

## Impact

- **Usuario:** ninguno. No hay cambio de comportamiento.
- **Documentación:** al archivar este change se crean las tres primeras
  specs vivas en `openspec/specs/`. Se añade `docs/spec/GLOSARIO.md` como
  vocabulario de referencia para specs futuras.
- **Código:** ninguno.

## Fuera de alcance

- Resto de la app: sesiones, rolls, compañeros, calendario/home y
  análisis, ajustes, exportación/importación y copia de seguridad.
- Cualquier cambio de comportamiento, incluidas las correcciones de las
  rarezas detectadas (se proponen aparte, si el owner lo decide).
- Actualizar `docs/spec/REQUISITOS.md` o las ADRs para alinearlas con el
  código: las discrepancias se reportan, no se corrigen aquí.

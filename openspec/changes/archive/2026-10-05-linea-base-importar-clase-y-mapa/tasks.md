# Tasks

## 1. Revisión del owner

- [ ] 1.1 *(Diferida: el owner aprobó el enfoque el 2026-10-05 pero aún no ha leído las specs; se revisa importar-clase al proponer la it.7)* Leer las tres specs (`importar-clase`, `catalogo-tecnico`, `mapa`) y confirmar que describen lo que la app hace hoy; verificar contrastando los casos dudosos en la app desplegada o en `pnpm preview`
- [x] 1.2 Decidir qué rarezas del informe se aceptan como comportamiento y cuáles abren un change aparte; verificar que no queda ninguna rareza sin decisión anotada
- [ ] 1.3 *(Diferida, igual que 1.1)* Revisar `docs/spec/GLOSARIO.md`; verificar que los términos y valores coinciden con los que usa la app

## 2. Cierre de la línea base

- [x] 2.1 Aplicar los ajustes de la revisión y ejecutar `openspec validate linea-base-importar-clase-y-mapa --strict`; verificar que pasa sin errores
- [x] 2.2 Archivar el change con `openspec archive linea-base-importar-clase-y-mapa`; verificar que existen `openspec/specs/importar-clase/`, `openspec/specs/catalogo-tecnico/` y `openspec/specs/mapa/` con su Purpose

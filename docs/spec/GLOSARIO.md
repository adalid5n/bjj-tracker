# Glosario — BJJ Tracker

Vocabulario de dominio que usan las specs (`openspec/specs/`) y la app.
Lenguaje de negocio; los valores entre comillas son los que ve el usuario.

## Entrenamiento

- **Sesión** — Un día de entrenamiento. Tiene fecha y tipo ("BJJ",
  "Grappling" u "Open mat"); en modo avanzado, además foco, técnica de la
  clase y observaciones del profesor.
- **Roll** — Un combate de práctica dentro de una sesión, normalmente con
  un compañero. Recoge resultado ("Dominé", "Equilibrado", "Me
  dominaron"), qué posiciones y técnicas fueron bien o fallaron y, en modo
  avanzado, la duración.
- **Compañero** — Persona con la que se hace un roll. Tiene nombre,
  cinturón (blanco a negro), peso relativo y, en modo avanzado, notas.

## Mapa técnico

- **Mapa técnico** — El catálogo personal de posiciones, técnicas y
  sumisiones, y la pantalla donde se consulta.
- **Grafo** — Vista del mapa como red: posiciones y sumisiones son nodos,
  cada técnica es una flecha de su origen a su destino.
- **Posición** — Situación en el combate desde el punto de vista del
  practicante (p. ej. "Mount top"). Es un nodo del grafo.
- **Categoría de posición** — Agrupación de la posición: "Guardia",
  "Control", "Transición" u "Otro" (por defecto).
- **Tipo de rol de posición** — Opcional: "Ofensiva", "Defensiva" o
  "Neutral", según el papel del practicante en esa posición.
- **Posición complementaria** — La misma situación vista por el rival
  (p. ej. "Mount top" ↔ "Mount bottom"). El vínculo es mutuo y único; en
  la ficha se ve como "Vista del oponente".
- **Técnica** — Movimiento que lleva de una posición de origen a un
  destino. Es siempre una flecha del grafo, nunca un nodo.
- **Tipo de técnica** — "Ataque", "Sweep", "Escape", "Transición" o
  "Sumisión". Las de tipo Sumisión acaban en una sumisión terminal; el
  resto, en una posición.
- **Variante** — Texto corto opcional que distingue versiones de la misma
  técnica desde el mismo origen (p. ej. "del profe X"). No puede haber dos
  técnicas con igual nombre, origen y variante.
- **Estado de técnica** — Grado de dominio: "Probando" (por defecto),
  "Funciona" o "Descartada".
- **Sumisión terminal** — Final del combate (p. ej. "Kimura"). Es un nodo
  del grafo al que solo llegan flechas; de él no sale ninguna técnica.
- **Contra** — Técnica que responde a otra (defensa, escape o
  contraataque). Relación de un solo sentido; se ve y se gestiona en la
  ficha de la técnica y no se dibuja en el grafo.
- **Disciplina** — "BJJ" (con kimono), "Grappling" (sin kimono) o
  "Ambos". Cada posición, técnica y sumisión tiene una; el mapa muestra
  la disciplina activa más los elementos "Ambos".
- **Etiqueta (tag)** — Marca de color que se pone a posiciones para
  agruparlas a criterio propio. Solo aplica a posiciones.
- **Ficha** — Panel de detalle de una posición, técnica o sumisión desde
  el que se navega a las entidades relacionadas.

## Modos y herramientas

- **Modo hobbyist / modo avanzado** — Ajuste global ("Vista avanzada").
  Hobbyist (por defecto) muestra captura simplificada; avanzado añade
  campos de texto extra (notas, detalles, errores comunes, foco…) y
  estadísticas en la home.
- **Importar de clase** — Flujo del mapa que, con ayuda de una IA externa,
  convierte la descripción escrita o dictada de una clase en posiciones,
  sumisiones y técnicas nuevas que el usuario revisa antes de insertar.
  Requiere conexión.

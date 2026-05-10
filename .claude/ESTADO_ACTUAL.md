# Estado actual del proyecto

**Última actualización:** 2026-05-10
**Fase activa:** Pulido pre-iteración 1 (planificación)
**Iteración en curso:** Ninguna (it.0 cerrada, it.0.5 pendiente de plan)

---

## Dónde estamos en macro

Iteración 0 ✅ cerrada en `v0.1-it0` (2026-05-10). La app permite capturar
sesiones, rolls, compañeros, ver tabla filtrable y exportar/importar JSON.
Desplegada en https://adalid5n.github.io/bjj-tracker/

Antes de arrancar iteración 1 (mapa técnico básico), pasamos por una
fase de pulido — `ITERACION_0_5.md` — para resolver fricción detectada
en uso real y dejar el sistema de diseño coherente.

---

## Última sesión (2026-05-10)

**Hecho:**
- Capturadas 3 sesiones reales en producción sin incidencias.
- Limpieza de scaffolding del template inicial (`/demo`, `/dev/*`).
- Marcados todos los criterios de aceptación en `ITERACION_0.md`.
- Commit `205d720`, tag `v0.1-it0`, push a `main`, deploy verde.
- Sacado `.claude/` del gitignore para que docs internos viajen con el
  repo entre máquinas. `CONTEXTO_AGENTE.md` reescrito para neutralizar
  contenido personal (repo es público).
- Creado este fichero `ESTADO_ACTUAL.md` como mecanismo de continuidad
  entre sesiones / ordenadores.

**Decisiones tomadas:**
- Sistema de continuidad: `ESTADO_ACTUAL.md` (este fichero) +
  `.claude/decisiones/NNN-tema.md` para ADRs cortos de decisiones con peso.
  Documentado en `CONTEXTO_AGENTE.md`.
- Plan acordado para fase de pulido (ver siguiente paso).

---

## Próximo paso

Crear `ITERACION_0_5.md` con el plan detallado de la fase de pulido,
que incluye estos cambios en este orden:

1. **Design tokens coherentes** — añadir regla en `CONTEXTO_AGENTE.md`
   ("no Tailwind raw de colores en componentes propios; usar tokens
   semánticos shadcn") y migrar los componentes que aún usan colores
   crudos (FAB, badges de resultado, mensajes vacío).
2. **Rediseño del editor de roll** — autoavance por pasos + chips para
   campos enum + combobox de compañero con "crear nuevo" inline. Todo
   junto porque es la misma pantalla.
3. **Rediseño del editor de compañero** — mismo patrón (pasos + chips).
4. **Rediseño del editor de sesión** — mismo patrón.
5. **Auto-update PWA** — cambiar `registerType` a `'prompt'` + componente
   toast "Nueva versión disponible". Requiere tocar `vite.config.ts`
   (fichero protegido, pedir OK explícito antes).

Razón del orden: si rediseñamos formularios antes que los tokens, los
chips nuevos quedan en Tailwind crudo y los re-toco después. Mejor un
solo paso.

---

## Decisiones recientes con peso

- **2026-05-10 — Auto-update PWA: opción B (prompt) sobre opción A
  (skipWaiting).** Razón: más respetuoso con flujo de captura,
  sin riesgo de recarga forzada en mitad de edición.
- **2026-05-10 — Combobox de compañero entra en la fase de pulido
  (no esperar a feedback de uso real).** Razón: es el momento donde
  se crean más compañeros nuevos.
- **2026-05-10 — Sync de docs por git, no Syncthing.** `~/.claude/`
  global (memorias, skills) se queda local; `bjj-tracker/.claude/`
  viaja con el repo. Si en el futuro hace falta también memorias en
  ambos PCs, se monta Syncthing.

---

## Cómo usar este fichero

- Al iniciar una sesión de trabajo: leer este fichero primero para
  ponerse al día.
- Al cerrar una sesión: actualizar las secciones "Última sesión",
  "Próximo paso" y "Decisiones recientes con peso".
- Las secciones macro ("Dónde estamos") cambian con poca frecuencia,
  solo al cerrar / abrir iteración.

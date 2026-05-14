# ADR-003 — Theme manager (auto / claro / oscuro) con override en /ajustes

**Fecha:** 2026-05-14
**Estado:** Aceptada
**Sesión:** 11

## Contexto

Hasta sesión 11 la app tenía CSS variables `:root` y `.dark` definidas en
`src/routes/layout.css` (heredadas del template shadcn-svelte), pero
**ningún código activaba la clase `.dark`** en `<html>`. Tampoco había
`@media (prefers-color-scheme: dark)` ni toggle en UI. Resultado: dark
mode tipográficamente listo pero inactivo. Edge DevTools emulando
`prefers-color-scheme: dark` no cambiaba nada en la app.

Adalid pidió en sesión 11 que existiera modo oscuro real, con la regla
"auto por defecto + override manual en /ajustes".

## Decisión

Singleton `ThemeState` en `src/lib/theme.svelte.ts`. Resumen:

```ts
type ThemeMode = 'auto' | 'light' | 'dark';

class ThemeState {
  #mode: ThemeMode = $state('auto');
  #systemDark: boolean = $state(false);
  // ...
  get mode() { return this.#mode; }
  get isDark() {
    return this.#mode === 'dark' || (this.#mode === 'auto' && this.#systemDark);
  }

  init() {
    if (typeof window === 'undefined' || this.#initialized) return;
    // Lee localStorage['theme'], se suscribe a matchMedia, aplica .dark
  }

  setMode(mode: ThemeMode) {
    this.#mode = mode;
    localStorage.setItem('theme', mode);
    this.#apply();
  }
}

export const theme = new ThemeState();
```

- `$state` solo en class fields (cumple la regla del proyecto, ver
  CONTEXTO_AGENTE.md / ADR-001 / histórico T-8).
- Singleton exportado.
- `init()` se llama una sola vez desde `+layout.svelte` en `onMount`,
  idempotente.
- Guarda `mode` en `localStorage` con key `theme`.
- Se suscribe a `matchMedia('(prefers-color-scheme: dark)')` y reaplica
  la clase `.dark` en `<html>` cuando cambia el sistema.
- El toggle en `/ajustes` es un grupo de 3 botones (Auto / Claro /
  Oscuro) con `aria-pressed`. Llama a `theme.setMode(...)`.

## Alternativas consideradas

1. **`mode-watcher` (npm)** — package estándar shadcn-svelte. Descartado:
   añade dependencia que no está acordada (CONTEXTO_AGENTE.md prohíbe deps
   no acordadas).
2. **Solo `@media (prefers-color-scheme: dark)` en CSS** — sin override
   manual. Más simple pero no cubre el caso "quiero forzar oscuro aunque
   el sistema esté claro".
3. **Toggle binario (claro/oscuro) sin auto** — pierde la opción de
   seguir el sistema, peor UX por defecto.
4. **Persistir en IndexedDB** — overkill para una preferencia atómica.
   `localStorage` es suficiente y síncrono (evita FOUC adicional).

## Consecuencias

- App con dark mode funcional, con preferencia persistida.
- Edge DevTools `prefers-color-scheme: dark` ahora cambia la app cuando
  `mode === 'auto'`.
- **FOUC en primera carga si `mode === 'dark'` o `(mode === 'auto' &&
  sistema dark)`**: la página se pinta en claro durante un microsegundo
  antes de que `onMount` ejecute `theme.init()` y aplique la clase. El
  owner aceptó este compromise para no tocar `app.html`. Mitigación
  documentada en `MEJORAS_FUTURAS.md`: script bloqueante en `<head>` de
  `app.html` que aplique la clase antes de pintar.
- Patrón replicable para otras preferencias globales del usuario
  (densidad, idioma, etc.) si surgieran.

## Referencias

- Componente: `src/lib/theme.svelte.ts`.
- Integración: `src/routes/+layout.svelte` (1 línea `theme.init()` en `onMount`).
- UI: `src/routes/ajustes/+page.svelte` (sección "Apariencia").
- Tokens CSS: `src/routes/layout.css` `:root` + `.dark`.
- Paleta retocada en sesión 11 para mejor jerarquía visual (background
  off-white en light, gris cálido en dark, cards con suficiente
  diferencia para crear capas).

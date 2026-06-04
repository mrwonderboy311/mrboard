# Research: UI Modernization with HTMX + Tailwind CSS

**Date**: 2026-06-01

## R1: Tailwind CSS Integration with Layui

**Decision**: Use Tailwind CSS v3.x via CDN Play with a custom override stylesheet.

**Rationale**: Tailwind's CDN Play mode (`<script src="https://cdn.tailwindcss.com">`) requires no build step, which aligns with the project's current setup (no webpack/vite). Tailwind utilities can coexist with Layui CSS because they use different specificity patterns. A single `modern-theme.css` file provides targeted overrides for Layui's form/button/table classes.

**Alternatives considered**:
- **PostCSS build step**: Rejected — adds tooling complexity for a project with no existing build pipeline
- **Tailwind CLI standalone**: Rejected — still requires a build step; CDN Play is simpler for this phase
- **Pure CSS custom theme**: Rejected — Tailwind utilities reduce the amount of custom CSS needed

## R2: HTMX Integration with Beego Templates

**Decision**: Use HTMX v2.x via CDN. Replace jQuery AJAX in templates with HTMX attributes. Backend endpoints may need to return HTML fragments instead of JSON for HTMX consumption.

**Rationale**: HTMX works with standard HTML attributes (`hx-get`, `hx-post`, `hx-swap`, `hx-target`), which integrate naturally with Beego's server-rendered templates. The project uses `<<<` `>>>` template delimiters, which do not conflict with HTMX attributes.

**Key consideration**: Many existing endpoints return JSON. HTMX can handle JSON responses via `hx-on:htmx:beforeSwap` event handler that transforms JSON to HTML, OR backend endpoints can be updated to return HTML fragments when the `HX-Request` header is present. The latter is cleaner but requires backend changes.

**Alternatives considered**:
- **Alpine.js**: Rejected — still requires JS for complex interactions; HTMX is more declarative
- **Keep jQuery + visual-only update**: Rejected per user decision — full HTMX migration requested
- **React SPA**: Rejected — too large a scope change; Beego templates preserved

## R3: jQuery AJAX Pattern Analysis

**Decision**: Migrate all 305 pages with jQuery AJAX to HTMX in a structured, module-by-module approach.

**Rationale**: Analysis shows:
- `$.ajax()` — most common, used for complex requests with custom headers/error handling
- `$.post()` / `$.get()` — simpler form submissions and data fetching
- `$.getJSON()` — JSON API calls

HTMX equivalents:
- `$.ajax({url, type:'GET'})` → `hx-get="url"`
- `$.ajax({url, type:'POST'})` → `hx-post="url"`
- `$.post(url, data)` → `hx-post="url"` with `hx-vals` or form data
- Response handling: `hx-swap` (innerHTML, outerHTML, beforeend) + `hx-target` (CSS selector)

**Challenge**: Some jQuery AJAX calls have complex success/error callbacks, loading indicators, and conditional logic. These need careful conversion to HTMX events (`htmx:beforeRequest`, `htmx:afterSwap`, `htmx:responseError`).

## R4: Layui CSS Override Strategy

**Decision**: Override Layui's CSS classes with higher-specificity selectors in `modern-theme.css`. Do not modify Layui's original CSS files.

**Rationale**: The constitution's "Vendored Libraries" constraint prohibits modifying files in `views/front/lib/`. Override approach:
- Target Layui's class names (`.layui-input`, `.layui-btn`, `.layui-table`, `.layui-form-label`, etc.)
- Use `!important` sparingly, prefer specificity-based overrides
- Test that Layui JS components (form, table, layer, tree) still initialize and function correctly

**Alternatives considered**:
- **Fork Layui CSS**: Rejected — maintenance burden, violates vendored library constraint
- **CSS custom properties**: Considered as complement — can define design tokens as CSS variables for consistency

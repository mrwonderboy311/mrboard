# Research: UI/UX Pro Max Upgrade

**Feature**: 002-ui-ux-promax-upgrade
**Date**: 2026-06-01

## Research Tasks

### 1. Material Design 3 CSS Custom Properties

**Decision**: Use CSS custom properties (CSS variables) to define a Material Design 3-inspired design system.

**Rationale**: CSS custom properties are natively supported in all modern browsers, require no build tools, and can be overridden at any DOM scope. This is the simplest way to introduce a design system without replacing Layui.

**Alternatives considered**:
- SCSS/Sass build step: Rejected — adds tooling complexity, project has no build pipeline for CSS.
- CSS-in-JS: Rejected — project uses server-rendered HTML, not a SPA.
- Tailwind CSS: Rejected — would require adding a build step and rewriting all HTML class attributes.

**Key tokens to define**:
```css
:root {
  /* Primary palette — Deep Indigo */
  --md-primary: #3F51B5;
  --md-primary-light: #7986CB;
  --md-primary-dark: #303F9F;
  --md-on-primary: #FFFFFF;

  /* Secondary palette */
  --md-secondary: #536DFE;
  --md-secondary-light: #8C9EFF;
  --md-secondary-dark: #304FFE;

  /* Surface & Background */
  --md-surface: #FFFFFF;
  --md-surface-variant: #F5F5F5;
  --md-background: #FAFAFA;
  --md-on-surface: #212121;
  --md-on-surface-variant: #757575;

  /* Status colors */
  --md-success: #4CAF50;
  --md-warning: #FF9800;
  --md-error: #F44336;
  --md-info: #2196F3;

  /* Neutral */
  --md-outline: #E0E0E0;
  --md-outline-variant: #EEEEEE;

  /* Typography */
  --md-font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --md-font-mono: 'Roboto Mono', 'Monaco', 'Menlo', 'Consolas', monospace;

  /* Spacing scale */
  --md-space-xs: 4px;
  --md-space-sm: 8px;
  --md-space-md: 16px;
  --md-space-lg: 24px;
  --md-space-xl: 32px;

  /* Border radius */
  --md-radius-sm: 4px;
  --md-radius-md: 8px;
  --md-radius-lg: 12px;
  --md-radius-xl: 16px;
  --md-radius-full: 9999px;

  /* Shadows (Material Design elevation) */
  --md-shadow-1: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.14);
  --md-shadow-2: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12);
  --md-shadow-3: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10);

  /* Transitions */
  --md-transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --md-transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --md-transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 2. Layui CSS Override Strategy

**Decision**: Override Layui's default CSS classes with higher-specificity selectors in a dedicated `material-theme.css` file, loaded after `layui.css`.

**Rationale**: Layui uses simple class selectors (`.layui-btn`, `.layui-table`, `.layui-form-item`). A single override file with `.layuimini-container` as a parent scope provides sufficient specificity without `!important`. This preserves all Layui JS functionality.

**Alternatives considered**:
- Fork Layui CSS: Rejected — creates maintenance burden when Layui updates.
- Inline styles: Rejected — not maintainable, no design system consistency.
- Replace Layui entirely: Rejected — violates constitution (backward compatibility).

**Key overrides needed**:
- `.layui-btn` — border-radius, transitions, colors
- `.layui-table` — alternating rows, hover, cell padding
- `.layui-form-item`, `.layui-input`, `.layui-select` — input styling, focus states
- `.layui-form-label` — typography, spacing
- `.layui-layer` (modals) — shadow, border-radius, overlay
- `.layui-nav` — sidebar navigation styling
- `.layui-card` — card shadows and border-radius

### 3. Gradient Sidebar Implementation

**Decision**: Apply a CSS linear-gradient background to the layuimini sidebar container, with white text and icon colors.

**Rationale**: The sidebar uses `.layui-nav` inside a fixed container. A gradient background on the parent div with color overrides on `.layui-nav > li > a` achieves the effect without modifying Layui's JS menu rendering.

**Alternatives considered**:
- Dark solid color: Rejected per user clarification (user chose gradient).
- SVG background: Rejected — unnecessary complexity for a linear gradient.
- Image background: Rejected — not responsive, adds network request.

### 4. Skeleton Loading CSS

**Decision**: Pure CSS skeleton screens using `@keyframes` shimmer animation on placeholder elements.

**Rationale**: CSS-only skeletons require no JavaScript library, work with Layui's table rendering, and are easy to apply/remove by toggling a class. The shimmer effect uses a moving linear-gradient.

**Implementation approach**:
- Add `.skeleton` class to table rows or card containers
- CSS `@keyframes shimmer` animates a background gradient
- JavaScript removes `.skeleton` class when data loads (via Layui's `done` callback)

### 5. Log Viewer Dark/Light Mode Toggle

**Decision**: Implement a CSS class-based theme toggle (`.log-theme-dark` / `.log-theme-light`) on the log viewer container.

**Rationale**: The log viewer's styles are already scoped in `logViewer.html`'s inline `<style>` block. Adding dark/light theme classes with CSS variables scoped to the log viewer is surgical and doesn't affect other pages.

**Dark theme variables**:
```css
.log-theme-dark {
  --log-bg: #1E1E1E;
  --log-text: #D4D4D4;
  --log-line-hover: #2A2D2E;
  --log-ts: #6A9955;
  --log-border: #333333;
}
```

**Light theme variables**:
```css
.log-theme-light {
  --log-bg: #FFFFFF;
  --log-text: #333333;
  --log-line-hover: #F5F5F5;
  --log-ts: #999999;
  --log-border: #E0E0E0;
}
```

### 6. Status Badge Component

**Decision**: Use pill-shaped `<span>` elements with background color from status mapping.

**Rationale**: Status badges are used across all resource list tables. A reusable CSS class pattern (`.status-badge`, `.status-running`, `.status-error`, etc.) can be applied via Layui's table templet function.

**Color mapping**:
- Running/Active/Ready: `var(--md-success)` green
- Pending/Creating/Waiting: `var(--md-warning)` amber
- Error/Failed/CrashLoop: `var(--md-error)` red
- Unknown/Terminated: `var(--md-outline)` gray
- Succeeded/Completed: `var(--md-info)` blue

### 7. Login Page Layout

**Decision**: Center the login form in a card with Material Design elevation, on a subtle gradient background.

**Rationale**: The current login page uses a simple form. Wrapping it in a centered card with `max-width: 420px`, `var(--md-shadow-3)`, and `var(--md-radius-lg)` achieves the modern look with minimal HTML changes.

## Summary of Decisions

| Area | Decision | Approach |
|------|----------|----------|
| Design system | CSS custom properties | `:root` variables in `material-theme.css` |
| Layui overrides | Higher-specificity selectors | Dedicated override file, loaded after layui.css |
| Sidebar | CSS gradient | Parent container gradient + white text overrides |
| Skeleton loading | Pure CSS `@keyframes` | Toggle `.skeleton` class via JS |
| Log viewer theme | CSS class toggle | `.log-theme-dark` / `.log-theme-light` |
| Status badges | Pill-shaped spans | CSS classes + Layui templet function |
| Login page | Centered card | HTML wrapper + CSS card styles |

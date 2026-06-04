# CSS Design System Contract

**Feature**: 002-ui-ux-promax-upgrade
**Date**: 2026-06-01

## Overview

This contract defines the CSS design system tokens and component styles that ALL pages in `views/front/` must use. It serves as the single source of truth for visual consistency.

## Design Token Contract

All color, spacing, radius, shadow, and transition values MUST be referenced via CSS custom properties. Hardcoded values are forbidden in new code.

### Required Token Usage

| Category | Variable Pattern | Example |
|----------|-----------------|---------|
| Primary color | `var(--md-primary)` | Button backgrounds, active states |
| Surface color | `var(--md-surface)` | Card, table, modal backgrounds |
| Text color | `var(--md-on-surface)` | Body text, labels |
| Secondary text | `var(--md-on-surface-variant)` | Descriptions, hints |
| Border color | `var(--md-outline)` | Input borders, dividers |
| Status colors | `var(--md-success/warning/error/info)` | Status badges, alerts |
| Spacing | `var(--md-space-xs/sm/md/lg/xl)` | Margins, padding |
| Border radius | `var(--md-radius-sm/md/lg/xl/full)` | Cards, inputs, badges |
| Shadows | `var(--md-shadow-1/2/3)` | Cards, modals, dropdowns |
| Transitions | `var(--md-transition-fast/normal/slow)` | Hover, focus, state changes |

## Component Style Contract

### Status Badge

```html
<span class="status-badge status-running">Running</span>
<span class="status-badge status-pending">Pending</span>
<span class="status-badge status-error">Error</span>
<span class="status-badge status-unknown">Unknown</span>
<span class="status-badge status-info">Succeeded</span>
```

### Card

```html
<div class="md-card">
  <div class="md-card-header">Title</div>
  <div class="md-card-body">Content</div>
</div>
```

### Skeleton Loader

```html
<div class="skeleton skeleton-text"></div>
<div class="skeleton skeleton-avatar"></div>
```

Remove by removing the `skeleton` class or the element.

### Log Theme Toggle

```html
<div class="log-theme-dark">  <!-- or log-theme-light -->
  <!-- log content -->
</div>
```

## File Load Order

Every HTML page MUST include stylesheets in this order:

1. `/lib/layui-v2.13.3/css/layui.css` (Layui base)
2. `/css/public.css` (existing project styles)
3. `/css/material-theme.css` (Material Design overrides — NEW)

## Backward Compatibility

- All existing Layui class names remain valid
- All existing JavaScript selectors continue to work
- No HTML structure changes that break existing JS event handlers
- New CSS classes are additive only

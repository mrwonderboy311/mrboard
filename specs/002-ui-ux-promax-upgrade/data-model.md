# Data Model: UI/UX Pro Max Upgrade

**Feature**: 002-ui-ux-promax-upgrade
**Date**: 2026-06-01

## Entities

This feature is purely frontend/CSS — there are no database entities or API data models. The "entities" here are the CSS design system components and their relationships.

### Design System Token

The foundation of the entire UI upgrade. Defined as CSS custom properties in `:root`.

**Attributes**:
- `--md-primary` (color): Deep Indigo #3F51B5 — primary brand color
- `--md-primary-light` (color): Lighter variant for hover states
- `--md-primary-dark` (color): Darker variant for active states
- `--md-on-primary` (color): Text/icon color on primary backgrounds
- `--md-surface` (color): Card/panel background
- `--md-background` (color): Page background
- `--md-on-surface` (color): Primary text color
- `--md-on-surface-variant` (color): Secondary text color
- `--md-outline` (color): Border color
- `--md-success` (color): #4CAF50 — running/active states
- `--md-warning` (color): #FF9800 — pending/waiting states
- `--md-error` (color): #F44336 — error/failed states
- `--md-info` (color): #2196F3 — informational states
- `--md-space-*` (spacing): xs(4px), sm(8px), md(16px), lg(24px), xl(32px)
- `--md-radius-*` (radius): sm(4px), md(8px), lg(12px), xl(16px), full(9999px)
- `--md-shadow-*` (shadow): 3 elevation levels
- `--md-transition-*` (timing): fast(150ms), normal(250ms), slow(350ms)

### Component Style

Reusable visual patterns applied across pages.

**Status Badge**:
- Class: `.status-badge`
- Variants: `.status-running`, `.status-pending`, `.status-error`, `.status-unknown`, `.status-info`
- Shape: pill (border-radius: var(--md-radius-full))
- Padding: 2px 10px
- Font-size: 12px, font-weight: 500

**Card**:
- Class: `.md-card`
- Background: var(--md-surface)
- Border-radius: var(--md-radius-lg)
- Shadow: var(--md-shadow-1)
- Hover: var(--md-shadow-2) with transition

**Table Row**:
- Alternating: var(--md-surface-variant) on even rows
- Hover: var(--md-primary-light) at 8% opacity
- Border-bottom: 1px solid var(--md-outline)

**Form Input**:
- Border: 1px solid var(--md-outline)
- Border-radius: var(--md-radius-md)
- Focus: border-color var(--md-primary), box-shadow with primary at 20% opacity
- Transition: var(--md-transition-fast)

**Button**:
- Variants: primary (filled), outlined, text
- Border-radius: var(--md-radius-md)
- Transition: var(--md-transition-fast)
- Hover: darken by 8%, shadow elevation +1

**Modal/Dialog**:
- Background: var(--md-surface)
- Border-radius: var(--md-radius-xl)
- Shadow: var(--md-shadow-3)
- Overlay: rgba(0,0,0,0.5)

**Skeleton Loader**:
- Background: linear-gradient shimmer animation
- Border-radius: var(--md-radius-md)
- Animation-duration: 1.5s

### Page Template

The base HTML structure shared across pages.

**Current structure** (per page):
```html
<head>
  <link rel="stylesheet" href="/lib/layui-v2.13.3/css/layui.css">
  <link rel="stylesheet" href="/css/public.css">
  <script src="/lib/layui-v2.13.3/layui.js"></script>
  <script src="/js/xkube.js"></script>
</head>
```

**Upgraded structure** (add material-theme.css after public.css):
```html
<head>
  <link rel="stylesheet" href="/lib/layui-v2.13.3/css/layui.css">
  <link rel="stylesheet" href="/css/public.css">
  <link rel="stylesheet" href="/css/material-theme.css">  <!-- NEW -->
  <script src="/lib/layui-v2.13.3/layui.js"></script>
  <script src="/js/xkube.js"></script>
</head>
```

## Relationships

```
Design System Token
  ├── defines colors for → Component Style (Status Badge, Card, Table, Form, Button, Modal)
  ├── defines spacing for → Component Style
  ├── defines shadows for → Component Style
  └── defines transitions for → Component Style

Component Style
  ├── applied to → Page Template (all HTML pages)
  └── overrides → Layui default styles

Page Template
  └── includes → material-theme.css (design system + component styles)
```

## Validation Rules

- All color values MUST use CSS custom properties (not hardcoded hex) for maintainability
- All interactive elements MUST have hover, active, and focus states defined
- All status badges MUST map to exactly one of: success, warning, error, info, unknown
- Skeleton loaders MUST be removable by toggling a single CSS class
- Dark mode variables MUST override all light mode variables within `.log-theme-dark` scope

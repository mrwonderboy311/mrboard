# Frontend UI Modernization Design

**Date**: 2026-06-01
**Scope**: Full frontend CSS overhaul + main layout & login page HTML tweaks
**Style**: Bright Modern (Vercel/Linear) + Dark Gradient Sidebar

## Problem

The current frontend loads 3 conflicting CSS theme files:
- `default.css` — layuimini theme (teal `#1aa094`)
- `material-theme.css` — Material Design 3 (indigo `#3F51B5`, 686 lines)
- `modern-theme.css` — Tailwind-inspired (blue `#3b82f6`, 384 lines)

These override the same Layui components with different colors, causing visual inconsistency. The UI looks dated.

## Solution

Replace all 3 theme files with a single unified `app-theme.css`. Make targeted HTML changes to the main layout and login pages.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Visual Style | Bright Modern — white content area, clean cards |
| Sidebar | Dark gradient (`#1e293b` → `#0f172a`) |
| Primary Color | Blue `#3b82f6` (hover `#2563eb`, active `#1d4ed8`) |
| Success/Warning/Danger | `#22c55e` / `#f59e0b` / `#ef4444` |
| Background/Surface/Border | `#f8fafc` / `#ffffff` / `#e2e8f0` |
| Text/Secondary | `#1e293b` / `#64748b` |
| Border Radius | sm 6px / md 8px / lg 12px |
| Shadows | sm (subtle) / md (card) / lg (modal) |

## CSS Architecture

### File: `views/front/css/app-theme.css`

Single source of truth. Replaces `default.css`, `material-theme.css`, `modern-theme.css`.

Load order in all pages:
1. `layui.css` — base Layui
2. `layuimini.css` — layuimini framework
3. **`app-theme.css`** — unified theme (this file)
4. `font-awesome.min.css` — icons

CSS Custom Properties define all design tokens. No `:root` conflicts.

### Component Coverage

**Tables**:
- Header: `#f8fafc` bg, uppercase 13px, font-weight 600
- Rows: alternating bg, hover `#eff6ff`
- Border-radius 8px, overflow hidden, subtle shadow

**Form Inputs**:
- Height 38px, radius 6px, border `#e2e8f0`
- Focus: blue border + glow `0 0 0 3px rgba(59,130,246,0.15)`
- Disabled: gray bg, cursor not-allowed

**Buttons**:
- Radius 6px, hover translateY(-1px) + shadow
- Primary blue, danger red, warm orange
- Border buttons: transparent bg + colored border

**Modals (Layer)**:
- Radius 12px, large shadow
- Title 16px 600 weight, bottom border
- Button area top border, buttons radius 6px

**Tabs**:
- Selected: bottom blue indicator (3px), blue text
- Transition 150ms

**Pagination**:
- Page numbers radius 6px, current page blue bg
- Hover blue text

**Sidebar**:
- Dark gradient `#1e293b` → `#0f172a`
- Menu items: radius, margin spacing, hover white-transparent bg
- Selected: left blue indicator bar + light blue bg
- Sub-menus: deeper transparent bg
- Logo: bold white text

**Status Badges**:
- Pill shape (radius-full), semi-transparent colored bg
- Running/Ready: green / Pending: orange / Error/Failed: red / Unknown: gray

## HTML Changes

### `views/front/xkube_index.html`

- Header: white bg, bottom subtle shadow, search input radius
- Sidebar gradient from new theme
- Tab bar: selected tab bottom blue bar, rounded tabs
- Footer: light gray bg, muted text
- Remove conflicting `default.css` reference
- Update CSS link from `material-theme.css` to `app-theme.css`

### Login Pages (`login_code.html`, `login_telcode.html`)

- Background: dark blue gradient (matching sidebar)
- Login card: white, radius 16px, large shadow, centered
- Inputs: 44px height, larger radius
- Submit button: full-width blue, 44px height
- Remove old icon styles, use clean placeholders

### Iframe Sub-pages (355 files)

- No HTML changes
- Update CSS link: replace `material-theme.css` with `app-theme.css`
- All Layui components automatically restyled via CSS overrides

## Files Modified

| File | Action |
|------|--------|
| `views/front/css/app-theme.css` | **NEW** — unified theme |
| `views/front/xkube_index.html` | Update CSS refs, minor layout tweaks |
| `views/front/login_code.html` | Modernize login card |
| `views/front/login_telcode.html` | Modernize login card |
| `views/front/page/**/*.html` | Update CSS link (batch replace) |
| `views/front/css/default.css` | Remove reference (keep file) |
| `views/front/css/material-theme.css` | Remove reference (keep file) |
| `views/front/css/modern-theme.css` | Remove reference (keep file) |

## Success Criteria

1. Single `app-theme.css` loaded, no style conflicts
2. Sidebar: dark gradient with blue selection highlight
3. Content area: clean white, modern cards/tables/forms
4. All 355 pages look consistent without HTML changes
5. Login page: modern card design with gradient background
6. No visual regressions in functionality (forms submit, tables render, modals open)

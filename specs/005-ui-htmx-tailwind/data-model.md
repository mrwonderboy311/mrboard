# Data Model: UI Modernization with HTMX + Tailwind CSS

**Date**: 2026-06-01

## Entities

This feature is a frontend-only visual/interaction change. No new database entities are created. The following conceptual "entities" represent the design system components:

### Design Token

Represents the unified visual language applied across all pages.

| Attribute | Type | Description |
|-----------|------|-------------|
| color-primary | string | Primary brand color (e.g., blue-600) |
| color-secondary | string | Secondary/accent color |
| color-danger | string | Danger/error color (e.g., red-500) |
| color-success | string | Success color (e.g., green-500) |
| color-bg | string | Page background color |
| color-surface | string | Card/panel background |
| color-text | string | Primary text color |
| color-text-muted | string | Secondary/muted text |
| spacing-unit | string | Base spacing unit (e.g., 4px) |
| border-radius | string | Default border radius (e.g., 6px) |
| font-family | string | Primary font stack |
| font-size-base | string | Base font size (e.g., 14px) |
| shadow-sm | string | Small shadow for cards |
| shadow-md | string | Medium shadow for modals |

### Component Style

Represents the visual treatment for reusable UI patterns.

| Component | Layui Class | Override Approach |
|-----------|-------------|-------------------|
| Text Input | `.layui-input` | Rounded corners, padding, focus ring, height |
| Select | `.layui-select` | Same as input + custom dropdown arrow |
| Textarea | `.layui-textarea` | Same as input + min-height |
| Checkbox | `.layui-form-checkbox` | Custom check icon, modern border |
| Radio | `.layui-form-radio` | Custom radio dot, modern border |
| Primary Button | `.layui-btn` | Background, rounded, hover/active states |
| Secondary Button | `.layui-btn-primary` | Border, text color, hover states |
| Danger Button | `.layui-btn-danger` | Red theme, hover states |
| Table | `.layui-table` | Borders, header bg, alternating rows, spacing |
| Form Label | `.layui-form-label` | Font weight, color, alignment |
| Sidebar | `.layui-side` | Background, shadow, section grouping |
| Header | `.layui-header` | Background, shadow, height |
| Modal/Popup | `.layui-layer` | Rounded corners, shadow, overlay |

### Page Template

Each HTML template that needs updating. Grouped by module:

| Module | Template Count | Priority | Key Patterns |
|--------|---------------|----------|--------------|
| RBAC | ~15 | P1 | Forms (edit/create), tables (list), modals |
| CI/CD | ~11 | P1 | Forms, tables, log viewers |
| xkube | ~50+ | P1 | Forms, tables, terminal, YAML editor |
| Wiki | ~4 | P2 | Content editor, list |
| Login | 2 | P3 | Login forms |
| Layout | 1 (xkube_index) | P2 | Sidebar, header, content area |
| Other | ~268 | P2-P3 | Various forms and tables |

## Relationships

```
Design Token ──defines──> Component Style
Component Style ──applied-to──> Page Template
Page Template ──grouped-by──> Module
```

## State Transitions

No state transitions apply (frontend-only visual change, no data lifecycle).

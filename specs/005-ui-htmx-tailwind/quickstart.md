# Quickstart: UI Modernization with HTMX + Tailwind CSS

**Date**: 2026-06-01

## Prerequisites

- xkube project running locally (Beego server on localhost)
- Modern browser for testing

## Step 1: Add CDN Resources to Main Layout

In `views/front/xkube_index.html`, add to `<head>`:

```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/htmx.org@2.0.4"></script>
<link rel="stylesheet" href="/css/modern-theme.css">
```

## Step 2: Create Design Override Stylesheet

Create `views/front/css/modern-theme.css` with overrides for:
- Form inputs (`.layui-input`, `.layui-textarea`, `.layui-select`)
- Buttons (`.layui-btn`, `.layui-btn-primary`, `.layui-btn-danger`)
- Tables (`.layui-table`)
- Layout (`.layui-side`, `.layui-header`)
- Modals (`.layui-layer`)

## Step 3: Verify Layui JS Still Works

After adding the CSS, manually verify:
- Form submission still works (layui `form.on('submit')`)
- Table rendering still works (layui `table.render()`)
- Layer popups still work (layui `layer.open()`)
- Dropdowns, date pickers still function

## Step 4: Migrate One Page's jQuery AJAX to HTMX

Pick a simple page (e.g., `page/rbac/adminList.html`):
1. Find `$.ajax()` / `$.post()` calls
2. Replace with HTMX attributes on the triggering element
3. Ensure the backend endpoint returns HTML (or use HTMX event handlers for JSON)
4. Test the interaction

## Step 5: Apply to Remaining Pages

Repeat Step 4 module by module, testing each module's critical flows.

## Verification

- [ ] Forms display with modern styling (rounded, padded, focus ring)
- [ ] Buttons have distinct variants with hover states
- [ ] Tables have alternating rows and modern borders
- [ ] Layui JS components (form, table, layer) still function
- [ ] jQuery AJAX calls successfully replaced by HTMX
- [ ] Login page looks modern and professional
- [ ] Layout (sidebar, header) has polished appearance
- [ ] Mobile responsive behavior preserved

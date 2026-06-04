# Quickstart: UI/UX Pro Max Upgrade

**Feature**: 002-ui-ux-promax-upgrade
**Date**: 2026-06-01

## Prerequisites

- Go 1.25.4+ installed
- Access to the xkube repository
- Modern browser (Chrome/Firefox/Edge) for testing

## Quick Start

### 1. Build and run the server

```bash
cd /root/xkube
go build -o /tmp/xkube main.go
/tmp/xkube
```

### 2. Verify the main layout

Open `http://localhost:<port>/index` in a browser. The sidebar should show:
- Gradient background (deep indigo to lighter shade)
- White text and icons
- Active menu item highlighted with primary color indicator
- Smooth hover transitions on menu items

### 3. Verify resource list pages

Navigate to any resource list (e.g., Deployments). Confirm:
- Modern table styling with alternating row colors
- Status badges are pill-shaped with color coding
- Search fieldset has card-style design
- Skeleton loading appears briefly before data loads

### 4. Verify form pages

Open any create/edit form (e.g., Create Deployment). Confirm:
- Inputs have rounded borders with focus glow
- Labels are clearly aligned
- Required fields show visual indicators

### 5. Verify log viewer

Navigate to Loki Log Viewer. Confirm:
- Service cards have modern shadows and rounded corners
- Default dark theme in log detail view
- Toggle button switches between dark and light themes
- Histogram chart has modern gradient fill

### 6. Verify login page

Open `/login` in a new incognito window. Confirm:
- Centered card layout with shadow
- Clean form design with focus animations
- Loading spinner on submit

## File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `views/front/css/material-theme.css` | NEW | Material Design 3 theme overrides and design tokens |
| `views/front/css/public.css` | MODIFY | Add design system CSS variables to `:root` |
| `views/front/css/skeleton.css` | NEW | Skeleton loading animation styles |
| `views/front/xkube_index.html` | MODIFY | Add material-theme.css link, gradient sidebar styles |
| `views/front/login_code.html` | MODIFY | Centered card layout |
| `views/front/login_telcode.html` | MODIFY | Centered card layout |
| `views/front/page/xkube/*.html` | MODIFY | Add material-theme.css link, status badge classes |
| `views/front/page/xkube/logViewer.html` | MODIFY | Dark/light theme toggle, refined styling |
| `views/front/page/cicd/*.html` | MODIFY | Add material-theme.css link |
| `views/front/page/rbac/*.html` | MODIFY | Add material-theme.css link |
| `views/front/page/wiki/*.html` | MODIFY | Add material-theme.css link |

## Testing Checklist

- [ ] Main layout sidebar gradient renders correctly
- [ ] All resource list tables show modern styling
- [ ] Status badges are color-coded and pill-shaped
- [ ] Form inputs have focus glow effects
- [ ] Modals have rounded corners and shadows
- [ ] Log viewer dark/light toggle works
- [ ] Login page shows centered card
- [ ] Skeleton loading appears on list pages
- [ ] All Layui JS functionality (forms, tables, dropdowns) still works
- [ ] No console errors on any page

# Implementation Plan: UI Modernization with HTMX + Tailwind CSS

**Branch**: `005-ui-htmx-tailwind` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-ui-htmx-tailwind/spec.md`

## Summary

Modernize the xkube platform's visual appearance by introducing Tailwind CSS for styling and HTMX for dynamic interactions. The platform currently uses Layui + jQuery across 351 HTML templates. This plan adds Tailwind CSS and HTMX via CDN, creates a unified design override stylesheet, and replaces all jQuery AJAX calls (305 pages) with HTMX attributes.

## Technical Context

**Language/Version**: Go 1.25.4 with Beego v2 (backend, no changes needed)

**Primary Dependencies**: Layui v2.13.3 + v2.6.3 (existing), Tailwind CSS v3.x (new, CDN), HTMX v2.x (new, CDN)

**Storage**: N/A (frontend-only changes)

**Testing**: Manual testing via web UI (no automated test suite exists)

**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge latest 2 versions)

**Project Type**: Web application (Beego server-rendered HTML templates)

**Performance Goals**: Page load time must not increase measurably; CDN resources should be cached

**Constraints**: Must preserve all Layui JS functionality; 305 pages with jQuery AJAX to migrate; template delimiters are `<<<` `>>>` (not `{{` `}}`)

**Scale/Scope**: 351 HTML templates, ~305 with jQuery AJAX calls, 8+ modules (RBAC, CI/CD, xkube, wiki, etc.)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | PASS | CDN approach avoids build tooling; override stylesheet is minimal |
| II. Surgical Changes | PASS | Only CSS/HTML/JS files in `views/front/` touched; no backend changes |
| III. Multi-Cluster Safety | N/A | Frontend-only changes, no K8s operations |
| IV. RBAC Enforcement | N/A | No API changes; existing auth flow preserved |
| V. Backward Compatibility | PASS | No API/route changes; all existing Layui JS functionality preserved |

**Post-Phase 1 Re-check**: All principles still pass. No new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/005-ui-htmx-tailwind/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
views/front/
├── css/
│   ├── modern-theme.css          # NEW: Tailwind + custom design overrides
│   ├── public.css                # EXISTING: keep, may need minor updates
│   ├── material-theme.css        # EXISTING: keep
│   └── ...                       # EXISTING: all other CSS files unchanged
├── js/
│   └── xkube.js                  # EXISTING: jQuery AJAX logic to be replaced by HTMX
├── lib/
│   ├── layui-v2.13.3/            # EXISTING: untouched
│   └── layui-v2.6.3/             # EXISTING: untouched
├── page/
│   ├── rbac/                     # ~15 templates to update
│   ├── cicd/                     # ~11 templates to update
│   ├── xkube/                    # ~50+ templates to update
│   ├── wiki/                     # ~4 templates to update
│   └── ...                       # other modules
├── login_code.html               # EXISTING: update styling
├── login_telcode.html            # EXISTING: update styling
└── xkube_index.html              # EXISTING: main layout, update styling
```

**Structure Decision**: All changes are within `views/front/`. No new directories or backend files needed. A single new CSS file (`css/modern-theme.css`) provides the design system. HTMX and Tailwind CSS are loaded via CDN in the main layout template.

## Implementation Strategy

### Phase 1: Foundation (Design System + CDN Setup)

1. Create `css/modern-theme.css` with:
   - Tailwind CSS `@layer` overrides for Layui form elements
   - Modern color palette, spacing, typography
   - Button variants (primary, secondary, danger)
   - Table styling (alternating rows, borders, header)
   - Layout polish (sidebar, header, content area)

2. Update `xkube_index.html` to load Tailwind CSS CDN + HTMX CDN + modern-theme.css

3. Update login pages with new styling

### Phase 2: Form & Button Styling (All Modules)

For each module (RBAC, CI/CD, xkube, wiki, etc.):
- Apply Tailwind utility classes to form elements
- Apply button styling classes
- Verify Layui JS components still function

### Phase 3: jQuery AJAX → HTMX Migration (All Modules)

For each of the 305 pages with jQuery AJAX:
- Identify `$.ajax()`, `$.post()`, `$.get()`, `$.getJSON()` calls
- Replace with HTMX attributes (`hx-get`, `hx-post`, `hx-swap`, `hx-target`)
- Update response handling (HTMX expects HTML fragments or uses `HX-Trigger` headers)
- Verify functionality matches original behavior

### Phase 4: Table & Layout Polish

- Apply table styling to all list pages
- Apply layout polish to sidebar, header, content area
- Mobile responsive verification

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | — | — |

No constitution violations. This is a CSS/HTML/JS frontend change with no backend modifications.

# Implementation Plan: UI/UX Pro Max Upgrade

**Branch**: `002-ui-ux-promax-upgrade` | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-ui-ux-promax-upgrade/spec.md`

## Summary

Upgrade all frontend HTML pages in xkube to a modern Material Design 3 visual style. The primary change is CSS-driven: introduce a design system via CSS custom properties, override Layui defaults, and selectively update HTML templates for structural changes (skeleton loading, status badges, sidebar gradient). The backend and JavaScript business logic remain untouched.

**Key decisions from spec clarifications**:
- Visual style: Material Design 3 (Material You)
- Primary color: Deep Indigo (#3F51B5)
- Sidebar: Gradient (deep to light)
- Skeleton loading: List pages only
- Log viewer: Dark/light mode toggle (default dark)

## Technical Context

**Language/Version**: Go 1.25.4 (backend unchanged), HTML/CSS/JavaScript (frontend)

**Primary Dependencies**: Layui v2.13.3, jQuery 1.11.3 / jQuery.min.js, ECharts, xterm.js, CodeMirror (all retained, styled via CSS overrides)

**Storage**: N/A (frontend-only changes)

**Testing**: Manual testing via web UI (no automated test suite exists)

**Target Platform**: Desktop browsers at 1280px+ width (Chrome, Firefox, Edge)

**Project Type**: Web application — server-rendered HTML with Beego v2 backend

**Performance Goals**: Pages load with consistent styling, skeleton screens appear within 300ms, interactive feedback within 200ms

**Constraints**:
- Must retain Layui v2.13.3 (no framework replacement)
- Must not modify backend APIs or Go code unless strictly necessary
- Must not modify vendored libraries in `views/front/lib/`, `views/front/monaco-editor/`, `views/front/js/lay-module/`, `views/front/page/wiki/editor/`
- Template delimiters are `<<<` `>>>` (not `{{` `}}`)
- Zero test coverage — all changes must be manually verified

**Scale/Scope**: ~150+ HTML pages across views/front/page/ (xkube, cicd, rbac, wiki, app subdirectories) plus login pages and main layout

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ PASS | CSS overrides + selective HTML updates. No framework replacement, no SPA rewrite. |
| II. Surgical Changes | ✅ PASS | Only CSS files and HTML templates touched. No Go code changes. Each change traces to a user story. |
| III. Multi-Cluster Safety | ✅ N/A | Frontend-only changes. No K8s operations involved. |
| IV. RBAC Enforcement | ✅ N/A | No new API endpoints. Existing RBAC unaffected. |
| V. Backward Compatibility | ✅ PASS | No API changes, no route changes. Visual-only upgrades preserve existing HTML structure and JS hooks. |

**GATE RESULT**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-ux-promax-upgrade/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CSS design system contract)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
views/front/
├── css/
│   ├── public.css           # Existing — will be enhanced with design system tokens
│   ├── material-theme.css   # NEW — Material Design 3 theme overrides
│   └── skeleton.css         # NEW — Skeleton loading animations
├── js/
│   └── xkube.js             # Existing — may need minor additions for dark mode toggle
├── page/
│   ├── xkube/               # ~120+ HTML files — K8s resource pages
│   ├── cicd/                # ~10 HTML files — CI/CD pages
│   ├── rbac/                # ~15 HTML files — RBAC admin pages
│   ├── wiki/                # ~6 HTML files + editor library
│   └── app/                 # ~2 HTML files — pod terminal
├── login_code.html          # Login page
├── login_telcode.html       # Tel login page
└── xkube_index.html         # Main layout with sidebar
```

**Structure Decision**: Single frontend directory. All changes are CSS-first with selective HTML template updates. No new directories needed except for the design system CSS file.

## Complexity Tracking

No constitution violations to justify. All changes are CSS overrides and selective HTML template modifications — the simplest approach that achieves the goal.

# Implementation Plan: Rebrand xkube to mrboard

**Branch**: `003-rebrand-to-mrboard` | **Date**: 2026-06-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-rebrand-to-mrboard/spec.md`

## Summary

Replace all user-visible "xkube" branding with "mrboard" across login pages, main layout, download page, and application configuration. Internal API routes, file names, and database names remain unchanged for backward compatibility.

## Technical Context

**Language/Version**: Go 1.25.4, Beego v2

**Primary Dependencies**: Layui v2.13.3, jQuery (frontend), Beego (backend)

**Storage**: MySQL 8.0 (config changes only, no schema changes)

**Testing**: Manual browser verification (no automated test suite)

**Target Platform**: Linux server, web browsers

**Project Type**: web-service

**Performance Goals**: N/A (text replacement has no performance impact)

**Constraints**: API routes (`/xkube/...`), JS filenames, DB names must remain unchanged

**Scale/Scope**: ~6 HTML files + 1 config file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Simplicity First | ✅ PASS | Text-only replacement, no abstractions |
| II. Surgical Changes | ✅ PASS | Only branding strings touched, nothing else |
| III. Multi-Cluster Safety | ✅ N/A | No K8s operations involved |
| IV. RBAC Enforcement | ✅ N/A | No API endpoints changed |
| V. Backward Compatibility | ✅ PASS | API routes, filenames, DB names preserved |

## Project Structure

### Documentation (this feature)

```text
specs/003-rebrand-to-mrboard/
├── plan.md              # This file
├── research.md          # Where xkube appears + logo decision
├── data-model.md        # Branding text entities + config values
├── quickstart.md        # Manual verification checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (files to modify)

```text
views/front/
├── login_code.html          # Login header text
├── login_telcode.html       # Tel login header text
├── xkube_index.html         # Page title + logo area
└── page/
    └── appDown.html         # Download page title + body text

conf/
└── app.conf                 # appname, SignName, domain

views/front/css/
└── material-theme.css       # Logo text via CSS ::after (if needed)
```

**Structure Decision**: Direct file edits — no new files or directories needed. Each file change is independent and can be done in any order.

## Implementation Approach

### Step 1: HTML Text Replacement
Replace "xkube" with "mrboard" in user-visible text across:
- `login_code.html` — header text
- `login_telcode.html` — header text
- `xkube_index.html` — `<title>` tag
- `appDown.html` — title and body text

### Step 2: Sidebar Logo
Add "mrboard" text to the `.layuimini-logo` div in `xkube_index.html`, either:
- Direct HTML text inside the div, OR
- CSS `::after` content rule in `material-theme.css`

### Step 3: Configuration Updates
Update `conf/app.conf`:
- `appname = mrboard`
- `SignName = "mrboard"`
- `domain = https://mrboard-demo.eeenet.net`

### Step 4: Verification
- `go build main.go` — verify compilation
- Manual browser check — login page, dashboard, download page
- Grep for remaining "xkube" in user-visible locations

## Complexity Tracking

No violations — all changes are simple text replacements with no architectural impact.

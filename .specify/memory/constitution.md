<!-- Sync Impact Report
Version change: 0.0.0 (template) → 1.0.0
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (5 principles)
  - Technical Constraints
  - Development Workflow
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check section exists)
  - .specify/templates/spec-template.md ✅ compatible (requirements section exists)
  - .specify/templates/tasks-template.md ✅ compatible (task categorization works)
Follow-up TODOs: none
-->

# xkube Constitution

## Core Principles

### I. Simplicity First

Every change MUST use the minimum code that solves the problem.
No speculative features, no premature abstractions, no
"flexibility" that was not requested. If a 200-line solution
could be 50 lines, rewrite it. Ask: "Would a senior engineer
say this is overcomplicated?" If yes, simplify.

**Rationale**: The codebase already has files exceeding 50KB
(deploy_model.go, deploy.go). Uncontrolled growth makes
maintenance impossible.

### II. Surgical Changes

When editing existing code, touch only what the task requires.
Do not "improve" adjacent code, comments, or formatting.
Do not refactor things that are not broken. Match existing
style even if you would do it differently. Every changed line
MUST trace directly to the user's request.

When your changes create orphans (unused imports, variables,
functions), remove them. Do not remove pre-existing dead code
unless explicitly asked.

**Rationale**: Large diffs increase review burden and introduce
regression risk. The project has zero test coverage, so every
unnecessary change is an untested change.

### III. Multi-Cluster Safety

All Kubernetes operations MUST be scoped to a specific cluster
ID. No operation may assume a single-cluster context. K8s
clients MUST be created per-request via
`common.ClientSet(clusterid)` — never cached globally.

When performing destructive operations (delete, drain, modify),
the cluster ID and resource name MUST be validated before
execution.

**Rationale**: xkube manages multiple K8s clusters
simultaneously. A missing or wrong cluster ID could destroy
resources in the wrong cluster.

### IV. RBAC Enforcement

Every API endpoint MUST either:
- Be listed in `not_auth_package` (public endpoints), OR
- Pass through the RBAC middleware in `xadmin/src/rbac.go`

New features MUST define corresponding RBAC permission nodes
so administrators can control access. No endpoint may bypass
authentication without being explicitly added to
`not_auth_package` in `conf/app.conf`.

**Rationale**: xkube is a multi-user platform with role-based
access control. Bypassing RBAC exposes cluster operations to
unauthorized users.

### V. Backward Compatibility

API changes MUST not break existing clients. When modifying
routes in `routers/router.go`:
- Do not change existing URL paths — add new ones instead
- Do not change JSON response field names — add new fields
- Version new endpoints (v1, v2) when behavior changes

Database schema changes MUST be additive (new columns/tables).
Do not drop or rename existing columns without a migration plan.

**Rationale**: Mobile apps (xkubeApp), Aliyun DevOps plugins,
and Jenkins integrations depend on stable API contracts.

## Technical Constraints

- **Language**: Go 1.25.4 with Beego v2 web framework
- **Database**: MySQL 8.0 via Beego ORM — raw SQL is acceptable
  for complex queries
- **Cache/Sessions**: Redis — sessions stored in Redis, not
  in-memory
- **K8s Client**: client-go v0.34.1 — typed clientset preferred
  over dynamic client for type safety
- **Frontend**: Server-rendered HTML with Layui and jQuery —
  NOT a SPA; each page is standalone
- **Template Delimiters**: `<<<` and `>>>` (not default `{{`
  `}}`)
- **Comments**: Chinese is the primary comment language;
  bilingual comments for public APIs
- **Vendored Libraries**: Do not modify files in
  `views/front/lib/`, `views/front/monaco-editor/`,
  `views/front/js/lay-module/`, or `views/front/page/wiki/editor/`

## Development Workflow

1. **Before coding**: State assumptions. If uncertain, ask.
   If multiple interpretations exist, present them.
2. **During coding**: Match existing code style. Use the same
   patterns (controller → model → K8s client).
3. **After coding**: Run `go build main.go` to verify
   compilation. There is no automated test suite — manual
   testing via the web UI is required.
4. **Commit messages**: Use concise English or Chinese
   describing WHAT changed and WHY.

## Governance

This constitution governs all development on the xkube project.
It supersedes conflicting guidance in individual files.

**Amendment process**:
1. Propose the change with rationale
2. Update this file with the new version
3. Propagate changes to dependent templates (plan, spec, tasks)
4. Commit with message: `docs: amend constitution to vX.Y.Z`

**Versioning**: MAJOR for principle removals/redefinitions,
MINOR for new principles or material expansions, PATCH for
clarifications and wording fixes.

**Compliance**: All PRs and code reviews MUST verify adherence
to these principles. Violations MUST be justified in the plan's
Complexity Tracking section.

**Version**: 1.0.0 | **Ratified**: 2026-06-01 | **Last Amended**: 2026-06-01

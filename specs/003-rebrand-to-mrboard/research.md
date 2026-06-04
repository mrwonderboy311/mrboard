# Research: Rebrand xkube to mrboard

## R1: Where does "xkube" appear as user-facing branding?

**Decision**: Found in the following locations:

| File | Location | Current Text | Replacement |
|------|----------|--------------|-------------|
| `views/front/login_code.html` | Login header | `xkube后台登录` | `mrboard` |
| `views/front/login_telcode.html` | Login header | `xkube后台登录` | `mrboard` |
| `views/front/xkube_index.html` | `<title>` | `xkube-k8s集群管理平台` | `mrboard` |
| `views/front/xkube_index.html` | Logo div | `.layuimini-logo` (shows via CSS) | Add "mrboard" text |
| `views/front/page/appDown.html` | `<title>` | `xkube - 移动k8s多集群管理助手` | `mrboard` |
| `views/front/page/appDown.html` | Body text | References "xkube" | Replace with "mrboard" |
| `conf/app.conf` | `appname` | `xkube` | `mrboard` |
| `conf/app.conf` | `SignName` | `xkube助手` | `mrboard` |
| `conf/app.conf` | `domain` | `xkube-demo.eeenet.net` | `mrboard-demo.eeenet.net` |

**Rationale**: Only user-visible text needs changing. API routes (`/xkube/...`), JS filenames (`xkube.js`), and DB names (`db_xkube`) are internal and out of scope per the spec.

**Alternatives considered**: Full rename of all references including routes — rejected due to massive scope, risk of breaking integrations, and spec explicitly excludes these.

## R2: How to display "mrboard" in the sidebar logo area?

**Decision**: Add "mrboard" text inside the existing `.layuimini-logo` div via CSS `::after` content or direct HTML text.

**Rationale**: The div already exists and is styled. Adding text is the simplest approach — no image assets needed.

**Alternatives considered**: SVG logo, PNG image — rejected as overkill for a text rebrand.

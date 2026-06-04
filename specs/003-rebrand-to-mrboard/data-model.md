# Data Model: Rebrand xkube to mrboard

## Entities

### Branding Text

User-visible strings that contain the product name.

| Location | Type | Current Value | New Value |
|----------|------|---------------|-----------|
| Login page header | HTML text | `xkube后台登录` | `mrboard` |
| Browser tab title | HTML `<title>` | `xkube-k8s集群管理平台` | `mrboard` |
| Sidebar logo | HTML/CSS text | (empty div) | `mrboard` |
| Download page title | HTML `<title>` | `xkube - 移动k8s多集群管理助手` | `mrboard` |
| Download page body | HTML text | References "xkube" | References "mrboard" |

### Configuration Values

App config fields that reference the brand name.

| Field | File | Current Value | New Value |
|-------|------|---------------|-----------|
| `appname` | `conf/app.conf` | `xkube` | `mrboard` |
| `SignName` | `conf/app.conf` | `xkube助手` | `mrboard` |
| `domain` | `conf/app.conf` | `xkube-demo.eeenet.net` | `mrboard-demo.eeenet.net` |

## Relationships

- All branding text changes are independent — no ordering dependencies
- Config changes are independent of HTML changes
- No schema changes, no new tables, no migrations needed

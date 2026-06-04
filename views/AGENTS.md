<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-01 | Updated: 2026-06-01 -->

# views

## Purpose
Frontend static assets and HTML templates. Beego serves the `front/` subdirectory as the static root. Contains the complete web UI built with jQuery, Layui, and server-rendered HTML.

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `front/` | All frontend assets — HTML pages, JavaScript, CSS, images, vendored libraries (see `front/AGENTS.md`) |

## For AI Agents

### Working In This Directory
- Beego serves `views/front/` as the static file root (`beego.SetStaticPath("/", "views/front")`)
- Template delimiters are `<<<` and `>>>` (configured in `app.conf`)
- The frontend is NOT a SPA — each page is a standalone HTML file that loads shared JS/CSS
- Page URLs map directly to HTML files under `front/page/`

### Common Patterns
- All vendored libraries (Layui, Monaco Editor, Font Awesome, CodeMirror, etc.) are in `front/lib/` and `front/` subdirectories
- Do not modify vendored library files — they are third-party assets

<!-- MANUAL: -->

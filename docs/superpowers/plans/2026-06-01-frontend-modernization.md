# Frontend UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 3 conflicting CSS themes with a single modern `app-theme.css` and update the main layout + login pages.

**Architecture:** Single CSS file overrides all Layui components. HTML changes limited to `xkube_index.html` and 2 login pages. 355 iframe pages get new theme via batch CSS link replacement.

**Tech Stack:** CSS Custom Properties, Layui v2.13.3, layuimini, Beego templates

---

## File Map

| File | Action |
|------|--------|
| `views/front/css/app-theme.css` | **CREATE** — unified theme (~500 lines) |
| `views/front/xkube_index.html` | **MODIFY** — CSS refs + layout tweaks |
| `views/front/login_code.html` | **MODIFY** — modern login card |
| `views/front/login_telcode.html` | **MODIFY** — modern login card |
| `views/front/page/**/*.html` | **MODIFY** — batch CSS link replacement |

---

### Task 1: Create app-theme.css — Tokens, Base, Tables, Forms, Buttons

**Files:**
- Create: `views/front/css/app-theme.css`

- [ ] **Step 1: Create app-theme.css with design tokens and base styles**

```css
/* ============================================
   app-theme.css — Unified Modern Theme
   Replaces: default.css, material-theme.css, modern-theme.css
   ============================================ */

/* --- Design Tokens --- */
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-primary-active: #1d4ed8;
  --color-primary-light: rgba(59, 130, 246, 0.1);
  --color-success: #22c55e;
  --color-success-light: rgba(34, 197, 94, 0.1);
  --color-warning: #f59e0b;
  --color-warning-light: rgba(245, 158, 11, 0.1);
  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-danger-light: rgba(239, 68, 68, 0.1);
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-border-light: #f1f5f9;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-label: #374151;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif;
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* --- Base --- */
body {
  font-family: var(--font-family);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.25); }
```

- [ ] **Step 2: Add table overrides to app-theme.css**

Append to `views/front/css/app-theme.css`:

```css
/* --- Tables --- */
.layui-table {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.layui-table th {
  background-color: var(--color-bg) !important;
  font-weight: 600;
  color: var(--color-text-label);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  padding: 10px 12px;
  border-bottom: 2px solid var(--color-border);
}
.layui-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text);
  font-size: 14px;
}
.layui-table tr:nth-child(even) { background-color: var(--color-bg); }
.layui-table tr:hover td { background-color: #eff6ff !important; }
.layui-table-view {
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.layui-table-header { background-color: var(--color-bg); }
.layui-table-body tr:hover { background-color: #eff6ff; }
.layui-table-page {
  padding: 10px 12px;
  background-color: var(--color-bg);
  border-top: 1px solid var(--color-border);
}
.layui-table-tool { background-color: var(--color-bg); border-bottom: 1px solid var(--color-border); }
```

- [ ] **Step 3: Add form and button overrides to app-theme.css**

Append to `views/front/css/app-theme.css`:

```css
/* --- Forms --- */
.layui-input,
.layui-textarea,
.layui-select {
  height: 38px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-family);
  font-size: 14px;
  color: var(--color-text);
  background-color: var(--color-surface);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  box-sizing: border-box;
}
.layui-textarea { height: auto; min-height: 80px; resize: vertical; }
.layui-input:focus,
.layui-textarea:focus,
.layui-select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
  outline: none;
}
.layui-input::placeholder { color: var(--color-text-secondary); opacity: 0.7; }
.layui-input[readonly],
.layui-input[disabled] {
  background-color: var(--color-border-light);
  color: var(--color-text-secondary);
  cursor: not-allowed;
}
.layui-form-label {
  font-weight: 500;
  color: var(--color-text-label);
  font-size: 14px;
  padding: 8px 12px;
}
.layui-form-item { margin-bottom: 16px; }
.layui-form-pane .layui-form-label {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-right: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
}
.layui-form-pane .layui-input-inline {
  border: 1px solid var(--color-border);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  overflow: hidden;
}

/* --- Buttons --- */
.layui-btn {
  height: 38px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-family);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  line-height: 1;
  background-color: var(--color-primary);
  color: #fff;
}
.layui-btn:hover {
  background-color: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}
.layui-btn:active {
  background-color: var(--color-primary-active);
  transform: translateY(0);
}
.layui-btn-primary {
  background-color: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}
.layui-btn-primary:hover {
  background-color: var(--color-primary-light);
  color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}
.layui-btn-danger { background-color: var(--color-danger); color: #fff; }
.layui-btn-danger:hover { background-color: var(--color-danger-hover); }
.layui-btn-warm { background-color: var(--color-warning); color: #fff; }
.layui-btn-warm:hover { background-color: #d97706; }
.layui-btn-disabled,
.layui-btn[disabled] {
  background-color: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
.layui-btn-sm { height: 30px; padding: 0 12px; font-size: 13px; }
.layui-btn-xs { height: 24px; padding: 0 8px; font-size: 12px; }
.layui-border-blue { border-color: var(--color-primary) !important; color: var(--color-primary) !important; }
.layui-border-green { border-color: var(--color-success) !important; color: var(--color-success) !important; }
.layui-border-red { border-color: var(--color-danger) !important; color: var(--color-danger) !important; }
```

- [ ] **Step 4: Verify CSS syntax**

Run: `npx css-validator views/front/css/app-theme.css 2>&1 || echo "no validator, check manually"`
Expected: No syntax errors (or validator not installed, verify by reading file)

---

### Task 2: Add Modal, Tab, Pagination, Badge, Sidebar, Header Overrides

**Files:**
- Modify: `views/front/css/app-theme.css`

- [ ] **Step 1: Add modal (layer) overrides**

Append to `views/front/css/app-theme.css`:

```css
/* --- Modals --- */
.layui-layer {
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-lg) !important;
  overflow: hidden;
}
.layui-layer-title {
  font-weight: 600;
  font-size: 16px;
  color: var(--color-text);
  padding: 14px 20px !important;
  border-bottom: 1px solid var(--color-border);
}
.layui-layer-content { padding: 20px !important; }
.layui-layer-btn {
  padding: 10px 20px !important;
  border-top: 1px solid var(--color-border);
}
.layui-layer-btn a {
  border-radius: var(--radius-sm) !important;
  height: 34px;
  line-height: 34px;
  padding: 0 16px;
}
.layui-layer-btn0 {
  background-color: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
}
.layui-layer-setwin a { color: var(--color-text-secondary) !important; }
.layui-layer-setwin a:hover { color: var(--color-text) !important; }
```

- [ ] **Step 2: Add tab and pagination overrides**

Append to `views/front/css/app-theme.css`:

```css
/* --- Tabs --- */
.layui-tab-title li {
  transition: all var(--transition-fast);
  font-weight: 500;
}
.layui-tab-title li.layui-this { color: var(--color-primary); }
.layui-tab-title li.layui-this::after {
  background-color: var(--color-primary);
  height: 3px;
  border-radius: 3px 3px 0 0;
}

/* --- Pagination --- */
.layui-laypage a,
.layui-laypage span {
  border-radius: var(--radius-sm) !important;
  margin: 0 2px;
  font-size: 13px;
}
.layui-laypage .layui-laypage-curr em {
  background-color: var(--color-primary) !important;
  border-radius: var(--radius-sm) !important;
}
.layui-laypage a:hover { color: var(--color-primary) !important; }

/* --- Checkboxes & Radio --- */
.layui-form-checkbox i,
.layui-form-radio i {
  font-size: 16px;
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}
.layui-form-checkbox:hover i,
.layui-form-radio:hover i { color: var(--color-primary); }
.layui-form-checkboxed i,
.layui-form-radioed i { color: var(--color-primary) !important; }
```

- [ ] **Step 3: Add status badge styles**

Append to `views/front/css/app-theme.css`:

```css
/* --- Status Badges --- */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
  text-align: center;
  white-space: nowrap;
}
.status-running, .status-active, .status-ready,
.status-available, .status-bound, .status-succeeded, .status-completed {
  background-color: var(--color-success-light);
  color: #15803d;
}
.status-pending, .status-creating, .status-waiting, .status-containercreating {
  background-color: var(--color-warning-light);
  color: #b45309;
}
.status-error, .status-failed, .status-crashloop, .status-crashloopbackoff,
.status-terminated, .status-oomkilled, .status-imagepullbackoff, .status-errimagepull {
  background-color: var(--color-danger-light);
  color: #b91c1c;
}
.status-unknown {
  background-color: rgba(100, 116, 139, 0.1);
  color: #475569;
}
```

- [ ] **Step 4: Add sidebar and header overrides**

Append to `views/front/css/app-theme.css`:

```css
/* --- Sidebar --- */
.layui-side.layui-bg-black,
.layui-side.layui-bg-black > .layuimini-menu-left > ul,
.layuimini-menu-left-zoom > ul {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%) !important;
}
.layuimini-menu-left .layui-nav,
.layuimini-menu-left-zoom .layui-nav {
  background: transparent !important;
}
.layuimini-menu-left .layui-nav .layui-nav-item a,
.layuimini-menu-left-zoom .layui-nav .layui-nav-item a {
  color: #94a3b8 !important;
  transition: color var(--transition-fast), background-color var(--transition-fast);
  border-radius: var(--radius-sm);
  margin: 2px 8px;
  padding: 0 16px;
}
.layuimini-menu-left .layui-nav .layui-nav-item a:hover,
.layuimini-menu-left-zoom .layui-nav .layui-nav-item a:hover {
  color: #e2e8f0 !important;
  background-color: rgba(255, 255, 255, 0.05) !important;
}
.layuimini-menu-left .layui-nav .layui-this > a,
.layuimini-menu-left-zoom .layui-nav .layui-this > a {
  color: #fff !important;
  background-color: rgba(59, 130, 246, 0.2) !important;
  position: relative;
}
.layuimini-menu-left .layui-nav .layui-this > a::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}
.layuimini-menu-left .layui-nav .layui-nav-child,
.layuimini-menu-left-zoom .layui-nav .layui-nav-child {
  background: rgba(0, 0, 0, 0.15) !important;
}
.layuimini-menu-left .layui-nav .layui-nav-child a,
.layuimini-menu-left-zoom .layui-nav .layui-nav-child a {
  color: #94a3b8 !important;
  padding-left: 44px !important;
}
.layuimini-menu-left .layui-nav .layui-nav-child a:hover,
.layuimini-menu-left-zoom .layui-nav .layui-nav-child a:hover {
  color: #e2e8f0 !important;
  background: rgba(255, 255, 255, 0.05) !important;
}
.layuimini-menu-left .layui-nav .layui-nav-more { border-top-color: #64748b; }
.layuimini-menu-left .layui-nav .layui-nav-mored,
.layuimini-menu-left .layui-nav-itemed > a .layui-nav-more {
  border-color: transparent transparent #64748b !important;
}

/* --- Logo --- */
.layuimini-logo {
  font-weight: 700;
  font-size: 18px;
  color: #fff !important;
  letter-spacing: 0.025em;
}

/* --- Header --- */
.layui-layout-admin .layui-header {
  background-color: var(--color-surface) !important;
  box-shadow: var(--shadow-sm);
  border-bottom: 1px solid var(--color-border);
}
.layui-header .layuimini-header-content > ul > .layui-nav-item.layui-this,
.layuimini-tool i:hover {
  background-color: var(--color-bg) !important;
}
.layui-layout-admin .layui-header .layui-nav .layui-nav-item a {
  color: var(--color-text-secondary);
}
.layui-layout-admin .layui-header .layui-nav .layui-nav-item .layui-nav-child a {
  color: var(--color-text-secondary) !important;
}
.layui-header .layuimini-menu-header-pc.layui-nav .layui-nav-item a:hover,
.layui-header .layuimini-header-menu.layuimini-pc-show.layui-nav .layui-this a {
  color: var(--color-text) !important;
}
.layui-header .layui-nav .layui-nav-child dd.layui-this a,
.layui-header .layui-nav .layui-nav-child dd.layui-this,
.layui-layout-admin .layui-header .layui-nav .layui-nav-item .layui-nav-child .layui-this a {
  background-color: var(--color-primary) !important;
  color: #fff !important;
}
.layui-layout-admin .layui-header .layuimini-tool i { color: var(--color-text-secondary); }

/* --- Footer --- */
.layui-footer {
  background-color: var(--color-surface) !important;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

/* --- Body Content Area --- */
.layui-body { background-color: var(--color-bg); }
.layuimini-container { background-color: var(--color-bg); }

/* --- Transitions --- */
.layui-nav .layui-nav-item,
.layui-tab-title li,
.layui-collapse-item { transition: all var(--transition-fast); }
```

- [ ] **Step 5: Verify final file**

Run: `wc -l views/front/css/app-theme.css`
Expected: ~500 lines

---

### Task 3: Update xkube_index.html

**Files:**
- Modify: `views/front/xkube_index.html`

- [ ] **Step 1: Update CSS references in xkube_index.html**

Replace these 3 lines in `views/front/xkube_index.html`:
```html
    <link rel="stylesheet" href="css/themes/default.css" media="all">
```
```html
    <link rel="stylesheet" href="css/material-theme.css" media="all">
```
```html
    <link rel="stylesheet" href="css/modern-theme.css" media="all">
```

With this single line (place after `layuimini.css`):
```html
    <link rel="stylesheet" href="css/app-theme.css" media="all">
```

Also remove the Tailwind CDN and htmx scripts (lines 22-23) since they are unused:
```html
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
```

And remove the Tailwind config block (lines 25-40):
```html
    <script>
      tailwind.config = { ... }
    </script>
```

- [ ] **Step 2: Update footer style**

Replace in `views/front/xkube_index.html`:
```html
    <div class="layui-footer" style="text-align:right;background-color: #f2f2f2;">
```
With:
```html
    <div class="layui-footer" style="text-align:right;">
```

- [ ] **Step 3: Verify HTML is valid**

Run: `grep -c "app-theme.css" views/front/xkube_index.html`
Expected: 1

Run: `grep -c "material-theme.css\|modern-theme.css\|default.css" views/front/xkube_index.html`
Expected: 0

---

### Task 4: Update Login Pages

**Files:**
- Modify: `views/front/login_code.html`
- Modify: `views/front/login_telcode.html`

- [ ] **Step 1: Update login_code.html**

In `views/front/login_code.html`, find the CSS link:
```html
    <link rel="stylesheet" href="/css/material-theme.css" media="all">
```
Replace with:
```html
    <link rel="stylesheet" href="/css/app-theme.css" media="all">
```

Find the `<style>` block containing `.main-body` login styles and replace the entire `<style>` block with:
```html
    <style>
        body { margin: 0; min-height: 100vh; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif; }
        .login-card { max-width: 420px; width: 100%; background: #fff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 40px 36px 32px; }
        .login-card h2 { text-align: center; font-size: 22px; font-weight: 600; color: #1e293b; margin: 0 0 8px; }
        .login-card .subtitle { text-align: center; font-size: 14px; color: #64748b; margin-bottom: 28px; }
        .login-card .form-item { margin-bottom: 18px; }
        .login-card .form-item label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
        .login-card .form-item input { width: 100%; height: 44px; padding: 0 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #1e293b; box-sizing: border-box; transition: border-color 0.15s, box-shadow 0.15s; outline: none; }
        .login-card .form-item input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .login-card .form-item input::placeholder { color: #94a3b8; }
        .login-card .login-btn { width: 100%; height: 44px; background: #3b82f6; color: #fff; border: none; border-radius: 8px; font-size: 15px; font-weight: 500; cursor: pointer; transition: background 0.15s; margin-top: 8px; }
        .login-card .login-btn:hover { background: #2563eb; }
        .login-card .login-footer { text-align: center; margin-top: 20px; font-size: 13px; color: #94a3b8; }
        .login-card .login-footer a { color: #3b82f6; text-decoration: none; }
        .login-card .error-msg { color: #ef4444; font-size: 12px; margin-top: 4px; }
    </style>
```

Find the login form HTML body and replace it with a clean card layout:
```html
<body>
    <div class="login-card">
        <h2>mrboard</h2>
        <p class="subtitle">后台管理系统</p>
        <form class="layui-form" action="/public/login" method="post">
            <div class="form-item">
                <label>用户名</label>
                <input type="text" name="username" placeholder="请输入用户名" autocomplete="off" lay-verify="required">
            </div>
            <div class="form-item">
                <label>密码</label>
                <input type="password" name="password" placeholder="请输入密码" autocomplete="off" lay-verify="required">
            </div>
            <button type="submit" class="login-btn" lay-submit lay-filter="login">登 录</button>
        </form>
    </div>
</body>
```

Note: Preserve any Beego template variables (e.g., `<<<...>>>`) that exist in the original form. The exact form fields and action URL should match the original file — only the styling changes.

- [ ] **Step 2: Update login_telcode.html**

Apply the same CSS link replacement and login card styling as Step 1. The telcode login page has phone number + verification code fields instead — preserve those original form fields, only update the wrapper styling.

- [ ] **Step 3: Verify login pages**

Run: `grep -c "app-theme.css" views/front/login_code.html views/front/login_telcode.html`
Expected: 1 for each file

---

### Task 5: Batch-Replace CSS References in 355 HTML Files

**Files:**
- Modify: `views/front/page/**/*.html` (all iframe sub-pages)

- [ ] **Step 1: Replace material-theme.css with app-theme.css in all page files**

Run:
```bash
find views/front/page -name "*.html" -exec sed -i 's|material-theme\.css|app-theme.css|g' {} +
```

- [ ] **Step 2: Verify no remaining material-theme.css references in page files**

Run:
```bash
grep -rl "material-theme.css" views/front/page/ | wc -l
```
Expected: 0

- [ ] **Step 3: Verify app-theme.css references count**

Run:
```bash
grep -rl "app-theme.css" views/front/page/ | wc -l
```
Expected: ~350+

---

### Task 6: Build, Deploy, and Verify

- [ ] **Step 1: Build the Go binary**

Run:
```bash
go build -o xkube main.go
```
Expected: no errors

- [ ] **Step 2: Copy files to hostPath and restart pods**

Run:
```bash
# Scale down both deployments
kubectl scale deploy xkube -n xkube --replicas=0
kubectl scale deploy mrboard -n mrboard --replicas=0

# Wait for pods to terminate
kubectl wait pod -n xkube -l app=xkube --for=delete --timeout=30s
kubectl wait pod -n mrboard -l app=mrboard --for=delete --timeout=30s

# Copy new binary and views
cp xkube /opt/xkube/xkube
cp -r views /opt/xkube/

# Scale back up
kubectl scale deploy xkube -n xkube --replicas=1
kubectl scale deploy mrboard -n mrboard --replicas=1
```

- [ ] **Step 3: Wait for pods and verify health**

Run:
```bash
kubectl wait pod -n xkube -l app=xkube --for=condition=Ready --timeout=60s
kubectl wait pod -n mrboard -l app=mrboard --for=condition=Ready --timeout=60s
```

- [ ] **Step 4: Verify the theme is loaded**

Run:
```bash
curl -s http://10.0.0.130:30080/ | grep -o "app-theme.css"
```
Expected: `app-theme.css`

Run:
```bash
curl -s http://10.0.0.130:30080/ | grep -o "material-theme.css\|modern-theme.css\|default.css" | wc -l
```
Expected: 0

- [ ] **Step 5: Verify login page renders**

Run:
```bash
curl -s -H "Host: mrboard.xx-xx.xyz" http://10.0.0.130/public/login | grep -o "login-card"
```
Expected: `login-card`

---

## Self-Review Checklist

- [x] All design spec sections covered by tasks
- [x] No TBD/TODO placeholders
- [x] CSS variable names consistent across all tasks
- [x] File paths match spec
- [x] Batch replacement covers all 355 files
- [x] Login page preserves Beego template variables
- [x] Deployment reuses existing hostPath pattern

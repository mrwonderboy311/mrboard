# Quickstart: Rebrand xkube to mrboard

## Manual Verification Checklist

### 1. Login Page
- [ ] Open login page in browser
- [ ] Header text shows "mrboard" (not "xkube后台登录")
- [ ] No "xkube" text anywhere on the page

### 2. Main Dashboard
- [ ] After login, browser tab title shows "mrboard"
- [ ] Sidebar logo area shows "mrboard" text
- [ ] No "xkube" text in the sidebar header area

### 3. Download Page
- [ ] Open `page/appDown.html`
- [ ] Page title shows "mrboard"
- [ ] Body text references "mrboard" (not "xkube")

### 4. Configuration
- [ ] `conf/app.conf` has `appname = mrboard`
- [ ] `conf/app.conf` has `SignName = "mrboard"`
- [ ] `conf/app.conf` domain references "mrboard"

### 5. Build Verification
- [ ] `go build main.go` compiles successfully
- [ ] App starts without errors

### 6. Negative Check (out of scope)
- [ ] API routes like `/xkube/...` still work (unchanged)
- [ ] `xkube.js` filename unchanged
- [ ] Database name `db_xkube` unchanged

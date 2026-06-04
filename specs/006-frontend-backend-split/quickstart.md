# Quickstart: Frontend-Backend Separation

**Branch**: `006-frontend-backend-split` | **Date**: 2026-06-01

## Prerequisites

- Node.js 20+ and npm
- Go 1.25.4+
- MySQL 8.0 running at `localhost:3306`
- Redis running at `localhost:6379`

## Quick Start (Development)

### 1. Start the Backend

```bash
# From repo root
go build -o xkube main.go
./xkube
# Backend runs on http://localhost:8080
```

### 2. Start the Frontend

```bash
# From frontend directory
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
# API calls proxied to http://localhost:8080
```

### 3. Open Browser

Navigate to `http://localhost:5173` — the React app loads and proxies API calls to the Go backend.

## Production Build

### Frontend

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Backend

```bash
go build -o xkube main.go
```

### Deploy with Nginx

```nginx
server {
    listen 80;
    server_name xkube.example.com;

    # Frontend static files
    location / {
        root /var/www/xkube/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location ~ ^/(cluster|deploy|rbac|cicd|wiki|public|search|app|favorite)/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Project Structure

```
xkube/
├── frontend/              # React app (new)
│   ├── src/
│   │   ├── pages/         # 355 pages as React components
│   │   ├── components/    # shadcn/ui components
│   │   ├── layouts/       # MainLayout, AuthLayout
│   │   ├── hooks/         # useApi, useAuth
│   │   └── lib/           # API client, utils
│   ├── package.json
│   └── vite.config.ts
├── controllers/           # Go controllers (modified: JSON-only)
├── models/                # Go models (unchanged)
├── routers/               # Go routes (unchanged)
└── deploy/                # K8s + Nginx configs
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot-reload |
| `npm run build` | Production build (output: `dist/`) |
| `npm run lint` | Run ESLint |
| `go build main.go` | Build Go backend |
| `go run main.go` | Run Go backend (dev mode) |

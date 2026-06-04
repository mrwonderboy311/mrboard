# API Contract: Frontend-Backend Separation

**Branch**: `006-frontend-backend-split` | **Date**: 2026-06-01

## Overview

All existing API paths are preserved. The contract documents the expected JSON response format for endpoints that previously rendered HTML templates.

## Authentication

All endpoints (except `/public/*`) require a valid session Cookie (`BsessionId`).

**Login**: `POST /public/login`
- Request: `{username: string, password: string}`
- Response (success): `{code: 0, msg: "ok", data: {username: string, role: string}}`
- Response (failure): `{code: -1, msg: "用户名或密码错误"}`
- Side effect: Sets `BsessionId` Cookie

**Logout**: `GET /public/logout`
- Response: `{code: 0, msg: "ok"}`
- Side effect: Clears session

**Session Check**: `GET /public/check`
- Response: `{code: 0, msg: "ok"}` (authenticated) or 401 (expired)

## Response Format Convention

All API responses follow this structure:

```json
{
  "code": 0,
  "msg": "success message",
  "data": { ... }
}
```

- `code: 0` = success
- `code: -1` = error
- `data` = payload (object, array, or null)

## Module Endpoints (existing paths preserved)

### Cluster Management
| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| GET | `/cluster/list` | List all clusters | `Array<Cluster>` |
| GET | `/cluster/get` | Get cluster detail | `Cluster` |
| POST | `/cluster/add` | Add cluster | `{cluster_id: string}` |
| POST | `/cluster/edit` | Update cluster | `{}` |
| POST | `/cluster/delete` | Delete cluster | `{}` |

### Deployments
| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| GET | `/deploy/list` | List deployments | `Array<Deployment>` |
| GET | `/deploy/get` | Get deployment detail | `Deployment` |
| POST | `/deploy/scale` | Scale deployment | `{}` |
| POST | `/deploy/restart` | Restart deployment | `{}` |

### RBAC
| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| GET | `/rbac/adminList` | List admins | `Array<User>` |
| GET | `/rbac/roleList` | List roles | `Array<Role>` |
| POST | `/rbac/adminAdd` | Add admin | `{}` |
| POST | `/rbac/adminEdit` | Edit admin | `{}` |

### CI/CD
| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| GET | `/cicd/list` | List pipelines | `Array<Pipeline>` |
| GET | `/cicd/detail` | Pipeline detail | `Pipeline` |
| POST | `/cicd/run` | Trigger pipeline | `{}` |

### Wiki
| Method | Path | Description | Response Data |
|--------|------|-------------|---------------|
| GET | `/wiki/list` | List articles | `Array<Article>` |
| GET | `/wiki/detail` | Article detail | `Article` |
| POST | `/wiki/add` | Create article | `{}` |
| POST | `/wiki/edit` | Edit article | `{}` |

## WebSocket Endpoints

| Path | Description |
|------|-------------|
| `/ws/exec` | Terminal exec into pod |
| `/ws/log` | Log streaming |
| `/ws/attach` | Pod attach |

WebSocket connections use standard upgrade handshake. Proxy via Nginx with `Upgrade` headers.

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| 0 | 200 | Success |
| -1 | 400 | Bad request / validation error |
| -1 | 401 | Unauthorized / session expired |
| -1 | 403 | Forbidden (RBAC denied) |
| -1 | 404 | Resource not found |
| -1 | 500 | Internal server error |

# Data Model: Frontend-Backend Separation

**Branch**: `006-frontend-backend-split` | **Date**: 2026-06-01

## Overview

This feature does not introduce new database entities. The data model changes are limited to the API response format — controllers that previously injected data into Beego templates will now return the same data as JSON.

## API Response Entities

### Cluster

Existing entity from `models/cluster_model.go`. API returns cluster list/details.

| Field | Type | Description |
|-------|------|-------------|
| cluster_id | string | Unique cluster identifier |
| cluster_name | string | Display name |
| cluster_type | string | Cluster type (e.g., ACK, TKE) |
| api_server | string | K8s API server URL |
| status | string | Connection status |
| prometheus_url | string | Prometheus endpoint |
| loki_url | string | Loki endpoint |
| tempo_url | string | Tempo endpoint |

### Deployment

Existing entity from `models/deploy_model.go`.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Deployment name |
| namespace | string | K8s namespace |
| replicas | int | Desired replicas |
| available | int | Available replicas |
| images | []string | Container images |
| labels | map[string]string | K8s labels |

### User/RBAC

Existing entity from RBAC models.

| Field | Type | Description |
|-------|------|-------------|
| username | string | Login username |
| role | string | Assigned role |
| permissions | []string | RBAC permission nodes |

### CI/CD Pipeline

Existing entity from `models/cicd_model.go`.

| Field | Type | Description |
|-------|------|-------------|
| pipeline_id | string | Pipeline identifier |
| name | string | Pipeline name |
| status | string | Running/success/failed |
| stages | []Stage | Pipeline stages |

## Frontend State Entities

### AuthState

Managed by React context/hook.

| Field | Type | Description |
|-------|------|-------------|
| isAuthenticated | boolean | Login status |
| user | User \| null | Current user info |
| loading | boolean | Session check in progress |

### ApiResponse\<T\>

Generic API response wrapper.

| Field | Type | Description |
|-------|------|-------------|
| data | T | Response payload |
| msg | string | Status message |
| code | number | Status code (0 = success) |

## No Schema Changes

MySQL schema remains unchanged per assumptions. This is an architecture split, not a data migration.

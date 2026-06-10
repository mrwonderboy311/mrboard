# Helm Chart Management Design

**Date:** 2026-06-10
**Status:** Approved
**Author:** Claude (brainstorming session)

## Overview

Add Helm chart management functionality to the mrboard Kubernetes dashboard. Users can view installed Helm releases, install new charts from various sources, view and edit values.yaml, upgrade releases, and manage Helm repositories.

## Requirements

### Core Operations
1. **List installed releases** - view what's currently deployed
2. **Install new chart** - from Helm repository with values configuration
3. **View/Edit values** - load and modify values.yaml for a release
4. **Upgrade release** - update chart version or values
5. **Uninstall release** - remove a deployment

### Chart Sources
- Pre-configured Helm repositories
- Custom repository URLs
- OCI image repositories
- Local chart uploads

### Values Management
- View default values from chart
- View current values of a release
- Edit values with full overlay strategy (replace entire values.yaml)
- No version history (K8s revision history sufficient)

### Repository Management
- Frontend CRUD operations for Helm repositories
- Support HTTP and OCI repository types

### Constraints
- Single cluster support (no multi-cluster)
- Follow existing UI patterns (List → Detail → Values edit)

## Architecture

### Approach: Helm SDK Direct Integration

Use `helm.sh/helm/v3` SDK directly in the Go backend, consistent with existing architecture (direct K8s client-go integration). No additional infrastructure dependencies.

### Backend Structure

**Controllers:**
- `controllers/helm.go` - Helm release operations
- `controllers/helm_repo.go` - Helm repository management

**Models:**
- `models/helm.go` - Helm-related data models

**API Pattern:**
- Release: `/mrboard/helm/v1/{Action}`
- Repository: `/mrboard/helmrepo/v1/{Action}`

### Frontend Structure

**Pages:**
- `pages/k8s/HelmReleaseList.tsx` - release list page
- `pages/k8s/HelmReleaseDetail.tsx` - release detail page
- `pages/k8s/HelmReleaseValues.tsx` - values edit page
- `pages/k8s/HelmRepoList.tsx` - repository list page
- `pages/k8s/HelmRepoForm.tsx` - repository add/edit form

**Routes:**
- `/helm/releases` - HelmReleaseList
- `/helm/releases/:name` - HelmReleaseDetail
- `/helm/releases/:name/values` - HelmReleaseValues
- `/helm/repos` - HelmRepoList
- `/helm/repos/add` - HelmRepoForm
- `/helm/repos/:name/edit` - HelmRepoForm

## Backend Design

### HelmController

Endpoints for Helm release operations:

| Action | Method | Description |
|--------|--------|-------------|
| `List` | GET | List all releases in the cluster |
| `Get` | GET | Get release details |
| `Install` | POST | Install a new chart |
| `Upgrade` | POST | Upgrade an existing release |
| `Uninstall` | POST | Uninstall a release |
| `GetValues` | GET | Get current values of a release |
| `GetDefaultValues` | GET | Get default values from chart |
| `UpdateValues` | POST | Update values and upgrade release |

### HelmRepoController

Endpoints for repository management:

| Action | Method | Description |
|--------|--------|-------------|
| `List` | GET | List all repositories |
| `Add` | POST | Add a new repository |
| `Update` | POST | Update repository configuration |
| `Delete` | POST | Delete a repository |
| `SearchCharts` | GET | Search charts in repositories |

### Data Models

**HelmRelease:**
```go
type HelmRelease struct {
    Name      string `json:"name"`
    Namespace string `json:"namespace"`
    Chart     string `json:"chart"`
    Version   string `json:"version"`
    Status    string `json:"status"`
    Values    string `json:"values"`
    Updated   string `json:"updated"`
}
```

**HelmRepo:**
```go
type HelmRepo struct {
    Name        string `json:"name"`
    URL         string `json:"url"`
    Type        string `json:"type"` // "http" or "oci"
    Credentials string `json:"credentials,omitempty"`
}
```

**HelmChart:**
```go
type HelmChart struct {
    Name        string `json:"name"`
    Version     string `json:"version"`
    Description string `json:"description"`
    AppVersion  string `json:"appVersion"`
}
```

## Frontend Design

### Pages

**HelmReleaseList.tsx:**
- DataTable displaying releases
- Columns: Name, Namespace, Chart, Version, Status, Updated
- Actions: View Details, Uninstall
- Button: Install New Chart

**HelmReleaseDetail.tsx:**
- Release details display
- Current values (read-only)
- Actions: Edit Values, Upgrade, Uninstall

**HelmReleaseValues.tsx:**
- Code editor for values.yaml
- Save and Apply button

**HelmRepoList.tsx:**
- DataTable displaying repositories
- Columns: Name, URL, Type
- Actions: Edit, Delete
- Button: Add Repository

**HelmRepoForm.tsx:**
- Form fields: Name, URL, Type (http/oci), Credentials
- Save button

### Reusable Components
- DataTable, PageHeader, ConfirmDialog, StatusBadge (existing)
- CodeEditor (new, for values.yaml editing)

## Data Flow

### Install Flow
1. User selects chart source:
   - From repository: select chart and version from search results
   - Local upload: upload .tgz chart package
2. User configures values (optional)
3. Frontend calls `/mrboard/helm/v1/Install`
4. Backend uses Helm SDK to install chart
5. Returns success/failure
6. Frontend redirects to release list

### Values Edit Flow
1. User clicks "Edit Values" on release detail page
2. Frontend calls `GetValues` to get current values
3. User edits values in code editor (full overlay - replaces entire values.yaml)
4. User clicks "Save"
5. Frontend calls `UpdateValues`
6. Backend replaces values and calls Helm SDK upgrade
7. Returns success/failure

### Upgrade Flow
1. User clicks "Upgrade"
2. User selects new chart version
3. Frontend calls `Upgrade`
4. Backend uses Helm SDK to upgrade release
5. Returns success/failure

### Uninstall Flow
1. User clicks "Uninstall"
2. Frontend shows confirmation dialog
3. User confirms
4. Frontend calls `Uninstall`
5. Backend uses Helm SDK to uninstall release
6. Returns success/failure

### Repository Management Flow
- Add/Edit/Delete repository → call corresponding API → update configuration → refresh list

## Error Handling

### Helm Operation Errors
- Chart not found → 404 error with message
- Invalid values.yaml → 400 error with validation details
- Installation/Upgrade/Uninstall failed → 500 error with Helm SDK error message

### Repository Errors
- Repository not found → 404 error
- Invalid URL → 400 error
- Connection failed → 500 error
- Authentication failed → 401 error

### Validation Rules
- Chart name: required, valid format
- Version: valid semver format
- Values: valid YAML format
- Repository URL: valid URL format

### Frontend Error Handling
- Toast notifications for error messages
- Inline validation errors in forms
- Graceful network error handling

### Backend Error Handling
- Wrap Helm SDK calls in try-catch
- Log errors for debugging
- Return structured error responses

## Dependencies

### Backend
- `helm.sh/helm/v3` SDK (new)
- `k8s.io/client-go` (existing)

### Frontend
- Code editor component (new, e.g., Monaco Editor or CodeMirror)
- Existing shadcn/ui components (existing)

## Implementation Order

1. Backend: Helm repository management (CRUD)
2. Backend: Helm release operations (list, get, install, upgrade, uninstall)
3. Backend: Values management (get, update)
4. Frontend: Repository management pages
5. Frontend: Release list and detail pages
6. Frontend: Values edit page
7. Integration testing

# Frontend Phase 2: List Pages Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all K8s list pages to use shared components (PageHeader, DataTable, StatusBadge, EmptyState) with consistent loading/empty states and frontend pagination.

**Architecture:** Each list page is refactored to use `DataTable` for display, `PageHeader` for title, `StatusBadge` for status columns. Frontend pagination is added initially (backend pagination requires K8s API changes and will be Phase 2b). The pattern is identical across all list pages — change one, apply to all.

**Tech Stack:** React 18, TypeScript, shadcn/ui, shared components from Phase 1

---

## Pattern: List Page Transformation

Every list page follows the same transformation pattern:

**Before (current pattern):**
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function XxxList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  // ... fetch logic
  return (
    <div className="p-4">
      <h1>标题</h1>
      {loading ? <div>加载中...</div> : items.length === 0 ? <div>暂无数据</div> : (
        <Table>...</Table>
      )}
    </div>
  )
}
```

**After (target pattern):**
```tsx
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'

export default function XxxList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  // ... fetch logic (unchanged)
  const columns: Column<SomeType>[] = [
    { key: 'name', header: '名称', render: (item) => item.name },
    { key: 'status', header: '状态', render: (item) => <StatusBadge status={item.status} /> },
    // ...
  ]
  const paged = items.slice((page-1)*20, page*20)
  return (
    <div className="p-4">
      <PageHeader title="标题" description="描述">
        <Button>创建</Button>
      </PageHeader>
      <DataTable columns={columns} data={paged} loading={loading}
        pagination={{ page, limit: 20, total: items.length }}
        onPageChange={setPage} emptyMessage="暂无数据"
        onRowClick={(item) => navigate(...)} />
    </div>
  )
}
```

---

## Task 1: Transform DeployList

**Files:**
- Modify: `frontend/src/pages/deploy/DeployList.tsx`

This is the reference implementation. All other list pages follow the same pattern.

**Steps:**

- [ ] **Step 1: Read current DeployList.tsx to understand its full structure**

Read `frontend/src/pages/deploy/DeployList.tsx` completely.

- [ ] **Step 2: Refactor DeployList to use shared components**

Replace the import section at the top:

```tsx
// REMOVE these imports:
// import { Badge } from '@/components/ui/badge'
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// ADD these imports:
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
```

Add pagination state after existing state:

```tsx
const [page, setPage] = useState(1)
```

Replace the table rendering section. Find the `<Table>` block and replace with:

```tsx
const columns: Column<DeployListItem>[] = [
  { key: 'name', header: '名称', render: (d) => <span className="font-medium">{d.name}</span> },
  { key: 'namespace', header: '命名空间', render: (d) => d.namespace },
  { key: 'ready', header: '就绪', render: (d) => `${d.ready_replicas || 0}/${d.replicas || 0}` },
  { key: 'status', header: '状态', render: (d) => <StatusBadge status={d.available_replicas > 0 ? 'Running' : 'Pending'} /> },
  { key: 'images', header: '镜像', render: (d) => <span className="text-xs truncate max-w-[200px] block">{d.images || '-'}</span> },
  { key: 'age', header: '创建时间', render: (d) => d.create_time || '-' },
  { key: 'actions', header: '操作', className: 'text-right', render: (d) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/deploy/detail?clusterId=${clusterId}&namespace=${d.namespace}&name=${d.name}`) }}>
        <Eye size={14} />
      </Button>
      {/* ... other action buttons */}
    </div>
  )},
]

const paged = filtered.slice((page - 1) * 20, page * 20)
```

Replace the return JSX:

```tsx
return (
  <div className="p-4">
    <PageHeader title="无状态" description="Deployment 管理">
      <Button onClick={() => setCreateOpen(true)}>
        <Plus size={14} className="mr-1" />创建部署
      </Button>
    </PageHeader>

    {/* Keep existing filter bar (namespace select + search input) */}
    <div className="flex gap-2 mb-4">
      {/* ... existing filter controls */}
    </div>

    <DataTable
      columns={columns}
      data={paged}
      loading={loading}
      pagination={{ page, limit: 20, total: filtered.length }}
      onPageChange={setPage}
      emptyMessage="暂无 Deployment"
      onRowClick={(d) => navigate(`/deploy/detail?clusterId=${clusterId}&namespace=${d.namespace}&name=${d.name}`)}
    />

    {/* Keep existing dialogs (delete, restart, scale, create) */}
  </div>
)
```

- [ ] **Step 3: Verify build**

Run: `cd /root/mrboard/frontend && npm run build 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/deploy/DeployList.tsx
git commit -m "refactor(ui): transform DeployList to use shared components (PageHeader, DataTable, StatusBadge)"
```

---

## Task 2: Transform PodList

**Files:**
- Modify: `frontend/src/pages/k8s/PodList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern as DeployList**

Read `frontend/src/pages/k8s/PodList.tsx`, then apply the same transformation:
- Replace `Table` with `DataTable`
- Replace `Badge` with `StatusBadge`
- Add `PageHeader`
- Add pagination state
- Define columns array

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/PodList.tsx
git commit -m "refactor(ui): transform PodList to use shared components"
```

---

## Task 3: Transform NodeList

**Files:**
- Modify: `frontend/src/pages/k8s/NodeList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/NodeList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/NodeList.tsx
git commit -m "refactor(ui): transform NodeList to use shared components"
```

---

## Task 4: Transform NamespaceList

**Files:**
- Modify: `frontend/src/pages/k8s/NamespaceList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/NamespaceList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/NamespaceList.tsx
git commit -m "refactor(ui): transform NamespaceList to use shared components"
```

---

## Task 5: Transform ServiceList

**Files:**
- Modify: `frontend/src/pages/k8s/ServiceList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/ServiceList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/ServiceList.tsx
git commit -m "refactor(ui): transform ServiceList to use shared components"
```

---

## Task 6: Transform IngressList

**Files:**
- Modify: `frontend/src/pages/k8s/IngressList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/IngressList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/IngressList.tsx
git commit -m "refactor(ui): transform IngressList to use shared components"
```

---

## Task 7: Transform StatefulSetList

**Files:**
- Modify: `frontend/src/pages/k8s/StatefulSetList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/StatefulSetList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/StatefulSetList.tsx
git commit -m "refactor(ui): transform StatefulSetList to use shared components"
```

---

## Task 8: Transform DaemonSetList

**Files:**
- Modify: `frontend/src/pages/k8s/DaemonSetList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/DaemonSetList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/DaemonSetList.tsx
git commit -m "refactor(ui): transform DaemonSetList to use shared components"
```

---

## Task 9: Transform CronJobList

**Files:**
- Modify: `frontend/src/pages/k8s/CronJobList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/CronJobList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/CronJobList.tsx
git commit -m "refactor(ui): transform CronJobList to use shared components"
```

---

## Task 10: Transform JobList

**Files:**
- Modify: `frontend/src/pages/k8s/JobList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/JobList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/JobList.tsx
git commit -m "refactor(ui): transform JobList to use shared components"
```

---

## Task 11: Transform ConfigMapList

**Files:**
- Modify: `frontend/src/pages/k8s/ConfigMapList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/ConfigMapList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/ConfigMapList.tsx
git commit -m "refactor(ui): transform ConfigMapList to use shared components"
```

---

## Task 12: Transform SecretList

**Files:**
- Modify: `frontend/src/pages/k8s/SecretList.tsx`

**Steps:**

- [ ] **Step 1: Apply same pattern**

Read and refactor `frontend/src/pages/k8s/SecretList.tsx`.

- [ ] **Step 2: Verify build and commit**

```bash
cd /root/mrboard/frontend && npm run build 2>&1 | tail -5
git add frontend/src/pages/k8s/SecretList.tsx
git commit -m "refactor(ui): transform SecretList to use shared components"
```

---

## Task 13: Transform remaining K8s list pages (batch)

Transform these pages using the same pattern. Each page gets its own commit.

**Files:**
- Modify: `frontend/src/pages/k8s/PvList.tsx`
- Modify: `frontend/src/pages/k8s/PvcList.tsx`
- Modify: `frontend/src/pages/k8s/HpaList.tsx`
- Modify: `frontend/src/pages/k8s/GatewayList.tsx`
- Modify: `frontend/src/pages/k8s/HttpRouteList.tsx`
- Modify: `frontend/src/pages/k8s/GrpcRouteList.tsx`
- Modify: `frontend/src/pages/k8s/TcpRouteList.tsx`
- Modify: `frontend/src/pages/k8s/UdpRouteList.tsx`
- Modify: `frontend/src/pages/k8s/ClusterRolesList.tsx`
- Modify: `frontend/src/pages/k8s/ClusterRoleBindingList.tsx`
- Modify: `frontend/src/pages/k8s/RolesList.tsx`
- Modify: `frontend/src/pages/k8s/RoleBindingList.tsx`
- Modify: `frontend/src/pages/k8s/EventList.tsx`
- Modify: `frontend/src/pages/k8s/CrdList.tsx`
- Modify: `frontend/src/pages/k8s/StorageClassList.tsx`
- Modify: `frontend/src/pages/k8s/GatewayClassList.tsx`
- Modify: `frontend/src/pages/k8s/ServiceAccountsList.tsx`
- Modify: `frontend/src/pages/k8s/NodePoolList.tsx`

**Steps:**

- [ ] **Step 1: Batch transform all remaining K8s list pages**

For each file, apply the same pattern:
1. Add imports for `PageHeader`, `DataTable`, `StatusBadge`
2. Add `page` state
3. Define `columns` array
4. Replace `Table` with `DataTable`
5. Add `PageHeader` wrapper

- [ ] **Step 2: Verify build**

Run: `cd /root/mrboard/frontend && npm run build 2>&1 | tail -10`

- [ ] **Step 3: Commit all**

```bash
git add frontend/src/pages/k8s/
git commit -m "refactor(ui): transform all remaining K8s list pages to use shared components"
```

---

## Task 14: Transform non-K8s list pages

Transform these pages using the same pattern:

**Files:**
- Modify: `frontend/src/pages/cluster/ClusterList.tsx`
- Modify: `frontend/src/pages/app/AppNameList.tsx`
- Modify: `frontend/src/pages/favorite/FavoriteList.tsx`
- Modify: `frontend/src/pages/ops/BackupList.tsx`
- Modify: `frontend/src/pages/wiki/WikiList.tsx`
- Modify: `frontend/src/pages/rbac/AdminList.tsx`
- Modify: `frontend/src/pages/rbac/RoleList.tsx`
- Modify: `frontend/src/pages/rbac/AuditLogList.tsx`
- Modify: `frontend/src/pages/search/SearchPage.tsx`

**Steps:**

- [ ] **Step 1: Batch transform all non-K8s list pages**

Same pattern as K8s pages.

- [ ] **Step 2: Verify build**

Run: `cd /root/mrboard/frontend && npm run build 2>&1 | tail -10`

- [ ] **Step 3: Commit all**

```bash
git add frontend/src/pages/
git commit -m "refactor(ui): transform all non-K8s list pages to use shared components"
```

---

## Verification Checklist

- [ ] All list pages use `PageHeader` instead of inline `<h1>`
- [ ] All list pages use `DataTable` instead of raw `Table`
- [ ] All status columns use `StatusBadge` instead of raw `Badge`
- [ ] Loading state shows skeleton instead of "加载中..."
- [ ] Empty state shows `EmptyState` component instead of raw text
- [ ] Pagination works on pages with >20 items
- [ ] All existing functionality preserved (search, filter, actions, dialogs)
- [ ] Frontend builds: `cd frontend && npm run build`

import React, { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Shield, Search, ChevronsUpDown, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'

interface TreeNode {
  Id: number
  Title: string
  Name: string
  Pid: number
  Level: number
  Status: number
  Group__Id: string
  Remark: string
  Icons: string
  Sorts: string
  children?: TreeNode[]
}

interface Group {
  Id: number
  Title: string
}

interface Role {
  Id: number
  Name: string
}

interface PidNode {
  Id: number
  Title: string
  Level: number
}

export default function NodeList() {
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [pidNodes, setPidNodes] = useState<PidNode[]>([])
  const [filterGroupId, setFilterGroupId] = useState('')
  const [authRoleId, setAuthRoleId] = useState('')
  const [form, setForm] = useState({
    Title: '', Name: '', Pid: '0', Level: '1', Group_id: '', Status: '2', Remark: '',
  })
  const [deleteTarget, setDeleteTarget] = useState<TreeNode | null>(null)

  const fetchNodes = async (groupId?: string) => {
    setLoading(true)
    try {
      const url = groupId ? `/rbac/node/Getlist?Id=${groupId}` : '/rbac/node/List'
      const data = await api<TreeNode[]>(url)
      const list = Array.isArray(data) ? data : (data as any)?.data || []
      setNodes(list)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const [groupResp, roleResp, pidResp] = await Promise.all([
        api<{ data: Group[] }>('/rbac/group/List'),
        api<{ data: Role[] }>('/rbac/role/List'),
        api<{ data: PidNode[] }>('/rbac/node/GetPid'),
      ])
      setGroups(groupResp.data || [])
      setRoles(roleResp.data || [])
      setPidNodes(pidResp.data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    fetchNodes()
    fetchOptions()
  }, [])

  useEffect(() => {
    if (filterGroupId) {
      fetchNodes(filterGroupId)
    }
  }, [filterGroupId])

  const update = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleSelect = (nodeId: number) => {
    setSelected(prev => prev.includes(nodeId) ? prev.filter(i => i !== nodeId) : [...prev, nodeId])
  }

  const handleAdd = async () => {
    if (!form.Title || !form.Name) {
      toast.error('请填写显示名和应用名')
      return
    }
    try {
      await api('/rbac/node/Add', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      toast.success('添加成功')
      setAddDialogOpen(false)
      setForm({ Title: '', Name: '', Pid: '0', Level: '1', Group_id: '', Status: '2', Remark: '' })
      fetchNodes(filterGroupId || undefined)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/rbac/node/Delete', {
        method: 'POST',
        body: JSON.stringify(deleteTarget),
      })
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchNodes(filterGroupId || undefined)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const handleAuthToRole = async () => {
    if (selected.length === 0) {
      toast.error('请先选择节点')
      return
    }
    if (!authRoleId) {
      toast.error('请选择角色')
      return
    }
    try {
      await api('/rbac/role/AddAccess', {
        method: 'POST',
        body: JSON.stringify({ roleid: authRoleId, ids: selected.join(',') }),
      })
      toast.success('授权成功')
      setAuthDialogOpen(false)
      setSelected([])
      setAuthRoleId('')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const expandAll = () => {
    const allIds = new Set<number>()
    const walk = (items: TreeNode[]) => {
      items.forEach(n => { allIds.add(n.Id); if (n.children) walk(n.children) })
    }
    walk(nodes)
    setExpanded(allIds)
  }

  const foldAll = () => setExpanded(new Set())

  const highlightText = (text: string) => {
    if (!searchText || !text) return text
    const parts = text.split(new RegExp(`(${searchText})`, 'gi'))
    return parts.map((part, i) =>
      part.toLowerCase() === searchText.toLowerCase()
        ? <mark key={i} className="bg-yellow-200">{part}</mark>
        : part
    )
  }

  const renderTreeRow = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expanded.has(node.Id)
    const rows: React.JSX.Element[] = []

    rows.push(
      <TableRow key={node.Id} className={selected.includes(node.Id) ? 'bg-muted/50' : ''}>
        <TableCell>
          <input
            type="checkbox"
            checked={selected.includes(node.Id)}
            onChange={() => toggleSelect(node.Id)}
          />
        </TableCell>
        <TableCell>{node.Id}</TableCell>
        <TableCell style={{ paddingLeft: `${depth * 20 + 8}px` }}>
          {hasChildren && (
            <button
              className="mr-1 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setExpanded(prev => {
                  const next = new Set(prev)
                  if (next.has(node.Id)) next.delete(node.Id)
                  else next.add(node.Id)
                  return next
                })
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {highlightText(node.Title)}
        </TableCell>
        <TableCell>{highlightText(node.Name)}</TableCell>
        <TableCell>{node.Pid}</TableCell>
        <TableCell>{node.Level}</TableCell>
        <TableCell>
          <Badge variant={node.Status === 2 ? 'default' : 'secondary'}>
            {node.Status === 2 ? '启用' : '禁用'}
          </Badge>
        </TableCell>
        <TableCell>{node.Group__Id}</TableCell>
        <TableCell>{node.Icons}</TableCell>
        <TableCell>{node.Sorts}</TableCell>
        <TableCell>{node.Remark}</TableCell>
        <TableCell>
          <Button variant="outline" size="sm" onClick={() => setDeleteTarget(node)}>
            <Trash2 size={14} />
          </Button>
        </TableCell>
      </TableRow>
    )

    if (hasChildren && isExpanded) {
      node.children!.forEach(child => {
        rows.push(...renderTreeRow(child, depth + 1))
      })
    }

    return rows
  }

  return (
    <div className="space-y-4">
      <PageHeader title="目录结构">
        <div className="flex gap-2">
          <Button onClick={() => {
            setForm({ Title: '', Name: '', Pid: '0', Level: '1', Group_id: '', Status: '2', Remark: '' })
            setAddDialogOpen(true)
          }}>
            <Plus size={16} className="mr-2" />添加
          </Button>
          <Button onClick={() => setAuthDialogOpen(true)} disabled={selected.length === 0}>
            <Shield size={16} className="mr-2" />授权给角色
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-3 mb-4 flex-wrap">
            <div className="space-y-1">
              <label className="text-sm font-medium">目录分组</label>
              <Select value={filterGroupId} onValueChange={v => setFilterGroupId(v ?? '')}>
                <SelectTrigger className="w-48"><SelectValue placeholder="选择分组" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.Id} value={String(g.Id)}>{g.Title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={expandAll}>
              <Maximize2 size={14} className="mr-1" />全部展开
            </Button>
            <Button variant="outline" size="sm" onClick={foldAll}>
              <ChevronsUpDown size={14} className="mr-1" />全部折叠
            </Button>
            <div className="flex items-center gap-1">
              <Input
                placeholder="输入关键字"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-48"
              />
              <Button variant="outline" size="sm"><Search size={14} /></Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={nodes.length > 0 && selected.length > 0}
                      onChange={e => {
                        if (e.target.checked) {
                          const allIds: number[] = []
                          const walk = (items: TreeNode[]) => items.forEach(n => { allIds.push(n.Id); if (n.children) walk(n.children) })
                          walk(nodes)
                          setSelected(allIds)
                        } else {
                          setSelected([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-16">ID</TableHead>
                  <TableHead>显示名</TableHead>
                  <TableHead>应用名</TableHead>
                  <TableHead>PID</TableHead>
                  <TableHead>目录级别</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>分组</TableHead>
                  <TableHead>图标</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8">加载中...</TableCell></TableRow>
                ) : nodes.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : nodes.flatMap(n => renderTreeRow(n))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Node Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加节点</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">显示名 *</label>
                <Input value={form.Title} onChange={e => update('Title', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">应用名 *</label>
                <Input value={form.Name} onChange={e => update('Name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">父目录</label>
                <Select value={form.Pid} onValueChange={v => update('Pid', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">/</SelectItem>
                    {pidNodes.filter(n => n.Level <= 2).map(n => (
                      <SelectItem key={n.Id} value={String(n.Id)}>
                        {'  '.repeat(n.Level - 1)}{n.Title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">目录级别</label>
                <Select value={form.Level} onValueChange={v => update('Level', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">一级目录</SelectItem>
                    <SelectItem value="2">二级目录</SelectItem>
                    <SelectItem value="3">三级目录</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">分组</label>
                <Select value={form.Group_id} onValueChange={v => update('Group_id', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="选择分组" /></SelectTrigger>
                  <SelectContent>
                    {groups.map(g => (
                      <SelectItem key={g.Id} value={String(g.Id)}>{g.Title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">状态</label>
                <Select value={form.Status} onValueChange={v => update('Status', v ?? '')}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">启用</SelectItem>
                    <SelectItem value="1">禁用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">描述</label>
              <Input value={form.Remark} onChange={e => update('Remark', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>取消</Button>
            <Button onClick={handleAdd}>确认创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auth to Role Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>授权给角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">角色选择</label>
              <Select value={authRoleId} onValueChange={v => setAuthRoleId(v ?? '')}>
                <SelectTrigger className="w-full"><SelectValue placeholder="选择角色" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.Id} value={String(r.Id)}>{r.Name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthDialogOpen(false)}>取消</Button>
            <Button onClick={handleAuthToRole}>确认授权</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p>确定删除节点 {deleteTarget?.Title}？</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { MinusSquare, Search, ChevronsUpDown, Maximize2 } from 'lucide-react'
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

export default function RoleToNodeList() {
  const { id } = useParams<{ id: string }>()
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number[]>([])
  const [searchText, setSearchText] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const fetchNodes = async () => {
    setLoading(true)
    try {
      const data = await api<TreeNode[]>(`/rbac/role/RoleToNodeList?Id=${id}`)
      const list = Array.isArray(data) ? data : (data as any)?.data || []
      setNodes(list)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNodes() }, [id])

  const toggleSelect = (nodeId: number) => {
    setSelected(prev => prev.includes(nodeId) ? prev.filter(i => i !== nodeId) : [...prev, nodeId])
  }

  const handleCancelAuth = async () => {
    if (selected.length === 0) {
      toast.error('请先选择节点')
      return
    }
    if (!confirm('确定取消选中节点的授权？')) return
    try {
      await api('/rbac/role/DelRoleToNode', {
        method: 'POST',
        body: JSON.stringify({ Id: id, ids: selected.join(',') }),
      })
      toast.success('取消成功')
      setSelected([])
      fetchNodes()
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
        <TableCell>{node.Sorts}</TableCell>
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
          <Button variant="outline" size="sm" render={<Link to="/rbac/node/list" />}>
            添加授权
          </Button>
          <Button variant="destructive" size="sm" onClick={handleCancelAuth} disabled={selected.length === 0}>
            <MinusSquare size={14} className="mr-1" />取消授权
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={expandAll}>
              <Maximize2 size={14} className="mr-1" />全部展开
            </Button>
            <Button variant="outline" size="sm" onClick={foldAll}>
              <ChevronsUpDown size={14} className="mr-1" />全部折叠
            </Button>
            <div className="flex items-center gap-1 ml-4">
              <Input
                placeholder="输入关键字"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-48"
              />
              <Button variant="outline" size="sm" onClick={() => {}}>
                <Search size={14} />
              </Button>
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
                  <TableHead>排序</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">加载中...</TableCell></TableRow>
                ) : nodes.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
                ) : nodes.flatMap(n => renderTreeRow(n))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

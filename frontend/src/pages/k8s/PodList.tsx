import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Search, FileCode, Trash2, Terminal, Eye, ScrollText } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Pod, Namespace, ApiResponse } from '@/types'

export default function PodK8sList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Pod[]>([])
  const [filtered, setFiltered] = useState<Pod[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [namespace, setNamespace] = useState('')
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Pod | null>(null)
  const clusterId = localStorage.getItem('clusterId') || ''

  const fetchNamespaces = async () => {
    try {
      const data = await api<Namespace[] | ApiResponse<Namespace[]>>('/mrboard/ns/v1/List?clusterId=' + clusterId)
      const list = Array.isArray(data) ? data : (data as ApiResponse<Namespace[]>).data || []
      setNamespaces(list.map(n => typeof n === 'string' ? n : n.name))
    } catch { /* optional */ }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const nsParam = namespace ? '&nameSpace=' + namespace : ''
      const res = await api<{ code: number; data: Pod[] }>('/mrboard/pod/v1/List?clusterId=' + clusterId + nsParam)
      setItems(res.data || [])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNamespaces() }, [])
  useEffect(() => { fetchData() }, [namespace])

  useEffect(() => {
    setFiltered(searchName ? items.filter(i => i.podName.toLowerCase().includes(searchName.toLowerCase())) : items)
  }, [items, searchName])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api('/mrboard/pod/v1/Del?clusterId=' + clusterId + '&nameSpace=' + deleteTarget.nameSpace + '&podName=' + deleteTarget.podName)
      toast.success('删除成功')
      setDeleteTarget(null)
      fetchData()
    } catch (err) { toast.error((err as Error).message) }
  }

  const handleTerminal = (pod: Pod) => {
    window.open('/k8s/pod/terminal?clusterId=' + clusterId + '&nameSpace=' + pod.nameSpace + '&podName=' + pod.podName, '_blank')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">容器组[Pod]</h1>
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Input placeholder="搜索Pod名称" value={searchName} onChange={e => setSearchName(e.target.value)} className="w-48" />
            <Select value={namespace || '__all__'} onValueChange={v => setNamespace(v === '__all__' ? '' : (v ?? ''))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="所有空间" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">所有空间</SelectItem>
                {namespaces.map(ns => <SelectItem key={ns} value={ns}>{ns}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}><Search size={14} className="mr-1" />刷新</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>命名空间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>重启</TableHead>
                <TableHead>Pod IP</TableHead>
                <TableHead>节点</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>内存</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8">加载中...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">暂无数据</TableCell></TableRow>
              ) : filtered.map(p => (
                <TableRow key={p.nameSpace + '/' + p.podName}>
                  <TableCell className="font-medium max-w-xs truncate" title={p.podName}>{p.podName}</TableCell>
                  <TableCell>{p.nameSpace}</TableCell>
                  <TableCell><Badge variant={p.podPhase === 'Running' ? 'default' : 'destructive'}>{p.podPhase}</Badge></TableCell>
                  <TableCell>{p.restartCount}</TableCell>
                  <TableCell className="font-mono text-sm">{p.podIp}</TableCell>
                  <TableCell>{p.nodeName}</TableCell>
                  <TableCell>{p.cpuUsage ? p.cpuUsage.toFixed(2) : '-'}</TableCell>
                  <TableCell>{p.memUsage ? p.memUsage.toFixed(0) + 'Mi' : '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{p.createTime}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => navigate('/pod/detail?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName)}><Eye size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/pod/log?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName)}><ScrollText size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => handleTerminal(p)}><Terminal size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => navigate('/k8s/pod/yaml?clusterId=' + clusterId + '&nameSpace=' + p.nameSpace + '&podName=' + p.podName)}><FileCode size={14} /></Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget(p)}><Trash2 size={14} className="text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确定删除 Pod <span className="font-mono font-medium text-foreground">{deleteTarget?.podName}</span>？此操作不可撤销。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

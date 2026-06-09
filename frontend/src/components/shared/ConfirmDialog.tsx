import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  trigger?: React.ReactNode
  title: string
  description?: string
  confirmText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => Promise<void> | void
  /** Controlled open state — when provided, dialog is externally controlled */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function ConfirmDialog({
  trigger, title, description, confirmText = '确认', variant = 'default', onConfirm,
  open: controlledOpen, onOpenChange,
}: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Use controlled state if provided, otherwise internal
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v)
    else setInternalOpen(v)
  }

  // Auto-open when controlled open becomes true
  useEffect(() => {
    if (isControlled && controlledOpen) {
      setLoading(false)
    }
  }, [isControlled, controlledOpen])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <div onClick={() => setOpen(true)}>{trigger}</div>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={(variant === 'destructive' || loading) ? 'flex items-center gap-2 text-destructive' : ''}>
            {loading && <Loader2 size={18} className="animate-spin text-primary" />}
            {!loading && variant === 'destructive' && <AlertTriangle className="h-5 w-5" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>取消</Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={handleConfirm} disabled={loading}>
            {loading ? <><Loader2 size={14} className="animate-spin mr-1.5" />处理中...</> : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { DetectedFieldValue } from '@/types/log'

interface FieldBreakdownProps {
  fieldName: string
  values: DetectedFieldValue[]
}

export function FieldBreakdown({ fieldName, values }: FieldBreakdownProps) {
  if (!values || values.length === 0) return null

  const data = values.slice(0, 10).map(v => ({
    name: v.value.length > 30 ? v.value.slice(0, 30) + '…' : v.value,
    fullName: v.value,
    count: v.count,
  }))

  return (
    <div className="border-t">
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Field Breakdown: {fieldName}
      </div>
      <div className="h-[180px] px-4 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <Tooltip
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
              contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            />
            <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

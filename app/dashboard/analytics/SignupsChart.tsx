'use client'

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailySignup } from '@/lib/analytics'

function formatTick(dateKey: string) {
  const d = new Date(`${dateKey}T00:00:00Z`)
  return d.toLocaleDateString('ka-GE', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: DailySignup }[] }) {
  if (!active || !payload?.length) return null
  const { date, count } = payload[0].payload
  return (
    <div className="bg-dbg2 border border-dline rounded-lg px-3 py-2 text-xs shadow-sm">
      <p className="text-dmuted mb-0.5">{formatTick(date)}</p>
      <p className="text-dtext font-semibold">{count} ახალი წევრი</p>
    </div>
  )
}

export default function SignupsChart({ data }: { data: DailySignup[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--dline)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatTick}
            tick={{ fill: 'var(--dmuted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--dline)' }}
            tickLine={false}
            interval={Math.ceil(data.length / 8) - 1}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--dmuted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<TooltipContent />} cursor={{ fill: 'var(--honey)', opacity: 0.12 }} />
          <Bar dataKey="count" fill="var(--honey)" radius={[3, 3, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

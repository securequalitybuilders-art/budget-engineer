import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { BOQSection } from '@/types';
import { fmtCents } from '@/lib/utils';

interface CostBreakdownChartProps {
  sections: BOQSection[];
  currency: string;
}

export function CostBreakdownChart({ sections, currency }: CostBreakdownChartProps) {
  const data = sections.map((s) => ({
    name: s.code,
    title: s.title,
    value: s.subtotalCents / 100, // dollars for display
  }));

  const colors = ['#1a365d', '#2c5282', '#d4a574', '#06b6d4', '#8b5cf6'];

  return (
    <div className="h-48 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border-default)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            cursor={{ fill: 'var(--bg-tertiary)' }}
            contentStyle={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
            formatter={(value: number) => [fmtCents(value * 100, currency), 'Subtotal']}
            labelFormatter={(_, payload) => (payload?.[0]?.payload?.title as string) || ''}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={colors[idx % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

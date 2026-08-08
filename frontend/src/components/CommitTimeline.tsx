import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface CommitTimelineProps {
  data: { date: string; count: number }[];
  authenticity: string | null;
}

export function CommitTimeline({ data, authenticity }: CommitTimelineProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    }),
    commits: d.count,
    fullDate: d.date,
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-dim text-sm">
        No commit data available
      </div>
    );
  }

  const barColor = authenticity === 'healthy' ? '#00E599' : authenticity === 'review_suggested' ? '#F59E0B' : '#71717A';

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#71717A', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181B',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#FAFAFA',
              fontSize: '13px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            labelStyle={{ color: '#A1A1AA', marginBottom: '4px' }}
          />
          <Bar dataKey="commits" radius={[3, 3, 0, 0]} maxBarSize={24}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={barColor} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { UptimeLog } from '../lib/api';

interface UptimeChartProps {
  data: UptimeLog[];
}

export function UptimeChart({ data }: UptimeChartProps) {
  const chartData = data.map((log) => ({
    time: new Date(log.checkedAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    responseTime: log.responseTimeMs ?? 0,
    status: log.isUp ? 1 : 0,
    statusCode: log.statusCode,
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-dim text-sm">
        No uptime data available yet
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E599" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00E599" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: '#71717A', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            label={{ value: 'ms', angle: -90, position: 'insideLeft', fill: '#52525B', fontSize: 11 }}
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
          <Area
            type="monotone"
            dataKey="responseTime"
            stroke="#00E599"
            strokeWidth={2}
            fill="url(#uptimeGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#00E599', stroke: '#0A0A0B', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

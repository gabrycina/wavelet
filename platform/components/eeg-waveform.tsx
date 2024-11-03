"use client"

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface EEGWaveformProps {
  data: number[]
  color?: string
  className?: string
}

export function EEGWaveform({ 
  data, 
  color = 'hsl(var(--primary))', 
  className 
}: EEGWaveformProps) {
  const chartData = data.map((value, index) => ({
    time: index,
    value: value
  }))

  return (
    <div className={cn(
      "rounded-lg border bg-card text-card-foreground shadow",
      className
    )}>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData}>
          <XAxis 
            dataKey="time" 
            tick={false} 
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis 
            domain={[-2, 2]} 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))',
              fontSize: 12
            }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-geist-sans)'
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 
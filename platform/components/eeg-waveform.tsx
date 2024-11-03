"use client"

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface EEGWaveformProps {
  data: number[]
  color?: string
}

export function EEGWaveform({ data, color = '#00ff80' }: EEGWaveformProps) {
  // Convert array of numbers to array of objects that Recharts expects
  const chartData = data.map((value, index) => ({
    time: index,
    value: value
  }))

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={chartData}>
        <XAxis 
          dataKey="time" 
          tick={false} 
          stroke="#666"
        />
        <YAxis 
          domain={[-2, 2]} 
          tick={{ fill: '#666' }}
          stroke="#666"
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
  )
} 
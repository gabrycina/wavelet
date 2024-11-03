"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartTooltipContent } from "@/components/ui/chart-tooltip"
import { useRef } from 'react'

const channelConfig = {
  ch1: { label: "AF3", color: "#ff4040", offset: -13 },
  ch2: { label: "F7", color: "#ff6040", offset: -11 },
  ch3: { label: "F3", color: "#ff8040", offset: -9 },
  ch4: { label: "FC5", color: "#ffa040", offset: -7 },
  ch5: { label: "T7", color: "#ffc040", offset: -5 },
  ch6: { label: "P7", color: "#ffe040", offset: -3 },
  ch7: { label: "O1", color: "#fff040", offset: -1 },
  ch8: { label: "O2", color: "#40ff40", offset: 1 },
  ch9: { label: "P8", color: "#40ffff", offset: 3 },
  ch10: { label: "T8", color: "#4080ff", offset: 5 },
  ch11: { label: "FC6", color: "#4040ff", offset: 7 },
  ch12: { label: "F4", color: "#8040ff", offset: 9 },
  ch13: { label: "F8", color: "#c040ff", offset: 11 },
  ch14: { label: "AF4", color: "#ff40ff", offset: 13 }
}

const megChannelConfig = {
  ch1: { label: "MEG1", color: "#00ffff", offset: -13 },
  ch2: { label: "MEG2", color: "#00f0ff", offset: -11 },
  ch3: { label: "MEG3", color: "#00e0ff", offset: -9 },
  ch4: { label: "MEG4", color: "#00d0ff", offset: -7 },
  ch5: { label: "MEG5", color: "#00c0ff", offset: -5 },
  ch6: { label: "MEG6", color: "#00b0ff", offset: -3 },
  ch7: { label: "MEG7", color: "#00a0ff", offset: -1 },
  ch8: { label: "MEG8", color: "#0090ff", offset: 1 },
  ch9: { label: "MEG9", color: "#0080ff", offset: 3 },
  ch10: { label: "MEG10", color: "#0070ff", offset: 5 },
  ch11: { label: "MEG11", color: "#0060ff", offset: 7 },
  ch12: { label: "MEG12", color: "#0050ff", offset: 9 },
  ch13: { label: "MEG13", color: "#0040ff", offset: 11 },
  ch14: { label: "MEG14", color: "#0030ff", offset: 13 }
}

interface EEGData {
  data?: { value: number }[]
}

export function EEGWaveform({ data, mode = 'raw' }: { data: EEGData, mode?: 'raw' | 'enhanced' }) {
  const lastValidDataRef = useRef<any[]>([])
  const config = mode === 'raw' ? channelConfig : megChannelConfig

  // If there's no data, use the last valid data
  if (!data?.data?.length && lastValidDataRef.current.length) {
    return null
  }

  // Transform and store valid data
  const chartData = data?.data?.length ? data.data.map((_, index) => ({
    time: index,
    ...Object.keys(config).reduce((acc, key, chIndex) => ({
      ...acc,
      [key]: (data.data[chIndex]?.value || 0) * 2 + config[key].offset
    }), {})
  })) : []

  if (chartData.length) {
    lastValidDataRef.current = chartData
  }

  return (
    <div className="rounded-lg p-4 transition-all duration-300 bg-black">
      <h3 className="text-sm font-medium mb-4 font-space tracking-tight">
        {mode === 'raw' ? 'EEG Channels' : 'AI-Derived MEG'}
        {mode === 'enhanced' && (
          <span className="ml-2 text-xs text-primary/60">• High Resolution</span>
        )}
      </h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
          >
            <defs>
              {Object.entries(config).map(([key, cfg]) => (
                <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <XAxis 
              dataKey="time" 
              tick={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis 
              domain={[-15, 15]}
              ticks={[-15, -10, -5, 0, 5, 10, 15]}
              tick={{ 
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 12,
                fontFamily: 'var(--font-space)'
              }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip 
              content={<ChartTooltipContent config={config} />} 
              cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
            />
            {Object.entries(config).map(([key, cfg]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={cfg.color}
                fill={`url(#gradient-${key})`}
                fillOpacity={0.2}
                strokeWidth={mode === 'enhanced' ? 2 : 1.5}
                stackId="1"
                isAnimationActive={true}
                animationDuration={300}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 
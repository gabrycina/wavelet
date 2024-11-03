"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

interface EEGData {
  data?: { value: number }[]
}

export function EEGWaveform({ data }: { data: EEGData }) {
  const lastValidDataRef = useRef<any[]>([])

  // If there's no data, use the last valid data
  if (!data?.data?.length && lastValidDataRef.current.length) {
    return (
      <Card className="border-0 bg-black">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">EEG Channels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={lastValidDataRef.current}
                margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
              >
                <defs>
                  {Object.entries(channelConfig).map(([key, config]) => (
                    <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
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
                    fontSize: 12
                  }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip content={<ChartTooltipContent config={channelConfig} />} />
                {Object.entries(channelConfig).map(([key, config]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={config.color}
                    fill={`url(#gradient-${key})`}
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                    stackId="1"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform and store valid data
  const chartData = data?.data?.length ? data.data.map((_, index) => ({
    time: index,
    ...Object.keys(channelConfig).reduce((acc, key, chIndex) => ({
      ...acc,
      [key]: (data.data[chIndex]?.value || 0) * 2 + channelConfig[key].offset
    }), {})
  })) : []

  // Store valid data for future use
  if (chartData.length) {
    lastValidDataRef.current = chartData
  }

  return (
    <Card className="border-0 bg-black">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-medium">EEG Channels</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
            >
              <defs>
                {Object.entries(channelConfig).map(([key, config]) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
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
                  fontSize: 12
                }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip content={<ChartTooltipContent config={channelConfig} />} />
              {Object.entries(channelConfig).map(([key, config]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={config.color}
                  fill={`url(#gradient-${key})`}
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                  stackId="1"
                  isAnimationActive={true}
                  animationDuration={300}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 
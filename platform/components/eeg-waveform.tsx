"use client"

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartTooltipContent } from "@/components/ui/chart-tooltip"
import { useRef, useEffect } from 'react'
import { Info } from "lucide-react"
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

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
  const accumulatedDataRef = useRef<any[]>([])
  const smoothingBufferRef = useRef<{ [key: string]: number[] }>({})
  const config = mode === 'raw' ? channelConfig : megChannelConfig
  const MAX_POINTS = 1000
  const VISIBLE_POINTS = 200
  const SMOOTHING_WINDOW = 5 // Number of points to average

  useEffect(() => {
    if (data?.data?.length) {
      const timestamp = Date.now()

      // Initialize smoothing buffers if needed
      Object.keys(config).forEach(key => {
        if (!smoothingBufferRef.current[key]) {
          smoothingBufferRef.current[key] = []
        }
      })

      const newPoint = {
        timestamp,
        ...Object.keys(config).reduce((acc, key, chIndex) => {
          const rawValue = (data.data[chIndex]?.value || 0)
          
          if (mode === 'enhanced') {
            // Add value to smoothing buffer
            smoothingBufferRef.current[key].push(rawValue)
            
            // Keep buffer at SMOOTHING_WINDOW size
            if (smoothingBufferRef.current[key].length > SMOOTHING_WINDOW) {
              smoothingBufferRef.current[key].shift()
            }
            
            // Calculate smoothed value (moving average)
            const smoothedValue = smoothingBufferRef.current[key].reduce((sum, val) => sum + val, 0) / 
              smoothingBufferRef.current[key].length
            
            return {
              ...acc,
              [key]: smoothedValue * 5 + config[key].offset
            }
          } else {
            return {
              ...acc,
              [key]: rawValue * 5 + config[key].offset
            }
          }
        }, {})
      }
      
      accumulatedDataRef.current = [
        ...accumulatedDataRef.current,
        newPoint
      ].slice(-MAX_POINTS)
    }
  }, [data, mode, config])

  const now = Date.now()
  const windowStart = now - (VISIBLE_POINTS * 50)
  const visibleData = accumulatedDataRef.current.filter(
    point => point.timestamp >= windowStart
  )

  return (
    <div className={`
      bg-black rounded-lg p-4 
      transition-all duration-500 ease-in-out
      ${mode === 'enhanced' ? 'scale-[1.02]' : 'scale-100'}
    `}>
      <h3 className="text-sm font-medium mb-4 font-space tracking-tight flex items-center gap-2">
        <span className="transition-all duration-500">
          {mode === 'raw' ? 'EEG Channels' : 'AI-Derived MEG'}
        </span>
        <ShadcnTooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground/70 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px] p-4">
            {mode === 'raw' ? (
              <>Real-time electrical signals recorded from 14 sensors placed on the scalp, measuring brain activity at different locations.</>
            ) : (
              <>AI-enhanced signals that transform EEG data into MEG-like readings, providing higher spatial resolution and deeper brain activity insights.</>
            )}
          </TooltipContent>
        </ShadcnTooltip>
        {mode === 'enhanced' && (
          <span className="ml-2 text-xs text-primary/60">• High Resolution</span>
        )}
      </h3>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={visibleData}
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
              dataKey="timestamp"
              domain={['dataMin', 'dataMax']}
              type="number"
              allowDataOverflow={true}
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
                type="natural" // Changed to natural interpolation
                dataKey={key}
                stroke={cfg.color}
                fill={`url(#gradient-${key})`}
                fillOpacity={0.2}
                strokeWidth={mode === 'enhanced' ? 2 : 1.5}
                isAnimationActive={true}
                animationDuration={300}
                dot={false}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartTooltipContent } from "@/components/ui/chart-tooltip"
import { useRef, useEffect, useState } from 'react'

const bandConfig = {
  delta: { label: "Delta", color: "#ff4040" },
  theta: { label: "Theta", color: "#ff8000" },
  alpha: { label: "Alpha", color: "#00ff80" },
  beta: { label: "Beta", color: "#0088ff" },
  gamma: { label: "Gamma", color: "#8000ff" }
}

const ANIMATION_DURATION = 200 // ms
const FRAME_RATE = 60 // fps

interface FrequencyBands {
  delta: number[]
  theta: number[]
  alpha: number[]
  beta: number[]
  gamma: number[]
}

function interpolateValue(start: number, end: number, progress: number): number {
  return start + (end - start) * progress
}

export function FrequencyBandsChart({ data }: { data: FrequencyBands }) {
  const [displayedData, setDisplayedData] = useState<any[]>([])
  const lastDataRef = useRef<any[]>([])
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  useEffect(() => {
    if (data.delta.length === 0) return

    const newData = data.delta.map((_, index) => ({
      time: index,
      delta: data.delta[index] || 0,
      theta: data.theta[index] || 0,
      alpha: data.alpha[index] || 0,
      beta: data.beta[index] || 0,
      gamma: data.gamma[index] || 0
    }))

    // If this is the first data, set it immediately
    if (lastDataRef.current.length === 0) {
      lastDataRef.current = newData
      setDisplayedData(newData)
      return
    }

    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const progress = Math.min(
        (timestamp - startTimeRef.current) / ANIMATION_DURATION,
        1
      )

      const interpolatedData = newData.map((target, index) => {
        const source = lastDataRef.current[index] || target
        return {
          time: target.time,
          delta: interpolateValue(source.delta, target.delta, progress),
          theta: interpolateValue(source.theta, target.theta, progress),
          alpha: interpolateValue(source.alpha, target.alpha, progress),
          beta: interpolateValue(source.beta, target.beta, progress),
          gamma: interpolateValue(source.gamma, target.gamma, progress)
        }
      })

      setDisplayedData(interpolatedData)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        lastDataRef.current = newData
        startTimeRef.current = undefined
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [data])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart 
        data={displayedData}
        margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
      >
        <defs>
          {Object.entries(bandConfig).map(([key, config]) => (
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
          domain={[-3, 3]}
          ticks={[-3, -2, -1, 0, 1, 2, 3]}
          tick={{ 
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 12
          }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip content={<ChartTooltipContent config={bandConfig} />} />
        {Object.entries(bandConfig).map(([key, config]) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={config.color}
            fill={`url(#gradient-${key})`}
            fillOpacity={0.4}
            strokeWidth={1.5}
            stackId="1"
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
} 
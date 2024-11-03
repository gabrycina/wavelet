"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartTooltipContent } from "@/components/ui/chart-tooltip"
import { useRef, useEffect, useState } from 'react'
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

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
  const startTimeRef = useRef<number>()
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (data.delta.length === 0) return

    // Transform the data to match the visual scale
    const newData = data.delta.map((_, index) => ({
      time: index,
      // Remove any scaling/offset that might be affecting the values
      delta: data.delta[index],
      theta: data.theta[index],
      alpha: data.alpha[index],
      beta: data.beta[index],
      gamma: data.gamma[index]
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
    <>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium font-space tracking-tight">
          Frequency Bands
        </h3>
        <ShadcnTooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground/70 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[300px] p-4">
            <p className="mb-2">Brain waves broken down into frequency bands:</p>
            <ul className="space-y-1 text-sm">
              <li><span className="text-red-400">Delta (0-4 Hz)</span>: Deep sleep, healing</li>
              <li><span className="text-orange-400">Theta (4-8 Hz)</span>: Meditation, memory</li>
              <li><span className="text-green-400">Alpha (8-13 Hz)</span>: Relaxation, focus</li>
              <li><span className="text-blue-400">Beta (13-30 Hz)</span>: Active thinking</li>
              <li><span className="text-purple-400">Gamma (30-50 Hz)</span>: Complex processing</li>
            </ul>
          </TooltipContent>
        </ShadcnTooltip>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={displayedData}
            margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
          >
            <defs>
              {Object.entries(bandConfig).map(([key, cfg]) => (
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
              // Remove any domain constraints if they exist
              tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 12
              }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <Tooltip content={<ChartTooltipContent config={bandConfig} />} />
            {Object.entries(bandConfig).map(([key, cfg]) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={cfg.color}
                fill={`url(#gradient-${key})`}
                fillOpacity={0.2}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  )
} 
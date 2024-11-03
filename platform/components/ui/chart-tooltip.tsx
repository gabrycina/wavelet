"use client"

import { Card } from "@/components/ui/card"

export interface ChartConfig {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  config: ChartConfig
}

export function ChartTooltipContent({ active, payload, config }: ChartTooltipProps) {
  if (!active || !payload) {
    return null
  }

  return (
    <Card className="p-2 shadow-sm border bg-background">
      <div className="grid gap-2">
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: config[item.dataKey].color }}
            />
            <span className="font-medium">{config[item.dataKey].label}:</span>
            <span>{Number(item.value).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ChartContainer({ children, config }: { children: React.ReactNode; config: ChartConfig }) {
  return (
    <style jsx global>{`
      :root {
        ${Object.entries(config)
          .map(([key, value]) => `--color-${key}: ${value.color};`)
          .join('\n')}
      }
    `}</style>
  )
}

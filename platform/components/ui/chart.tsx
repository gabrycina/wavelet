import * as React from "react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { cn } from "@/lib/utils"

interface ChartProps {
  data: { value: number; time: number }[]
  color?: string
  className?: string
}

const Chart = React.forwardRef<
  HTMLDivElement,
  ChartProps
>(({ className, data, color = "hsl(var(--primary))" }, ref) => (
  <div ref={ref} className={cn("w-full h-[120px]", className)}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
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
))
Chart.displayName = "Chart"

export { Chart }

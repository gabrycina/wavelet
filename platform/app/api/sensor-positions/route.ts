import { NextResponse } from 'next/server'
import { generateSpherePoints } from '@/lib/sensor-positioning'

export async function GET() {
  // Generate 65 sensor positions in a cap-like pattern
  const points = generateSpherePoints(65, 1)
  
  const sensors = points.map((point, i) => {
    console.log(`Generated sensor ${i} at:`, point)  // Debug log
    return {
      name: `Sensor${i}`,
      position: {
        x: point.x,
        y: point.y,
        z: point.z
      }
    }
  })

  console.log('Total sensors generated:', sensors.length)  // Debug log
  return NextResponse.json({ sensors })
}

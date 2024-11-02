import { NextResponse } from 'next/server'
import { generateSpherePoints } from '@/lib/sensor-positioning'

export async function GET() {
  // Generate 65 sensor positions in a cap-like pattern
  const points = generateSpherePoints(65, 1)
  
  const sensors = points.map((point, i) => ({
    name: `Sensor${i}`,
    position: {
      x: point.x,
      y: point.y,
      z: point.z
    }
  }))

  return NextResponse.json({ sensors })
}

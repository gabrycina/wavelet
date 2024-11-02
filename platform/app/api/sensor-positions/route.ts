import { NextResponse } from 'next/server'
import { getEpocSensorPositions } from '@/lib/sensor-positioning'

export async function GET() {
  const sensors = getEpocSensorPositions()
  return NextResponse.json({ sensors })
}

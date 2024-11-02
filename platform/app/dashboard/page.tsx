"use client"
import { useEffect, useState } from 'react'
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BrainVisualizer } from "@/components/brain-visualizer"
import { SidebarProvider } from '@/components/ui/sidebar'
import { Switch } from "@/components/ui/switch"

export default function DashboardPage() {
  const [sensorData, setSensorData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEnhanced, setIsEnhanced] = useState(false)
  const [signalQuality, setSignalQuality] = useState(95.5)

  useEffect(() => {
    const fetchSensorPositions = async () => {
      try {
        const response = await fetch('/api/sensor-positions')
        const data = await response.json()
        setSensorData(data)
      } catch (error) {
        console.error('Error fetching sensor positions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSensorPositions()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <SidebarProvider>
      <div className="flex">
        <AppSidebar />
        <div className="flex-1 p-8">
          <div className="grid grid-cols-3 gap-4">
            {/* Main Brain Visualization */}
            <div className="col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{isEnhanced ? 'Enhanced EEG Signal' : 'EEG Signal'}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Enhancement</span>
                    <Switch 
                      checked={isEnhanced}
                      onCheckedChange={setIsEnhanced}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {sensorData && (
                    <BrainVisualizer 
                      type="EEG"
                      sensorData={{
                        sensors: Object.entries(sensorData.eeg.positions).map(([name, pos], i) => ({
                          name,
                          position: pos as { x: number; y: number; z: number },
                          value: sensorData.eeg.data[i]?.[0]
                        }))
                      }}
                      options={{
                        showLabels: true,
                        sensorSize: 0.8,
                        colorScale: [-100, 100]
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Metrics and Controls */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Signal Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-medium pr-5">Original Signal Quality</span>
                      <span className="text-lg font-semibold">{signalQuality.toFixed(1)}%</span>
                    </div>
                    {isEnhanced && (
                      <>
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-medium pr-5">Enhanced Signal Quality</span>
                          <span className="text-lg font-semibold text-green-600">
                            {(signalQuality + 3).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="font-medium pr-5">Improvement</span>
                          <span className="text-lg font-semibold text-green-600">+3.0%</span>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

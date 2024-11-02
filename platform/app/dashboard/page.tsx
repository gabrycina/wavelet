"use client"
import { useEffect, useState } from 'react'
import { BrainVisualizer } from '@/components/brain-visualizer'

export default function DashboardPage() {
  // Initialize state with proper structure
  const [sensorData, setSensorData] = useState({
    sensors: [],
    eeg: {
      data: []
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await fetch('/api/sensor-positions')
        const data = await response.json()
        setSensorData(prev => ({
          ...prev,
          sensors: data.sensors || []
        }))
        setLoading(false)
      } catch (error) {
        console.error('Error fetching sensor positions:', error)
        setLoading(false)
      }
    }

    const setupEventSource = () => {
      const eventSource = new EventSource('/api/eeg-stream')

      eventSource.onmessage = (event) => {
        try {
          const eegData = JSON.parse(event.data)
          setSensorData(prev => ({
            ...prev,
            eeg: eegData
          }))
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("EventSource error:", error)
        eventSource.close()
      }

      return () => eventSource.close()
    }

    fetchInitialData()
    const cleanup = setupEventSource()
    return cleanup
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  const visualizerOptions = {
    sensorSize: 1.5,
    spikeHeight: 5,
    colors: {
      positive: '#00ff80',
      negative: '#ff8000',
      sensor: '#ff0000'
    },
    scale: {
      brain: 20,
      sensor: 20
    }
  }

  return (
    <div className="w-full h-screen">
      <BrainVisualizer 
        type="EEG"
        sensorData={sensorData}
        options={visualizerOptions}
      />
    </div>
  )
}

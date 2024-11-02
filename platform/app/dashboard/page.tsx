"use client"

import { useEffect, useState, useRef } from 'react'
import { BrainVisualizer } from '@/components/brain-visualizer'

export default function DashboardPage() {
  const [sensorData, setSensorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    let mounted = true

    async function initializeData() {
      try {
        // Get initial sensor positions
        const posRes = await fetch('/api/sensor-positions')
        const positions = await posRes.json()
        
        if (!mounted) return
        
        setSensorData(positions)
        setLoading(false)

        // Setup SSE connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }

        const es = new EventSource('/api/eeg-stream')
        eventSourceRef.current = es

        es.onmessage = (event) => {
          if (!mounted) return
          try {
            const eegData = JSON.parse(event.data)
            setSensorData(prev => ({
              ...prev,
              eeg: eegData
            }))
          } catch (e) {
            console.error('Failed to parse SSE data:', e)
          }
        }

        es.addEventListener('open', () => {
          console.log('SSE Connection established')
        })

        es.addEventListener('error', (e) => {
          console.warn('SSE Connection error:', e)
        })
      } catch (error) {
        console.error('Failed to initialize data:', error)
      }
    }

    initializeData()

    return () => {
      mounted = false
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
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

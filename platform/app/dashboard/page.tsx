"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { BrainVisualizer } from '@/components/brain-visualizer'
import { EEGWaveform } from '@/components/eeg-waveform'
import { throttle } from 'lodash'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const [sensorData, setSensorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [leftWaveformData, setLeftWaveformData] = useState<number[]>([])
  const [rightWaveformData, setRightWaveformData] = useState<number[]>([])

  const throttledSensorUpdate = useCallback(
    throttle((eegData) => {
      if (!isPaused) {
        setSensorData(prev => ({
          ...prev,
          eeg: eegData
        }))
        
        const leftValue = eegData.data[0]?.value || 0
        const rightValue = eegData.data[7]?.value || 0
        setLeftWaveformData(prev => [...prev.slice(-50), leftValue])
        setRightWaveformData(prev => [...prev.slice(-50), rightValue])
      }
    }, 16),
    [isPaused]
  )

  useEffect(() => {
    let mounted = true

    async function initializeData() {
      try {
        const posRes = await fetch('/api/sensor-positions')
        const positions = await posRes.json()
        
        if (!mounted) return
        
        setSensorData(positions)
        setLoading(false)

        if (eventSourceRef.current) {
          eventSourceRef.current.close()
        }

        const es = new EventSource('/api/eeg-stream')
        eventSourceRef.current = es

        es.onmessage = (event) => {
          if (!mounted || isPaused) return
          try {
            const eegData = JSON.parse(event.data)
            throttledSensorUpdate(eegData)
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
  }, [isPaused])

  const toggleStream = useCallback(() => {
    setIsPaused(prev => !prev)
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  const baseVisualizerOptions = {
    sensorSize: 0.8,
    spikeHeight: 5,
    scale: {
      brain: 20,
      sensor: 20
    }
  }

  const leftVisualizerOptions = {
    ...baseVisualizerOptions,
    colors: {
      positive: '#00ff80',
      negative: '#ff8000',
      sensor: '#808080',  // Gray color
      sensorRing: '#a0a0a0'  // Lighter gray for ring
    }
  }

  const rightVisualizerOptions = {
    ...baseVisualizerOptions,
    colors: {
      positive: '#00ff80',
      negative: '#ff8000',
      sensor: '#0088ff',  // Blue color
      sensorRing: '#40a0ff'  // Lighter blue for ring
    }
  }

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex items-center justify-end p-4 gap-2">
        <Button 
          onClick={toggleStream}
          variant="outline"
          size="icon"
          className="w-10 h-10"
        >
          {isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <BrainVisualizer 
            type="EEG"
            sensorData={sensorData}
            options={leftVisualizerOptions}
          />
          <div className="h-32 p-4 bg-black/5 m-4 rounded-lg">
            <EEGWaveform 
              data={leftWaveformData}
              color={leftVisualizerOptions.colors.positive}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <BrainVisualizer 
            type="EEG"
            sensorData={sensorData}
            options={rightVisualizerOptions}
          />
          <div className="h-32 p-4 bg-black/5 m-4 rounded-lg">
            <EEGWaveform 
              data={rightWaveformData}
              color={rightVisualizerOptions.colors.positive}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

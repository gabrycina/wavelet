"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { BrainVisualizer } from '@/components/brain-visualizer'
import { EEGWaveform } from '@/components/eeg-waveform'
import { throttle } from 'lodash'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fft } from 'fft-js'
import { Spinner } from '@/components/ui/spinner';
import { SidebarProvider } from '@/components/ui/sidebar'
import { FrequencyBandsChart } from '@/components/frequency-bands-chart'
import { synthesizer } from '@/lib/audio-synthesizer'

export default function DashboardPage() {
  const [sensorData, setSensorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [frequencyBands, setFrequencyBands] = useState({
    delta: [],
    theta: [],
    alpha: [],
    beta: [],
    gamma: []
  })

  // Buffer to accumulate data
  const dataBuffer = useRef(Array(14).fill([]))

  const BUFFER_SIZE = 32; // Smaller buffer size for faster processing

  const [currentBands, setCurrentBands] = useState({
    delta: [],
    theta: [],
    alpha: [],
    beta: [],
    gamma: []
  });

  const [isLoading, setIsLoading] = useState(true);

  const [isAudioEnabled, setIsAudioEnabled] = useState(false)

  const toggleStream = useCallback(() => {
    setIsPaused(prev => {
      if (!prev && isAudioEnabled) {
        synthesizer.stop()
        setIsAudioEnabled(false)
      }
      return !prev
    })
  }, [isAudioEnabled])

  const toggleAudio = useCallback(() => {
    if (!isPaused) {
      setIsAudioEnabled(prev => {
        if (!prev) {
          synthesizer.start()
        } else {
          synthesizer.stop()
        }
        return !prev
      })
    }
  }, [isPaused])

  useEffect(() => {
    if (isAudioEnabled) {
      synthesizer.updateFrequencyBands(frequencyBands)
    }
  }, [frequencyBands, isAudioEnabled])

  const normalizeData = (data) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    return data.map(value => (2 * (value - min) / (max - min)) - 1);
  };

  const calculateFrequencyBands = (eegData) => {
    if (!eegData || !Array.isArray(eegData)) {
      console.error('Invalid EEG data:', eegData)
      return currentBands;
    }

    eegData.forEach((sensor, index) => {
      dataBuffer.current[index] = [...dataBuffer.current[index], sensor.value];
    });

    if (dataBuffer.current[0].length >= BUFFER_SIZE) {
      const frequencyBands = dataBuffer.current.map(channelData => {
        const fftData = fft(channelData);
        const realParts = fftData.map(([real, imaginary]) => real);

        return {
          delta: normalizeData(realParts.slice(0, 2)),
          theta: normalizeData(realParts.slice(2, 4)),
          alpha: normalizeData(realParts.slice(4, 6)),
          beta: normalizeData(realParts.slice(6, 8)),
          gamma: normalizeData(realParts.slice(8, 10))
        };
      });

      dataBuffer.current = Array(14).fill([]);

      const aggregatedBands = frequencyBands.reduce((acc, bands) => {
        Object.keys(bands).forEach(key => {
          acc[key] = acc[key].concat(bands[key]);
        });
        return acc;
      }, {
        delta: [],
        theta: [],
        alpha: [],
        beta: [],
        gamma: []
      });

      setCurrentBands(aggregatedBands);
      setIsLoading(false);
      return aggregatedBands;
    }

    return currentBands;
  };

  const throttledSensorUpdate = useCallback(
    throttle((eegData) => {
      if (!isPaused) {
        setSensorData(prev => ({
          ...prev,
          eeg: eegData
        }))
        
        const bands = calculateFrequencyBands(eegData.data)
        setFrequencyBands(bands)
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

  if (loading) {
    return <></>
  }

  const baseVisualizerOptions = {
    sensorSize: 1.2,
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
      sensor: '#ff4040',
      sensorRing: '#ff6060'
    }
  }

  const rightVisualizerOptions = {
    ...baseVisualizerOptions,
    colors: {
      positive: '#00ff80',
      negative: '#ff8000',
      sensor: '#0088ff',
      sensorRing: '#40a0ff'
    }
  }

  console.log('Delta Band:', frequencyBands.delta)
  console.log('Theta Band:', frequencyBands.theta)
  console.log('Alpha Band:', frequencyBands.alpha)
  console.log('Beta Band:', frequencyBands.beta)
  console.log('Gamma Band:', frequencyBands.gamma)
  console.log('Buffer Lengths:', dataBuffer.current.map(buf => buf.length))

  return (
    <SidebarProvider>
      <div className="w-full h-screen flex flex-col relative bg-background p-6">
        {/* Top Bar with Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <Button 
              onClick={toggleStream}
              variant="outline"
              size="icon"
              className="w-10 h-10"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            
            <Button 
              onClick={toggleAudio}
              variant="outline"
              size="icon"
              className="w-10 h-10"
              disabled={isPaused}
            >
              {isAudioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Raw Signals
            </Button>
            <Button variant="ghost" size="sm">
              Enhanced Signals
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6">
          {/* Left: Brain Visualization */}
          <div className="flex-1 flex flex-col justify-center">
            <BrainVisualizer 
              type="EEG"
              sensorData={sensorData}
              options={leftVisualizerOptions}
            />
          </div>

          {/* Right: Charts */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Spinner className="w-8 h-8 text-primary" />
              </div>
            ) : (
              <>
                {/* EEG Waveform without card border */}
                    <EEGWaveform data={sensorData.eeg} />

                {/* Frequency Bands without card border */}
                  <h3 className="text-sm font-medium mb-4">Frequency Bands</h3>
                  <FrequencyBandsChart data={frequencyBands} />
              </>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

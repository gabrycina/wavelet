"use client"

import { useEffect, useState, useRef, useCallback } from 'react'
import { BrainVisualizer } from '@/components/brain-visualizer'
import { EEGWaveform } from '@/components/eeg-waveform'
import { throttle } from 'lodash'
import { Play, Pause, Volume2, VolumeX, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fft } from 'fft-js'
import { Spinner } from '@/components/ui/spinner';
import { SidebarProvider } from '@/components/ui/sidebar'
import { FrequencyBandsChart } from '@/components/frequency-bands-chart'
import { synthesizer } from '@/lib/audio-synthesizer'
import { JetBrains_Mono } from 'next/font/google'
import { megSimulator } from '@/lib/meg-simulator'
import { DownloadModal } from '@/components/download-modal'

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
})

function AnimatedVolumeIcon({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div className="relative">
      <Volume2 className={`h-4 w-4 ${isPlaying ? 'text-primary' : ''}`} />
      {isPlaying && (
        <>
          <div className="absolute inset-0 animate-ping-slow rounded-full border border-primary opacity-75" />
          <div className="absolute -inset-0.5 animate-pulse-slow rounded-full border border-primary opacity-50" />
        </>
      )}
    </div>
  )
}

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

  const [signalType, setSignalType] = useState<'raw' | 'enhanced'>('raw')

  const [megData, setMegData] = useState<number[][]>([])

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
    setIsAudioEnabled(!isAudioEnabled)
    if (!isAudioEnabled) {
      synthesizer.start()
      synthesizer.setMode(signalType === 'raw' ? 'eeg' : 'meg')
    } else {
      synthesizer.stop()
    }
  }, [isAudioEnabled, signalType])

  useEffect(() => {
    if (isAudioEnabled && frequencyBands) {
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
        const realParts = fftData.map(([real, imaginary]) => {
          // Calculate magnitude for smoother transitions
          return Math.sqrt(real * real + imaginary * imaginary);
        });

        // Apply smoothing and scaling factors
        return {
          delta: realParts.slice(0, 4).map(v => v * 0.8),  // 0-4 Hz
          theta: realParts.slice(4, 8).map(v => v * 0.7),  // 4-8 Hz
          alpha: realParts.slice(8, 13).map(v => v * 0.6), // 8-13 Hz
          beta: realParts.slice(13, 30).map(v => v * 0.5), // 13-30 Hz
          gamma: realParts.slice(30, 50).map(v => v * 0.4) // 30-50 Hz
        };
      });

      dataBuffer.current = Array(14).fill([]);

      // Aggregate and smooth the bands
      const aggregatedBands = frequencyBands.reduce((acc, bands) => {
        Object.keys(bands).forEach(key => {
          // Add some randomness for more natural movement
          const jitter = Math.random() * 0.2 - 0.1; // ±0.1
          acc[key] = acc[key].concat(
            bands[key].map(v => Math.max(-1, Math.min(1, v + jitter)))
          );
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

  useEffect(() => {
    if (signalType === 'enhanced') {
      synthesizer.setMode('meg')
    } else {
      synthesizer.setMode('eeg')
    }
  }, [signalType])

  useEffect(() => {
    if (signalType === 'enhanced') {
      const unsubscribe = megSimulator.subscribe(throttle((data) => {
        if (!isPaused) {
          setMegData(data)
          // Transform MEG data to EEG-like format for visualization
          const transformedData = {
            data: data.slice(0, 14).map((value, index) => ({
              value: value[value.length - 1]
            }))
          }
          setSensorData(prev => ({
            ...prev,
            eeg: transformedData
          }))
        }
      }, 16))

      const stopSimulation = megSimulator.start()
      
      return () => {
        unsubscribe()
        stopSimulation()
      }
    }
  }, [signalType, isPaused])

  useEffect(() => {
    if (signalType === 'raw') {
      // Your existing EEG stream code
    }
  }, [signalType, isPaused])

  const toggleSignalType = useCallback((type: 'raw' | 'enhanced') => {
    setSignalType(type)
    if (isAudioEnabled) {
      synthesizer.setMode(type === 'raw' ? 'eeg' : 'meg')
    }
  }, [isAudioEnabled])

  if (loading) {
    return <></>
  }

  const baseVisualizerOptions = {
    sensorSize: 1.2,
    spikeHeight: 12,
    scale: {
      brain: 20,
      sensor: 20
    }
  }

  const leftVisualizerOptions = {
    ...baseVisualizerOptions,
    colors: {
      positive: '#ff4040',
      negative: '#40ff40',
      sensor: '#ff4040',
      sensorRing: '#ff6060'
    }
  }

  const rightVisualizerOptions = {
    ...baseVisualizerOptions,
    colors: {
      positive: '#ff4040',
      negative: '#40ff40',
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
        {/* Wavelet Credit - Now at Top */}
        <div className="flex justify-between items-center mb-6">
          <h1 className={`${jetbrains.className} text-xl text-muted-foreground/90`}>
            <span className="typewriter">
              Welcome to Wavelet Gabriele<span className="cursor">_</span>
            </span>
            <style jsx>{`
              .typewriter {
                overflow: hidden;
                border-right: .15em solid transparent;
                white-space: nowrap;
                animation: typing 3.5s steps(40, end),
                           blink-caret .75s step-end infinite;
              }
              
              @keyframes typing {
                from { width: 0 }
                to { width: 100% }
              }
              
              .cursor {
                animation: blink 1s step-end infinite;
              }
              
              @keyframes blink {
                from, to { opacity: 1 }
                50% { opacity: 0 }
              }
            `}</style>
          </h1>

          <div className="flex items-center gap-2">
            <Button 
              variant={signalType === 'raw' ? "secondary" : "ghost"}
              size="sm"
              className={`font-space tracking-tight transition-all duration-300 ${
                signalType === 'raw' ? 'scale-105' : 'scale-100 opacity-70'
              }`}
              onClick={() => toggleSignalType('raw')}
            >
              Raw Signals
            </Button>

            <div className={`text-muted-foreground/60 transition-all duration-300 ${
              signalType === 'raw' ? 'rotate-0' : 'rotate-180'
            }`}>
              <ArrowRight className="h-4 w-4" />
            </div>

            <Button 
              variant={signalType === 'enhanced' ? "secondary" : "ghost"}
              size="sm"
              className={`font-space tracking-tight transition-all duration-300 ${
                signalType === 'enhanced' ? 'scale-105' : 'scale-100 opacity-70'
              }`}
              onClick={() => toggleSignalType('enhanced')}
            >
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
          <div className="flex-1 flex flex-col justify-center gap-6 pr-16">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Spinner className="w-8 h-8 text-primary" />
              </div>
            ) : (
              <>
                <EEGWaveform 
                  data={sensorData.eeg} 
                  mode={signalType}
                  megData={signalType === 'enhanced' ? megData : null}
                />
                <FrequencyBandsChart data={frequencyBands} />
              </>
            )}
          </div>
        </div>

        {/* Controls - Now at Bottom */}
        <div className="absolute bottom-6 left-6 z-10 flex gap-2">
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
            {isAudioEnabled ? (
              <AnimatedVolumeIcon isPlaying={true} />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          <DownloadModal 
            sensorData={sensorData}
            megData={megData}
          />
        </div>
      </div>
    </SidebarProvider>
  )
}

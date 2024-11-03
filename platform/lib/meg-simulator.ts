import { throttle } from 'lodash'

class MEGSimulator {
  private features: number = 14
  private time: number = 0
  private baseFrequencies: number[]
  private phases: number[]
  private amplitudes: number[]
  private buffer: number[][] = []
  private currentIndex: number = 0
  private callbacks: ((data: number[][]) => void)[] = []

  constructor() {
    // Initialize with more controlled parameters
    this.baseFrequencies = Array(this.features).fill(0).map(() => 
      Math.random() * 0.3 + 0.1 // Frequencies between 0.1 and 0.4 Hz
    )
    this.phases = Array(this.features).fill(0).map(() => 
      Math.random() * Math.PI * 2
    )
    this.amplitudes = Array(this.features).fill(0).map(() => 
      Math.random() * 0.3 + 0.2 // Amplitudes between 0.2 and 0.5
    )

    // Initialize buffer with smoother MEG data
    this.buffer = Array(this.features).fill(0).map((_, i) => 
      Array(1000).fill(0).map(() => this.generateSmoothValue(i))
    )
  }

  private generateSmoothValue(channelIndex: number) {
    const t = this.time
    const baseFreq = this.baseFrequencies[channelIndex]
    const phase = this.phases[channelIndex]
    const amplitude = this.amplitudes[channelIndex]
    
    // Combine waves with different frequencies but controlled amplitudes
    return (
      Math.sin(t * baseFreq + phase) * amplitude +
      Math.sin(t * baseFreq * 1.5 + phase) * (amplitude * 0.5) +
      Math.sin(t * baseFreq * 2.3 + phase) * (amplitude * 0.3) +
      // Add small random variation
      (Math.random() - 0.5) * 0.05
    )
  }

  private generateNextSample() {
    this.time += 0.05 // Adjust time increment for desired wave speed
    return Array(this.features).fill(0).map((_, i) => 
      this.generateSmoothValue(i)
    )
  }

  private updateBuffer() {
    const newSample = this.generateNextSample()
    // Notify subscribers with new data
    this.callbacks.forEach(callback => callback(newSample))
  }

  subscribe(callback: (data: number[][]) => void) {
    this.callbacks.push(callback)
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback)
    }
  }

  start() {
    // Update at 60fps
    const interval = setInterval(() => this.updateBuffer(), 16)
    return () => clearInterval(interval)
  }
}

export const megSimulator = new MEGSimulator()

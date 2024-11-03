import { throttle } from 'lodash'

class MEGSimulator {
  private features: number = 306
  private sampleRate: number = 1000 // Hz
  private buffer: number[][] = []
  private currentIndex: number = 0
  private callbacks: ((data: number[][]) => void)[] = []

  constructor() {
    // Initialize buffer with simulated MEG data
    this.buffer = Array(this.features).fill(0).map(() => 
      Array(1000).fill(0).map(() => // Keep 1 second of data in memory
        (Math.random() - 0.5) * 2 // Random values between -1 and 1
      )
    )
  }

  private generateNextSample() {
    // Generate new sample for each feature
    return Array(this.features).fill(0).map(() => 
      (Math.random() - 0.5) * 2
    )
  }

  private updateBuffer() {
    // Add new sample to buffer
    const newSample = this.generateNextSample()
    for (let i = 0; i < this.features; i++) {
      this.buffer[i].shift() // Remove oldest sample
      this.buffer[i].push(newSample[i]) // Add new sample
    }
    
    // Notify subscribers
    this.callbacks.forEach(callback => callback(this.buffer))
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

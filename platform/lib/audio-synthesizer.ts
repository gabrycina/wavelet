import { FrequencyBands } from '@/types/eeg'

class AudioSynthesizer {
  private audioContext: AudioContext | null = null
  private oscillators: Map<string, OscillatorNode>
  private gainNodes: Map<string, GainNode>
  private isPlaying: boolean

  constructor() {
    this.oscillators = new Map()
    this.gainNodes = new Map()
    this.isPlaying = false
  }

  private createOscillators() {
    // Clear existing oscillators
    this.oscillators.clear()
    this.gainNodes.clear()

    const frequencies = {
      delta: 2,    // 0.5-4 Hz
      theta: 5,    // 4-8 Hz
      alpha: 10,   // 8-13 Hz
      beta: 20,    // 13-32 Hz
      gamma: 40    // 32+ Hz
    }

    Object.entries(frequencies).forEach(([band, freq]) => {
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
      
      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime)
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext!.destination)
      
      this.oscillators.set(band, oscillator)
      this.gainNodes.set(band, gainNode)
    })
  }

  private initializeAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
    }
    this.createOscillators()
  }

  start() {
    if (this.isPlaying) return
    this.initializeAudioContext()
    this.oscillators.forEach(osc => osc.start())
    this.isPlaying = true
  }

  stop() {
    if (!this.isPlaying || !this.audioContext) return
    
    // Stop and disconnect old oscillators
    this.oscillators.forEach(osc => {
      osc.stop()
      osc.disconnect()
    })
    this.gainNodes.forEach(gain => gain.disconnect())
    
    this.isPlaying = false
  }

  updateFrequencyBands(bands: FrequencyBands) {
    if (!this.audioContext || !this.isPlaying) return

    Object.entries(bands).forEach(([band, values]) => {
      const gainNode = this.gainNodes.get(band)
      if (!gainNode || !values.length) return

      const latestValue = values.slice(-1)[0]
      const volume = Math.min(Math.abs(latestValue) * 0.2, 0.2)
      
      gainNode.gain.setValueAtTime(volume, this.audioContext!.currentTime)
    })
  }
}

export const synthesizer = new AudioSynthesizer()

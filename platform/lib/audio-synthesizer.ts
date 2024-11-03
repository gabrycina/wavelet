class AudioSynthesizer {
  private audioContext: AudioContext | null = null
  private oscillators: OscillatorNode[] = []
  private gainNodes: GainNode[] = []
  private filterNodes: BiquadFilterNode[] = []
  private noiseNodes: AudioBufferSourceNode[] = []
  private noiseGainNodes: GainNode[] = []
  private masterGain: GainNode | null = null
  private mode: 'eeg' | 'meg' = 'eeg'
  private isInitialized: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new AudioContext()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.connect(this.audioContext.destination)
      this.masterGain.gain.setValueAtTime(0.3, this.audioContext.currentTime)
    }
  }

  private createNoise() {
    const bufferSize = this.audioContext!.sampleRate * 2
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate)
    const data = buffer.getChannelData(0)
    
    // Generate pink noise for EEG (more natural sounding than white noise)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362
      data[i] *= 0.11 // Scaling down the noise
    }

    return buffer
  }

  private initializeOscillators() {
    if (this.isInitialized) return
    
    // Create 5 oscillators for different frequency bands
    for (let i = 0; i < 5; i++) {
      const oscillator = this.audioContext!.createOscillator()
      const gainNode = this.audioContext!.createGain()
      const filter = this.audioContext!.createBiquadFilter()

      // Configure nodes
      oscillator.type = this.mode === 'meg' ? 'sine' : 'triangle'
      filter.type = 'bandpass'

      // Connect nodes
      oscillator.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(this.masterGain!)

      // Initialize gain to 0
      gainNode.gain.setValueAtTime(0, this.audioContext!.currentTime)

      // Store nodes
      this.oscillators[i] = oscillator
      this.gainNodes[i] = gainNode
      this.filterNodes[i] = filter

      // Start oscillator
      oscillator.start()
    }

    // Add noise generators for EEG
    for (let i = 0; i < 5; i++) {
      const noiseGain = this.audioContext!.createGain()
      noiseGain.gain.setValueAtTime(0, this.audioContext!.currentTime)
      noiseGain.connect(this.masterGain!)
      
      const noiseSource = this.audioContext!.createBufferSource()
      noiseSource.buffer = this.createNoise()
      noiseSource.loop = true
      noiseSource.connect(noiseGain)
      noiseSource.start()
      
      this.noiseNodes[i] = noiseSource
      this.noiseGainNodes[i] = noiseGain
    }

    this.isInitialized = true
    console.log('Audio synthesizer initialized')
  }

  updateFrequencyBands(bands: { 
    delta: number[], 
    theta: number[], 
    alpha: number[], 
    beta: number[], 
    gamma: number[] 
  }) {
    if (!this.audioContext || !bands) return
    
    // Make sure oscillators are initialized
    this.initializeOscillators()

    // Get the latest values from each band
    const values = [
      bands.delta[bands.delta.length - 1] || 0,
      bands.theta[bands.theta.length - 1] || 0,
      bands.alpha[bands.alpha.length - 1] || 0,
      bands.beta[bands.beta.length - 1] || 0,
      bands.gamma[bands.gamma.length - 1] || 0
    ]

    console.log('Updating frequencies with values:', values)

    if (this.mode === 'meg') {
      values.forEach((value, i) => {
        const baseFreq = 220 * (i + 1)
        const normalizedValue = Math.max(0, Math.min(1, (value + 1) / 2))
        
        this.oscillators[i].frequency.setTargetAtTime(
          baseFreq + normalizedValue * baseFreq,
          this.audioContext!.currentTime,
          0.05
        )
        this.gainNodes[i].gain.setTargetAtTime(
          normalizedValue * 0.15,
          this.audioContext!.currentTime,
          0.01
        )
        this.filterNodes[i].Q.setValueAtTime(15, this.audioContext!.currentTime)
        this.noiseGainNodes[i].gain.setTargetAtTime(0, this.audioContext!.currentTime, 0.01)
      })
    } else {
      values.forEach((value, i) => {
        const baseFreq = 110 * (i + 1)
        const normalizedValue = Math.max(0, Math.min(1, (value + 1) / 2))
        
        this.oscillators[i].frequency.setValueAtTime(
          baseFreq + normalizedValue * baseFreq,
          this.audioContext!.currentTime
        )
        this.gainNodes[i].gain.setValueAtTime(
          normalizedValue * 0.2 * (0.8 + Math.random() * 0.4),
          this.audioContext!.currentTime
        )
        this.filterNodes[i].Q.setValueAtTime(2, this.audioContext!.currentTime)
        this.noiseGainNodes[i].gain.setValueAtTime(
          normalizedValue * 0.1,
          this.audioContext!.currentTime
        )
      })
    }
  }

  setMode(mode: 'eeg' | 'meg') {
    console.log('Setting mode to:', mode)
    this.mode = mode
    if (this.isInitialized) {
      this.oscillators.forEach(osc => {
        osc.type = mode === 'meg' ? 'sine' : 'triangle'
      })
    }
  }

  start() {
    console.log('Starting audio synthesis')
    this.audioContext?.resume()
    this.initializeOscillators()
  }

  stop() {
    console.log('Stopping audio synthesis')
    this.audioContext?.suspend()
  }
}

export const synthesizer = new AudioSynthesizer()

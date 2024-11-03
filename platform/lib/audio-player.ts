class AudioPlayer {
  private audio: HTMLAudioElement | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/taylor-swift.mp3') // You'll need to add this file
      this.audio.loop = true
    }
  }

  start() {
    this.audio?.play()
  }

  stop() {
    this.audio?.pause()
    if (this.audio) {
      this.audio.currentTime = 0
    }
  }
}

export const audioPlayer = new AudioPlayer()

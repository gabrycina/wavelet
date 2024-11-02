import * as THREE from 'three'

export function getSignalColor(value: number, range: [number, number]): THREE.Color {
  const [min, max] = range
  const normalized = (value - min) / (max - min)
  
  // Create a gradient from blue (cold) to red (hot)
  if (value < 0) {
    // Negative values: blue gradient
    return new THREE.Color(0, 0, Math.min(1, Math.abs(normalized) + 0.2))
  } else {
    // Positive values: red gradient
    return new THREE.Color(Math.min(1, normalized + 0.2), 0, 0)
  }
} 
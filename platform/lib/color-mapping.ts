import * as THREE from 'three'

export function getActivityColor(value: number, minMax: [number, number]): THREE.Color {
  const [min, max] = minMax
  const normalized = (value - min) / (max - min) // 0 to 1
  
  // Color gradient: blue (cold) -> white -> red (hot)
  if (normalized < 0.5) {
    // Blue to white
    const t = normalized * 2
    return new THREE.Color(t, t, 1)
  } else {
    // White to red
    const t = (normalized - 0.5) * 2
    return new THREE.Color(1, 1 - t, 1 - t)
  }
}

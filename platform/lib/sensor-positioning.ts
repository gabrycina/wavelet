import * as THREE from 'three'

// Improved Fibonacci sphere algorithm for more even distribution
export function generateSpherePoints(numPoints: number, radius: number) {
  const points: THREE.Vector3[] = []
  const phi = Math.PI * (3 - Math.sqrt(5)) // golden angle in radians

  for (let i = 0; i < numPoints; i++) {
    const y = (1 - (i / (numPoints - 1)) * 1)  // y goes from 1 to 0
    const radius_at_y = Math.sqrt(1 - y * y)  // radius at y
    
    const theta = phi * i  // golden angle increment

    const x = Math.cos(theta) * radius_at_y
    const z = Math.sin(theta) * radius_at_y

    if (y >= 0) {
      points.push(new THREE.Vector3(
        x * radius,
        y * radius,
        z * radius
      ))
    }
  }

  while (points.length < numPoints) {
    const i = points.length
    const y = Math.random() * 0.3 + 0.7  // Add points near the top (0.7 to 1.0)
    const radius_at_y = Math.sqrt(1 - y * y)
    const theta = phi * i

    const x = Math.cos(theta) * radius_at_y
    const z = Math.sin(theta) * radius_at_y

    points.push(new THREE.Vector3(
      x * radius,
      y * radius,
      z * radius
    ))
  }

  return points
}

// Modified surface mapping function with better occlusion checking
export function mapPointToBrainSurface(
  point: THREE.Vector3,
  brainMesh: THREE.Mesh,
  camera: THREE.Camera,
  offset: number = 0.1
): THREE.Vector3 | null {
  // Create a ray from slightly outside the point towards the brain center
  const direction = new THREE.Vector3(0, 0, 0).sub(point).normalize()
  const startPoint = point.clone().add(direction.clone().multiplyScalar(-20))
  
  const raycaster = new THREE.Raycaster()
  raycaster.set(startPoint, direction)
  
  // Increase the precision
  raycaster.params.Points.threshold = 0.1
  
  const intersects = raycaster.intersectObject(brainMesh, true)
  
  if (intersects.length > 0) {
    const hitPoint = intersects[0].point
    const normal = intersects[0].face?.normal || direction.clone().negate()
    
    // Add small offset along normal
    return hitPoint.clone().add(normal.multiplyScalar(offset))
  }
  
  // Fallback: If no intersection, project onto a sphere approximating the brain
  const brainRadius = 15 // Approximate brain radius
  const normalized = point.clone().normalize()
  return normalized.multiplyScalar(brainRadius)
} 
import * as THREE from 'three'

// Improved Fibonacci sphere algorithm for more even distribution
export function generateSpherePoints(numPoints: number, radius: number) {
  const points: THREE.Vector3[] = []
  
  // Golden angle in radians
  const phi = Math.PI * (3 - Math.sqrt(5))
  // Distance between points, normalized to [0, 1]
  const increment = 1.0 / numPoints
  
  for (let i = 0; i < numPoints; i++) {
    // Modified to create a ring pattern
    const y = ((i * increment)) * 0.5 + 0.3  // Height range from 0.3 to 0.8
    const radiusAtY = Math.sqrt(1 - y * y)
    
    const theta = phi * i

    // Ensure minimum distance from center by scaling radiusAtY
    const minRadius = 0.6 // Minimum distance from center axis
    const scaledRadius = radiusAtY * (minRadius + (1 - minRadius))

    const x = Math.cos(theta) * scaledRadius
    const z = Math.sin(theta) * scaledRadius

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
  // Start from outside but not too far
  const startPoint = point.clone().normalize().multiplyScalar(30)
  const directionToCenter = point.clone().negate().normalize()
  
  const raycaster = new THREE.Raycaster(startPoint, directionToCenter)
  const intersects = raycaster.intersectObject(brainMesh)
  
  if (intersects.length > 0) {
    const hitPoint = intersects[0].point
    const normal = intersects[0].face!.normal
    
    // Check distance from center axis
    const distanceFromCenter = Math.sqrt(hitPoint.x * hitPoint.x + hitPoint.z * hitPoint.z)
    
    // Only accept points that are far enough from center and above middle
    if (hitPoint.y > -2 && distanceFromCenter > 10) { // Adjust the 10 based on your brain scale
      return hitPoint.clone().add(normal.multiplyScalar(offset))
    }
  }
  
  return null
} 
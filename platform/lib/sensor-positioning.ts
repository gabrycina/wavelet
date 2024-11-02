import * as THREE from 'three'

// Improved Fibonacci sphere algorithm for more even distribution
export function generateSpherePoints(numPoints: number, radius: number) {
  const points: THREE.Vector3[] = []
  
  // Create points in a cap pattern
  for (let i = 0; i < numPoints; i++) {
    // Use polar coordinates to create a cap shape
    const phi = Math.acos(1 - (i / numPoints) * 0.5) // Range from 0 to ~1.0 radians
    const theta = i * Math.PI * (3 - Math.sqrt(5)) // Golden angle

    const x = Math.sin(phi) * Math.cos(theta)
    const y = Math.cos(phi)
    const z = Math.sin(phi) * Math.sin(theta)

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
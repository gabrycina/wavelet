"use client"

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function WaveBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mousePosition = useRef({ x: 0, y: 0 })
  const targetMousePosition = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    if (!containerRef.current) return
    
    // Setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true // Smoother rendering
    })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)
    
    // Create grid of points
    const geometry = new THREE.BufferGeometry()
    const material = new THREE.PointsMaterial({
      size: 2.5,
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true // Points scale with distance
    })
    
    // Create grid points with more density
    const points = []
    const gridSize = 60 // Increased grid size
    const spacing = 15 // Decreased spacing
    
    for (let x = -gridSize; x <= gridSize; x += 1.5) {
      for (let z = -gridSize; z <= gridSize; z += 1.5) {
        // Add slight random offset to each point for more organic look
        const xPos = x * spacing + (Math.random() - 0.5) * spacing * 0.5
        const zPos = z * spacing + (Math.random() - 0.5) * spacing * 0.5
        points.push(xPos, 0, zPos)
      }
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    const pointCloud = new THREE.Points(geometry, material)
    scene.add(pointCloud)
    
    // Position camera
    camera.position.y = 350
    camera.position.z = 100
    camera.lookAt(0, 0, 0)
    
    // Smooth mouse move handler
    const onMouseMove = (event: MouseEvent) => {
      targetMousePosition.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1
      }
    }
    
    window.addEventListener('mousemove', onMouseMove)
    
    // Animation
    let time = 0
    function animate() {
      requestAnimationFrame(animate)
      time += 0.002
      
      // Smooth mouse movement
      mousePosition.current.x += (targetMousePosition.current.x - mousePosition.current.x) * 0.05
      mousePosition.current.y += (targetMousePosition.current.y - mousePosition.current.y) * 0.05
      
      const positions = geometry.attributes.position.array as Float32Array
      
      // Update points
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i]
        const z = positions[i + 2]
        
        // Calculate distance from mouse with smoother falloff
        const dx = x / (gridSize * spacing) - mousePosition.current.x * 0.5
        const dz = z / (gridSize * spacing) - mousePosition.current.y * 0.5
        const distance = Math.sqrt(dx * dx + dz * dz)
        
        // Create multiple wave effects
        const wave1 = Math.sin(time + distance * 2) * 10
        const wave2 = Math.cos(time * 0.8 + distance * 3) * 5
        const wave3 = Math.sin(time * 1.2 + distance * 4) * 3
        
        // Combine waves and add mouse interaction
        const mouseEffect = Math.exp(-distance * 1.5) * 20 // Smoother mouse falloff
        const totalWave = (wave1 + wave2 + wave3) * Math.exp(-distance * 0.5)
        
        positions[i + 1] = totalWave + mouseEffect * mousePosition.current.y
      }
      
      geometry.attributes.position.needsUpdate = true
      
      // Gentle camera movement
      camera.position.y = 350 + Math.sin(time * 0.5) * 20
      camera.position.x = Math.sin(time * 0.2) * 50
      camera.lookAt(0, 0, 0)
      
      renderer.render(scene, camera)
    }
    
    animate()
    
    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', handleResize)
      containerRef.current?.removeChild(renderer.domElement)
      geometry.dispose()
      material.dispose()
    }
  }, [])
  
  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 -z-10 bg-gradient-to-b from-background to-background/80"
    />
  )
}

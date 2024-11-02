"use client"

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { generateSpherePoints, mapPointToBrainSurface } from '@/lib/sensor-positioning'

interface BrainVisualizerProps {
  type: 'EEG' | 'MEG';
  sensorData: {
    sensors: any[];
    eeg: {
      data: any[];
    };
  };
  options: {
    sensorSize: number;
    spikeHeight: number;
    colors: {
      positive: string;
      negative: string;
      sensor: string;
    };
    scale: {
      brain: number;
      sensor: number;
    };
  };
}

// Helper function for activity color (add at top of file or in a utils file)
function getActivityGradient(value: number, [min, max]: [number, number]): THREE.Color {
  // Normalize value between 0 and 1
  const normalized = (value - min) / (max - min)
  
  // Green: rgb(0, 255, 0) to Purple: rgb(128, 0, 255)
  return new THREE.Color(
    normalized * 0.5,    // R: 0 to 0.5
    1 - normalized,      // G: 1 to 0
    normalized          // B: 0 to 1
  )
}

export function BrainVisualizer({ type, sensorData, options }: BrainVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const brainRef = useRef<THREE.Group | null>(null)
  const spikesRef = useRef<THREE.Object3D[]>([])
  const animationFrameRef = useRef<number>()

  // Setup scene, lights, and load brain model - only once
  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    sceneRef.current = scene
    
    // Fix aspect ratio calculation
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    camera.position.set(0, 0, 100) // Adjust camera position
    cameraRef.current = camera
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance" 
    })
    rendererRef.current = renderer
    
    // Balanced ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)

    // Subtle fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4)
    fillLight.position.set(-1, 0.5, -0.5)
    scene.add(fillLight)

    // Add a hemisphere light for more natural illumination
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0)
    scene.add(hemisphereLight)
    
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    containerRef.current.appendChild(renderer.domElement)
    
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 50
    controls.maxDistance = 200
    controls.maxPolarAngle = Math.PI // Allow full vertical rotation

    const loader = new GLTFLoader()
    
    loader.load('/brain-model.glb', 
      (gltf) => {
        const brain = gltf.scene
        
        // Adjust scale to maintain proportions
        brain.scale.set(20, 20, 20)
        
        // Center the brain
        const box = new THREE.Box3().setFromObject(brain)
        const center = box.getCenter(new THREE.Vector3())
        brain.position.sub(center)
        
        brainRef.current = brain
        
        brain.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0xdfdfdf, // Lighter gray (increased from 0xcccccc)
              shininess: 20,
              transparent: true,
              opacity: 0.95,
            })
          }
        })

        scene.add(brain)
        
        // Collect surface points
        validPointsRef.current = []
        brain.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const geometry = child.geometry
            const position = geometry.attributes.position
            
            for (let i = 0; i < position.count; i += 100) {
              const vertex = new THREE.Vector3()
              vertex.fromBufferAttribute(position, i)
              vertex.applyMatrix4(child.matrixWorld)
              validPointsRef.current.push(vertex.clone())
            }
          }
        })
      },
      undefined,
      (error) => console.error('Error loading brain model:', error)
    )

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      controls.dispose()
      renderer.dispose()
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, []) // Empty dependency array

  // Update spikes when sensor data changes
  useEffect(() => {
    if (!sceneRef.current || !sensorData?.sensors || !brainRef.current || !cameraRef.current) return
    
    // Remove old spikes
    spikesRef.current.forEach(spike => {
      sceneRef.current?.remove(spike)
      spike.geometry.dispose()
      if (spike.material instanceof THREE.Material) {
        spike.material.dispose()
      }
    })
    spikesRef.current = []

    // Find the brain mesh
    let brainMesh: THREE.Mesh | null = null
    brainRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        brainMesh = child
      }
    })

    if (!brainMesh) return

    // Create new spikes for each sensor
    sensorData.sensors.forEach((sensor, i) => {
      // Create initial sensor position vector
      const initialPos = new THREE.Vector3(
        sensor.position.x * options.scale.sensor,
        sensor.position.y * options.scale.sensor,
        sensor.position.z * options.scale.sensor
      )

      // Map the point to the brain surface
      const mappedPosition = mapPointToBrainSurface(
        initialPos,
        brainMesh,
        cameraRef.current!,
        0.5 // offset from surface
      )

      if (mappedPosition) {
        // Create sensor sphere at mapped position
        const sensorGeometry = new THREE.SphereGeometry(0.8, 16, 16)  // Smaller size
        const sensorMaterial = new THREE.MeshPhongMaterial({
          color: 0x444444,        // Dark gray
          emissive: 0x222222,     // Darker emissive
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.95,
          shininess: 30
        })
        const sensorMesh = new THREE.Mesh(sensorGeometry, sensorMaterial)
        sensorMesh.position.copy(mappedPosition)
        sceneRef.current?.add(sensorMesh)
        spikesRef.current.push(sensorMesh)

        // Get EEG value for this sensor
        const value = sensorData.eeg?.data?.[i]?.value || 0
        
        if (value !== 0) {
          // Create spike pointing outward from the brain surface
          const height = Math.abs(value) * 3  // Smaller height multiplier
          const spikeGeometry = new THREE.CylinderGeometry(0.2, 0, height, 8)  // Thinner spike
          const color = value > 0 ? 
            new THREE.Color(0x00ff80) :  // Cyan/green for positive
            new THREE.Color(0xff8000)    // Orange for negative

          const spikeMaterial = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            emissive: color,
            emissiveIntensity: 0.3  // Lower intensity
          })

          const spike = new THREE.Mesh(spikeGeometry, spikeMaterial)
          spike.position.copy(mappedPosition)

          // Orient spike along surface normal
          const normal = mappedPosition.clone().sub(brainMesh.position).normalize()
          spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)

          sceneRef.current?.add(spike)
          spikesRef.current.push(spike)
        }
      }
    })
  }, [sensorData, options])

  return <div ref={containerRef} className="w-full h-full" />
}
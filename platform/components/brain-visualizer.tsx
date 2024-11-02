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
  const sensorMeshesRef = useRef<THREE.Mesh[]>([])
  const spikeMeshesRef = useRef<THREE.Mesh[]>([])
  const animationFrameRef = useRef<number>()
  const validPointsRef = useRef<THREE.Vector3[]>([])

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

  // Update sensor and spike positions
  useEffect(() => {
    if (!sensorData?.sensors || !brainRef.current || !sceneRef.current) return

    // Clear old meshes efficiently
    const scene = sceneRef.current
    sensorMeshesRef.current.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      mesh.material instanceof THREE.Material && mesh.material.dispose()
    })
    spikeMeshesRef.current.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      mesh.material instanceof THREE.Material && mesh.material.dispose()
    })
    sensorMeshesRef.current = []
    spikeMeshesRef.current = []

    // Reuse geometries and materials
    const sensorGeometry = new THREE.SphereGeometry(options.sensorSize, 16, 16)
    const sensorMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(options.colors.sensor),
      emissive: new THREE.Color(options.colors.sensor),
      emissiveIntensity: 0.5
    })
    const spikeBaseGeometry = new THREE.CylinderGeometry(0.2, 0, 1, 8) // Base geometry to scale

    const brainMesh = brainRef.current?.children[0] as THREE.Mesh
    if (!brainMesh) return

    // Batch process sensors
    sensorData.sensors.forEach((sensor, i) => {
      if (!sensor.position) return

      const initialPos = new THREE.Vector3(
        sensor.position.x * options.scale.sensor * 0.5,
        sensor.position.y * options.scale.sensor * 0.5,
        sensor.position.z * options.scale.sensor * 0.5
      )

      const mappedPosition = mapPointToBrainSurface(
        initialPos,
        brainMesh,
        cameraRef.current!,
        0.5
      ) || initialPos.normalize().multiplyScalar(15)

      // Create sensor
      const sensorMesh = new THREE.Mesh(sensorGeometry, sensorMaterial)
      sensorMesh.position.copy(mappedPosition)
      scene.add(sensorMesh)
      sensorMeshesRef.current.push(sensorMesh)

      // Create spike if needed
      const value = sensorData.eeg?.data?.[i]?.value
      if (value !== undefined && value !== 0) {
        const height = Math.abs(value) * options.spikeHeight
        const spike = new THREE.Mesh(
          spikeBaseGeometry,
          new THREE.MeshPhongMaterial({
            color: value > 0 ? options.colors.positive : options.colors.negative,
            emissive: value > 0 ? options.colors.positive : options.colors.negative,
            emissiveIntensity: 0.5
          })
        )
        spike.scale.y = height
        spike.position.copy(mappedPosition)

        const normal = mappedPosition.clone().sub(brainMesh.position).normalize()
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)

        scene.add(spike)
        spikeMeshesRef.current.push(spike)
      }
    })

    // Clean up geometries
    return () => {
      sensorGeometry.dispose()
      sensorMaterial.dispose()
      spikeBaseGeometry.dispose()
    }
  }, [sensorData, options])

  return <div ref={containerRef} className="w-full h-full" />
}
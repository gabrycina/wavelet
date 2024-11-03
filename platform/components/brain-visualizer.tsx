"use client"

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mapPointToBrainSurface } from '@/lib/sensor-positioning'

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
      sensorRing: string;
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
  const materialRefs = useRef({
    sensor: null as THREE.MeshPhongMaterial | null,
    ring: null as THREE.MeshPhongMaterial | null,
    spikePositive: null as THREE.MeshPhongMaterial | null,
    spikeNegative: null as THREE.MeshPhongMaterial | null
  })
  const lastSpikeDataRef = useRef<any>(null) // Store last spike data

  // Setup scene, lights, and load brain model - only once
  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene
    
    // Fix aspect ratio calculation
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000)
    camera.position.set(-100, 30, 50) 
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera
    
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance",
      precision: "mediump", // Lower precision for better performance
      alpha: false, // We don't need transparency in the canvas
      stencil: false,
      depth: true
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
    controls.rotateSpeed = 0.8
    controls.zoomSpeed = 0.8
    controls.enablePan = false // Disable panning for better performance
    controls.minDistance = 80
    controls.maxDistance = 400

    const loader = new GLTFLoader()
    
    loader.load('/brain-model.glb', 
      (gltf) => {
        const brain = gltf.scene
        
        // Make brain bigger
        brain.scale.set(40, 40, 40)  // Increased from 30
        
        // Center the brain
        const box = new THREE.Box3().setFromObject(brain)
        const center = box.getCenter(new THREE.Vector3())
        brain.position.sub(center)
        
        brainRef.current = brain
        
        // Update the brain material section
        brain.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0xc0c0c0,        // Light gray instead of white
              specular: 0x222222,     // Subtle highlights
              shininess: 80,          
              transparent: true,
              opacity: 0.75,          
              side: THREE.DoubleSide
            })
          }
        })

        // Clean lighting setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
        scene.add(ambientLight)

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
        mainLight.position.set(1, 1, 1)
        scene.add(mainLight)

        // Add a contrasting rim light for edge definition
        const rimLight = new THREE.DirectionalLight(0x00ffff, 0.4)  // Cyan rim light
        rimLight.position.set(-1, 0, -1)
        scene.add(rimLight)

        // Add environment map for reflections
        const pmremGenerator = new THREE.PMREMGenerator(renderer)
        const envTexture = new THREE.CubeTextureLoader().load([
          '/env/px.jpg', '/env/nx.jpg',
          '/env/py.jpg', '/env/ny.jpg',
          '/env/pz.jpg', '/env/nz.jpg'
        ], () => {
          const envMap = pmremGenerator.fromCubemap(envTexture).texture
          scene.environment = envMap
          pmremGenerator.dispose()
        })

        scene.add(brain)
        
        // Optimize point sampling
        validPointsRef.current = []
        brain.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const geometry = child.geometry
            const position = geometry.attributes.position
            
            // Sample fewer points
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

    const scene = sceneRef.current

    // Clear old meshes efficiently
    sensorMeshesRef.current.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }
    })
    spikeMeshesRef.current.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose()
      }
    })
    sensorMeshesRef.current = []
    spikeMeshesRef.current = []

    // Store the latest EEG data if it exists
    if (sensorData.eeg?.data) {
      lastSpikeDataRef.current = sensorData.eeg
    }

    // Use the most recent data (either current or last stored)
    const eegData = sensorData.eeg?.data ? sensorData.eeg : lastSpikeDataRef.current

    // Create or update shared materials
    if (!materialRefs.current.sensor) {
      materialRefs.current.sensor = new THREE.MeshPhongMaterial({
        color: new THREE.Color(options.colors.sensor),
        emissive: new THREE.Color(options.colors.sensor),
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.6,
        shininess: 90
      })
    }
    if (!materialRefs.current.ring) {
      materialRefs.current.ring = new THREE.MeshPhongMaterial({
        color: new THREE.Color(options.colors.sensorRing),
        emissive: new THREE.Color(options.colors.sensorRing),
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.6
      })
    }

    // Reuse geometries
    const sensorGeometry = new THREE.SphereGeometry(options.sensorSize, 8, 8)
    const ringGeometry = new THREE.TorusGeometry(options.sensorSize * 1.2, 0.1, 6, 12)
    const spikeBaseGeometry = new THREE.CylinderGeometry(0.2, 0, 1, 6)

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

      // Create sensor sphere using shared material
      const sensorMesh = new THREE.Mesh(sensorGeometry, materialRefs.current.sensor!)
      sensorMesh.position.copy(mappedPosition)
      scene.add(sensorMesh)
      sensorMeshesRef.current.push(sensorMesh)

      // Add ring around sensor using shared material
      const ring = new THREE.Mesh(ringGeometry, materialRefs.current.ring!)
      ring.position.copy(mappedPosition)
      
      // Orient ring to face camera
      const normal = mappedPosition.clone().sub(brainMesh.position).normalize()
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
      scene.add(ring)
      sensorMeshesRef.current.push(ring)

      // Create spike if needed using the eegData
      const value = eegData?.data?.[i]?.value
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
      ringGeometry.dispose()
      spikeBaseGeometry.dispose()
    }
  }, [sensorData, options])

  return <div ref={containerRef} className="w-full h-full" />
}
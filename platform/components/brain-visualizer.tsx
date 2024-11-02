"use client"

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { generateSpherePoints, mapPointToBrainSurface } from '@/lib/sensor-positioning'
import { EEGSensor, EEGData } from '@/types/eeg'

interface BrainVisualizerProps {
  type: 'EEG' | 'MEG';
  sensorData: EEGData;
  options?: {
    showLabels?: boolean;
    sensorSize?: number;
    colorScale?: [number, number]; // [min, max] for value mapping
  };
}

export function BrainVisualizer({ 
  type,
  sensorData,
  options
}: BrainVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.setClearColor(0xffffff, 1)
    containerRef.current.appendChild(renderer.domElement)

    const loader = new GLTFLoader()
    
    // Set camera position for better viewing angle
    camera.position.set(0, 10, 40)
    camera.lookAt(0, 0, 0)

    loader.load(
      '/brain-model.glb',
      (gltf: any) => {
        const brain = gltf.scene
        
        // Increase scale significantly
        brain.scale.set(25, 25, 25)
        
        // Center the brain
        const box = new THREE.Box3().setFromObject(brain)
        const center = box.getCenter(new THREE.Vector3())
        brain.position.sub(center)
        
        brain.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            const brainMesh = child
            
            // Get brain bounds
            const boundingSphere = new THREE.Sphere()
            new THREE.Box3().setFromObject(brain).getBoundingSphere(boundingSphere)
            
            // Generate points only for top hemisphere
            const extraPoints = sensorData.sensors.length * 2
            let sensorPoints = generateSpherePoints(extraPoints, boundingSphere.radius * 1.1)
            
            // Additional filtering for top hemisphere
            sensorPoints = sensorPoints.filter(point => {
              const normalizedY = point.y / boundingSphere.radius
              const distanceFromCenter = Math.sqrt(point.x * point.x + point.z * point.z) / boundingSphere.radius
              
              return (
                normalizedY > 0.1 && // Above middle
                distanceFromCenter > 0.4 && // Away from center
                distanceFromCenter < 0.9 && // Not too far out
                Math.abs(point.z) < boundingSphere.radius * 0.8 // Not too far front/back
              )
            })
            
            // Map points to surface
            const validPoints = sensorPoints
              .map(point => mapPointToBrainSurface(point, brainMesh, camera, 0.1))
              .filter((point): point is THREE.Vector3 => point !== null)
              .slice(0, sensorData.sensors.length)

            // Create sensors at valid points
            validPoints.forEach((surfacePoint, i) => {
              const sensorGeometry = type === 'EEG' 
                ? new THREE.CylinderGeometry(0.8, 0.8, 0.4, 32)
                : new THREE.SphereGeometry(1.0, 32, 32)
              
              const sensorMaterial = new THREE.MeshStandardMaterial({ 
                color: type === 'EEG' ? 0xff3333 : 0x3333ff,
                emissive: type === 'EEG' ? 0xff0000 : 0x0000ff,
                emissiveIntensity: 0.3,
                metalness: 0.9,
                roughness: 0.1
              })

              const sensor = new THREE.Mesh(sensorGeometry, sensorMaterial)
              sensor.position.copy(surfacePoint)
              
              if (type === 'EEG') {
                const normal = surfacePoint.clone().normalize()
                sensor.quaternion.setFromUnitVectors(
                  new THREE.Vector3(0, 1, 0),
                  normal
                )
              }
              
              scene.add(sensor)
            })
          }
        })
        
        // Adjust brain material to be more transparent
        brain.traverse((child: any) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x999999,
              roughness: 0.7,
              metalness: 0.1,
              transparent: true,
              opacity: 0.9
            })
          }
        })
        
        scene.add(brain)
      },
      undefined,
      (error: any) => {
        console.error('Error loading brain model:', error)
      }
    )

    // Enhanced lighting for better visibility of sensors
    const frontLight = new THREE.DirectionalLight(0xffffff, 1.5)
    frontLight.position.set(0, 0, 30)
    const backLight = new THREE.DirectionalLight(0xffffff, 1)
    backLight.position.set(0, 0, -30)
    const topLight = new THREE.DirectionalLight(0xffffff, 1)
    topLight.position.set(0, 30, 0)
    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.5)
    bottomLight.position.set(0, -30, 0)
    
    scene.add(frontLight)
    scene.add(backLight)
    scene.add(topLight)
    scene.add(bottomLight)
    scene.add(new THREE.AmbientLight(0x404040, 2))

    // Adjust camera and controls for larger scene
    camera.position.z = 60
    
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 40
    controls.maxDistance = 80

    const animationCallbacks: (() => void)[] = []

    function animate() {
      requestAnimationFrame(animate)
      controls.update()
      animationCallbacks.forEach(callback => callback())
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      renderer.dispose()
      containerRef.current?.replaceChildren()
    }
  }, [type, sensorData, options])

  return <div ref={containerRef} className="w-full h-[400px] rounded-lg relative bg-white" />
}
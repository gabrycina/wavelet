import { NextResponse } from 'next/server'

export async function GET() {
  const sensorPositions = {
    eeg: {
      positions: {
        'Fp1': { x: -0.2, y: 0.9, z: 0.3 },   // Front left
        'Fp2': { x: 0.2, y: 0.9, z: 0.3 },    // Front right
        'F7': { x: -0.6, y: 0.7, z: 0 },      // Temporal left
        'F3': { x: -0.3, y: 0.7, z: 0.4 },
        'Fz': { x: 0, y: 0.7, z: 0.5 },       // Midline
        'F4': { x: 0.3, y: 0.7, z: 0.4 },
        'F8': { x: 0.6, y: 0.7, z: 0 },       // Temporal right
        'T3': { x: -0.9, y: 0, z: 0 },        // Pure temporal left
        'C3': { x: -0.6, y: 0, z: 0.6 },
        'Cz': { x: 0, y: 0, z: 0.9 },         // Top center
        'C4': { x: 0.6, y: 0, z: 0.6 },
        'T4': { x: 0.9, y: 0, z: 0 },         // Pure temporal right
        'T5': { x: -0.6, y: -0.7, z: 0 },     // Posterior temporal left
        'P3': { x: -0.3, y: -0.7, z: 0.4 },
        'Pz': { x: 0, y: -0.7, z: 0.5 },      // Posterior midline
        'P4': { x: 0.3, y: -0.7, z: 0.4 },
        'T6': { x: 0.6, y: -0.7, z: 0 },      // Posterior temporal right
        'O1': { x: -0.2, y: -0.9, z: 0.3 },   // Back left
        'O2': { x: 0.2, y: -0.9, z: 0.3 }     // Back right
      },
      channels: [
        'Fp1', 'Fp2', 'F7', 'F3', 'Fz', 'F4', 'F8',
        'T3', 'C3', 'Cz', 'C4', 'T4', 'T5', 'P3',
        'Pz', 'P4', 'T6', 'O1', 'O2'
      ],
      // Mock data array for each channel
      data: Array(74).fill(Array(500).fill(0).map(() => Math.random()))
    },
    meg: {
      // MEG sensors in a spherical pattern
      positions: Array.from({ length: 8 }).map((_, i) => {
        const phi = Math.acos(-1 + (2 * i) / 8)
        const theta = Math.PI * 2 * i / 8
        return {
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.sin(phi) * Math.sin(theta),
          z: Math.cos(phi)
        }
      }),
      channels: Array.from({ length: 8 }).map((_, i) => `MEG${i + 1}`),
      data: Array(8).fill(Array(500).fill(0).map(() => Math.random()))
    }
  }

  return NextResponse.json(sensorPositions)
}

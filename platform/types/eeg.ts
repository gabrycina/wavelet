export interface EEGSensor {
  name: string;          // e.g., "Fp1", "Fp2"
  position: {
    x: number;
    y: number;
    z: number;
  };
  value?: number;        // Current signal value
}

export interface EEGData {
  sensors: EEGSensor[];
  samplingRate?: number; // Hz
  timestamp?: number;    // Unix timestamp
} 
export type FrequencyBands = {
  [key in 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma']: number[]
} 
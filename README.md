# Wavelet 🌊🧠

Wavelet is a transformer based custom model that enables real-time EEG to AI-Derived MEG brain waves enhancing.

![Demo](./demo.gif)

## Features

- **Real-time Signal Processing**: Visualize EEG signals with milliseconds latency
- **3D Brain Visualization**: Interactive 3D model with real-time sensor activity mapping
- **AI Signal Enhancement**: Transform EEG signals into MEG-like data for deeper insights
- **Frequency Band Analysis**: Live monitoring of Delta, Theta, Alpha, Beta, and Gamma bands
- **Audio Synthesis**: Convert brain signals into real-time auditory feedback (just a cool idea, no use, must try!)
- **Data Export**: Download raw EEG or enhanced MEG data in CSV/JSON formats

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **3D Rendering**: Three.js with custom WebGL shaders
- **Data Visualization**: Recharts with custom animations
- **Signal Processing**: Custom FFT implementation with real-time filtering
- **Audio**: Web Audio API with dynamic synthesis

## Getting Started

1. Clone the repository:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Some Credits and mentions
- This data was obtained from the [OpenfMRI database](https://openfmri.org/dataset/ds000117/). Its accession number is ds000117.
- Perri Karyal (her work on EEG gaming is incredible,[check it out](https://www.youtube.com/@perrikaryal)) and Charles Cumpsty for lending us the EEG equipment!
- [Tim](https://github.com/timfarkas) and [Gleb](https://github.com/ProjectGleb) for letting us explore more their initial idea: [BrainTransform](https://github.com/timfarkas/BrainTransform) ❤️
- Nebius for offering the Nvidia H100s used!

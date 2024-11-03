"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { JetBrains_Mono } from 'next/font/google'
import DashboardPage from './dashboard/page'
import WaveBackground from '@/components/wave-background'

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
})

export default function Home() {
  const [showLanding, setShowLanding] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Delay showing the button for a smoother entrance
    const timer = setTimeout(() => setVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!showLanding) {
    return <DashboardPage />
  }

  return (
    <>
      <WaveBackground />
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center landing-overlay">
        <h1 className={`${jetbrains.className} text-4xl md:text-6xl mb-12`}>
          <span className="typewriter">
            Welcome to Wavelet<span className="cursor flowing-cursor">_</span>
          </span>
        </h1>

        <Button 
          onClick={() => {
            const overlay = document.querySelector('.landing-overlay')
            overlay?.classList.add('fade-out')
            setTimeout(() => setShowLanding(false), 1000)
          }}
          className={`
            transition-all duration-1000 
            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          size="lg"
        >
          Enter Platform
        </Button>

        <style jsx global>{`
          .landing-overlay {
            transition: opacity 1s ease-in-out;
          }

          .landing-overlay.fade-out {
            opacity: 0;
          }

          .typewriter {
            overflow: hidden;
            border-right: .15em solid transparent;
            white-space: nowrap;
            animation: typing 2s steps(20, end);
          }
          
          @keyframes typing {
            from { width: 0 }
            to { width: 100% }
          }
          
          .flowing-cursor {
            position: relative;
            background: linear-gradient(
              90deg,
              #8000ff,  /* Purple */
              #0088ff,  /* Blue */
              #00ff80,  /* Green */
              #ff8000,  /* Orange */
              #ff4040,  /* Red */
              #8000ff   /* Back to purple for seamless loop */
            );
            background-size: 300% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: blink 1s step-end infinite,
                       flowingGradient 3s linear infinite;
          }

          @keyframes flowingGradient {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: -200% 50%;
            }
          }
          
          @keyframes blink {
            from, to { opacity: 1 }
            50% { opacity: 0 }
          }
        `}</style>
      </div>
    </>
  )
}

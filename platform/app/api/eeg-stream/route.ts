import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let counter = 0
      let lastValues = Array(14).fill(0)

      function send() {
        // Generate smoother transitions between values
        const eegData = {
          data: lastValues.map((lastValue) => {
            // Add a smaller random change to the last value
            const change = (Math.random() - 0.5) * 0.3
            const newValue = Math.max(-2, Math.min(2, lastValue + change))
            return {
              value: newValue
            }
          })
        }

        lastValues = eegData.data.map(d => d.value)
        
        const data = `id: ${counter}\ndata: ${JSON.stringify(eegData)}\n\n`
        controller.enqueue(encoder.encode(data))
        counter++
      }

      send()

      // Set interval to match EPOC X's 256 Hz sampling rate
      const timer = setInterval(() => {
        try {
          send()
        } catch (e) {
          clearInterval(timer)
          controller.close()
        }
      }, 1000 / 256) // ≈ 3.90625ms between samples

      req.signal.addEventListener('abort', () => {
        clearInterval(timer)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=120',
      'Access-Control-Allow-Origin': '*',
    }
  })
}

export const dynamic = 'force-dynamic'

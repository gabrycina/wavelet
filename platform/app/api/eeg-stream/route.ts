import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let counter = 0

      function send() {
        const eegData = {
          data: Array.from({ length: 65 }, () => ({
            value: Math.random() * 4 - 2
          }))
        }

        const data = `id: ${counter}\ndata: ${JSON.stringify(eegData)}\n\n`
        controller.enqueue(encoder.encode(data))
        counter++
      }

      // Send initial data
      send()

      const timer = setInterval(() => {
        try {
          send()
        } catch (e) {
          clearInterval(timer)
          controller.close()
        }
      }, 100)

      // Keep connection alive
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

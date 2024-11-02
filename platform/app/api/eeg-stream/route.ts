import { NextResponse } from 'next/server'

export async function GET() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController | null = null
  let interval: NodeJS.Timeout | null = null

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      
      // Send initial data
      try {
        const eegData = {
          data: Array.from({ length: 65 }, () => ({
            value: Math.random() * 4 - 2
          }))
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eegData)}\n\n`))
        
        // Start interval after initial data
        interval = setInterval(() => {
          if (!controller) {
            if (interval) clearInterval(interval)
            return
          }

          try {
            const eegData = {
              data: Array.from({ length: 65 }, () => ({
                value: Math.random() * 4 - 2
              }))
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(eegData)}\n\n`))
          } catch (error) {
            console.error('Stream error:', error)
            if (interval) clearInterval(interval)
            controller.close()
            controller = null
          }
        }, 100)
      } catch (error) {
        console.error('Initial data error:', error)
        controller.close()
        controller = null
      }
    },
    
    cancel() {
      console.log('Stream cancelled by client')
      if (interval) clearInterval(interval)
      if (controller) {
        controller.close()
        controller = null
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

export const dynamic = 'force-dynamic'

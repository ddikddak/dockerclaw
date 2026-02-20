import { NextRequest } from 'next/server';
import { setSseBroadcaster } from '@/lib/activity';

// Store connected clients
const clients = new Map<string, WritableStreamDefaultWriter<Uint8Array>>();

// Broadcast function to send events to all connected clients
function broadcast(event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  clients.forEach((writer, id) => {
    try {
      writer.write(encoded);
    } catch (error) {
      console.error(`Failed to send to client ${id}:`, error);
      clients.delete(id);
    }
  });
}

// Set up the global broadcaster
setSseBroadcaster(broadcast);

export async function GET(request: NextRequest) {
  const clientId = crypto.randomUUID();
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`));
      
      // Store the writer for broadcasting
      // We need to create a writer from the controller
      const writer = new WritableStream({
        write(chunk) {
          controller.enqueue(chunk);
        }
      }).getWriter();
      
      clients.set(clientId, writer);
      
      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'));
        } catch {
          clearInterval(keepaliveInterval);
          clients.delete(clientId);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        clients.delete(clientId);
        writer.close().catch(() => {});
        console.log(`SSE client ${clientId} disconnected`);
      });
    },
    cancel() {
      clients.delete(clientId);
      console.log(`SSE client ${clientId} cancelled`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// Health check endpoint
export async function HEAD() {
  return new Response(null, { status: 200 });
}

import { NextRequest } from 'next/server';
import { getRedisClient } from '@/lib/redis-client';

// Server-Sent Events for MC messages
export async function GET(request: NextRequest) {
  // Check if client accepts text/event-stream
  const acceptHeader = request.headers.get('accept');
  if (!acceptHeader?.includes('text/event-stream')) {
    return new Response('This endpoint only supports Server-Sent Events', { 
      status: 400 
    });
  }

  // Create a stream for Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const redisClient = getRedisClient();
      
      // Register handlers for different message types
      const messageTypes = [
        'mc_web_auth_response',
        'mc_web_player_status', 
        'mc_web_server_info',
        'mc_otp_response'
      ];

      messageTypes.forEach(messageType => {
        redisClient.registerHandler(messageType, async (message) => {
          try {
            // Send message to client via SSE
            const sseData = `data: ${JSON.stringify({
              type: message.type,
              timestamp: message.timestamp,
              data: message.data
            })}\n\n`;
            
            controller.enqueue(encoder.encode(sseData));
          } catch (error) {
            console.error(`Error sending SSE message for ${messageType}:`, error);
          }
        });
      });

      // Start Redis subscription
      redisClient.subscribeToMcMessages().catch((error) => {
        console.error('Failed to subscribe to Redis messages:', error);
        controller.error(error);
      });

      // Send initial connection confirmation
      const welcomeMsg = `data: ${JSON.stringify({
        type: 'connected',
        timestamp: new Date().toISOString(),
        data: { message: 'Connected to MC messages stream' }
      })}\n\n`;
      
      controller.enqueue(encoder.encode(welcomeMsg));

      // Keep connection alive with periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMsg = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            data: { message: 'ping' }
          })}\n\n`;
          
          controller.enqueue(encoder.encode(heartbeatMsg));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // 30 second heartbeat

      // Cleanup on connection close
      request.signal?.addEventListener('abort', () => {
        clearInterval(heartbeat);
        redisClient.disconnect().catch(console.error);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Cache-Control',
    },
  });
}
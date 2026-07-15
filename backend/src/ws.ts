import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from './logger';

// Extend WebSocket to include session isolation logic
interface SessionWebSocket extends WebSocket {
  sessionId?: string;
}

let wss: WebSocketServer;

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws: SessionWebSocket) => {
    logger.info('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'SUBSCRIBE' && data.sessionId) {
          ws.sessionId = data.sessionId;
          logger.info(`WebSocket client subscribed to session: ${data.sessionId}`);
        }
      } catch (err) {
        logger.error('Failed to parse WebSocket message');
      }
    });

    ws.on('error', (err) => logger.error('WebSocket error:', { error: err.message }));
    
    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });
  });

  logger.info('WebSocket server initialized');
}

/**
 * Broadcasts a REFRESH_DATA event to targeted clients.
 * This triggers the frontend to immediately re-fetch data instead of polling.
 */
export function broadcastRefresh(targetSessionId?: string) {
  if (!wss) return;
  
  const message = JSON.stringify({ type: 'REFRESH_DATA', timestamp: Date.now() });
  let count = 0;
  
  for (const client of wss.clients) {
    const sessionClient = client as SessionWebSocket;
    if (sessionClient.readyState === WebSocket.OPEN) {
      // If targetSessionId is provided, only broadcast to matching clients
      if (!targetSessionId || sessionClient.sessionId === targetSessionId) {
        sessionClient.send(message);
        count++;
      }
    }
  }
  
  logger.debug(`Broadcasted REFRESH_DATA to ${count} clients${targetSessionId ? ` in session ${targetSessionId}` : ''}`);
}

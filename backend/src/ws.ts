import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from './logger';

let wss: WebSocketServer;

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    
    ws.on('error', (err) => logger.error('WebSocket error:', { error: err.message }));
    
    ws.on('close', () => {
      logger.info('WebSocket client disconnected');
    });
  });

  logger.info('WebSocket server initialized');
}

/**
 * Broadcasts a REFRESH_DATA event to all connected clients.
 * This triggers the frontend to immediately re-fetch data instead of polling.
 */
export function broadcastRefresh() {
  if (!wss) return;
  
  const message = JSON.stringify({ type: 'REFRESH_DATA', timestamp: Date.now() });
  
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
  
  logger.debug('Broadcasted REFRESH_DATA to connected clients');
}

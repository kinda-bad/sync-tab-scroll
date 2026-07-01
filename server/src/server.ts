import { WebSocketServer } from 'ws';
import type { ServerConfig } from './config.js';

export function createServer(config: ServerConfig): WebSocketServer {
  const wss = new WebSocketServer({ port: config.port });

  wss.on('connection', (socket) => {
    console.log('client connected');
    socket.on('close', () => console.log('client disconnected'));
  });

  return wss;
}

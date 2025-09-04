import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from '../storage';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function setupWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log('Cliente WebSocket conectado');

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Cliente WebSocket desconectado');
    });

    ws.on('error', (error) => {
      console.error('Erro WebSocket:', error);
      clients.delete(ws);
    });

    // Send initial data on connection
    sendInitialData(ws);
  });
}

async function sendInitialData(ws: WebSocket): Promise<void> {
  try {
    const notifications = await storage.getNotifications();
    const queueStats = await storage.getQueueStats();

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'initial_data',
        notifications: notifications.slice(0, 10), // Send last 10 notifications
        queueStats,
      }));
    }
  } catch (error) {
    console.error('Erro ao enviar dados iniciais:', error);
  }
}

export function broadcastStatusUpdate(notificationId: string, status: string): void {
  const message = JSON.stringify({
    type: 'status_update',
    notificationId,
    status,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export async function broadcastQueueStats(): Promise<void> {
  try {
    const queueStats = await storage.getQueueStats();
    const message = JSON.stringify({
      type: 'queue_stats',
      stats: queueStats,
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (error) {
    console.error('Erro ao transmitir estatísticas da fila:', error);
  }
}

export function broadcastSystemEvent(event: string, details: string): void {
  const message = JSON.stringify({
    type: 'system_event',
    event,
    details,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function broadcastMessageStatusUpdate(mensagemId: string, status: string): void {
  const message = JSON.stringify({
    type: 'message-status-update',
    mensagemId,
    status,
    timestamp: new Date().toISOString(),
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

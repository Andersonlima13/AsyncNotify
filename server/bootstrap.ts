import { type Server } from "http";
import { connectRabbitMQ } from "./services/rabbitmq";
import { setupWebSocket, broadcastSystemEvent } from "./services/websocket";

/**
 * Inicializa todos os serviços da aplicação
 */
export async function initializeServices(httpServer: Server): Promise<void> {
  try {
    // Conectar ao RabbitMQ
    await connectRabbitMQ();
    console.log('✓ RabbitMQ conectado com sucesso');

    // Configurar WebSocket
    setupWebSocket(httpServer);
    console.log('✓ WebSocket configurado com sucesso');

    // Notificar que os serviços foram inicializados
    broadcastSystemEvent('system_start', 'Serviços da aplicação inicializados');
    console.log('✓ Todos os serviços inicializados com sucesso');
    
  } catch (error) {
    console.error('❌ Falha ao inicializar serviços:', error);
    throw error;
  }
}
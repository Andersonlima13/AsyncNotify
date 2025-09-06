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
    
    // Em modo desenvolvimento, continuar sem RabbitMQ
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Continuando sem RabbitMQ (modo desenvolvimento)');
      
      // Configurar WebSocket mesmo sem RabbitMQ
      setupWebSocket(httpServer);
      console.log('✓ WebSocket configurado com sucesso (modo desenvolvimento)');
      
      // Notificar que os serviços foram inicializados em modo desenvolvimento
      broadcastSystemEvent('system_start', 'Serviços da aplicação inicializados (modo desenvolvimento)');
      console.log('✓ Serviços inicializados em modo desenvolvimento');
      return;
    }
    
    throw error;
  }
}
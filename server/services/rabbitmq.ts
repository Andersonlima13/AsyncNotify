import amqp, { Connection, Channel } from 'amqplib';
import { storage } from '../storage';
import { NotificationStatus } from '@shared/schema';
import { broadcastStatusUpdate, broadcastMessageStatusUpdate } from './websocket';

const RABBITMQ_URL = 'amqp://bjnuffmq:gj-YQIiEXyfxQxjsZtiYDKeXIT8ppUq7@jaragua-01.lmq.cloudamqp.com/bjnuffmq';
const ENTRADA_QUEUE_NAME = 'fila.notificacao.entrada.Anderson-Lima';
const STATUS_QUEUE_NAME = 'fila.notificacao.status.Anderson-Lima';

// Map global para armazenar status das mensagens
export const messageStatusMap = new Map<string, string>();

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Criar filas de entrada e status
    await channel.assertQueue(ENTRADA_QUEUE_NAME, { durable: true });
    await channel.assertQueue(STATUS_QUEUE_NAME, { durable: true });
    
    // Setup consumer para fila de entrada
    await setupEntradaConsumer();
    
    // Setup consumer existente para compatibilidade
    await channel.consume('notifications', async (msg) => {
      if (msg) {
        try {
          const notificationData = JSON.parse(msg.content.toString());
          await processNotification(notificationData);
          channel?.ack(msg);
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
          channel?.nack(msg, false, false);
        }
      }
    });

    console.log('Conectado ao RabbitMQ e escutando mensagens');
  } catch (error) {
    console.error('Falha ao conectar ao RabbitMQ:', error);
    throw error;
  }
}

export async function publishNotification(notificationId: string): Promise<void> {
  if (!channel) {
    throw new Error('Canal RabbitMQ não disponível');
  }

  const notification = await storage.getNotification(notificationId);
  if (!notification) {
    throw new Error('Notificação não encontrada');
  }

  const message = {
    id: notification.id,
    recipient: notification.recipient,
    subject: notification.subject,
    message: notification.message,
    priority: notification.priority,
  };

  await channel.sendToQueue(ENTRADA_QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  console.log(`Notificação ${notificationId} publicada na fila`);
}

// Função específica para publicar mensagem do endpoint /api/notificar
export async function publishDirectMessage(mensagemId: string, conteudoMensagem: string): Promise<void> {
  if (!channel) {
    throw new Error('Canal RabbitMQ não disponível');
  }

  const message = {
    mensagemId,
    conteudoMensagem,
    timestamp: new Date().toISOString()
  };

  await channel.sendToQueue(ENTRADA_QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  console.log(`Mensagem ${mensagemId} publicada diretamente na fila de entrada`);
}

// Função para configurar consumidor da fila de entrada
async function setupEntradaConsumer(): Promise<void> {
  if (!channel) {
    throw new Error('Canal RabbitMQ não disponível');
  }

  await channel.consume(ENTRADA_QUEUE_NAME, async (msg) => {
    if (msg) {
      try {
        const messageData = JSON.parse(msg.content.toString());
        await processEntradaMessage(messageData);
        channel?.ack(msg);
      } catch (error) {
        console.error('Erro ao processar mensagem da fila de entrada:', error);
        channel?.nack(msg, false, false);
      }
    }
  });

  console.log(`Consumidor configurado para fila: ${ENTRADA_QUEUE_NAME}`);
}

// Processamento específico para mensagens da fila de entrada
async function processEntradaMessage(messageData: any): Promise<void> {
  const { mensagemId, conteudoMensagem, id } = messageData;
  
  try {
    console.log(`Iniciando processamento da mensagem: ${mensagemId || id}`);
    
    // Armazenar status inicial
    const trackingId = mensagemId || id;
    messageStatusMap.set(trackingId, 'PROCESSANDO');
    
    // Emitir status inicial via WebSocket
    if (mensagemId) {
      broadcastMessageStatusUpdate(mensagemId, 'PROCESSANDO');
    }
    
    // Simular processamento assíncrono (1-2 segundos)
    const processingTime = 1000 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Gerar número aleatório de 1 a 10 (20% de chance de falha)
    const randomNumber = Math.floor(Math.random() * 10) + 1;
    const success = randomNumber > 2; // 80% de sucesso, 20% de falha
    
    let status: string;
    if (success) {
      status = 'PROCESSADO_SUCESSO';
      console.log(`Mensagem ${trackingId} processada com sucesso (número: ${randomNumber})`);
    } else {
      status = 'FALHA_PROCESSAMENTO';
      console.log(`Falha no processamento da mensagem ${trackingId} (número: ${randomNumber})`);
    }
    
    // Atualizar status no Map
    messageStatusMap.set(trackingId, status);
    
    // Emitir status atualizado via WebSocket
    if (mensagemId) {
      broadcastMessageStatusUpdate(mensagemId, status);
    }
    
    // Publicar status na fila de status
    await publishStatusMessage(trackingId, status);
    
    // Atualizar status da notificação no storage se existir
    if (id) {
      const notificationStatus = success ? NotificationStatus.COMPLETED : NotificationStatus.FAILED;
      await storage.updateNotificationStatus(id, notificationStatus);
      broadcastStatusUpdate(id, notificationStatus);
    }
    
  } catch (error) {
    console.error(`Erro ao processar mensagem ${mensagemId || id}:`, error);
    const trackingId = mensagemId || id;
    messageStatusMap.set(trackingId, 'FALHA_PROCESSAMENTO');
    await publishStatusMessage(trackingId, 'FALHA_PROCESSAMENTO');
  }
}

// Função para publicar mensagem na fila de status
async function publishStatusMessage(mensagemId: string, status: string): Promise<void> {
  if (!channel) {
    throw new Error('Canal RabbitMQ não disponível');
  }

  const statusMessage = {
    mensagemId,
    status,
    timestamp: new Date().toISOString()
  };

  await channel.sendToQueue(STATUS_QUEUE_NAME, Buffer.from(JSON.stringify(statusMessage)), {
    persistent: true,
  });

  console.log(`Status publicado na fila: ${mensagemId} -> ${status}`);
}

async function processNotification(notificationData: any): Promise<void> {
  const { id } = notificationData;
  
  try {
    // Update status to processing
    await storage.updateNotificationStatus(id, NotificationStatus.PROCESSING);
    broadcastStatusUpdate(id, NotificationStatus.PROCESSING);

    // Simulate processing time (2-5 seconds)
    const processingTime = Math.random() * 3000 + 2000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Simulate 90% success rate
    const success = Math.random() > 0.1;
    
    if (success) {
      await storage.updateNotificationStatus(id, NotificationStatus.COMPLETED);
      broadcastStatusUpdate(id, NotificationStatus.COMPLETED);
      console.log(`Notificação ${id} processada com sucesso`);
    } else {
      await storage.updateNotificationStatus(id, NotificationStatus.FAILED);
      broadcastStatusUpdate(id, NotificationStatus.FAILED);
      console.log(`Falha ao processar notificação ${id}`);
    }
  } catch (error) {
    console.error(`Erro ao processar notificação ${id}:`, error);
    await storage.updateNotificationStatus(id, NotificationStatus.FAILED);
    broadcastStatusUpdate(id, NotificationStatus.FAILED);
  }
}

// Função para obter status de uma mensagem
export function getMessageStatus(mensagemId: string): string | undefined {
  return messageStatusMap.get(mensagemId);
}

// Função para obter todas as mensagens e seus status
export function getAllMessageStatus(): Map<string, string> {
  return new Map(messageStatusMap);
}

export async function closeRabbitMQ(): Promise<void> {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
}

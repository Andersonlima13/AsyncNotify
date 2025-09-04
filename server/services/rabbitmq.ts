import amqp, { Connection, Channel } from 'amqplib';
import { storage } from '../storage';
import { NotificationStatus } from '@shared/schema';
import { broadcastStatusUpdate } from './websocket';

const RABBITMQ_URL = 'amqp://bjnuffmq:gj-YQIiEXyfxQxjsZtiYDKeXIT8ppUq7@jaragua-01.lmq.cloudamqp.com/bjnuffmq';
const QUEUE_NAME = 'fila.notificacao.entrada.replit';

let connection: Connection | null = null;
let channel: Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    // Setup consumer for processing messages
    await channel.consume(QUEUE_NAME, async (msg) => {
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

  await channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });

  console.log(`Notificação ${notificationId} publicada na fila`);
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

export async function closeRabbitMQ(): Promise<void> {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
}

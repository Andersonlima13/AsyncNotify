import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock amqplib before importing the module
const mockChannel = {
  sendToQueue: jest.fn(),
  assertQueue: jest.fn(),
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn(),
};

const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  close: jest.fn(),
};

const mockAmqp = {
  connect: jest.fn().mockResolvedValue(mockConnection),
};

jest.mock('amqplib', () => mockAmqp);

// Mock other dependencies
jest.mock('../storage', () => ({
  storage: {
    getNotification: jest.fn(),
    updateNotificationStatus: jest.fn(),
    getNotifications: jest.fn(),
    getQueueStats: jest.fn(),
  },
}));

jest.mock('./websocket', () => ({
  broadcastStatusUpdate: jest.fn(),
  broadcastMessageStatusUpdate: jest.fn(),
}));

// Import the module after mocking dependencies
import {
  publishDirectMessage,
  publishNotification,
  connectRabbitMQ,
  closeRabbitMQ,
  messageStatusMap,
} from '../services/rabbitmq';

// Mock storage with proper typing
const mockStorage = {
  getNotification: jest.fn(),
  updateNotificationStatus: jest.fn(),
  getNotifications: jest.fn(),
  getQueueStats: jest.fn(),
};

describe('RabbitMQ Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    messageStatusMap.clear();
  });

  describe('connectRabbitMQ', () => {
    it('should establish connection and setup queues', async () => {
      await connectRabbitMQ();

      expect(mockAmqp.connect).toHaveBeenCalledWith(
        'amqp://bjnuffmq:gj-YQIiEXyfxQxjsZtiYDKeXIT8ppUq7@jaragua-01.lmq.cloudamqp.com/bjnuffmq'
      );
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'fila.notificacao.entrada.Anderson-Lima',
        { durable: true }
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'fila.notificacao.status.Anderson-Lima',
        { durable: true }
      );
    });

    it('should throw error when connection fails', async () => {
      const error = new Error('Connection failed');
      (mockAmqp.connect as jest.Mock).mockRejectedValueOnce(error);

      await expect(connectRabbitMQ()).rejects.toThrow('Connection failed');
    });
  });

  describe('publishDirectMessage', () => {
    beforeEach(async () => {
      // Setup connection before each test
      await connectRabbitMQ();
      jest.clearAllMocks();
    });

    it('should publish message to entrada queue with correct format', async () => {
      const mensagemId = 'test-uuid-123';
      const conteudoMensagem = 'Test message content';

      await publishDirectMessage(mensagemId, conteudoMensagem);

      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1);
      
      const calls = (mockChannel.sendToQueue as jest.Mock).mock.calls;
      const [queueName, messageBuffer, options] = calls[0];
      
      expect(queueName).toBe('fila.notificacao.entrada.Anderson-Lima');
      expect(options).toEqual({ persistent: true });
      
      const messageData = JSON.parse((messageBuffer as Buffer).toString());
      expect(messageData).toEqual({
        mensagemId,
        conteudoMensagem,
        timestamp: expect.any(String),
      });
      
      // Verify timestamp is a valid ISO string
      expect(() => new Date(messageData.timestamp)).not.toThrow();
    });

    it('should throw error when channel is not available', async () => {
      // Close connection to simulate unavailable channel
      await closeRabbitMQ();

      await expect(
        publishDirectMessage('test-id', 'test content')
      ).rejects.toThrow('Canal RabbitMQ não disponível');
    });

    it('should handle special characters in message content', async () => {
      const mensagemId = 'test-uuid-456';
      const conteudoMensagem = 'Mensagem com acentos: ção, ã, ê, ü';

      await publishDirectMessage(mensagemId, conteudoMensagem);

      const calls = (mockChannel.sendToQueue as jest.Mock).mock.calls;
      const [, messageBuffer] = calls[0];
      const messageData = JSON.parse((messageBuffer as Buffer).toString());
      
      expect(messageData.conteudoMensagem).toBe(conteudoMensagem);
    });
  });

  describe('publishNotification', () => {
    const mockNotification = {
      id: 'notification-123',
      recipient: 'user@example.com',
      subject: 'Test Subject',
      message: 'Test notification message',
      priority: 'high',
    };

    beforeEach(async () => {
      await connectRabbitMQ();
      jest.clearAllMocks();
      mockStorage.getNotification.mockResolvedValue(mockNotification);
    });

    it('should publish notification to entrada queue with correct format', async () => {
      // Mock the storage module directly
      const { storage } = await import('../storage');
      (storage.getNotification as jest.Mock).mockResolvedValue(mockNotification);

      await publishNotification('notification-123');

      expect(storage.getNotification).toHaveBeenCalledWith('notification-123');
      expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1);
      
      const calls = (mockChannel.sendToQueue as jest.Mock).mock.calls;
      const [queueName, messageBuffer, options] = calls[0];
      
      expect(queueName).toBe('fila.notificacao.entrada.Anderson-Lima');
      expect(options).toEqual({ persistent: true });
      
      const messageData = JSON.parse((messageBuffer as Buffer).toString());
      expect(messageData).toEqual({
        id: mockNotification.id,
        recipient: mockNotification.recipient,
        subject: mockNotification.subject,
        message: mockNotification.message,
        priority: mockNotification.priority,
      });
    });

    it('should throw error when notification is not found', async () => {
      const { storage } = await import('../storage');
      (storage.getNotification as jest.Mock).mockResolvedValue(null);

      await expect(
        publishNotification('non-existent-id')
      ).rejects.toThrow('Notificação não encontrada');

      expect(mockChannel.sendToQueue).not.toHaveBeenCalled();
    });

    it('should throw error when channel is not available', async () => {
      await closeRabbitMQ();

      await expect(
        publishNotification('notification-123')
      ).rejects.toThrow('Canal RabbitMQ não disponível');
    });

    it('should handle storage errors gracefully', async () => {
      const storageError = new Error('Database connection failed');
      const { storage } = await import('../storage');
      (storage.getNotification as jest.Mock).mockRejectedValue(storageError);

      await expect(
        publishNotification('notification-123')
      ).rejects.toThrow('Database connection failed');

      expect(mockChannel.sendToQueue).not.toHaveBeenCalled();
    });
  });

  describe('closeRabbitMQ', () => {
    it('should close channel and connection properly', async () => {
      await connectRabbitMQ();
      await closeRabbitMQ();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle null channel and connection gracefully', async () => {
      // Don't connect first, so channel and connection are null
      await expect(closeRabbitMQ()).resolves.not.toThrow();
    });
  });

  describe('Message Processing Integration', () => {
    it('should handle complete message flow', async () => {
      await connectRabbitMQ();
      
      const mensagemId = 'integration-test-123';
      const conteudoMensagem = 'Integration test message';

      // Publish message
      await publishDirectMessage(mensagemId, conteudoMensagem);

      // Verify message was published correctly
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'fila.notificacao.entrada.Anderson-Lima',
        expect.any(Buffer),
        { persistent: true }
      );

      const calls = (mockChannel.sendToQueue as jest.Mock).mock.calls;
      const publishedMessage = JSON.parse(calls[0][1].toString());

      expect(publishedMessage).toEqual({
        mensagemId,
        conteudoMensagem,
        timestamp: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await connectRabbitMQ();
      jest.clearAllMocks();
    });

    it('should handle channel sendToQueue errors', async () => {
      const error = new Error('Queue send failed');
      (mockChannel.sendToQueue as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        publishDirectMessage('test-id', 'test content')
      ).rejects.toThrow('Queue send failed');
    });

    it('should handle JSON serialization edge cases', async () => {
      const mensagemId = 'test-id';
      const conteudoMensagem = 'Normal message';

      await publishDirectMessage(mensagemId, conteudoMensagem);

      const calls = (mockChannel.sendToQueue as jest.Mock).mock.calls;
      const [, messageBuffer] = calls[0];
      const messageString = (messageBuffer as Buffer).toString();
      
      // Verify it's valid JSON
      expect(() => JSON.parse(messageString)).not.toThrow();
    });
  });
});
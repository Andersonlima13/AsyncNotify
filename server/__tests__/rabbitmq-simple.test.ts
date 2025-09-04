// Simple working test for RabbitMQ functionality
const mockSendToQueue = jest.fn();
const mockAssertQueue = jest.fn();

const mockChannel = {
  sendToQueue: mockSendToQueue,
  assertQueue: mockAssertQueue,
  consume: jest.fn(),
  ack: jest.fn(),
  nack: jest.fn(),
  close: jest.fn(),
};

const mockConnection = {
  createChannel: jest.fn(() => Promise.resolve(mockChannel)),
  close: jest.fn(),
};

const mockAmqp = {
  connect: jest.fn(() => Promise.resolve(mockConnection)),
};

// Mock amqplib
jest.mock('amqplib', () => mockAmqp);

// Mock dependencies
jest.mock('../storage', () => ({
  storage: {
    getNotification: jest.fn(),
    updateNotificationStatus: jest.fn(),
  },
}));

jest.mock('./websocket', () => ({
  broadcastStatusUpdate: jest.fn(),
  broadcastMessageStatusUpdate: jest.fn(),
}));

import { publishDirectMessage, connectRabbitMQ } from '../services/rabbitmq';

describe('RabbitMQ Message Publishing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('publishDirectMessage should call sendToQueue with correct parameters', async () => {
    // Setup connection
    await connectRabbitMQ();
    
    const mensagemId = 'test-123';
    const conteudoMensagem = 'Test message';
    
    // Call the function
    await publishDirectMessage(mensagemId, conteudoMensagem);
    
    // Verify sendToQueue was called
    expect(mockSendToQueue).toHaveBeenCalledTimes(1);
    
    const [queueName, messageBuffer, options] = mockSendToQueue.mock.calls[0];
    
    // Verify queue name
    expect(queueName).toBe('fila.notificacao.entrada.Anderson-Lima');
    
    // Verify options
    expect(options).toEqual({ persistent: true });
    
    // Verify message content
    const messageData = JSON.parse(messageBuffer.toString());
    expect(messageData.mensagemId).toBe(mensagemId);
    expect(messageData.conteudoMensagem).toBe(conteudoMensagem);
    expect(messageData.timestamp).toBeDefined();
  });

  test('connectRabbitMQ should setup queues correctly', async () => {
    await connectRabbitMQ();
    
    // Verify connection was established
    expect(mockAmqp.connect).toHaveBeenCalledWith(
      'amqp://bjnuffmq:gj-YQIiEXyfxQxjsZtiYDKeXIT8ppUq7@jaragua-01.lmq.cloudamqp.com/bjnuffmq'
    );
    
    // Verify channel was created
    expect(mockConnection.createChannel).toHaveBeenCalled();
    
    // Verify queues were asserted
    expect(mockAssertQueue).toHaveBeenCalledWith(
      'fila.notificacao.entrada.Anderson-Lima',
      { durable: true }
    );
    expect(mockAssertQueue).toHaveBeenCalledWith(
      'fila.notificacao.status.Anderson-Lima',
      { durable: true }
    );
  });

  test('publishDirectMessage should throw error when channel is not available', async () => {
    // Don't call connectRabbitMQ, so channel is null
    
    await expect(
      publishDirectMessage('test-id', 'test message')
    ).rejects.toThrow('Canal RabbitMQ não disponível');
    
    // Verify sendToQueue was not called
    expect(mockSendToQueue).not.toHaveBeenCalled();
  });
});
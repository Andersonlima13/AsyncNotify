import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNotificationSchema, notificarSchema } from "@shared/schema";
import { publishNotification, publishDirectMessage, getMessageStatus, getAllMessageStatus, connectRabbitMQ } from "./services/rabbitmq";
import { setupWebSocket, broadcastQueueStats, broadcastSystemEvent } from "./services/websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize services
  try {
    await connectRabbitMQ();
    setupWebSocket(httpServer);
    broadcastSystemEvent('system_start', 'Serviços da aplicação inicializados');
  } catch (error) {
    console.error('Falha ao inicializar serviços:', error);
  }

  // POST /api/notificar - Endpoint específico com mensagemId e conteudoMensagem
  app.post("/api/notificar", async (req, res) => {
    try {
      const validatedData = notificarSchema.parse(req.body);
      
      // Publicar diretamente na fila de entrada usando a nova função
      await publishDirectMessage(validatedData.mensagemId, validatedData.conteudoMensagem);
      
      // Atualizar estatísticas da fila
      await broadcastQueueStats();
      
      // Retornar HTTP 202 Accepted imediatamente após publicação
      res.status(202).json({
        mensagemId: validatedData.mensagemId,
        status: "aceito",
        mensagem: "Requisição recebida e será processada assincronamente"
      });
    } catch (error) {
      console.error('Erro ao processar notificação:', error);
      
      // Tratamento específico para erros de validação Zod
      if (error && typeof error === 'object' && 'issues' in error) {
        const zodError = error as any;
        const firstIssue = zodError.issues[0];
        return res.status(400).json({
          sucesso: false,
          erro: firstIssue.message,
          campo: firstIssue.path[0]
        });
      }
      
      res.status(500).json({
        sucesso: false,
        erro: "Falha interna ao processar notificação"
      });
    }
  });

  // POST /api/notifications - Create and queue a new notification
  app.post("/api/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      
      // Create notification in storage
      const notification = await storage.createNotification(validatedData);
      
      // Publish to RabbitMQ queue
      await publishNotification(notification.id);
      
      // Broadcast updated queue stats
      await broadcastQueueStats();
      
      res.status(201).json({
        success: true,
        notification,
        message: "Notification queued successfully"
      });
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Falha ao criar notificação"
      });
    }
  });

  // GET /api/notifications - Get all notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const notifications = await storage.getNotifications();
      res.json({
        success: true,
        notifications
      });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({
        success: false,
        message: "Falha ao buscar notificações"
      });
    }
  });

  // GET /api/notifications/:id - Get specific notification
  app.get("/api/notifications/:id", async (req, res) => {
    try {
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notificação não encontrada"
        });
      }
      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error('Erro ao buscar notificação:', error);
      res.status(500).json({
        success: false,
        message: "Falha ao buscar notificação"
      });
    }
  });

  // GET /api/queue/stats - Get queue statistics
  app.get("/api/queue/stats", async (req, res) => {
    try {
      const stats = await storage.getQueueStats();
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas da fila:', error);
      res.status(500).json({
        success: false,
        message: "Falha ao buscar estatísticas da fila"
      });
    }
  });

  // GET /api/status/:mensagemId - Consultar status de uma mensagem específica
  app.get("/api/status/:mensagemId", async (req, res) => {
    try {
      const { mensagemId } = req.params;
      const status = getMessageStatus(mensagemId);
      
      if (status) {
        res.json({
          sucesso: true,
          mensagemId,
          status
        });
      } else {
        res.status(404).json({
          sucesso: false,
          mensagem: "Mensagem não encontrada"
        });
      }
    } catch (error) {
      console.error('Erro ao consultar status da mensagem:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: "Falha ao consultar status da mensagem"
      });
    }
  });

  // GET /api/status - Consultar status de todas as mensagens
  app.get("/api/status", async (req, res) => {
    try {
      const allStatus = getAllMessageStatus();
      const statusArray = Array.from(allStatus.entries()).map(([mensagemId, status]) => ({
        mensagemId,
        status
      }));
      
      res.json({
        sucesso: true,
        mensagens: statusArray
      });
    } catch (error) {
      console.error('Erro ao consultar status das mensagens:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: "Falha ao consultar status das mensagens"
      });
    }
  });

  return httpServer;
}

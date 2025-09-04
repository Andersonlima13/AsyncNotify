import type { Request, Response } from "express";
import { storage } from "../storage";
import { insertNotificationSchema, notificarSchema } from "@shared/schema";
import { publishNotification, publishDirectMessage, getMessageStatus, getAllMessageStatus } from "../services/rabbitmq";
import { broadcastQueueStats } from "../services/websocket";

/**
 * Controller para notificações diretas via /api/notificar
 */
export async function notificarHandler(req: Request, res: Response) {
  try {
    const validatedData = notificarSchema.parse(req.body);
    
    // Publicar diretamente na fila de entrada
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
}

/**
 * Controller para criar notificação via /api/notifications
 */
export async function createNotificationHandler(req: Request, res: Response) {
  try {
    const validatedData = insertNotificationSchema.parse(req.body);
    
    // Criar notificação no storage
    const notification = await storage.createNotification(validatedData);
    
    // Publicar na fila RabbitMQ
    await publishNotification(notification.id);
    
    // Atualizar estatísticas da fila
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
}

/**
 * Controller para listar todas as notificações
 */
export async function getNotificationsHandler(req: Request, res: Response) {
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
}

/**
 * Controller para buscar notificação específica
 */
export async function getNotificationHandler(req: Request, res: Response) {
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
}
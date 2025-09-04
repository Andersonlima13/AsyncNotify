import type { Request, Response } from "express";
import { getMessageStatus, getAllMessageStatus } from "../services/rabbitmq";
import { storage } from "../storage";

/**
 * Controller para consultar status de mensagem específica
 */
export async function getMessageStatusHandler(req: Request, res: Response) {
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
}

/**
 * Controller para consultar status de todas as mensagens
 */
export async function getAllMessageStatusHandler(req: Request, res: Response) {
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
}

/**
 * Controller para obter estatísticas da fila
 */
export async function getQueueStatsHandler(req: Request, res: Response) {
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
}
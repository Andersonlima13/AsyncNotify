import type { Express } from "express";
import { createServer, type Server } from "http";
import { initializeServices } from "./bootstrap";
import {
  notificarHandler,
  createNotificationHandler,
  getNotificationsHandler,
  getNotificationHandler
} from "./controllers/notification.controller";
import {
  getMessageStatusHandler,
  getAllMessageStatusHandler,
  getQueueStatsHandler
} from "./controllers/status.controller";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Inicializar serviços da aplicação
  await initializeServices(httpServer);

  // Rotas de notificações
  app.post("/api/notificar", notificarHandler);
  app.post("/api/notifications", createNotificationHandler);
  app.get("/api/notifications", getNotificationsHandler);
  app.get("/api/notifications/:id", getNotificationHandler);
  
  // Rotas de status e estatísticas
  app.get("/api/queue/stats", getQueueStatsHandler);
  app.get("/api/status/:mensagemId", getMessageStatusHandler);
  app.get("/api/status", getAllMessageStatusHandler);

  return httpServer;
}

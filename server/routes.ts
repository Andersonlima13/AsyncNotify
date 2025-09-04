import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertNotificationSchema } from "@shared/schema";
import { publishNotification, connectRabbitMQ } from "./services/rabbitmq";
import { setupWebSocket, broadcastQueueStats, broadcastSystemEvent } from "./services/websocket";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize services
  try {
    await connectRabbitMQ();
    setupWebSocket(httpServer);
    broadcastSystemEvent('system_start', 'Application services initialized');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }

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
      console.error('Error creating notification:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to create notification"
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
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch notifications"
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
          message: "Notification not found"
        });
      }
      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch notification"
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
      console.error('Error fetching queue stats:', error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch queue statistics"
      });
    }
  });

  return httpServer;
}

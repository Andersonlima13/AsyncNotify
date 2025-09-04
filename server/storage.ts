import { type User, type InsertUser, type Notification, type InsertNotification, NotificationStatus } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(id: string): Promise<Notification | undefined>;
  updateNotificationStatus(id: string, status: string): Promise<Notification | undefined>;
  getNotifications(): Promise<Notification[]>;
  getQueueStats(): Promise<{ pending: number; processing: number; completed: number; failed: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private notifications: Map<string, Notification>;

  constructor() {
    this.users = new Map();
    this.notifications = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const now = new Date();
    const notification: Notification = {
      ...insertNotification,
      id,
      status: NotificationStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async updateNotificationStatus(id: string, status: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (notification) {
      const updated = {
        ...notification,
        status,
        updatedAt: new Date(),
      };
      this.notifications.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async getNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getQueueStats(): Promise<{ pending: number; processing: number; completed: number; failed: number }> {
    const notifications = Array.from(this.notifications.values());
    return {
      pending: notifications.filter(n => n.status === NotificationStatus.PENDING).length,
      processing: notifications.filter(n => n.status === NotificationStatus.PROCESSING).length,
      completed: notifications.filter(n => n.status === NotificationStatus.COMPLETED).length,
      failed: notifications.filter(n => n.status === NotificationStatus.FAILED).length,
    };
  }
}

export const storage = new MemStorage();

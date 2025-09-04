import { apiRequest } from './queryClient';
import type { InsertNotification, Notification } from '@shared/schema';

export interface NotificationResponse {
  success: boolean;
  notification?: Notification;
  message?: string;
}

export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
}

export interface QueueStatsResponse {
  success: boolean;
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export const notificationApi = {
  create: async (data: InsertNotification): Promise<NotificationResponse> => {
    const response = await apiRequest('POST', '/api/notifications', data);
    return response.json();
  },

  getAll: async (): Promise<NotificationsResponse> => {
    const response = await apiRequest('GET', '/api/notifications');
    return response.json();
  },

  getById: async (id: string): Promise<NotificationResponse> => {
    const response = await apiRequest('GET', `/api/notifications/${id}`);
    return response.json();
  },

  getQueueStats: async (): Promise<QueueStatsResponse> => {
    const response = await apiRequest('GET', '/api/queue/stats');
    return response.json();
  },
};
